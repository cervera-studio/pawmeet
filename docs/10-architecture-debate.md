# DogWalk - Dibattito Architetturale: Panel di 5 Architetti Senior

> **Versione:** 1.0
> **Data:** 9 marzo 2026
> **Formato:** Dibattito strutturato con verdetto finale
> **Classificazione:** Documento interno - Confidenziale
> **Contesto:** Revisione dell'architettura attuale (Full Cloudflare Workers, doc 09) su richiesta del fondatore

---

## Premessa

Il fondatore di DogWalk ha posto una domanda fondamentale: l'architettura attuale basata interamente su Cloudflare Workers (Hono + Durable Objects + KV + Queues + R2) e la scelta giusta, oppure un server tradizionale (Node.js su container) con Cloudflare limitato a CDN/storage sarebbe meglio?

Cinque architetti senior sono stati convocati per un dibattito strutturato. Ognuno porta la propria specializzazione e i propri bias dichiarati. L'obiettivo e una raccomandazione concreta e attuabile.

### Le opzioni sul tavolo

| | Opzione A: Full Cloudflare Workers | Opzione B: Server tradizionale + CF per il resto |
|---|---|---|
| **Compute** | Hono su CF Workers | Node.js (Hono o Fastify) su Fly.io / Cloud Run / Railway |
| **WebSocket** | Durable Objects | WebSocket nativo sul server |
| **Cache** | Cloudflare KV | Upstash Redis |
| **Job Queue** | Cloudflare Queues | BullMQ + Upstash Redis |
| **Storage** | Cloudflare R2 | Cloudflare R2 |
| **Database** | Neon PostgreSQL (invariato) | Neon PostgreSQL (invariato) |
| **Frontend hosting** | Cloudflare Pages | Cloudflare Pages |
| **CDN** | Cloudflare (built-in) | Cloudflare CDN davanti a tutto |

---

## 1. Marco - Cloud Architect

**Specializzazione:** Infrastruttura cloud ad alta scala, ha gestito sistemi con milioni di request/day su AWS, GCP e Cloudflare.

### Posizione: Opzione B (Server tradizionale + Cloudflare per il resto)

### Argomenti

**1. I limiti di Workers sono reali e impattano DogWalk direttamente.**
Workers ha un limite di 128MB di memoria per invocazione e un tempo massimo di esecuzione di 30 secondi (su paid plan). L'algoritmo di matching di DogWalk fa query PostGIS con calcoli di compatibilita multi-dimensionali (taglia, energia, temperamento, distanza, disponibilita oraria). Se il matching deve considerare centinaia di candidati con scoring pesato, 128MB e un vincolo concreto. Su un server Node.js hai 256MB-2GB di RAM configurabili e nessun timeout artificiale.

**2. La connessione a Neon da Workers e un collo di bottiglia architetturale.**
Workers non supporta connessioni TCP persistenti. Ogni request a Neon passa attraverso il driver HTTP/WebSocket serverless (`@neondatabase/serverless`), che aggiunge 20-50ms di latenza rispetto a un connection pool TCP diretto. Per un'app con query PostGIS intensive (matching, mappa, ricerca nelle vicinanze), questa latenza si accumula. Su un server tradizionale puoi usare un connection pool pgBouncer o il pool nativo di Neon con connessioni TCP persistenti, riducendo la latenza del database del 40-60%.

**3. Durable Objects per la chat funzionano, ma hanno un modello mentale complesso e costi non lineari.**
Ogni Durable Object ha un costo di storage ($0.20/GB/mese) e un costo per request ($0.15/milione). Con 500K utenti e migliaia di chat attive, i costi dei Durable Objects possono crescere in modo non lineare. Un server WebSocket tradizionale con Redis pub/sub e un pattern ben documentato, con costi prevedibili e scaling orizzontale tramite load balancer. I Durable Objects hanno anche il problema della "single point of execution": ogni Object vive su un singolo edge node, e se quel nodo ha un problema, la chat si interrompe.

