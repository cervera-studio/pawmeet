import AccordionClient from './AccordionClient';

export default function PrivacyAccordionClient() {
  const sections = [
    {
      id: '1',
      title: '1. Titolare del trattamento',
      children: (
        <>
          <p>Il titolare del trattamento dei dati personali è:</p>
          <ul className="list-none pl-0 space-y-1 mt-3">
            <li><strong>PawMeet S.r.l.</strong></li>
            <li>Sede legale: Via Roma 1, 20121 Milano (MI), Italia</li>
            <li>P.IVA: 12345678901</li>
            <li>Email: <a href="mailto:privacy@pawmeet.io" className="text-primary underline">privacy@pawmeet.io</a></li>
            <li>PEC: <a href="mailto:pawmeet@pec.it" className="text-primary underline">pawmeet@pec.it</a></li>
          </ul>
          <p className="mt-3">
            Il Titolare non ha al momento nominato un Responsabile della Protezione dei Dati (DPO)
            ai sensi dell'art. 37 del GDPR, non ricorrendo i presupposti obbligatori previsti dalla
            normativa. Per qualsiasi questione relativa al trattamento dei dati personali, puoi
            contattarci agli indirizzi sopra indicati.
          </p>
        </>
      ),
    },
    {
      id: '2',
      title: '2. Dati personali raccolti',
      children: (
        <>
          <p>
            Il Servizio raccoglie le seguenti categorie di dati personali, in funzione delle
            interazioni dell'utente con l'applicazione:
          </p>

          <h4 className="font-semibold text-neutral-900 mt-4 mb-2">2.1 Dati forniti direttamente dall'utente</h4>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Dati di registrazione:</strong> indirizzo email, password (hash bcrypt), nome visualizzato.</li>
            <li><strong>Foto profilo</strong> (facoltativa): conservata su Cloudflare R2.</li>
            <li><strong>Profili dei cani:</strong> nome, razza, taglia, livello energetico, tratti comportamentali e preferenze di passeggiata.</li>
            <li><strong>Messaggi di chat:</strong> contenuti testuali scambiati tra utenti via WebSocket.</li>
          </ul>

          <h4 className="font-semibold text-neutral-900 mt-4 mb-2">2.2 Dati raccolti automaticamente</h4>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Dati di geolocalizzazione:</strong> coordinate GPS per calcolare la prossimità con altri utenti.</li>
            <li><strong>Token di notifica push:</strong> identificativo tecnico per Expo Push Notifications.</li>
            <li><strong>Dati tecnici:</strong> indirizzo IP, tipo di dispositivo e user agent.</li>
            <li><strong>Dati di diagnostica:</strong> report di errori (Sentry) con scrubbing automatico dei dati personali.</li>
          </ul>

          <h4 className="font-semibold text-neutral-900 mt-4 mb-2">2.3 Dati non raccolti</h4>
          <p>
            Il Servizio <strong>non raccoglie</strong> dati relativi alla salute, dati biometrici,
            opinioni politiche, convinzioni religiose, orientamento sessuale o altre categorie
            particolari di dati personali di cui all'art. 9 del GDPR.
          </p>
        </>
      ),
    },
    {
      id: '3',
      title: '3. Finalità e base giuridica del trattamento',
      children: (
        <>
          <p className="mb-3">
            Ai sensi dell'art. 6 del GDPR, i dati personali sono trattati per le seguenti finalità:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-neutral-300">
                  <th className="text-left py-2 pr-4 font-semibold">Finalità</th>
                  <th className="text-left py-2 pr-4 font-semibold">Dati trattati</th>
                  <th className="text-left py-2 font-semibold">Base giuridica</th>
                </tr>
              </thead>
              <tbody className="text-[13px]">
                <tr className="border-b border-neutral-200"><td className="py-2 pr-4">Registrazione e gestione account</td><td className="py-2 pr-4">Email, password (hash), display name, foto</td><td className="py-2">Art. 6(1)(b) — Esecuzione contratto</td></tr>
                <tr className="border-b border-neutral-200"><td className="py-2 pr-4">Matching tra proprietari</td><td className="py-2 pr-4">Profili cani</td><td className="py-2">Art. 6(1)(b) — Esecuzione contratto</td></tr>
                <tr className="border-b border-neutral-200"><td className="py-2 pr-4">Messaggistica in tempo reale</td><td className="py-2 pr-4">Messaggi di chat</td><td className="py-2">Art. 6(1)(b) — Esecuzione contratto</td></tr>
                <tr className="border-b border-neutral-200"><td className="py-2 pr-4">Geolocalizzazione</td><td className="py-2 pr-4">Coordinate GPS</td><td className="py-2">Art. 6(1)(a) — Consenso</td></tr>
                <tr className="border-b border-neutral-200"><td className="py-2 pr-4">Notifiche push</td><td className="py-2 pr-4">Token push dispositivo</td><td className="py-2">Art. 6(1)(a) — Consenso</td></tr>
                <tr className="border-b border-neutral-200"><td className="py-2 pr-4">Email transazionali</td><td className="py-2 pr-4">Indirizzo email</td><td className="py-2">Art. 6(1)(b) — Esecuzione contratto</td></tr>
                <tr className="border-b border-neutral-200"><td className="py-2 pr-4">Monitoraggio errori (Sentry)</td><td className="py-2 pr-4">Report con scrubbing</td><td className="py-2">Art. 6(1)(a) — Consenso</td></tr>
                <tr className="border-b border-neutral-200"><td className="py-2 pr-4">Test A/B (Statsig)</td><td className="py-2 pr-4">ID pseudonimizzato</td><td className="py-2">Art. 6(1)(a) — Consenso</td></tr>
                <tr className="border-b border-neutral-200"><td className="py-2 pr-4">Analytics anonime</td><td className="py-2 pr-4">Dati aggregati</td><td className="py-2">Art. 6(1)(a) — Consenso</td></tr>
                <tr className="border-b border-neutral-200"><td className="py-2 pr-4">Marketing</td><td className="py-2 pr-4">Indirizzo email</td><td className="py-2">Art. 6(1)(a) — Consenso</td></tr>
                <tr className="border-b border-neutral-200"><td className="py-2 pr-4">Sicurezza e prevenzione abusi</td><td className="py-2 pr-4">IP, dati sessione</td><td className="py-2">Art. 6(1)(f) — Legittimo interesse</td></tr>
                <tr><td className="py-2 pr-4">Obblighi di legge</td><td className="py-2 pr-4">Dati caso per caso</td><td className="py-2">Art. 6(1)(c) — Obbligo legale</td></tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[13px]">
            <strong>Nota sul legittimo interesse:</strong> il Titolare ha effettuato un bilanciamento
            tra il proprio legittimo interesse e i diritti degli interessati. Hai il diritto di opporti
            ai sensi dell'art. 21 del GDPR (vedi sezione 8).
          </p>
        </>
      ),
    },
    {
      id: '4',
      title: '4. Modalità di trattamento',
      children: (
        <>
          <p>
            I dati personali sono trattati con strumenti elettronici e automatizzati, nel rispetto dei
            principi di cui all'art. 5 del GDPR. Misure di sicurezza adottate:
          </p>
          <ul className="list-disc pl-6 space-y-1 mt-3">
            <li><strong>Crittografia password</strong> tramite bcrypt con salt (OWASP).</li>
            <li><strong>Token di autenticazione</strong> con firma crittografica e rotazione.</li>
            <li><strong>TLS/HTTPS</strong> per tutte le trasmissioni.</li>
            <li><strong>Rate limiting</strong> contro attacchi brute-force.</li>
            <li><strong>Sanitizzazione input</strong> contro XSS e SQL injection.</li>
            <li><strong>Scrubbing automatico</strong> dei dati personali nei report Sentry.</li>
            <li><strong>Pseudonimizzazione</strong> dell'ID utente in Statsig.</li>
          </ul>
        </>
      ),
    },
    {
      id: '5',
      title: '5. Destinatari dei dati',
      children: (
        <>
          <h4 className="font-semibold text-neutral-900 mb-2">5.1 Altri utenti del Servizio</h4>
          <p>
            Nome visualizzato, foto profilo e profili cani sono visibili agli altri utenti.
            Email, posizione GPS esatta e dati identificativi non sono mai condivisi.
          </p>
          <h4 className="font-semibold text-neutral-900 mt-4 mb-2">5.2 Fornitori di servizi</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px] border-collapse">
              <thead>
                <tr className="border-b border-neutral-300">
                  <th className="text-left py-1.5 pr-3 font-semibold">Fornitore</th>
                  <th className="text-left py-1.5 pr-3 font-semibold">Servizio</th>
                  <th className="text-left py-1.5 pr-3 font-semibold">Ubicazione</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-neutral-200"><td className="py-1.5 pr-3">Neon</td><td className="py-1.5 pr-3">Database PostgreSQL + PostGIS</td><td className="py-1.5">Francoforte (UE)</td></tr>
                <tr className="border-b border-neutral-200"><td className="py-1.5 pr-3">Fly.io</td><td className="py-1.5 pr-3">Hosting API</td><td className="py-1.5">Francoforte (UE)</td></tr>
                <tr className="border-b border-neutral-200"><td className="py-1.5 pr-3">Cloudflare</td><td className="py-1.5 pr-3">Storage (R2) + Hosting web (Pages)</td><td className="py-1.5">UE</td></tr>
                <tr className="border-b border-neutral-200"><td className="py-1.5 pr-3">Upstash</td><td className="py-1.5 pr-3">Rate limiting + cache (Redis)</td><td className="py-1.5">UE</td></tr>
                <tr className="border-b border-neutral-200"><td className="py-1.5 pr-3">Resend</td><td className="py-1.5 pr-3">Email transazionali</td><td className="py-1.5">USA (con SCC)</td></tr>
                <tr className="border-b border-neutral-200"><td className="py-1.5 pr-3">Sentry</td><td className="py-1.5 pr-3">Monitoraggio errori</td><td className="py-1.5">USA (con SCC)</td></tr>
                <tr className="border-b border-neutral-200"><td className="py-1.5 pr-3">Statsig</td><td className="py-1.5 pr-3">Feature flags + test A/B</td><td className="py-1.5">USA (con SCC)</td></tr>
                <tr><td className="py-1.5 pr-3">Expo</td><td className="py-1.5 pr-3">Notifiche push</td><td className="py-1.5">USA (con SCC)</td></tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[13px]">
            Elenco aggiornato disponibile su richiesta a{' '}
            <a href="mailto:privacy@pawmeet.io" className="text-primary underline">privacy@pawmeet.io</a>.
          </p>
        </>
      ),
    },
    {
      id: '6',
      title: '6. Trasferimento dati extra-UE',
      children: (
        <>
          <p>
            I dati sono conservati principalmente nell'UE (Francoforte). Per fornitori con sede negli USA,
            il Titolare si avvale di:
          </p>
          <ul className="list-disc pl-6 space-y-1 mt-3">
            <li><strong>Decisione di adeguatezza</strong> (EU-U.S. Data Privacy Framework) ai sensi dell'art. 45 GDPR.</li>
            <li><strong>Clausole Contrattuali Standard (SCC)</strong> ai sensi dell'art. 46(2)(c) GDPR.</li>
          </ul>
          <p className="mt-3 text-[13px]">
            Copia delle SCC disponibile su richiesta a{' '}
            <a href="mailto:privacy@pawmeet.io" className="text-primary underline">privacy@pawmeet.io</a>.
          </p>
        </>
      ),
    },
    {
      id: '7',
      title: '7. Periodo di conservazione dei dati',
      children: (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-neutral-300">
                <th className="text-left py-2 pr-4 font-semibold">Categoria</th>
                <th className="text-left py-2 font-semibold">Conservazione</th>
              </tr>
            </thead>
            <tbody className="text-[13px]">
              <tr className="border-b border-neutral-200"><td className="py-2 pr-4">Dati account</td><td className="py-2">Durata account attivo. Cancellazione entro 30 gg dalla richiesta.</td></tr>
              <tr className="border-b border-neutral-200"><td className="py-2 pr-4">Messaggi di chat</td><td className="py-2">Durata account attivo. Eliminati con cancellazione account.</td></tr>
              <tr className="border-b border-neutral-200"><td className="py-2 pr-4">Geolocalizzazione</td><td className="py-2">Ultimo aggiornamento fino a cancellazione. Auto-eliminata dopo 90 gg di inattività.</td></tr>
              <tr className="border-b border-neutral-200"><td className="py-2 pr-4">Token di refresh/verifica</td><td className="py-2">Eliminati alla scadenza o revoca.</td></tr>
              <tr className="border-b border-neutral-200"><td className="py-2 pr-4">Cache (Upstash Redis)</td><td className="py-2">Temporanei, eliminati alla scadenza TTL.</td></tr>
              <tr className="border-b border-neutral-200"><td className="py-2 pr-4">Report errori (Sentry)</td><td className="py-2">Retention Sentry (~90 gg).</td></tr>
              <tr><td className="py-2 pr-4">Obblighi legali</td><td className="py-2">Periodo previsto dalla normativa (es. 10 anni per obblighi fiscali).</td></tr>
            </tbody>
          </table>
        </div>
      ),
    },
    {
      id: '8',
      title: '8. Diritti dell\'interessato',
      children: (
        <>
          <p className="mb-3">
            Ai sensi degli artt. 15-22 del GDPR, hai diritto a:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Accesso (art. 15):</strong> ottenere conferma e accesso ai tuoi dati.</li>
            <li><strong>Rettifica (art. 16):</strong> correggere dati inesatti o incompleti.</li>
            <li><strong>Cancellazione (art. 17):</strong> diritto all'oblio. Puoi eliminare l'account dall'app.</li>
            <li><strong>Limitazione (art. 18):</strong> limitare il trattamento nei casi previsti.</li>
            <li><strong>Portabilità (art. 20):</strong> ricevere i tuoi dati in formato strutturato.</li>
            <li><strong>Opposizione (art. 21):</strong> opporti al trattamento basato su legittimo interesse.</li>
            <li><strong>Revoca consenso (art. 7):</strong> revocare il consenso in qualsiasi momento.</li>
            <li><strong>Decisioni automatizzate (art. 22):</strong> il matching fornisce solo suggerimenti non vincolanti.</li>
          </ul>
          <p className="mt-4">
            <strong>Come esercitare i tuoi diritti:</strong> scrivi a{' '}
            <a href="mailto:privacy@pawmeet.io" className="text-primary underline">privacy@pawmeet.io</a>{' '}
            o via PEC a <a href="mailto:pawmeet@pec.it" className="text-primary underline">pawmeet@pec.it</a>.
            Riscontro entro un mese (prorogabile di due mesi per complessità).
          </p>
          <p className="mt-3">
            <strong>Diritto di reclamo:</strong> Garante per la protezione dei dati personali,
            Piazza Venezia 11, 00187 Roma —{' '}
            <a href="mailto:protocollo@gpdp.it" className="text-primary underline">protocollo@gpdp.it</a>
          </p>
        </>
      ),
    },
    {
      id: '9',
      title: '9. Cookie e tecnologie di tracciamento',
      children: (
        <p>
          L'app mobile non utilizza cookie. Il sito web utilizza esclusivamente cookie tecnici
          strettamente necessari (esenzione dal consenso ai sensi dell'art. 122 D.Lgs. 196/2003).
          Dettagli nella nostra <a href="/cookie" className="text-primary underline">Cookie Policy</a>.
        </p>
      ),
    },
    {
      id: '10',
      title: '10. Gestione del consenso',
      children: (
        <>
          <p>Al primo utilizzo dell'app, puoi esprimere le tue preferenze su:</p>
          <ul className="list-disc pl-6 space-y-1 mt-3">
            <li><strong>Analytics:</strong> dati di utilizzo aggregati e anonimizzati.</li>
            <li><strong>Test A/B:</strong> sperimentazione funzionalità (Statsig, ID pseudonimizzato).</li>
            <li><strong>Monitoraggio errori:</strong> report Sentry con scrubbing automatico.</li>
            <li><strong>Marketing:</strong> comunicazioni promozionali via email.</li>
          </ul>
          <p className="mt-3">
            Tutte le categorie sono <strong>disattivate per impostazione predefinita</strong> (opt-in).
            Puoi modificare le preferenze dalle Impostazioni dell'app in qualsiasi momento.
          </p>
        </>
      ),
    },
    {
      id: '11',
      title: '11. Trattamento dati di minori',
      children: (
        <p>
          Il Servizio non è destinato a minori di 16 anni (art. 8 GDPR, art. 2-quinquies D.Lgs. 196/2003).
          Se veniamo a conoscenza di dati raccolti da un minore senza consenso del tutore,
          provvederemo alla cancellazione tempestiva.
        </p>
      ),
    },
    {
      id: '12',
      title: '12. Modifiche alla presente informativa',
      children: (
        <p>
          Il Titolare può aggiornare questa Informativa in qualsiasi momento. Per modifiche sostanziali,
          gli utenti saranno informati tramite notifica in-app o email. L'utilizzo continuato del
          Servizio dopo le modifiche costituisce accettazione della nuova Informativa.
        </p>
      ),
    },
    {
      id: '13',
      title: '13. Contatti',
      children: (
        <ul className="list-disc pl-6 space-y-1">
          <li>Email: <a href="mailto:privacy@pawmeet.io" className="text-primary underline">privacy@pawmeet.io</a></li>
          <li>PEC: <a href="mailto:pawmeet@pec.it" className="text-primary underline">pawmeet@pec.it</a></li>
          <li>Posta: PawMeet S.r.l., Via Roma 1, 20121 Milano (MI), Italia</li>
        </ul>
      ),
    },
  ];

  return <AccordionClient items={sections} defaultOpen="1" />;
}
