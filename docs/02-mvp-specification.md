# DogWalk -- Specifica MVP

**Versione:** 1.0
**Data:** 2026-03-09
**Autore:** Product Owner
**Stato:** Draft

---

## Indice

1. [Visione del Prodotto](#1-visione-del-prodotto)
2. [Personas e Segmenti Utente](#2-personas-e-segmenti-utente)
3. [User Stories](#3-user-stories)
4. [Architettura Funzionale MVP](#4-architettura-funzionale-mvp)
5. [Profilo Cane -- Data Model](#5-profilo-cane--data-model)
6. [Algoritmo di Matching](#6-algoritmo-di-matching)
7. [Geolocalizzazione](#7-geolocalizzazione)
8. [Chat Sicura](#8-chat-sicura)
9. [Flusso di Onboarding](#9-flusso-di-onboarding)
10. [Strategia Notifiche Push](#10-strategia-notifiche-push)
11. [Privacy, Sicurezza e GDPR](#11-privacy-sicurezza-e-gdpr)
12. [Requisiti Non Funzionali](#12-requisiti-non-funzionali)
13. [Matrice di Prioritizzazione](#13-matrice-di-prioritizzazione)
14. [Casi Limite e Gestione Errori](#14-casi-limite-e-gestione-errori)
15. [Analytics e Tracking](#15-analytics-e-tracking)
16. [Roadmap Post-MVP](#16-roadmap-post-mvp)

---

## 1. Visione del Prodotto

**DogWalk** e' un'app social progettata per proprietari di cani che desiderano trovare compagni di passeggiata compatibili per i propri amici a quattro zampe. L'app utilizza un algoritmo di matching basato su taglia, energia, comportamento e prossimita' geografica per suggerire abbinamenti sicuri e piacevoli.

### 1.1 Problema

I proprietari di cani, specialmente in contesti urbani, faticano a trovare compagni di passeggiata adatti al proprio cane. Le passeggiate solitarie riducono le opportunita' di socializzazione del cane e del proprietario. Gli incontri casuali al parco possono essere problematici quando i cani hanno temperamenti incompatibili.

### 1.2 Soluzione

Un sistema di matching intelligente che analizza compatibilita' comportamentale, dimensionale e di energia tra cani, combinato con geolocalizzazione in tempo reale e chat sicura per organizzare passeggiate condivise.

### 1.3 Proposta di Valore Unica

A differenza delle app social generiche o dei gruppi Facebook locali, DogWalk garantisce compatibilita' verificata tra cani prima del primo incontro, riducendo il rischio di interazioni negative e aumentando la qualita' dell'esperienza per cani e proprietari.

### 1.4 Metriche di Successo MVP

| Metrica | Target MVP (3 mesi) | Misurazione |
|---------|---------------------|-------------|
| Utenti registrati | 5.000 | Conteggio account attivi |
| Profili cane completati | 4.000 | Profili con almeno 1 foto e dati completi |
| Match confermati | 2.000 | Entrambi gli utenti hanno fatto swipe "interessato" |
| Passeggiate organizzate via chat | 500 | Messaggi contenenti data/ora/luogo |
| Retention D7 | >= 40% | Utenti attivi a 7 giorni dalla registrazione |
| Retention D30 | >= 20% | Utenti attivi a 30 giorni dalla registrazione |
| NPS | >= 30 | Survey in-app |

---

## 2. Personas e Segmenti Utente

### Persona 1: Marco -- Il Proprietario Urbano

- **Eta':** 28-35 anni
- **Contesto:** Vive in appartamento in citta', lavora in ufficio
- **Cane:** Labrador di 2 anni, alta energia
- **Bisogno:** Trovare compagni di passeggiata nel quartiere per far socializzare il cane
- **Frustrazione:** Il cane ha troppa energia per passeggiate brevi da solo
- **Comportamento digitale:** Usa app quotidianamente, familiare con meccaniche di swipe

### Persona 2: Laura -- La Dog Sitter Occasionale

- **Eta':** 22-28 anni
- **Contesto:** Studentessa, porta a spasso il cane dei genitori nei weekend
- **Cane:** Barboncino di 5 anni, timido
- **Bisogno:** Trovare cani calmi e compatibili per passeggiate tranquille
- **Frustrazione:** Il cane si spaventa con cani troppo irruenti
- **Comportamento digitale:** Attiva sui social, preferisce comunicazione via chat

### Persona 3: Giuseppe -- Il Pensionato Attivo

- **Eta':** 60-70 anni
- **Contesto:** In pensione, vive in periferia, ha tempo libero
- **Cane:** Beagle di 8 anni, tranquillo
- **Bisogno:** Compagnia umana e canina per le passeggiate quotidiane
- **Frustrazione:** Pochi contatti sociali nel quartiere
- **Comportamento digitale:** Usa smartphone ma preferisce interfacce semplici

### Persona 4: Sofia -- La Proprietaria Esperta

- **Eta':** 35-45 anni
- **Contesto:** Proprietaria esperta, segue corsi di educazione cinofila
- **Cane:** Pastore tedesco di 3 anni, ben addestrato ma selettivo
- **Bisogno:** Filtrare cani compatibili in base a comportamento specifico
- **Frustrazione:** Incontri con cani non socializzati che provocano reazioni nel suo
- **Comportamento digitale:** Esigente sulla qualita' delle informazioni disponibili

---

## 3. User Stories

### 3.1 Classificazione MoSCoW

#### MUST HAVE (M)

| ID | User Story | Criteri di Accettazione |
|----|-----------|------------------------|
| US-01 | Come proprietario di un cane, voglio creare un profilo dettagliato del mio cane, cosi' che altri utenti possano valutare la compatibilita' prima di un incontro. | - Il profilo contiene: nome, eta', razza, taglia, peso, livello di energia, comportamento con altri cani, stato sterilizzazione, foto (min 1, max 6). - Tutti i campi obbligatori devono essere compilati per pubblicare il profilo. - Il profilo e' visibile solo ad utenti registrati. - Le foto vengono validate per contenuto appropriato. |
| US-02 | Come proprietario, voglio visualizzare cani compatibili nelle vicinanze tramite un sistema di swipe, cosi' che possa esprimere interesse verso quelli piu' adatti al mio cane. | - Il sistema mostra una card alla volta con foto, nome, razza, taglia, distanza. - L'utente puo' fare swipe destro (interessato) o sinistro (passa). - I cani gia' valutati non riappaiono per 30 giorni (se "passa"). - La coda di suggerimenti si rigenera quotidianamente in base alla posizione. |
| US-03 | Come proprietario, voglio ricevere una notifica quando c'e' un match reciproco, cosi' che possa iniziare una conversazione. | - Il match si crea solo quando entrambi gli utenti fanno swipe "interessato". - Una notifica push viene inviata a entrambi gli utenti. - Il match appare nella lista match di entrambi. |
| US-04 | Come proprietario con un match confermato, voglio chattare con l'altro proprietario, cosi' che possiamo organizzare una passeggiata insieme. | - La chat si attiva solo dopo match reciproco. - I messaggi supportano testo e immagini. - E' visibile l'indicatore "ultimo accesso" e "messaggio letto". - La chat mostra il profilo del cane dell'interlocutore in alto. |
| US-05 | Come utente, voglio registrarmi con email o account social, cosi' che possa accedere all'app in modo rapido e sicuro. | - Registrazione disponibile via email+password, Google, Apple Sign-In. - Email richiede verifica tramite codice OTP. - Password: minimo 8 caratteri, 1 maiuscola, 1 numero. - Accettazione obbligatoria di T&C e Privacy Policy. |
| US-06 | Come utente, voglio che l'app rilevi la mia posizione, cosi' che possa vedere cani disponibili nella mia zona. | - Richiesta permesso di localizzazione con spiegazione chiara. - Funziona con GPS attivo (precisione < 100m). - L'utente puo' impostare un raggio di ricerca (1-25 km, default 5 km). - La posizione si aggiorna quando l'app e' in foreground. |
| US-07 | Come utente, voglio poter segnalare un profilo inappropriato o un comportamento molesto, cosi' che la community resti sicura. | - Pulsante "Segnala" visibile su ogni profilo e in chat. - Categorie di segnalazione: profilo falso, contenuto inappropriato, comportamento molesto, altro. - Conferma di ricezione della segnalazione all'utente. - Il segnalato non viene notificato. |
| US-08 | Come utente, voglio poter bloccare un altro utente, cosi' che non possa piu' contattarmi o vedere il mio profilo. | - Opzione "Blocca" disponibile dal profilo e dalla chat. - L'utente bloccato non puo' vedere il profilo del bloccante. - La chat esistente viene archiviata e non e' piu' accessibile. - Il blocco e' reversibile dalle impostazioni. |

#### SHOULD HAVE (S)

| ID | User Story | Criteri di Accettazione |
|----|-----------|------------------------|
| US-09 | Come proprietario, voglio specificare le preferenze di passeggiata del mio cane (orari, durata, tipo di percorso), cosi' che il matching sia piu' accurato. | - Campi: orari preferiti (mattina/pomeriggio/sera), durata tipica (15-120 min), tipo percorso (urbano/parco/campagna/spiaggia). - Almeno un orario e una durata devono essere selezionati. - Le preferenze influenzano il punteggio di matching. |
| US-10 | Come utente, voglio visualizzare il profilo completo di un cane prima di fare swipe, cosi' che possa prendere una decisione informata. | - Il profilo espanso mostra tutte le informazioni: razza, eta', peso, comportamento, preferenze di passeggiata, stato sterilizzazione. - Le foto sono navigabili con swipe orizzontale. - E' visibile la distanza dall'utente. - E' visibile il punteggio di compatibilita' (alto/medio/basso). |
| US-11 | Come utente, voglio gestire le mie impostazioni di privacy, cosi' che possa controllare chi vede le mie informazioni. | - Toggle per visibilita' del profilo (attivo/nascosto). - Toggle per mostrare distanza esatta vs approssimativa. - Toggle per "ultimo accesso" visibile in chat. - Opzione per eliminare l'account e tutti i dati. |
| US-12 | Come utente, voglio poter modificare il profilo del mio cane in qualsiasi momento, cosi' che le informazioni siano sempre aggiornate. | - Tutti i campi del profilo sono modificabili. - Le modifiche sono salvate immediatamente. - Il cambio di foto richiede rivalidazione. - Lo storico delle modifiche e' conservato internamente. |

#### COULD HAVE (C)

| ID | User Story | Criteri di Accettazione |
|----|-----------|------------------------|
| US-13 | Come proprietario di piu' cani, voglio poter aggiungere piu' profili cane al mio account, cosi' che ognuno abbia il proprio matching. | - Massimo 5 profili cane per account nell'MVP. - Ogni cane ha un profilo indipendente. - L'utente seleziona con quale cane fare matching. - I match sono associati al singolo cane. |
| US-14 | Come utente, voglio ricevere suggerimenti personalizzati in base ai miei pattern di swipe, cosi' che i suggerimenti migliorino nel tempo. | - Il sistema traccia i pattern di swipe (taglie preferite, razze, distanza). - Dopo 20 swipe, i suggerimenti iniziano a pesare le preferenze implicite. - L'utente puo' resettare le preferenze implicite. |
| US-15 | Come utente, voglio vedere una mappa con i cani disponibili nelle vicinanze, cosi' che possa avere una visione d'insieme della mia zona. | - Mappa centrata sulla posizione dell'utente. - I cani appaiono come pin con foto miniatura. - Tap sul pin mostra una card riassuntiva. - La mappa rispetta il raggio di ricerca impostato. |

#### WON'T HAVE (W) -- Escluso dall'MVP

| ID | User Story | Note |
|----|-----------|------|
| US-16 | Come utente, voglio partecipare a eventi di gruppo con piu' cani e proprietari. | Richiede gestione eventi, RSVP, logistica. Post-MVP fase 2. |
| US-17 | Come utente, voglio guadagnare badge e punti per le passeggiate completate. | Gamification prevista in fase 3. |
| US-18 | Come utente, voglio condividere foto e video delle passeggiate in un feed social. | Feed social previsto in fase 3. |
| US-19 | Come utente, voglio sincronizzare i dati di attivita' con app fitness. | Integrazione esterna prevista in fase 4. |
| US-20 | Come utente, voglio che un sistema AI suggerisca l'abbinamento ottimale in base a dati storici. | ML avanzato previsto in fase 4. |

---

## 4. Architettura Funzionale MVP

### 4.1 Moduli Principali

```
+--------------------------------------------------+
|                   APP MOBILE                      |
|  (React Native / Flutter -- cross-platform)       |
+--------------------------------------------------+
        |              |             |          |
   Autenticazione  Profilo Cane  Matching   Chat
        |              |             |          |
+--------------------------------------------------+
|                   API GATEWAY                     |
+--------------------------------------------------+
        |              |             |          |
+----------+  +------------+  +---------+  +------+
| Auth     |  | Profile    |  | Match   |  | Chat |
| Service  |  | Service    |  | Engine  |  | Svc  |
+----------+  +------------+  +---------+  +------+
        |              |             |          |
+--------------------------------------------------+
|              DATABASE + STORAGE                   |
|        PostgreSQL + Redis + S3/Cloud Storage      |
+--------------------------------------------------+
        |
+--------------------------------------------------+
|           SERVIZI ESTERNI                         |
|  Geolocation API | Push Notifications | CDN       |
+--------------------------------------------------+
```

### 4.2 Flusso Utente Principale

1. Registrazione / Login
2. Onboarding: creazione profilo cane
3. Concessione permesso geolocalizzazione
4. Visualizzazione coda di suggerimenti (swipe)
5. Match reciproco --> apertura chat
6. Organizzazione passeggiata via chat
7. (Futuro) Feedback post-passeggiata

---

## 5. Profilo Cane -- Data Model

### 5.1 Tabella `dog_profiles`

| Campo | Tipo | Obbligatorio | Validazione | Note |
|-------|------|:------------:|-------------|------|
| `id` | UUID | Si' | Generato automaticamente | PK |
| `owner_id` | UUID | Si' | FK -> users.id | Proprietario |
| `name` | VARCHAR(50) | Si' | 2-50 caratteri, solo lettere e spazi | Nome del cane |
| `birth_date` | DATE | Si' | Non futura, non oltre 25 anni fa | Per calcolo eta' |
| `breed` | VARCHAR(100) | Si' | Da lista predefinita + "Meticcio" | Razza |
| `breed_secondary` | VARCHAR(100) | No | Da lista predefinita | Seconda razza (per incroci) |
| `size` | ENUM | Si' | `toy`, `piccola`, `media`, `grande`, `gigante` | Taglia |
| `weight_kg` | DECIMAL(4,1) | Si' | 0.5 - 100.0 | Peso in kg |
| `gender` | ENUM | Si' | `maschio`, `femmina` | Sesso |
| `is_neutered` | BOOLEAN | Si' | -- | Sterilizzato/castrato |
| `energy_level` | ENUM | Si' | `bassa`, `media`, `alta`, `molto_alta` | Livello di energia |
| `behavior_with_dogs` | ENUM | Si' | `molto_socievole`, `socievole`, `selettivo`, `reattivo` | Comportamento con altri cani |
| `behavior_with_people` | ENUM | Si' | `molto_socievole`, `socievole`, `timido`, `diffidente` | Comportamento con persone |
| `leash_behavior` | ENUM | Si' | `eccellente`, `buono`, `in_addestramento`, `difficile` | Comportamento al guinzaglio |
| `recall_reliability` | ENUM | No | `affidabile`, `parziale`, `non_affidabile` | Richiamo |
| `bio` | TEXT | No | Max 500 caratteri | Descrizione libera |
| `walk_pref_time` | ARRAY[ENUM] | Si' | `mattina_presto`, `mattina`, `pomeriggio`, `sera`, `sera_tardi` | Orari preferiti |
| `walk_pref_duration_min` | INTEGER | Si' | 15 - 180 | Durata minima (minuti) |
| `walk_pref_duration_max` | INTEGER | Si' | 15 - 180, >= duration_min | Durata massima (minuti) |
| `walk_pref_terrain` | ARRAY[ENUM] | Si' | `urbano`, `parco`, `campagna`, `spiaggia`, `montagna` | Tipo percorso |
| `is_active` | BOOLEAN | Si' | Default: true | Profilo visibile |
| `created_at` | TIMESTAMP | Si' | Generato automaticamente | -- |
| `updated_at` | TIMESTAMP | Si' | Aggiornato automaticamente | -- |

### 5.2 Tabella `dog_photos`

| Campo | Tipo | Obbligatorio | Validazione | Note |
|-------|------|:------------:|-------------|------|
| `id` | UUID | Si' | Generato automaticamente | PK |
| `dog_id` | UUID | Si' | FK -> dog_profiles.id | -- |
| `url` | VARCHAR(500) | Si' | URL valido, HTTPS | URL su CDN |
| `position` | INTEGER | Si' | 1-6 | Ordine visualizzazione |
| `is_primary` | BOOLEAN | Si' | Esattamente 1 per cane | Foto principale |
| `moderation_status` | ENUM | Si' | `pending`, `approved`, `rejected` | Stato moderazione |
| `uploaded_at` | TIMESTAMP | Si' | Generato automaticamente | -- |

### 5.3 Tabella `users`

| Campo | Tipo | Obbligatorio | Validazione | Note |
|-------|------|:------------:|-------------|------|
| `id` | UUID | Si' | Generato automaticamente | PK |
| `email` | VARCHAR(255) | Si' | Formato email valido, unico | -- |
| `display_name` | VARCHAR(50) | Si' | 2-50 caratteri | Nome visualizzato |
| `auth_provider` | ENUM | Si' | `email`, `google`, `apple` | Metodo di autenticazione |
| `avatar_url` | VARCHAR(500) | No | URL valido | Foto profilo proprietario |
| `latitude` | DECIMAL(10,8) | No | -90.0 a 90.0 | Ultima posizione nota |
| `longitude` | DECIMAL(11,8) | No | -180.0 a 180.0 | Ultima posizione nota |
| `location_updated_at` | TIMESTAMP | No | -- | Timestamp ultima posizione |
| `search_radius_km` | INTEGER | Si' | 1-25, default 5 | Raggio di ricerca |
| `is_active` | BOOLEAN | Si' | Default: true | Account attivo |
| `created_at` | TIMESTAMP | Si' | Generato automaticamente | -- |
| `last_login_at` | TIMESTAMP | No | -- | Ultimo accesso |

### 5.4 Regole di Validazione Aggiuntive

1. **Foto:** Minimo 1, massimo 6 per profilo cane. Formati accettati: JPEG, PNG, HEIC. Dimensione massima: 10 MB. Risoluzione minima: 400x400 px.
2. **Peso vs Taglia:** Il peso deve essere coerente con la taglia selezionata:
   - Toy: 0.5 - 5.0 kg
   - Piccola: 5.0 - 12.0 kg
   - Media: 12.0 - 25.0 kg
   - Grande: 25.0 - 45.0 kg
   - Gigante: 45.0 - 100.0 kg
3. **Eta' e Energia:** Cani sopra i 10 anni non possono avere energia "molto_alta" (soft warning, non bloccante).
4. **Razza:** Lista di razze riconosciute FCI (Federazione Cinologica Internazionale) + voce "Meticcio" con possibilita' di indicare incroci.

---

## 6. Algoritmo di Matching

### 6.1 Panoramica

L'algoritmo calcola un **punteggio di compatibilita'** (0-100) tra due profili cane. I suggerimenti vengono ordinati per punteggio decrescente e filtrati per distanza massima.

### 6.2 Fattori e Pesi

| Fattore | Peso | Descrizione |
|---------|:----:|-------------|
| Compatibilita' taglia | 25% | Cani di taglia simile sono piu' compatibili |
| Compatibilita' energia | 25% | Livelli di energia simili favoriscono passeggiate piacevoli |
| Comportamento con altri cani | 20% | Cani socievoli matchano meglio |
| Preferenze di passeggiata | 15% | Sovrapposizione orari, durata e terreno |
| Prossimita' geografica | 10% | Cani piu' vicini hanno un bonus |
| Comportamento al guinzaglio | 5% | Cani con buon comportamento al guinzaglio sono preferiti |

### 6.3 Matrice di Compatibilita' Taglia

Punteggio (0.0 - 1.0) per ogni combinazione di taglie:

|  | Toy | Piccola | Media | Grande | Gigante |
|--|:---:|:-------:|:-----:|:------:|:-------:|
| **Toy** | 1.0 | 0.7 | 0.3 | 0.1 | 0.0 |
| **Piccola** | 0.7 | 1.0 | 0.7 | 0.3 | 0.1 |
| **Media** | 0.3 | 0.7 | 1.0 | 0.7 | 0.3 |
| **Grande** | 0.1 | 0.3 | 0.7 | 1.0 | 0.7 |
| **Gigante** | 0.0 | 0.1 | 0.3 | 0.7 | 1.0 |

### 6.4 Matrice di Compatibilita' Energia

|  | Bassa | Media | Alta | Molto Alta |
|--|:-----:|:-----:|:----:|:----------:|
| **Bassa** | 1.0 | 0.6 | 0.2 | 0.0 |
| **Media** | 0.6 | 1.0 | 0.7 | 0.3 |
| **Alta** | 0.2 | 0.7 | 1.0 | 0.8 |
| **Molto Alta** | 0.0 | 0.3 | 0.8 | 1.0 |

### 6.5 Matrice di Compatibilita' Comportamento

|  | Molto Socievole | Socievole | Selettivo | Reattivo |
|--|:---------------:|:---------:|:---------:|:--------:|
| **Molto Socievole** | 1.0 | 0.9 | 0.5 | 0.2 |
| **Socievole** | 0.9 | 1.0 | 0.6 | 0.3 |
| **Selettivo** | 0.5 | 0.6 | 0.7 | 0.2 |
| **Reattivo** | 0.2 | 0.3 | 0.2 | 0.0 |

> **Nota:** Due cani entrambi "reattivo" hanno punteggio 0.0 -- il sistema non proporra' mai questo abbinamento come suggerimento.

### 6.6 Punteggio Preferenze di Passeggiata

```
score_walk = (overlap_orari / max_orari) * 0.4
           + (overlap_terreno / max_terreno) * 0.3
           + (1 - |durata_A - durata_B| / 180) * 0.3
```

Dove:
- `overlap_orari`: numero di fasce orarie in comune
- `max_orari`: numero massimo di fasce orarie tra i due profili
- `overlap_terreno`: numero di terreni in comune
- `max_terreno`: numero massimo di terreni tra i due profili
- `durata_A`, `durata_B`: durata media preferita ((min+max)/2) dei due cani

### 6.7 Funzione di Decadimento Distanza

La distanza influenza il punteggio con una funzione di decadimento esponenziale:

```
score_distanza = e^(-0.15 * distanza_km)
```

| Distanza (km) | Punteggio |
|:--------------:|:---------:|
| 0 | 1.00 |
| 1 | 0.86 |
| 2 | 0.74 |
| 5 | 0.47 |
| 10 | 0.22 |
| 15 | 0.11 |
| 20 | 0.05 |
| 25 | 0.02 |

### 6.8 Calcolo Punteggio Finale

```
score_totale = (score_taglia * 0.25)
             + (score_energia * 0.25)
             + (score_comportamento * 0.20)
             + (score_passeggiata * 0.15)
             + (score_distanza * 0.10)
             + (score_guinzaglio * 0.05)
```

### 6.9 Regole di Filtraggio

Prima del calcolo del punteggio, vengono applicati i seguenti filtri escludenti:

1. **Distanza massima:** Il cane deve essere entro il raggio di ricerca dell'utente.
2. **Cane proprio:** L'utente non vede i propri cani.
3. **Blocchi:** Utenti bloccati/che hanno bloccato non appaiono.
4. **Match esistente:** Cani gia' matchati non riappaiono nel feed di swipe.
5. **Swipe recente "passa":** Cani rifiutati non riappaiono per 30 giorni.
6. **Profilo inattivo:** Solo profili con `is_active = true`.
7. **Foto approvate:** Almeno 1 foto con `moderation_status = approved`.

### 6.10 Ordinamento Finale

I suggerimenti sono ordinati per:

1. Punteggio di compatibilita' (decrescente)
2. Ultima attivita' dell'utente proprietario (favorire utenti attivi)
3. Completezza del profilo (favorire profili completi)

---

## 7. Geolocalizzazione

### 7.1 Requisiti Tecnici

| Requisito | Specifica |
|-----------|-----------|
| Precisione richiesta | < 100 m (GPS, non solo rete) |
| Aggiornamento posizione | Ogni volta che l'app passa in foreground + ogni 15 minuti in foreground |
| Raggio di ricerca | Configurabile: 1-25 km (default 5 km) |
| Calcolo distanza | Formula di Haversine |
| Stale threshold | Posizioni piu' vecchie di 7 giorni non vengono usate per matching attivo |
| Storage posizione | Solo ultima posizione nota, non storico percorsi |

### 7.2 Privacy della Posizione

- La posizione esatta non viene mai mostrata ad altri utenti.
- La distanza mostrata e' arrotondata: "< 1 km", "~2 km", "~5 km", "> 10 km".
- L'utente puo' scegliere di mostrare solo la distanza approssimativa (arrotondata al km superiore).
- La posizione viene offuscata aggiungendo un offset casuale di +/- 200m prima dello storage.

### 7.3 Gestione Permessi

| Scenario | Comportamento App |
|----------|-------------------|
| Permesso concesso (sempre) | Aggiornamento automatico in foreground |
| Permesso concesso (solo in uso) | Aggiornamento solo quando app e' aperta |
| Permesso negato | Funzionalita' di matching disabilitata, messaggio esplicativo con link a impostazioni |
| Permesso "chiedi la prossima volta" | Richiesta al prossimo avvio dell'app |

---

## 8. Chat Sicura

### 8.1 Specifiche Funzionali

| Funzionalita' | Dettaglio |
|----------------|----------|
| Attivazione | Solo dopo match reciproco |
| Tipi di messaggio | Testo (max 2000 caratteri), immagini (JPEG/PNG, max 5 MB) |
| Stato messaggi | Inviato, consegnato, letto |
| Ultimo accesso | Visibile (disattivabile nelle impostazioni privacy) |
| Indicatore digitazione | Si', in tempo reale |
| Cancellazione messaggi | L'utente puo' cancellare i propri messaggi (entro 24h) |
| Segnalazione | Possibile segnalare singoli messaggi o l'intera conversazione |

### 8.2 Sicurezza

- Comunicazione via WebSocket con TLS 1.3.
- I messaggi sono criptati in transito.
- Moderazione automatica: filtro su parole chiave per contenuti inappropriati (telefono, email, link esterni nelle prime 5 interazioni).
- Rate limiting: massimo 30 messaggi al minuto per utente.
- Allegati immagine: scansione automatica per contenuti espliciti prima della consegna.

### 8.3 Struttura Dati Chat

| Campo | Tipo | Note |
|-------|------|------|
| `id` | UUID | PK |
| `match_id` | UUID | FK -> matches.id |
| `sender_id` | UUID | FK -> users.id |
| `content` | TEXT (encrypted) | Testo del messaggio |
| `media_url` | VARCHAR(500) | URL immagine allegata (opzionale) |
| `status` | ENUM | `sent`, `delivered`, `read` |
| `is_deleted` | BOOLEAN | Cancellato dal mittente |
| `created_at` | TIMESTAMP | -- |

---

## 9. Flusso di Onboarding

### 9.1 Sequenza Schermate

```
[Splash] -> [Welcome] -> [Registrazione] -> [Profilo Proprietario]
   -> [Profilo Cane 1/4] -> [Profilo Cane 2/4] -> [Profilo Cane 3/4]
   -> [Profilo Cane 4/4] -> [Permessi] -> [Tutorial] -> [Feed Swipe]
```

### 9.2 Dettaglio Schermate

#### Schermata 1: Welcome (3 slide)

- **Slide 1:** "Trova il compagno di passeggiata perfetto per il tuo cane" + illustrazione
- **Slide 2:** "Matching intelligente basato su compatibilita'" + illustrazione
- **Slide 3:** "Chat sicura per organizzare le passeggiate" + illustrazione
- **CTA:** "Inizia" / "Hai gia' un account? Accedi"

#### Schermata 2: Registrazione

- Opzioni: Email, Google, Apple Sign-In
- Se email: campi email + password + conferma password
- Checkbox: accettazione T&C e Privacy Policy (obbligatorio)
- Checkbox: consenso comunicazioni marketing (opzionale)

#### Schermata 3: Profilo Proprietario

- Nome visualizzato (obbligatorio)
- Foto profilo (opzionale, con opzione "scatta" o "scegli dalla galleria")

#### Schermata 4: Profilo Cane -- Informazioni Base (step 1/4)

- Nome del cane
- Data di nascita (date picker, formato GG/MM/AAAA)
- Sesso (maschio/femmina)
- Sterilizzato/castrato (si'/no)

#### Schermata 5: Profilo Cane -- Fisico (step 2/4)

- Razza (campo di ricerca con autocompletamento dalla lista FCI + "Meticcio")
- Eventuale seconda razza
- Taglia (selettore con icone: toy/piccola/media/grande/gigante)
- Peso (slider o input numerico, kg)

#### Schermata 6: Profilo Cane -- Comportamento (step 3/4)

- Livello di energia (selettore con descrizioni: bassa/media/alta/molto alta)
- Comportamento con altri cani (con descrizioni per ogni livello)
- Comportamento con persone (con descrizioni per ogni livello)
- Comportamento al guinzaglio (con descrizioni per ogni livello)
- Bio (campo di testo libero, opzionale, max 500 caratteri)

#### Schermata 7: Profilo Cane -- Foto e Preferenze (step 4/4)

- Upload foto (min 1, max 6, con indicazione della foto principale)
- Orari preferiti di passeggiata (multi-selezione)
- Durata preferita (range slider: min-max)
- Tipo di percorso preferito (multi-selezione con icone)

#### Schermata 8: Permessi

- Richiesta permesso geolocalizzazione con spiegazione: "Per mostrarti cani nelle vicinanze, abbiamo bisogno della tua posizione"
- Richiesta permesso notifiche push con spiegazione: "Per avvisarti di nuovi match e messaggi"

#### Schermata 9: Tutorial Rapido (opzionale, skippabile)

- Overlay su feed swipe: "Scorri a destra se sei interessato, a sinistra per passare"
- Indicazione gesto: "Tocca la card per vedere il profilo completo"

### 9.3 Metriche Onboarding

| Step | Target Completamento |
|------|:--------------------:|
| Welcome -> Registrazione | >= 70% |
| Registrazione -> Profilo proprietario | >= 90% |
| Profilo proprietario -> Profilo cane (step 1) | >= 95% |
| Profilo cane (step 1) -> (step 4) | >= 80% |
| Profilo cane -> Permessi | >= 85% |
| Permessi -> Feed swipe | >= 75% |
| **Completamento totale onboarding** | **>= 40%** |

---

## 10. Strategia Notifiche Push

### 10.1 Tipi di Notifica

| Tipo | Trigger | Priorita' | Testo Esempio | Frequenza Max |
|------|---------|:---------:|---------------|:-------------:|
| Nuovo match | Match reciproco confermato | Alta | "Hai un nuovo match! [NomeCane] vuole passeggiare con [TuoCane]!" | Illimitata |
| Nuovo messaggio | Messaggio ricevuto in chat (app in background) | Alta | "[NomeProprietario]: [Anteprima messaggio...]" | Max 10/ora per conversazione |
| Cani nelle vicinanze | Nuovi profili nel raggio di ricerca | Media | "3 nuovi cani nel tuo quartiere! Scopri se sono compatibili." | Max 1/giorno |
| Profilo incompleto | Profilo cane senza foto o campi mancanti | Bassa | "Completa il profilo di [NomeCane] per ricevere piu' match!" | Max 1 in 3 giorni |
| Inattivita' | Utente non apre l'app da 3+ giorni | Bassa | "[NomeCane] ha nuovi potenziali amici! Torna a scoprirli." | Giorno 3, 7, 14, 30 poi stop |
| Match in scadenza | Match senza messaggi da 48h | Media | "Non hai ancora scritto a [NomeProprietario]! Il match scade tra 24h." | 1 sola volta |

### 10.2 Regole di Opt-in

- Le notifiche push richiedono consenso esplicito del sistema operativo.
- All'interno dell'app, l'utente puo' configurare granularmente:
  - Notifiche match: on/off (default: on)
  - Notifiche messaggi: on/off (default: on)
  - Notifiche promozionali/suggerimenti: on/off (default: on)
- Orario silenzioso: nessuna notifica push tra le 22:00 e le 08:00 (configurabile).
- Rispetto delle "Quiet Hours" del dispositivo.

### 10.3 Regole Anti-Spam

- Massimo 5 notifiche push al giorno per utente (escluse notifiche messaggi chat).
- Raggruppamento (bundling) se piu' notifiche dello stesso tipo in 5 minuti.
- Se l'utente ignora 5 notifiche consecutive dello stesso tipo, ridurre la frequenza del 50%.
- Se l'utente disinstalla e reinstalla, rispettare le preferenze precedenti.

---

## 11. Privacy, Sicurezza e GDPR

### 11.1 Conformita' GDPR

| Requisito | Implementazione |
|-----------|----------------|
| **Base legale** | Consenso esplicito per il trattamento dati. Legittimo interesse per funzionamento del servizio. |
| **Informativa privacy** | Disponibile in-app e sul sito web. Linguaggio chiaro e comprensibile. |
| **Consenso granulare** | Checkbox separate per: (1) T&C, (2) Privacy Policy, (3) Marketing, (4) Analisi comportamentale. |
| **Diritto di accesso** | Export dei dati in formato JSON entro 30 giorni dalla richiesta. |
| **Diritto di cancellazione** | Eliminazione account e tutti i dati associati entro 30 giorni. Funzione self-service in-app. |
| **Diritto di portabilita'** | Dati esportabili in formato JSON strutturato. |
| **Diritto di rettifica** | Modifica dati possibile in qualsiasi momento dall'app. |
| **Data retention** | Dati account: fino a cancellazione. Log attivita': 12 mesi. Messaggi chat: 6 mesi dopo eliminazione match. Dati di analytics: 24 mesi, poi anonimizzati. |
| **DPO** | Nominato un Data Protection Officer raggiungibile via dpo@dogwalk.app. |
| **Registro trattamenti** | Documentato e aggiornato. |

### 11.2 Moderazione Contenuti

| Meccanismo | Dettaglio |
|------------|----------|
| **Moderazione foto** | Scansione automatica tramite servizio di content moderation (es. AWS Rekognition). Rejection automatica per contenuti espliciti, violenti o non pertinenti (no cani nell'immagine). |
| **Moderazione chat** | Filtro parole chiave per insulti, minacce, contenuto sessuale. Alert automatico al team di moderazione per messaggi flaggati. |
| **Segnalazioni utente** | Sistema di segnalazione con categorie predefinite. Revisione entro 24h lavorative. |
| **Politica di ban** | Warning al primo report verificato. Sospensione temporanea (7gg) al secondo. Ban permanente al terzo. Ban immediato per contenuti illegali. |

### 11.3 Sicurezza Tecnica

| Area | Misura |
|------|--------|
| Autenticazione | OAuth 2.0 + JWT con refresh token. Token di accesso: scadenza 1 ora. Refresh token: scadenza 30 giorni. |
| Password | Hashing con bcrypt (cost factor 12). |
| Comunicazioni | HTTPS obbligatorio (TLS 1.3). Certificate pinning su app mobile. |
| API | Rate limiting per endpoint. Input validation su tutti i campi. Protezione CSRF. |
| Storage | Encryption at rest per database. Encryption at rest per file storage. |
| Logging | Audit log per azioni sensibili (login, cambio password, eliminazione account). No log di contenuti chat. |

### 11.4 Reporting e Blocco

- **Segnalazione profilo:** Categorie: profilo falso, foto inappropriate, informazioni fuorvianti, comportamento sospetto.
- **Segnalazione in chat:** Categorie: molestia, spam, contenuto esplicito, minacce, altro.
- **Blocco utente:** Immediato e bilaterale. L'utente bloccato non puo' vedere il profilo, inviare messaggi o apparire nei suggerimenti.
- **Unmatch:** L'utente puo' annullare un match in qualsiasi momento. La chat viene archiviata e resa inaccessibile.

---

## 12. Requisiti Non Funzionali

### 12.1 Performance

| Metrica | Target |
|---------|--------|
| Tempo di caricamento app (cold start) | < 3 secondi |
| Tempo di caricamento feed swipe | < 1 secondo (dopo il primo caricamento) |
| Tempo di risposta API (p95) | < 500 ms |
| Tempo di risposta API (p99) | < 1500 ms |
| Tempo di consegna messaggio chat | < 2 secondi |
| Tempo di calcolo matching batch | < 30 secondi per 10.000 profili |
| Tempo caricamento foto | < 5 secondi per foto da 5 MB |

### 12.2 Scalabilita'

| Parametro | Target MVP | Target 12 Mesi |
|-----------|:----------:|:--------------:|
| Utenti registrati | 10.000 | 100.000 |
| Utenti concorrenti | 500 | 5.000 |
| Profili cane | 12.000 | 150.000 |
| Messaggi chat/giorno | 50.000 | 500.000 |
| Calcoli matching/giorno | 100.000 | 2.000.000 |

### 12.3 Disponibilita' e Affidabilita'

| Requisito | Target |
|-----------|--------|
| Uptime | 99.5% (esclusa manutenzione programmata) |
| Manutenzione programmata | Max 2h/settimana, tra le 03:00 e le 06:00 CET |
| RTO (Recovery Time Objective) | < 4 ore |
| RPO (Recovery Point Objective) | < 1 ora |
| Backup database | Giornaliero, retention 30 giorni |

### 12.4 Compatibilita'

| Piattaforma | Versione Minima |
|-------------|:--------------:|
| iOS | 15.0+ |
| Android | API 26 (Android 8.0)+ |
| Dimensione app | < 50 MB (download iniziale) |

### 12.5 Accessibilita'

- Supporto VoiceOver (iOS) e TalkBack (Android).
- Contrasto minimo WCAG 2.1 AA (4.5:1 per testo, 3:1 per elementi UI).
- Dimensione minima target touch: 44x44 pt.
- Supporto Dynamic Type / font scalabili.

---

## 13. Matrice di Prioritizzazione

### 13.1 Impatto vs Sforzo

Scala impatto: 1 (basso) - 5 (alto). Scala sforzo: 1 (basso) - 5 (alto).

| Feature | Impatto | Sforzo | Priorita' | Sprint |
|---------|:-------:|:------:|:---------:|:------:|
| Registrazione (email + social) | 5 | 3 | **MUST** | 1 |
| Profilo cane (creazione) | 5 | 3 | **MUST** | 1 |
| Upload e moderazione foto | 4 | 3 | **MUST** | 1-2 |
| Geolocalizzazione | 5 | 3 | **MUST** | 2 |
| Algoritmo di matching | 5 | 4 | **MUST** | 2-3 |
| Feed swipe | 5 | 3 | **MUST** | 3 |
| Notifica match reciproco | 4 | 2 | **MUST** | 3 |
| Chat (testo) | 5 | 4 | **MUST** | 3-4 |
| Segnalazione / blocco | 4 | 2 | **MUST** | 4 |
| Preferenze di passeggiata | 3 | 2 | **SHOULD** | 4 |
| Profilo espanso (dettaglio) | 3 | 2 | **SHOULD** | 4 |
| Impostazioni privacy | 3 | 2 | **SHOULD** | 5 |
| Modifica profilo | 3 | 1 | **SHOULD** | 5 |
| Chat (immagini) | 2 | 2 | **SHOULD** | 5 |
| Multi-cane per account | 2 | 3 | **COULD** | 6 |
| Suggerimenti personalizzati | 3 | 4 | **COULD** | 6 |
| Visualizzazione mappa | 3 | 3 | **COULD** | 6 |

### 13.2 Piano Sprint (2 settimane/sprint)

| Sprint | Focus | Deliverable |
|:------:|-------|-------------|
| 1 | Fondamenta | Auth, profilo cane, upload foto |
| 2 | Localizzazione | Geolocalizzazione, aggiornamento posizione, raggio di ricerca |
| 3 | Core Loop | Algoritmo matching, feed swipe, notifica match |
| 4 | Comunicazione | Chat testo, segnalazione, blocco, preferenze passeggiata |
| 5 | Rifinitura | Privacy settings, modifica profilo, chat immagini, onboarding tutorial |
| 6 | Nice-to-have | Multi-cane, mappa, suggerimenti personalizzati |

---

## 14. Casi Limite e Gestione Errori

### 14.1 Profilo e Registrazione

| Caso | Comportamento Atteso |
|------|---------------------|
| Email gia' registrata | Messaggio: "Questa email e' gia' associata a un account. Vuoi accedere?" |
| Upload foto non valida (formato) | Messaggio: "Formato non supportato. Carica un'immagine JPEG, PNG o HEIC." |
| Upload foto troppo grande | Compressione automatica lato client. Se ancora > 10 MB, messaggio di errore. |
| Upload foto senza cane rilevato | Warning: "Non abbiamo rilevato un cane in questa foto. Vuoi caricarla comunque?" (soft block, non bloccante). |
| Foto rifiutata dalla moderazione | Notifica all'utente con motivo. Possibilita' di caricare una foto sostitutiva. Se l'unica foto viene rifiutata, il profilo diventa invisibile. |
| Peso incoerente con taglia | Warning visivo ma non bloccante: "Il peso inserito sembra insolito per questa taglia." |

### 14.2 Matching e Swipe

| Caso | Comportamento Atteso |
|------|---------------------|
| Nessun cane nel raggio | Messaggio: "Non ci sono cani nelle vicinanze. Prova ad aumentare il raggio di ricerca." CTA per modificare il raggio. |
| Tutti i cani gia' valutati | Messaggio: "Hai visto tutti i cani nella tua zona! Torna domani per nuovi suggerimenti." |
| Utente fa swipe troppo veloce (> 1 swipe/sec) | Rate limiting: rallentare l'animazione per forzare una pausa. Dopo 100 swipe in 10 minuti, messaggio "Prenditi un momento!" |
| Match con utente che poi elimina il profilo | Il match viene rimosso dalla lista. La chat diventa inaccessibile. Messaggio: "Questo utente non e' piu' disponibile." |

### 14.3 Geolocalizzazione

| Caso | Comportamento Atteso |
|------|---------------------|
| GPS non disponibile | Usare ultima posizione nota (se < 7 giorni). Altrimenti, messaggio di richiesta attivazione GPS. |
| Posizione molto imprecisa (> 500m) | Messaggio: "La tua posizione potrebbe non essere precisa. Le distanze mostrate sono approssimative." |
| Utente si sposta in un'altra citta' | Aggiornamento automatico della posizione. I match nella citta' precedente restano attivi. |
| Posizione in area senza utenti (es. mare, montagna isolata) | Messaggio: "Non ci sono utenti DogWalk nella tua zona attuale." Nessun suggerimento proposto. |

### 14.4 Chat

| Caso | Comportamento Atteso |
|------|---------------------|
| Messaggio non consegnato (errore rete) | Indicatore "non inviato" con opzione "riprova". Retry automatico al ripristino della connessione. |
| Utente bloccato durante una chat | La chat scompare per entrambi. Il bloccato non riceve notifica del blocco. |
| Messaggio con contenuto flaggato | Consegnato ma segnalato internamente per review. Se contiene link/email nelle prime 5 interazioni: messaggio trattenuto con avviso. |
| Utente invia > 30 messaggi/minuto | Rate limiting: messaggio "Stai inviando messaggi troppo velocemente. Attendi qualche secondo." |

### 14.5 Rete e Connettivita'

| Caso | Comportamento Atteso |
|------|---------------------|
| Perdita di connessione durante swipe | Lo swipe viene salvato localmente e sincronizzato al ripristino della connessione. |
| Perdita di connessione durante onboarding | I dati inseriti vengono salvati in locale. Al ripristino, ripresa dall'ultimo step completato. |
| App in background per lungo tempo | Al ritorno in foreground: refresh silenzioso dei dati. Se token scaduto: refresh token automatico. |
| Sessione scaduta | Redirect alla schermata di login con messaggio: "La tua sessione e' scaduta. Accedi di nuovo." |

---

## 15. Analytics e Tracking

### 15.1 Eventi di Registrazione e Onboarding

| Evento | Proprieta' | Scopo |
|--------|-----------|-------|
| `onboarding_started` | `source` (organic, referral, ad) | Misurare inizio funnel |
| `onboarding_step_completed` | `step_number`, `step_name`, `duration_seconds` | Identificare drop-off |
| `onboarding_step_skipped` | `step_number`, `step_name` | Capire quali step vengono saltati |
| `onboarding_completed` | `total_duration_seconds`, `auth_method` | Misurare conversione totale |
| `registration_completed` | `auth_method` (email, google, apple) | Popolarita' metodi auth |
| `registration_failed` | `auth_method`, `error_type` | Diagnostica problemi |

### 15.2 Eventi Profilo

| Evento | Proprieta' | Scopo |
|--------|-----------|-------|
| `dog_profile_created` | `breed`, `size`, `energy_level`, `has_photo` | Demografica cani |
| `dog_profile_updated` | `fields_changed[]` | Campi piu' modificati |
| `dog_photo_uploaded` | `photo_position`, `file_size_kb` | Utilizzo foto |
| `dog_photo_moderation_result` | `result` (approved, rejected), `rejection_reason` | Efficacia moderazione |

### 15.3 Eventi Matching e Swipe

| Evento | Proprieta' | Scopo |
|--------|-----------|-------|
| `swipe_performed` | `direction` (right, left), `compatibility_score`, `distance_km`, `time_on_card_seconds` | Comportamento swipe |
| `match_created` | `compatibility_score`, `distance_km`, `size_pair`, `energy_pair` | Qualita' match |
| `match_unmatched` | `reason` (manual, block, account_deleted), `match_age_hours` | Salute dei match |
| `feed_exhausted` | `total_swipes_session`, `search_radius_km` | Disponibilita' contenuti |
| `feed_loaded` | `cards_available`, `avg_compatibility_score` | Qualita' feed |

### 15.4 Eventi Chat

| Evento | Proprieta' | Scopo |
|--------|-----------|-------|
| `chat_opened` | `match_id`, `match_age_hours` | Attivazione chat |
| `message_sent` | `message_type` (text, image), `chat_age_hours`, `message_count_in_chat` | Engagement chat |
| `chat_inactive_48h` | `match_id`, `total_messages` | Match non attivati |

### 15.5 Eventi Sicurezza

| Evento | Proprieta' | Scopo |
|--------|-----------|-------|
| `user_reported` | `report_category`, `reported_user_age_days` | Sicurezza community |
| `user_blocked` | `block_source` (profile, chat), `interaction_count` | Pattern di blocco |
| `content_flagged` | `content_type` (photo, message), `flag_reason` | Efficacia moderazione |

### 15.6 Eventi Tecnici

| Evento | Proprieta' | Scopo |
|--------|-----------|-------|
| `app_opened` | `time_since_last_open_hours`, `notification_driven` (bool) | Retention e engagement |
| `app_crashed` | `screen`, `os_version`, `app_version` | Stabilita' |
| `api_error` | `endpoint`, `status_code`, `response_time_ms` | Salute API |
| `location_permission_changed` | `new_status` (granted, denied, restricted) | Impatto su funzionalita' |
| `push_permission_changed` | `new_status` (granted, denied) | Copertura notifiche |

### 15.7 KPI Dashboard

| KPI | Formula | Target |
|-----|---------|--------|
| Tasso di conversione onboarding | Onboarding completati / Onboarding iniziati | >= 40% |
| Swipe-to-match rate | Match creati / Swipe destro effettuati | >= 10% |
| Match-to-chat rate | Chat con almeno 1 messaggio / Match creati | >= 60% |
| Chat-to-walk rate | Chat con messaggio di organizzazione / Chat attive | >= 25% |
| DAU/MAU ratio | Utenti attivi giornalieri / Utenti attivi mensili | >= 30% |
| Tasso di segnalazione | Segnalazioni / Utenti attivi mensili | < 2% |
| Tasso di blocco | Blocchi / Match creati | < 5% |

---

## 16. Roadmap Post-MVP

### Fase 2 -- Consolidamento (mesi 4-6)

- Filtri avanzati (razza, eta', sterilizzazione)
- Calendario condiviso per programmare passeggiate
- Notifiche push avanzate (promemoria passeggiata)
- Badge di socievolezza (basati su feedback post-passeggiata)
- Multi-cane per account (se non implementato nello sprint 6)

### Fase 3 -- Social (mesi 7-9)

- Feed foto/video delle passeggiate
- Commenti e reazioni
- Profilo pubblico condivisibile
- Gamification: punti, livelli, classifiche locali
- Eventi di gruppo (DogWalk Meetup)

### Fase 4 -- Ecosistema (mesi 10-12)

- Integrazione fitness (Apple Health, Google Fit)
- AI per matching predittivo basato su dati storici
- Marketplace: dog sitter, veterinari, negozi
- API per partner (parchi canini, associazioni)
- Programma ambassador

---

*Documento redatto secondo le best practice di product management. Soggetto a revisione iterativa basata su feedback utenti e dati di utilizzo.*