**4. Il vendor lock-in su Cloudflare e totale con l'Opzione A.**
KV, Queues, Durable Objects, Workers AI -- sono tutti servizi proprietari senza equivalenti diretti. Se Cloudflare cambia pricing (come ha fatto nel 2023 con il bandwidth repricing), alza i limiti, o depreca un servizio, devi riscrivere. Con l'Opzione B, l'unico lock-in Cloudflare e R2 e Pages, entrambi con alternative dirette (S3, Vercel/Netlify).

### Rischi della propria scelta (B)

- Devi gestire un container: uptime, scaling, deploy, health check. Non e serverless "fire and forget".
- Costi fissi del container anche con zero traffico (Fly.io parte da ~$5/mese per macchina, ma scala a $50-100/mese per setup produzione con failover).
- WebSocket su container richiede gestione dello stato: se scali a 2+ istanze, serve Redis pub/sub per sincronizzare i messaggi tra nodi.

### Rischi dell'alternativa (A)

- Il team spende il 30% del tempo a workaroundare limiti della piattaforma anziche scrivere feature.
- Debug e testing locale con `wrangler dev` e significativamente peggiore rispetto a un server Node.js con debugger nativo.
- La migrazione via da Workers, se necessaria, richiede riscrittura di chat (Durable Objects), cache (KV), job queue (Queues) -- praticamente tutto il backend tranne le route HTTP.

---

## 2. Elena - Backend Architect

**Specializzazione:** API design, ha 8 anni di esperienza con Node.js e 2 anni con Cloudflare Workers in produzione.

### Posizione: Opzione C (Ibrida -- Server per API core + Durable Objects per chat)

### La proposta C di Elena

| Componente | Tecnologia | Motivazione |
|-----------|-----------|-------------|
| **API core** | Hono su Fly.io (Node.js runtime) | Connection pool TCP a Neon, nessun limite memoria/tempo, debug nativo |
| **Chat real-time** | Cloudflare Durable Objects | Il caso d'uso perfetto per DO: stato isolato per room, WebSocket nativo, edge proximity |
| **Cache** | Upstash Redis | Compatibile con Redis standard, SDK edge-ready, nessun lock-in |
| **Job Queue** | Upstash QStash o BullMQ su Fly.io | Job con retry, scheduling, dead letter queue matura |
| **Storage** | Cloudflare R2 | Zero egress, S3-compatible |
| **Frontend** | Cloudflare Pages | Invariato |
| **CDN** | Cloudflare | Davanti a tutto, incluso il server Fly.io |

### Argomenti

**1. Hono e portatile -- questa e la sua forza principale.**
Hono gira sia su Workers che su Node.js, Deno, Bun. Scegliere Hono su Node.js (Fly.io) significa che il codice delle route, dei middleware, della validazione Zod, e dell'integrazione tRPC resta identico. L'unica differenza e l'entry point (`serve()` di Node.js invece del `export default` di Workers). Se un giorno servono Workers, la migrazione e banale. Ma il contrario -- migrare da Durable Objects a WebSocket tradizionali -- e una riscrittura.

**2. Per la chat, i Durable Objects sono genuinamente superiori.**
Ho usato DO in produzione per 2 anni: per la chat 1-to-1 sono perfetti. Ogni match di DogWalk diventa un Durable Object con la sua coppia di WebSocket. Lo stato (messaggi recenti, typing indicator, read receipt) vive nell'Object. Non serve Redis pub/sub, non serve sincronizzazione tra nodi. La latenza e sotto i 50ms. E il caso d'uso per cui i DO sono stati progettati. Il costo per la chat di DogWalk a 500K utenti sara nell'ordine di $20-50/mese per i DO -- trascurabile.

**3. tRPC su Hono/Node.js ha un'esperienza di sviluppo superiore a tRPC su Workers.**
Su Node.js puoi usare il debugger VS Code step-by-step, puoi fare profiling con `--inspect`, puoi eseguire test di integrazione con un database locale PostGIS senza emulatori. Su Workers, `wrangler dev` non supporta breakpoint, i Miniflare binding mock non sono sempre fedeli alla produzione, e il feedback loop e piu lento. Per un team che deve consegnare un MVP in 12 settimane (Fase 1 del roadmap), la DX conta enormemente.

**4. L'assunzione di backend developer e drasticamente piu semplice.**
In Italia, trovare un senior Node.js developer che conosca Hono/Fastify, PostgreSQL, e WebSocket e relativamente facile. Trovare un senior che abbia esperienza produttiva con Cloudflare Durable Objects, Workers KV, e Cloudflare Queues e difficilissimo. Il pool di talento e 10-20x piu piccolo. Con un budget team di 628K e la necessita di 2 backend senior, non puoi permetterti 3 mesi di onboarding su una piattaforma che nessuno conosce.

### Rischi della propria scelta (C)

- Complessita architetturale: due runtime diversi (Node.js su Fly.io + Workers per DO) richiedono due pipeline di deploy, due sistemi di monitoring, due set di config.
- Il server Fly.io introduce un single point of failure regionale (mitigabile con multi-region, ma aggiunge costo e complessita).
- Bisogna gestire la comunicazione tra il server Node.js e i Durable Objects (tramite Cloudflare Workers come proxy o chiamate HTTP dirette).

### Rischi dell'alternativa A (Full Workers)

- Query PostGIS pesanti su driver HTTP serverless con cold start potenziali.
- BullMQ non esiste su Workers -- Cloudflare Queues ha retry basico ma manca di: priorita, job scheduling con cron, dead letter queue avanzata, dashboard di monitoring (che BullBoard offre gratis).
- Il 90% dei tutorial, delle risposte Stack Overflow, e degli esempi tRPC sono per Node.js. Il team passa piu tempo a cercare workaround che a scrivere codice.

### Rischi dell'alternativa B (Full server)

- WebSocket tradizionali su container richiedono sticky sessions o Redis pub/sub per multi-istanza. E codice infrastrutturale che non produce feature.
- I costi di un server always-on sono piu alti di Workers per traffico basso (prime fasi).

---

## 3. Luca - DevOps/SRE

**Specializzazione:** Reliability engineering, ha gestito SLA 99.95% su sistemi di produzione, esperto CI/CD e monitoring.

### Posizione: Opzione B (Server tradizionale + Cloudflare per il resto)

### Argomenti

**1. L'observability su Cloudflare Workers e drammaticamente inferiore a un server tradizionale.**
Su un server Node.js ho: structured logging con Pino o Winston che posso mandare a qualsiasi destinazione (Datadog, Grafana Cloud, Loki), distributed tracing con OpenTelemetry, metriche custom con Prometheus, profiling CPU/memoria con `clinic.js`. Su Workers ho: `console.log()` che va in Cloudflare Logpush (a pagamento, $0.05/milione di log), Workers Analytics Engine (metriche basiche), e Sentry per i crash. Non posso fare profiling. Non posso fare heap dump. Non posso riprodurre un bug con un debugger attaccato alla produzione. Per un'app con matching algorithm, geolocation, e chat real-time, questa mancanza di visibilita e un rischio operativo serio.

**2. Il deploy e il rollback su Workers hanno gap importanti.**
Workers supporta "gradual rollouts" (canary deploy al 1%, 10%, 50%, 100%), ma non supporta rollback automatico basato su metriche (error rate, latenza). Su Fly.io posso configurare un health check HTTP, e se il nuovo deploy fallisce il check, Fly fa rollback automatico alla versione precedente. Con Workers devo monitorare manualmente e fare `wrangler rollback` -- di notte, nel weekend, quando il deploy va in produzione. Per un team piccolo senza SRE dedicato, l'automazione del rollback e critica.

**3. Il testing di integrazione e drasticamente piu semplice con un server.**
Con un server Node.js posso fare: `docker-compose up` per PostgreSQL+PostGIS, avviare il server, e lanciare test di integrazione end-to-end che verificano il matching algorithm, la creazione di match, e il flusso chat. Con Workers devo usare Miniflare per emulare KV, Queues, Durable Objects, R2 -- e Miniflare non e sempre fedele. Ho visto bug che esistevano solo in produzione perche il binding Miniflare si comportava diversamente. Per il matching algorithm di DogWalk, che e il cuore del prodotto, voglio poter testare con dati reali su un database reale con PostGIS reale, non su un emulatore.

**4. Incident response su Workers e una scatola nera.**
Se alle 3 di notte il matching smette di funzionare, su un server posso: SSH nel container, guardare i log, controllare le connessioni al database, fare una query diagnostica direttamente. Su Workers non posso fare niente di tutto cio. Posso guardare i log in Cloudflare Dashboard (con 2-5 minuti di ritardo), posso deployare un hotfix, e posso pregare. Per un'app social dove il downtime significa utenti che disinstallano, questa differenza e concreta.

### Rischi della propria scelta (B)

- Devo gestire scaling manuale o semi-automatico del container (Fly.io autoscale e buono ma non perfetto).
- Costo piu alto a traffico basso: un server Fly.io costa ~$15-30/mese minimo vs Workers che a traffico basso e praticamente gratis.
- La pipeline CI/CD e piu complessa: build Docker, push registry, deploy container vs `wrangler deploy` (un comando).

### Rischi dell'alternativa (A)

- Nessuna possibilita di profiling in produzione. Se il matching algorithm ha un memory leak o una query N+1, lo scopri solo quando gli utenti si lamentano.
- Cloudflare Queues non ha una dashboard di monitoring dei job. BullMQ ha BullBoard, che mostra job in coda, falliti, completati, con retry e dead letter queue visuale. Con Queues vai alla cieca.
- `wrangler dev` crasha periodicamente con Durable Objects complessi -- ho visto issue aperte su GitHub da mesi senza risoluzione.

---

## 4. Sara - Mobile Architect

**Specializzazione:** Frontend mobile, ha sviluppato 5 app React Native in produzione con milioni di download, esperta di UX e performance percepita.

### Posizione: Opzione A (Full Cloudflare Workers) -- con riserve

### Argomenti

**1. Dal punto di vista del client mobile, l'edge proximity di Workers e un vantaggio tangibile.**
L'app DogWalk fa chiamate API frequenti: swipe (ogni 2-3 secondi), aggiornamento posizione (ogni 30 secondi sulla mappa), caricamento feed. Workers risponde dall'edge node piu vicino all'utente, con latenza tipica di 10-30ms in Europa. Un server su Fly.io risponde dal datacenter piu vicino (tipicamente Amsterdam o Francoforte per utenti italiani), con latenza di 30-80ms. Per lo swipe, dove la reattivita e percepita direttamente dall'utente, 20-50ms di differenza sono rilevanti. La mia esperienza con Tinder-like dice che sotto i 100ms l'utente percepisce l'azione come "istantanea", sopra i 150ms inizia a sentire lag.

**2. I Durable Objects per la chat offrono un'esperienza mobile superiore.**
La riconnessione WebSocket dopo un cambio di rete (WiFi -> 4G, tunnel, ascensore) e il problema piu critico della chat mobile. I Durable Objects gestiscono la riconnessione al WebSocket in modo trasparente: il client si riconnette all'edge node piu vicino, che proxy verso lo stesso Durable Object. Con un server WebSocket tradizionale, il client deve riconnettersi allo stesso server (sticky session) o recuperare lo stato da Redis. L'esperienza utente e peggiore.

**3. R2 + Cloudflare Images transform e perfetto per un'app con molte foto di cani.**
L'app mostra centinaia di foto nelle card di swipe. Con R2 + Image Resizing, posso richiedere esattamente la dimensione che serve per ogni device (`/cdn-cgi/image/width=400,quality=80/photo.jpg`) senza generare thumbnail in anticipo. Questo riduce il tempo di caricamento delle card del 40-60% rispetto a servire immagini full-size e ridimensionarle lato client.

**4. Come client mobile, mi interessa zero dove gira il backend -- basta che l'API sia veloce e stabile.**
TanStack Query con tRPC mi da lo stesso codice client sia che il backend sia su Workers che su Node.js. Il contratto API (tipi tRPC) non cambia. Quindi dal mio punto di vista la scelta e: quale backend risponde piu velocemente e con meno downtime? Workers ha 99.99% SLA globale. Fly.io ha 99.99% ma su singola regione.

### Le riserve di Sara

- L'edge proximity di Workers e un vantaggio **solo per le API leggere** (swipe, feed, profilo). Per il matching algorithm pesante e le query PostGIS, il database e su Neon in una singola regione comunque, quindi Workers deve chiamare cross-region. Il vantaggio edge scompare per le operazioni database-intensive.
- Se il backend team soffre per la DX di Workers e consegna in ritardo, il mobile team si blocca in attesa delle API. La velocita di delivery del backend e piu importante della latenza di 20ms.

### Rischi della propria scelta (A)

- Se il backend team non ha esperienza con Workers, i ritardi di consegna impattano direttamente il mobile. Un'API non pronta = schermata non testabile.
- I Durable Objects hanno un modello di errore diverso da un server tradizionale. Il mobile deve gestire riconnessioni e stati inconsistenti in modo piu robusto.

### Rischi dell'alternativa (B)

- Latenza piu alta per le API ad alta frequenza (swipe, mappa). Mitigabile con CDN cache per le risposte statiche, ma lo swipe e dinamico.
- WebSocket su container tradizionale ha riconnessione piu complessa dopo cambio rete mobile.

---

## 5. Paolo - CTO con esperienza startup

**Specializzazione:** Ha scalato 3 startup da 0 a 1M utenti, sa cosa uccide i progetti e cosa li fa sopravvivere.

### Posizione: Opzione B (Server tradizionale + Cloudflare per il resto)

### Argomenti

**1. Ho visto morire due startup per over-engineering dell'infrastruttura. Mai per under-engineering.**
La startup #1 ha scelto microservizi su Kubernetes quando aveva 200 utenti. La #2 ha scelto un database distribuito "per scalare" quando aveva 50 tabelle. Entrambe hanno bruciato 6 mesi di runway in infrastruttura invece di iterare sul prodotto. DogWalk ha un algoritmo di matching che deve essere validato con utenti reali, un'UX di swipe che deve essere perfezionata, e un product-market fit da trovare. Ogni giorno speso a debuggare Durable Objects o workaroundare limiti di Workers e un giorno non speso a intervistare utenti e iterare.

**2. Il pool di talento in Italia per Cloudflare Workers e praticamente inesistente.**
Ho fatto hiring per le mie 3 startup. Trovare 2 senior Node.js developer in Italia che conoscano PostgreSQL, WebSocket, e TypeScript richiede 4-6 settimane. Trovare 2 senior che abbiano esperienza produttiva con Durable Objects e Cloudflare Queues richiede 4-6 mesi, se li trovi. E se un backend dev se ne va dopo 8 mesi, il sostituto deve imparare una piattaforma di nicchia. Con Node.js, il sostituto e produttivo in 2 settimane. Con Workers, in 2 mesi. Il costo del team e 628K/anno -- ogni mese di onboarding perso sono 52K bruciati.

**3. A 5K utenti il problema non e la scala, e il product-market fit.**
Il fondatore dice "da 5K a 500K senza riscrivere". Ma la realta e che il 90% delle app social non arriva mai a 50K utenti. Il rischio numero uno non e "il server non regge", e "gli utenti non tornano dopo la prima settimana". Node.js su Fly.io regge tranquillamente 500K utenti con un singolo server da $50/mese (per le API REST). Quando arrivi a 100K+ utenti e hai validato il prodotto, puoi investire in ottimizzazione. La mia startup #3 ha fatto 800K utenti su un singolo server Express.js da $80/mese prima di dover aggiungere un secondo nodo.

**4. La migrazione da Node.js a Workers e facile. Il contrario e un incubo.**
Se un giorno DogWalk ha 500K utenti e serve edge proximity, prendere le route Hono da Node.js e deployarle su Workers e un pomeriggio di lavoro (cambio entry point, test, deploy). Ma migrare da Durable Objects a WebSocket tradizionali, da KV a Redis, da Queues a BullMQ, e una riscrittura di 2-3 mesi. Scegliere B oggi non chiude nessuna porta. Scegliere A oggi chiude la porta del "torniamo a qualcosa di piu semplice".

### Rischi della propria scelta (B)

- Costi leggermente piu alti a traffico bassissimo (primi 3 mesi).
- Serve qualcuno nel team che sappia gestire un container (ma qualsiasi senior dev sa farlo).
- WebSocket multi-nodo richiede Redis pub/sub, che aggiunge un servizio da gestire.

### Rischi dell'alternativa (A)

- Il fondatore dice "non e un MVP throwaway", ma la verita e che il prodotto cambiera radicalmente nei primi 6 mesi. Se il matching algorithm va riscritto (succede sempre), rifarlo dentro i limiti di Workers costa il doppio.
- Se Cloudflare cambia i prezzi dei Durable Objects (oggi $0.15/milione di request), non hai alternativa se non riscrivere la chat.
- Team frustrato = team che se ne va. Developer che combattono con la piattaforma invece di scrivere feature sono developer che aggiornano LinkedIn.

---

## Verdetto del Panel

### Voto finale

| Architetto | Voto | Posizione |
|-----------|------|-----------|
| **Marco** (Cloud Architect) | **B** | Server tradizionale + CF per storage/CDN |
| **Elena** (Backend Architect) | **C** | Ibrido: Server per API + Durable Objects per chat |
| **Luca** (DevOps/SRE) | **B** | Server tradizionale + CF per storage/CDN |
| **Sara** (Mobile Architect) | **A** | Full Cloudflare Workers (con riserve) |
| **Paolo** (CTO Startup) | **B** | Server tradizionale + CF per storage/CDN |

**Risultato: 3 voti per B, 1 voto per C (variante ibrida), 1 voto per A (con riserve).**

---

### Raccomandazione di maggioranza: Opzione B con elementi di C

Il panel converge su una **raccomandazione B+**, che incorpora l'insight di Elena sulla chat:

#### Architettura raccomandata

```
┌─────────────────────────────────────────────────────────┐
│                  Cloudflare Network                      │
│              (CDN + DDoS + Edge Cache)                   │
└────────┬──────────────┬──────────────┬──────────────────┘
         │              │              │
         ▼              ▼              ▼
┌────────────┐  ┌──────────────┐  ┌──────────────────┐
│  CF Pages  │  │  CF Workers   │  │   Fly.io         │
│            │  │  (proxy +     │  │   (Node.js)      │
│  web       │  │   chat DO)    │  │                  │
│  admin     │  │              │  │   Hono + tRPC    │
│            │  │  Durable     │  │   API core       │
│            │  │  Objects     │  │   Matching algo   │
│            │  │  (chat only) │  │   PostGIS queries │
└────────────┘  └──────┬───────┘  └────────┬─────────┘
                       │                    │
                       │              ┌─────▼─────────┐
                       │              │ Upstash Redis  │
                       │              │ (cache + pub/  │
                       │              │  sub + queue)  │
                       │              └───────────────┘
                       │                    │
                       └────────┬───────────┘
                                │
                         ┌──────▼──────┐
                         │   Neon      │
                         │ PostgreSQL  │
                         │  + PostGIS  │
                         └─────────────┘
                                │
                         ┌──────▼──────┐
                         │     R2      │
                         │  (storage)  │
                         └─────────────┘
```

#### Stack concreto

| Componente | Tecnologia | Costo stimato (500K utenti) |
|-----------|-----------|---------------------------|
| **API server** | Hono su Node.js, Fly.io (2 macchine, fra-1 + ams-1) | $30-60/mese |
| **Chat real-time** | Cloudflare Durable Objects (1 DO per match attivo) | $10-30/mese |
| **Cache + Pub/Sub** | Upstash Redis (Pro plan) | $30-50/mese |
| **Job Queue** | BullMQ su Fly.io (stessa macchina o dedicata) oppure Upstash QStash | $0-20/mese |
| **Database** | Neon PostgreSQL (Scale plan) | $50-100/mese |
| **Storage** | Cloudflare R2 | $5-15/mese |
| **Frontend** | Cloudflare Pages (gratis) | $0/mese |
| **Email** | Resend | $0-20/mese |
| **Monitoring** | Sentry + Grafana Cloud free tier | $0-30/mese |
| **TOTALE** | | **$125-325/mese** |

#### Motivazioni della raccomandazione

1. **Developer experience al primo posto.** Il team (628K/anno di costo) e l'investimento piu grande del progetto. Ogni settimana persa in lotte con la piattaforma costa piu dell'infrastruttura di un anno intero. Node.js offre debugging nativo, testing di integrazione reale con PostGIS, e un ecosistema di strumenti maturi.

2. **Hiring realistico.** In Italia ci sono migliaia di senior Node.js developer. Ce ne sono forse 50 con esperienza produttiva su Durable Objects. Con il budget e le timeline di DogWalk, non puoi scommettere su un pool di talento cosi ristretto.

3. **Hono come ponte strategico.** Usando Hono sia per l'API server (Node.js) che per il proxy Workers (chat), il codice resta portatile. Se un giorno servira migrare tutto su Workers, il framework e gia quello giusto. Nessun lock-in sul framework.

4. **Durable Objects solo dove eccellono.** La chat 1-to-1 e il caso d'uso ideale per i DO: stato isolato, WebSocket nativo, edge proximity per la riconnessione mobile. Usare i DO per la chat ma non per tutto il resto e il compromesso ottimale tra innovazione e pragmatismo.

5. **Nessuna riscrittura per scalare a 500K.** Node.js su Fly.io scala aggiungendo macchine. Upstash Redis scala automaticamente. Neon scala con autoscaling. R2 scala senza limiti. L'unica parte che richiede attenzione a scala e il WebSocket, ma i Durable Objects lo gestiscono nativamente.

---

### Piano d'azione concreto

#### Fase 0 - Setup (Settimana 1-2)

- [ ] Creare il progetto Hono con entry point Node.js (`@hono/node-server`)
- [ ] Configurare Fly.io con `fly.toml` (regione `fra`, 1 macchina shared-cpu-1x, 256MB)
- [ ] Setup Upstash Redis (free tier per dev)
- [ ] Mantenere Neon PostgreSQL + PostGIS come da architettura attuale
- [ ] Mantenere R2 e Pages come da architettura attuale
- [ ] Creare il Cloudflare Worker proxy per i Durable Objects della chat
- [ ] Aggiornare il `docker-compose.yml` aggiungendo Redis locale per dev

#### Fase 1 - MVP (Settimana 3-14)

- [ ] Sviluppare tutte le API (auth, user, dog, matching, upload, notification) su Hono/Node.js
- [ ] Sviluppare il Durable Object per la chat (unico componente su Workers)
- [ ] tRPC resta invariato -- il client non sa (e non deve sapere) dove gira il backend
- [ ] BullMQ per job asincroni (moderazione foto, push, email) sullo stesso server Fly.io
- [ ] Test di integrazione con database PostgreSQL+PostGIS reale

#### Modifiche ai documenti esistenti

Il documento `09-consolidated-architecture.md` va aggiornato nei seguenti punti:

1. **Sezione 3.3 Backend**: Da "Hono su Cloudflare Workers" a "Hono su Node.js (Fly.io)", mantenendo tRPC e Drizzle invariati
2. **Sezione 4 Architettura Cloudflare**: Ridurre il ruolo di Workers a "proxy + chat Durable Objects"
3. **Conflitto 1**: Hono resta, ma su Node.js runtime anziche Workers runtime
4. **Conflitto 2**: KV sostituito da Upstash Redis, Queues sostituito da BullMQ
5. **Conflitto 7**: Durable Objects per la chat restano confermati
6. **Conflitto 14**: Docker Compose aggiunge Redis locale

#### Cosa NON cambia

- Expo + React Native per il mobile
- tRPC come API layer type-safe
- Drizzle ORM + Neon PostgreSQL + PostGIS
- Cloudflare R2 per storage foto
- Cloudflare Pages per web + admin
- Zod per validazione condivisa
- Struttura monorepo e tutti i package condivisi
- Il client tRPC (`@pawmeet/api-client`) resta identico -- il cambio e trasparente

---

### Nota finale del panel

Il fondatore ha ragione: DogWalk non e un MVP throwaway. Ma "architettura solida che scala" non significa "l'architettura piu avanzata tecnologicamente". Significa l'architettura che il team puo costruire, debuggare, e iterare velocemente. Un server Node.js con Hono e esattamente questo: solido, scalabile, e -- soprattutto -- qualcosa che qualsiasi backend developer senior puo prendere in mano dal giorno uno.

L'unica concessione alla "magia" di Cloudflare e la chat con Durable Objects, perche li il vantaggio tecnico e reale e misurabile. Per tutto il resto, la scelta pragmatica vince sulla scelta elegante.

> *"Make it work, make it right, make it fast -- in questo ordine."*
> -- Kent Beck, citato da tutti e cinque gli architetti.
