# PawMeet - UX/UI Design System

> **Versione:** 2.0
> **Data:** 12 marzo 2026
> **Autore:** UX/UI Design & Service Design Team
> **Stato:** Active
> **Target:** Sviluppatori frontend Expo/React Native

---

## Indice

1. [Design Principles](#1-design-principles)
2. [Service Blueprint](#2-service-blueprint)
3. [Information Architecture](#3-information-architecture)
4. [Design System Specification](#4-design-system-specification)
5. [Screen Inventory](#5-screen-inventory)
6. [Micro-interactions & Animations](#6-micro-interactions--animations)
7. [Accessibility](#7-accessibility)
8. [Design Tokens (per Expo/RN)](#8-design-tokens-per-exporn)

---

## 1. Design Principles

Sei principi guida che informano ogni decisione di design in PawMeet. Devono essere applicati in ordine di priorita in caso di conflitto.

### 1.1 Fiducia prima di tutto (Trust First)

Ogni interazione deve trasmettere sicurezza e affidabilita. L'utente affida a PawMeet la sicurezza del proprio cane e di se stesso. Questo si traduce in: informazioni chiare prima del match, identita verificabili, comunicazione trasparente sugli algoritmi, e un sistema di segnalazione sempre accessibile.

*Applicazione pratica:* Il punteggio di compatibilita e sempre visibile. I badge di verifica sono prominenti. Il pulsante "Segnala" non e mai a piu di 2 tap di distanza.

### 1.2 Semplicita progressiva (Progressive Simplicity)

L'interfaccia deve essere immediatamente comprensibile per Roberto (52 anni, tech savviness media-bassa) ma offrire profondita per Sofia (24 anni, nativa digitale). Le funzionalita avanzate si rivelano progressivamente, senza sovraccaricare la prima esperienza.

*Applicazione pratica:* Onboarding a 4 step con campi essenziali. Filtri avanzati accessibili ma non obbligatori. Tooltip contestuali al primo utilizzo di ogni sezione.

### 1.3 Il cane al centro (Dog-Centric)

Il cane e il protagonista dell'esperienza. Ogni schermata che mostra un profilo mette il cane in primo piano: foto grandi, nome in evidenza, informazioni comportamentali immediate. Il proprietario e contestuale, non primario.

*Applicazione pratica:* Le card di swipe mostrano la foto del cane a pieno schermo. Il nome del cane e piu grande del nome del proprietario. L'avatar del cane accompagna ogni interazione in chat.

### 1.4 Informazione prima dell'azione (Informed Decisions)

L'utente non deve mai trovarsi in una situazione imprevista. Prima di ogni azione significativa (swipe, incontro, condivisione posizione), le informazioni necessarie sono gia visibili e chiare.

*Applicazione pratica:* La card di swipe mostra taglia, energia e comportamento con icone immediate. Prima di concedere i permessi, una schermata spiega il perche con linguaggio umano.

### 1.5 Calore e giocosita (Warm & Playful)

L'esperienza deve evocare la gioia di una passeggiata con il proprio cane. Colori caldi, angoli arrotondati, micro-animazioni giocose (non infantili), illustrazioni amichevoli. Il tono e quello di un amico che ti presenta qualcuno, non di un'app aziendale.

*Applicazione pratica:* L'animazione di match mostra due cani che si annusano. Le empty states usano illustrazioni con cani. I messaggi di sistema usano un tono colloquiale ("Nessun cane nelle vicinanze... per ora!").

### 1.6 Rispetto del tempo (Respect Time)

Ogni flusso deve essere completabile nel minor numero di tap possibile, senza sacrificare la qualita dell'informazione. Le attese sono sempre comunicate. Le azioni distruttive richiedono conferma, quelle costruttive no.

*Applicazione pratica:* L'onboarding completo richiede meno di 3 minuti. Lo swipe e fluido e senza interruzioni. La chat si apre con un tap dal match. I loading state sono sempre skeletons, mai spinner.

---

## 2. Service Blueprint

### 2.1 Customer Journey Map -- Flusso Principale

Il flusso principale copre il percorso dalla scoperta dell'app fino alla prima passeggiata completata.

```
FASI:          SCOPERTA       REGISTRAZIONE      PROFILING        DISCOVERY        MATCHING         CHAT          PASSEGGIATA
               ──────────     ──────────────     ──────────       ──────────       ──────────      ──────        ────────────
TEMPO:         Giorno 0       Giorno 0           Giorno 0         Giorno 0-1       Giorno 1-3      Giorno 1-5    Giorno 3-7
               (5 min)        (2 min)            (3 min)          (5-10 min)       (variabile)     (variabile)   (30-90 min)
```

#### Fase 1: Scoperta

| Livello | Dettaglio |
|---------|-----------|
| **Azioni utente** | Vede un post su Instagram / riceve un invito da amico / trova l'app nello store |
| **Touchpoint digitale** | App Store / Google Play listing, landing page, social ads, deep link referral |
| **Touchpoint fisico** | Volantino dal veterinario, QR code al parco cani, passaparola |
| **Pensiero utente** | "Sembra interessante, potrebbe risolvere il mio problema" |
| **Emozione** | Curiosita, leggero scetticismo |
| **Frontstage** | Store listing con screenshot, rating, descrizione. Landing page con video demo |
| **Backstage** | ASO (App Store Optimization), A/B test su screenshot e descrizione |
| **Support** | Campagne marketing geo-targetizzate, partnership veterinari, programma Ambassador |

#### Fase 2: Registrazione

| Livello | Dettaglio |
|---------|-----------|
| **Azioni utente** | Scarica l'app, vede le 3 slide di welcome, sceglie metodo di registrazione |
| **Touchpoint digitale** | Welcome slides, form di registrazione, OAuth flow (Google/Apple) |
| **Pensiero utente** | "Deve essere veloce e non chiedermi troppe cose subito" |
| **Emozione** | Impazienza, aspettativa |
| **Frontstage** | 3 slide animate con illustrazioni, bottoni social login prominenti, email come alternativa |
| **Backstage** | Auth service (Firebase/Supabase), verifica email OTP, creazione record utente |
| **Support** | Provider OAuth (Google, Apple), servizio email transazionale, anti-fraud |

#### Fase 3: Profiling (Creazione Profilo Cane)

| Livello | Dettaglio |
|---------|-----------|
| **Azioni utente** | Inserisce nome e foto del cane, seleziona taglia/razza, descrive comportamento, imposta preferenze passeggiata |
| **Touchpoint digitale** | Wizard a 4 step con progress bar, camera/gallery picker, selettori visivi, slider |
| **Pensiero utente** | "Devo descrivere bene il mio cane per trovare compagni adatti" |
| **Emozione** | Coinvolgimento (parla del proprio cane), leggera fatica se troppo lungo |
| **Frontstage** | Form a step con illustrazioni guida, feedback visivo immediato, salvataggio automatico |
| **Backstage** | Validazione dati, moderazione foto (AI), salvataggio profilo, calcolo iniziale pool matching |
| **Support** | Servizio moderazione immagini (AWS Rekognition), CDN per foto, lista razze FCI |

#### Fase 4: Discovery (Esplorazione)

| Livello | Dettaglio |
|---------|-----------|
| **Azioni utente** | Concede permesso geolocalizzazione, visualizza il feed di swipe, esplora profili |
| **Touchpoint digitale** | Permission request screen, swipe feed, profilo espanso del cane |
| **Pensiero utente** | "Vediamo chi c'e nella mia zona... questo cane sembra perfetto per il mio!" |
| **Emozione** | Eccitazione, valutazione, a volte delusione (se pochi risultati) |
| **Frontstage** | Card con foto grande, badge compatibilita, info chiave. Gesti swipe fluidi |
| **Backstage** | Match engine che calcola compatibilita, geolocation service, coda suggerimenti ordinata |
| **Support** | API geolocalizzazione, algoritmo matching, CDN immagini, cache Redis |

#### Fase 5: Matching

| Livello | Dettaglio |
|---------|-----------|
| **Azioni utente** | Fa swipe destro su un cane, riceve notifica di match reciproco |
| **Touchpoint digitale** | Animazione swipe, animazione "It's a Match!", push notification, match list |
| **Pensiero utente** | "Match! Ora possiamo organizzare una passeggiata!" |
| **Emozione** | Soddisfazione, entusiasmo, leggera ansia sociale |
| **Frontstage** | Animazione celebrativa con i due cani, CTA "Scrivi un messaggio" o "Continua a esplorare" |
| **Backstage** | Match service registra il match, trigger notifica push a entrambi, apertura canale chat |
| **Support** | Push notification service (Expo Notifications), WebSocket per real-time |

#### Fase 6: Chat

| Livello | Dettaglio |
|---------|-----------|
| **Azioni utente** | Apre la chat, si presenta, propone luogo/orario per la passeggiata |
| **Touchpoint digitale** | Chat interface, profilo cane visibile in header, suggerimenti contestuali |
| **Pensiero utente** | "Dove ci troviamo? A che ora? Il mio cane va d'accordo con cani di questa taglia?" |
| **Emozione** | Eccitazione, prudenza, organizzazione |
| **Frontstage** | Chat bubble con typing indicator, profilo cane accessibile dall'header, aree suggerite sulla mappa |
| **Backstage** | Chat service WebSocket, moderazione automatica messaggi, filtro contenuti |
| **Support** | Infrastruttura WebSocket, content moderation, sistema segnalazione |

#### Fase 7: Prima Passeggiata

| Livello | Dettaglio |
|---------|-----------|
| **Azioni utente** | Si incontra con l'altro proprietario, passeggia insieme, (futuro: traccia la passeggiata) |
| **Touchpoint digitale** | (Futuro: tracking GPS, timer passeggiata). MVP: la passeggiata avviene offline |
| **Touchpoint fisico** | Incontro al punto concordato, passeggiata con i cani, socializzazione |
| **Pensiero utente** | "Speriamo che i cani vadano d'accordo! L'app aveva ragione sulla compatibilita" |
| **Emozione** | Nervosismo iniziale, poi rilassamento e soddisfazione (se positiva) |
| **Frontstage** | (Futuro: bottone "Inizia passeggiata", mappa percorso, feedback post-passeggiata) |
| **Backstage** | (Futuro: GPS tracking, calcolo distanza/durata, prompt per feedback) |
| **Support** | (Futuro: feedback system, badge assignment, aggiornamento punteggio matching) |

### 2.2 Momenti di Verita (Moments of Truth)

| Momento | Fase | Impatto | Cosa puo andare storto | Mitigazione UX |
|---------|------|---------|------------------------|----------------|
| Primo profilo visualizzato | Discovery | Alto | Profilo scarno, foto di bassa qualita | Mostrare prima i profili piu completi e con foto migliori |
| Primo match | Matching | Critico | Nessun match per giorni | Notifica "Hai nuovi cani da scoprire", ampliamento raggio suggerito |
| Primo messaggio inviato | Chat | Alto | Ansia da primo contatto | Suggerimenti di icebreaker ("Ciao! Dove portate di solito [NomeCane]?") |
| Primo incontro fisico | Passeggiata | Critico | Cani incompatibili nella realta | Consigli pre-incontro in chat ("Suggerimenti per il primo incontro") |

---

## 3. Information Architecture

### 3.1 Sitemap dell'App

```
PawMeet App
|
+-- Splash Screen
|
+-- Onboarding (stack, non autenticato)
|   +-- Welcome Slides (3 pagine, pager orizzontale)
|   +-- Login
|   |   +-- Login con Email
|   |   +-- Recupero Password
|   +-- Registrazione
|   |   +-- Registrazione Email
|   |   +-- Verifica OTP
|   +-- Creazione Profilo Proprietario
|   +-- Wizard Profilo Cane
|   |   +-- Step 1: Informazioni Base (nome, data nascita, sesso, sterilizzazione)
|   |   +-- Step 2: Fisico (razza, taglia, peso)
|   |   +-- Step 3: Comportamento (energia, socialita, guinzaglio, bio)
|   |   +-- Step 4: Foto & Preferenze (foto, orari, durata, terreno)
|   +-- Richiesta Permessi (geolocalizzazione, notifiche)
|   +-- Tutorial Overlay
|
+-- App Principale (tab navigator, autenticato)
|   |
|   +-- [TAB 1] Home / Discovery
|   |   +-- Swipe Feed (stack di card)
|   |   +-- Profilo Cane Espanso (modal bottom sheet)
|   |   +-- Empty State (nessun cane / tutti visti)
|   |   +-- Filtri (bottom sheet)
|   |
|   +-- [TAB 2] Mappa
|   |   +-- Vista Mappa con marker
|   |   +-- Card Cane da marker (bottom sheet compatto)
|   |   +-- Filtro raggio (slider overlay)
|   |
|   +-- [TAB 3] Match / Chat
|   |   +-- Lista Match (griglia orizzontale, match senza chat)
|   |   +-- Lista Conversazioni (lista verticale, chat attive)
|   |   +-- Singola Chat (stack push)
|   |   |   +-- Header con profilo cane
|   |   |   +-- Messaggi (testo + immagini)
|   |   |   +-- Azioni: Profilo, Segnala, Blocca, Unmatch
|   |   +-- Empty State (nessun match)
|   |
|   +-- [TAB 4] Profilo
|       +-- Profilo Proprietario
|       +-- Lista Cani (con card per ogni cane)
|       +-- Modifica Profilo Proprietario
|       +-- Modifica Profilo Cane
|       +-- Aggiungi Nuovo Cane
|       +-- Impostazioni
|       |   +-- Notifiche
|       |   +-- Privacy
|       |   +-- Raggio di Ricerca
|       |   +-- Aspetto (Light/Dark/System)
|       |   +-- Lingua
|       |   +-- Informazioni App (versione, T&C, Privacy Policy)
|       |   +-- Supporto / FAQ
|       |   +-- Elimina Account
|       +-- Gestione Blocchi
|
+-- Modali Globali (accessibili ovunque)
    +-- Animazione Match ("It's a Match!")
    +-- Segnala Profilo / Messaggio
    +-- Blocca Utente
    +-- Conferma Unmatch
    +-- Aggiornamento Richiesto (force update)
    +-- Errore di Rete
    +-- Permessi Mancanti
```

### 3.2 Navigation Model

L'app utilizza un modello di navigazione ibrido ottimizzato per React Navigation (Expo):

```
NavigationContainer
|
+-- RootStack (Stack.Navigator, screenOptions: { headerShown: false })
    |
    +-- AuthStack (Stack.Navigator) -- se utente non autenticato
    |   +-- WelcomeScreen
    |   +-- LoginScreen
    |   +-- RegisterScreen
    |   +-- OTPVerificationScreen
    |   +-- OwnerProfileScreen
    |   +-- DogWizardScreen (step interni gestiti con state locale)
    |   +-- PermissionsScreen
    |
    +-- MainTabs (Bottom Tab Navigator) -- se utente autenticato
    |   +-- DiscoveryStack (Stack.Navigator)
    |   |   +-- SwipeFeedScreen
    |   |   +-- DogProfileDetailScreen (presentazione modal)
    |   |
    |   +-- MapScreen (singola schermata)
    |   |
    |   +-- ChatStack (Stack.Navigator)
    |   |   +-- MatchListScreen
    |   |   +-- ChatScreen
    |   |
    |   +-- ProfileStack (Stack.Navigator)
    |       +-- ProfileScreen
    |       +-- EditOwnerProfileScreen
    |       +-- EditDogProfileScreen
    |       +-- AddDogScreen
    |       +-- SettingsScreen
    |       +-- SubSettingsScreens (notifiche, privacy, etc.)
    |
    +-- MatchModal (Stack.Screen, presentation: 'transparentModal')
    +-- ReportModal (Stack.Screen, presentation: 'modal')
    +-- BlockConfirmModal (Stack.Screen, presentation: 'transparentModal')
```

**Principi di navigazione:**

- **Tab bar** sempre visibile nelle 4 sezioni principali (Discovery, Mappa, Chat, Profilo)
- **Stack navigation** per drill-down all'interno di ogni tab
- **Modal presentation** per azioni overlay (match animation, report, block)
- **Bottom sheet** per contenuti espandibili (profilo cane espanso, filtri)
- **Gesti nativi** per tornare indietro (swipe edge su iOS, back button su Android)

---

## 4. Design System Specification

### 4.1 Colori

#### Palette Primaria

| Nome | Hex | Utilizzo |
|------|-----|----------|
| **Primary** | `#065F46` | CTA principali, accenti, tab attivo, link |
| **Primary Light** | `#059669` | Hover/press state, background leggero |
| **Primary Dark** | `#064E3B` | Testo su sfondo chiaro quando serve piu contrasto |
| **Primary 50** | `#ECFDF5` | Background tinted, card selezionate, badge background |

Il verde smeraldo profondo e stato scelto perche evoca la natura, la fiducia e un senso di qualita premium -- in linea con il mood "vita nella natura di lusso". E sufficientemente distinto dal rosso (errore) e dal giallo (warning) per evitare ambiguita semantiche.

#### Palette Secondaria

| Nome | Hex | Utilizzo |
|------|-----|----------|
| **Secondary** | `#C9A84C` | Elementi secondari, badge compatibilita alta, accenti dorati |
| **Secondary Light** | `#E0B04E` | Background secondari, indicatori positivi |
| **Secondary Dark** | `#8B6914` | Testo secondario su sfondo chiaro (secondary-text) |
| **Secondary 50** | `#FDF8EF` | Background sezione, card sfondo alternativo |

Il champagne gold richiama eleganza e calore, bilanciando il verde smeraldo primario con un accento luminoso e premium.

**Nota accessibilita:** Il colore `Secondary (#C9A84C)` non deve MAI essere usato come testo su sfondi chiari (contrasto 2.29:1 FAIL). Per testo su sfondo chiaro, usare `Secondary Dark (#8B6914)` che ha contrasto 4.86:1 (AA).

#### Palette Neutra

| Nome | Light Mode | Dark Mode | Utilizzo |
|------|-----------|-----------|----------|
| **Neutral 900** | `#1A1A2E` | `#F5F5F7` | Testo primario |
| **Neutral 700** | `#4A4A5A` | `#D1D1D6` | Testo secondario |
| **Neutral 500** | `#8E8E93` | `#8E8E93` | Testo placeholder, icone inattive |
| **Neutral 300** | `#C7C7CC` | `#48484A` | Bordi, divisori |
| **Neutral 200** | `#E5E5EA` | `#38383A` | Background secondario |
| **Neutral 100** | `#F2F2F7` | `#2C2C2E` | Background card |
| **Neutral 50** | `#FAFAFA` | `#1C1C1E` | Background principale |
| **White** | `#FFFFFF` | `#000000` | Card background, superfici elevate |

#### Colori Semantici

| Nome | Light Mode | Dark Mode | Utilizzo |
|------|-----------|-----------|----------|
| **Success** | `#34C759` | `#30D158` | Match confermato, profilo verificato, azione completata |
| **Error** | `#FF3B30` | `#FF453A` | Errori, segnalazioni, eliminazione, cane reattivo |
| **Warning** | `#FF9500` | `#FFD60A` | Attenzione, profilo incompleto, compatibilita bassa |
| **Info** | `#007AFF` | `#0A84FF` | Informazioni, tooltip, link, messaggi di sistema |

#### Colori Specifici PawMeet

| Nome | Hex | Utilizzo |
|------|-----|----------|
| **Compatibility High** | `#34C759` | Badge compatibilita >= 75% |
| **Compatibility Medium** | `#FF9500` | Badge compatibilita 50-74% |
| **Compatibility Low** | `#FF3B30` | Badge compatibilita < 50% (raramente mostrato) |
| **Premium Gold** | `#FFD700` | Badge premium, feature premium |
| **Chat Bubble Sent** | `#065F46` | Bolla messaggio inviato |
| **Chat Bubble Received** | `#F2F2F7` (light) / `#2C2C2E` (dark) | Bolla messaggio ricevuto |
| **Map Radius** | `#065F4620` | Area raggio di ricerca sulla mappa (20% opacita) |

#### Light/Dark Mode

Il supporto dark mode e implementato tramite il sistema di design tokens (vedi sezione 8). L'app rispetta la preferenza di sistema come default, con possibilita di override manuale nelle impostazioni (Light / Dark / System).

Regole per il dark mode:
- Le superfici usano grigi scuri, MAI nero puro (#000000) per le superfici elevate
- Il colore Primary resta invariato (#065F46) -- ha contrasto sufficiente su sfondo scuro
- Le ombre diventano piu sottili e scure
- Le immagini e le foto non vengono alterate
- Le illustrazioni hanno una variante dark mode con sfondi adattati

### 4.2 Tipografia

#### Font Family

**Font primario: Inter**

Motivazioni:
- Open source e gratuito (Google Fonts), nessun costo di licenza
- Eccellente leggibilita su schermi piccoli
- Ampio range di pesi (100-900)
- Supporto ottimo per caratteri latini estesi (accenti italiani)
- Facilmente integrabile con Expo (`expo-font` + `@expo-google-fonts/inter`)
- Tono professionale ma amichevole, adatto sia a Roberto che a Sofia

**Font fallback:** System (San Francisco su iOS, Roboto su Android)

#### Scala Tipografica

| Token | Dimensione | Line Height | Weight | Utilizzo |
|-------|-----------|-------------|--------|----------|
| **displayLarge** | 32px | 40px | 700 (Bold) | Titolo schermata principale, "It's a Match!" |
| **displayMedium** | 28px | 36px | 700 (Bold) | Titolo sezione principale |
| **headingLarge** | 24px | 32px | 600 (SemiBold) | Nome cane su card espansa |
| **headingMedium** | 20px | 28px | 600 (SemiBold) | Titolo sezione, heading schermata |
| **headingSmall** | 17px | 24px | 600 (SemiBold) | Sottotitolo, nome in lista |
| **bodyLarge** | 17px | 24px | 400 (Regular) | Testo corpo principale, messaggi chat |
| **bodyMedium** | 15px | 22px | 400 (Regular) | Testo corpo secondario, descrizione card |
| **bodySmall** | 13px | 18px | 400 (Regular) | Testo di supporto, timestamp, distanza |
| **labelLarge** | 17px | 22px | 600 (SemiBold) | Label bottone, tab label attivo |
| **labelMedium** | 13px | 18px | 600 (SemiBold) | Badge, chip, tag, tab label inattivo |
| **labelSmall** | 11px | 16px | 600 (SemiBold) | Caption, helper text, contatori |
| **caption** | 11px | 16px | 400 (Regular) | Timestamp, note, disclaimer |

**Note implementative:**
- Tutte le dimensioni sono in punti logici (scalano con Dynamic Type)
- Usare `allowFontScaling: true` su tutti i componenti `Text`
- Definire `maxFontSizeMultiplier: 1.5` per evitare layout break su scale estreme

### 4.3 Spacing & Grid

#### Spacing Scale (base 4px)

| Token | Valore | Utilizzo |
|-------|--------|----------|
| `xxs` | 2px | Micro-spacing, gap tra icona e badge |
| `xs` | 4px | Padding interno badge, gap minimo |
| `sm` | 8px | Padding interno bottoni piccoli, gap tra elementi inline |
| `md` | 12px | Padding interno card, gap tra elementi di lista |
| `base` | 16px | Padding standard, margini orizzontali dello schermo |
| `lg` | 20px | Spazio tra sezioni minori |
| `xl` | 24px | Spazio tra componenti principali |
| `2xl` | 32px | Spazio tra sezioni maggiori |
| `3xl` | 40px | Padding top/bottom di schermate |
| `4xl` | 48px | Spazio prominente, separatori di sezione |
| `5xl` | 64px | Spazio massimo, top di schermate con header grande |

#### Grid System

```
Schermo mobile (375px reference width - iPhone 13/14)
|
+-- Margini laterali: 16px (base) per lato
+-- Area contenuto: 343px
+-- Colonne: 4 colonne con 8px gutter
|   +-- Colonna singola: ~78px
|   +-- 2 colonne: ~164px
|   +-- 3 colonne: ~250px
|   +-- Full width: 343px
+-- Safe area top: rispetta il notch/dynamic island
+-- Safe area bottom: rispetta la home indicator (34px su iPhone con notch)
```

**Breakpoint per tablet (iPad):**

| Breakpoint | Larghezza | Layout |
|------------|-----------|--------|
| Mobile | < 768px | 4 colonne, layout standard |
| Tablet | >= 768px | 8 colonne, split view (lista + dettaglio) |

In Expo, usare `useWindowDimensions()` per il layout responsivo.

### 4.4 Border Radius

| Token | Valore | Utilizzo |
|-------|--------|----------|
| `none` | 0px | Nessun arrotondamento |
| `sm` | 4px | Badge piccoli, chip |
| `md` | 8px | Input field, card secondarie |
| `lg` | 12px | Card principali, bottom sheet |
| `xl` | 16px | Card di swipe, modal |
| `2xl` | 24px | Bottoni pill, avatar |
| `full` | 9999px | Avatar circolari, bottoni rotondi, badge circolari |

### 4.5 Ombre (Shadows)

| Token | Light Mode | Dark Mode | Utilizzo |
|-------|-----------|-----------|----------|
| `sm` | `0 1px 2px rgba(0,0,0,0.06)` | `0 1px 2px rgba(0,0,0,0.3)` | Card in lista, input focus |
| `md` | `0 2px 8px rgba(0,0,0,0.10)` | `0 2px 8px rgba(0,0,0,0.4)` | Card swipe, bottom sheet peek |
| `lg` | `0 4px 16px rgba(0,0,0,0.12)` | `0 4px 16px rgba(0,0,0,0.5)` | Modal, bottom sheet espanso |
| `xl` | `0 8px 32px rgba(0,0,0,0.16)` | `0 8px 32px rgba(0,0,0,0.6)` | Card swipe in movimento, overlay |

**Nota RN:** React Native non supporta `box-shadow` come CSS. Usare le proprieta `shadowColor`, `shadowOffset`, `shadowOpacity`, `shadowRadius` su iOS e `elevation` su Android. Per coerenza cross-platform, usare la libreria `react-native-shadow-2` o implementare le ombre con `elevation` + `shadowColor`.

### 4.6 Componenti UI Core

#### 4.6.1 Button

Quattro varianti principali:

| Variante | Background | Testo | Border | Utilizzo |
|----------|-----------|-------|--------|----------|
| **Primary** | `Primary (#065F46)` | `White` | Nessuno | CTA principali: "Registrati", "Invia messaggio", "Salva" |
| **Secondary** | `Transparent` | `Primary` | `1px Primary` | Azioni secondarie: "Annulla", "Modifica", "Vedi profilo" |
| **Ghost** | `Transparent` | `Neutral 700` | Nessuno | Azioni terziarie: "Salta", "Dopo", link inline |
| **Destructive** | `Error` | `White` | Nessuno | Azioni distruttive: "Blocca", "Elimina account", "Segnala" |

**Proprietà comuni:**
- Altezza: 48px (standard), 40px (compact), 56px (large)
- Border radius: `2xl` (24px) -- stile pill per coerenza con il tono amichevole
- Padding orizzontale: 24px (standard), 16px (compact)
- Font: `labelLarge` (17px, Medium)
- Touch target minimo: 48x48px (superiore al minimo di 44x44)
- Stato disabled: opacita 0.4
- Stato pressed: opacita 0.8 + scale(0.97) con animazione spring
- Stato loading: spinner al posto del testo, dimensione invariata
- Supporto icona: sinistra o destra del testo, 20x20px, gap 8px

#### 4.6.2 Card

**Dog Profile Card (Swipe Card)**

```
+------------------------------------------+
|                                          |
|          [FOTO CANE FULL BLEED]          |
|              (aspect 3:4)                |
|                                          |
|   [Badge Compatibilita]                 |
|                                          |
|  +--------------------------------------+|
|  | Luna, 2 anni              ~1.2 km   ||
|  | Labrador  |  Media  |  Alta energia  ||
|  | [Icona zampa] Molto socievole        ||
|  +--------------------------------------+|
+------------------------------------------+
```

- Dimensione: full width meno 16px per lato, altezza ~80% dello schermo
- Border radius: `xl` (16px)
- Ombra: `lg` a riposo, `xl` durante il drag
- Gradient overlay in basso sulla foto per leggibilita del testo (linear-gradient da transparent a rgba(0,0,0,0.6))
- Badge compatibilita: angolo in alto a destra, 48px, circolare
- Informazioni in overlay sul gradient: nome + eta, razza, taglia + energia, comportamento

**Match Card (nella lista match)**

```
+----------+
| [Avatar  |
|  cane]   |
| Luna     |
+----------+
```

- Dimensione: 72x96px
- Avatar cane circolare: 64x64px
- Nome sotto: `labelSmall`, centrato, max 1 riga con ellipsis
- Border: 2px `Primary` se match nuovo (non ancora aperta la chat)
- Scroll orizzontale nella lista match

**User/Chat Card (nella lista conversazioni)**

```
+-----------------------------------------------+
| [Avatar] Luna & Giulia           14:32        |
|          Ci vediamo al parco alle 18?          |
|          [Badge non letto]                     |
+-----------------------------------------------+
```

- Altezza: 72px
- Avatar cane: 48x48px, circolare
- Nome cane + proprietario: `headingSmall`, 1 riga
- Anteprima messaggio: `bodyMedium`, `Neutral 500`, 1 riga con ellipsis
- Timestamp: `caption`, allineato a destra
- Badge non letto: cerchio `Primary`, 20x20px, con contatore

#### 4.6.3 Input

**Text Input**

- Altezza: 48px
- Border: 1px `Neutral 300`, border radius `md` (8px)
- Focus: border 2px `Primary`, ombra `sm`
- Error: border 2px `Error`, messaggio errore sotto in `Error` + `caption`
- Placeholder: `Neutral 500`, `bodyMedium`
- Label sopra: `labelMedium`, `Neutral 700`, margin bottom 4px
- Padding interno: 12px orizzontale
- Icona opzionale a sinistra (20x20, `Neutral 500`) o a destra (azione: clear, toggle password)

**Select / Dropdown**

- Stesso stile del Text Input
- Icona chevron-down a destra
- Apre un bottom sheet con lista di opzioni (non il picker nativo, per coerenza cross-platform)

**Slider**

- Track height: 4px, `Neutral 200`
- Track filled: `Primary`
- Thumb: 24x24px, `White`, ombra `md`, bordo 2px `Primary`
- Label valore: sopra il thumb durante il drag, `labelMedium`, background `Primary`, testo `White`
- Range slider (per durata passeggiata): due thumb

**Multi-Select (Chip Group)**

- Chip non selezionato: background `Neutral 100`, testo `Neutral 700`, border 1px `Neutral 300`
- Chip selezionato: background `Primary 50`, testo `Primary`, border 1px `Primary`
- Chip dimensione: altezza 36px, padding orizzontale 12px, border radius `full`
- Gap tra chip: 8px
- Layout: flex wrap

**Date Picker**

- Bottone che mostra la data selezionata nel formato "GG/MM/AAAA"
- Apre il date picker nativo del sistema operativo (rispetta la piattaforma)
- Validazione: non futura, non oltre 25 anni fa

#### 4.6.4 Avatar

**Avatar Utente (Proprietario)**

| Dimensione | Pixel | Utilizzo |
|------------|-------|----------|
| XS | 24x24px | Inline nel testo, menzioni |
| SM | 32x32px | Lista compatta |
| MD | 40x40px | Header chat, commenti |
| LG | 48x48px | Lista conversazioni |
| XL | 64x64px | Profilo, match card |
| 2XL | 96x96px | Profilo proprietario espanso |

- Forma: circolare (border radius `full`)
- Placeholder: icona utente generica su sfondo `Neutral 200`
- Border opzionale: 2px `White` quando sovrapposto a immagini

**Avatar Cane**

Stesse dimensioni dell'avatar utente, con distinzione:

- Forma: circolare (come l'utente)
- Placeholder: icona zampa su sfondo `Primary 50`
- Badge angolare possibile (vedi sotto)

**Badge su Avatar**

- Posizione: angolo in basso a destra dell'avatar
- Dimensione: 33% del diametro dell'avatar (minimo 16px)
- Tipi: verificato (check verde), premium (stella dorata), online (cerchio verde)

#### 4.6.5 Badge

| Tipo | Background | Testo/Icona | Border Radius | Utilizzo |
|------|-----------|-------------|---------------|----------|
| **Compatibilita Alta** | `Success 10%` | `Success` + "85%" | `full` | Punteggio match >= 75% |
| **Compatibilita Media** | `Warning 10%` | `Warning` + "62%" | `full` | Punteggio match 50-74% |
| **Verificato** | `Info 10%` | `Info` + icona check | `full` | Utente con identita verificata |
| **Premium** | `#FFF8E1` | `Premium Gold` + icona stella | `full` | Utente premium |
| **Taglia** | `Neutral 100` | `Neutral 700` + "Media" | `sm` | Informazione taglia sulla card |
| **Energia** | `Neutral 100` | `Neutral 700` + "Alta" | `sm` | Informazione energia sulla card |
| **Nuovo** | `Primary` | `White` + "Nuovo" | `full` | Match nuovi, funzionalita nuove |
| **Contatore** | `Primary` | `White` + numero | `full` | Messaggi non letti, notifiche |

Dimensioni badge:
- Piccolo: altezza 20px, padding orizzontale 6px, font `labelSmall`
- Medio: altezza 24px, padding orizzontale 8px, font `labelMedium`
- Grande: altezza 32px, padding orizzontale 12px, font `labelMedium`

#### 4.6.6 SwipeCard (Componente Principale)

Il componente di swipe e il cuore dell'esperienza PawMeet. Implementazione consigliata: `react-native-gesture-handler` + `react-native-reanimated`.

```
Struttura dello stack di card:

   [Card 3] -- scala 0.90, translateY +16, opacity 0.5
  [Card 2]  -- scala 0.95, translateY +8, opacity 0.8
 [Card 1]   -- scala 1.0, interattiva (draggable)
```

**Specifiche tecniche:**

- Stack visibile: 3 card (solo la prima interattiva)
- Soglia swipe: 120px orizzontale per confermare l'azione
- Rotazione durante drag: max +/- 12 gradi, proporzionale allo spostamento
- Overlay di feedback:
  - Swipe destro: overlay verde con icona cuore, opacita proporzionale allo spostamento
  - Swipe sinistro: overlay rosso con icona X, opacita proporzionale allo spostamento
- Animazione di uscita: spring animation con `damping: 15`, `stiffness: 150`
- Animazione di entrata della card successiva: spring animation con scale da 0.95 a 1.0
- Tap sulla card: espande il profilo in un bottom sheet (non interferisce con il gesto di swipe)
- Bottoni alternativi allo swipe (per accessibilita): bottone X a sinistra, cuore a destra sotto la card
- Dimensioni bottoni azione: 56x56px, circolari, con ombra `md`

#### 4.6.7 Map Markers

**Marker Cane**

```
    +--------+
    |[Avatar]|  40x40px, circolare, con bordo
    +--------+
        V       puntatore triangolare 8px
```

- Avatar cane: 36x36px, circolare, dentro un contenitore 40x40 con bordo 2px `White`
- Puntatore: triangolo 8px sotto il cerchio, stesso colore del bordo
- Stato default: bordo `White`
- Stato selezionato: bordo `Primary`, dimensione 48x48, ombra `lg`
- Stato cluster: cerchio `Primary`, 40x40, con numero al centro in `White`

**Marker Posizione Utente**

- Cerchio pieno `Primary`, 16x16
- Cerchio pulsante intorno: `Primary 20%`, animazione pulse che va da 16px a 48px
- Cerchio raggio di ricerca: fill `Map Radius`, stroke `Primary 40%`, 1px dashed

#### 4.6.8 Chat Bubble

**Messaggio Inviato (destra)**

```
                        +--------------------+
                        | Ci vediamo alle 18 |
                        | al parco Sempione? |
                        +--------------------+
                                    14:32  ✓✓
```

- Background: `Chat Bubble Sent` (#065F46)
- Testo: `White`, `bodyLarge`
- Border radius: 16px top-left, 16px top-right, 4px bottom-right, 16px bottom-left
- Padding: 12px orizzontale, 8px verticale
- Max width: 75% dello schermo
- Timestamp: `caption`, `White 70%`, allineato a destra sotto la bolla
- Read receipt: doppio check, `White 70%`

**Messaggio Ricevuto (sinistra)**

- Background: `Chat Bubble Received`
- Testo: `Neutral 900`, `bodyLarge`
- Border radius: 4px top-left, 16px top-right, 16px bottom-right, 16px bottom-left
- Avatar cane: 28x28 a sinistra della bolla (solo sul primo messaggio di un gruppo)
- Timestamp: `caption`, `Neutral 500`

**Messaggio con Immagine**

- Immagine con border radius della bolla, max width 240px
- Aspect ratio originale mantenuto
- Tap per espandere a full screen (lightbox)

#### 4.6.9 Bottom Tab Bar

```
+-------------------------------------------------------+
|  [Zampa]      [Mappa]       [Chat]       [Utente]     |
|  Scopri       Mappa         Chat         Profilo      |
+-------------------------------------------------------+
```

- Altezza: 49px (standard iOS) + safe area bottom
- Background: `White` (light) / `#1C1C1E` (dark), con blur effect (`BlurView`)
- Bordo top: 0.5px `Neutral 300`
- Icone: 24x24px
- Icona attiva: `Primary`, label `Primary`
- Icona inattiva: `Neutral 500`, label `Neutral 500`
- Label: `labelSmall` (11px)
- Badge notifica su Chat: cerchio `Primary` con contatore, 18px, posizione top-right dell'icona
- Animazione cambio tab: nessuna animazione sull'icona (evitare distrazioni per Roberto)

#### 4.6.10 Modal / Bottom Sheet

**Bottom Sheet**

Implementazione: `@gorhom/bottom-sheet`

- Handle: 36x4px, `Neutral 300`, border radius `full`, centrato, margin top 8px
- Background: `White` / `Neutral 50` (dark)
- Border radius top: `lg` (12px)
- Ombra: `xl`
- Snap points configurabili per sheet (tipicamente 25%, 50%, 90%)
- Backdrop: `rgba(0,0,0,0.5)`, tap per chiudere
- Gesture: drag per espandere/ridurre/chiudere

**Modal Centrato**

- Background: `White`, border radius `xl`
- Padding: 24px
- Max width: 320px, centrato verticalmente e orizzontalmente
- Backdrop: `rgba(0,0,0,0.5)`, tap per chiudere (se non critico)
- Utilizzato per: conferme distruttive (blocco, elimina), match animation

#### 4.6.11 Toast / Snackbar

- Posizione: top dello schermo, sotto la safe area
- Altezza: auto (min 48px)
- Margin: 16px laterale
- Border radius: `lg` (12px)
- Ombra: `lg`
- Durata: 3 secondi (auto-dismiss), swipe up per chiudere
- Varianti:

| Tipo | Icona Sinistra | Background | Bordo Sinistro |
|------|---------------|-----------|----------------|
| Success | check-circle | `White` | 3px `Success` |
| Error | alert-circle | `White` | 3px `Error` |
| Warning | alert-triangle | `White` | 3px `Warning` |
| Info | info | `White` | 3px `Info` |

- Testo: `bodyMedium`, `Neutral 900`
- Azione opzionale: link `Ghost` a destra ("Annulla", "Vedi")

#### 4.6.12 Empty State

Layout standard per tutte le empty states:

```
+------------------------------------------+
|                                          |
|          [Illustrazione]                 |
|            160x160px                     |
|                                          |
|     Titolo dell'empty state              |
|     headingMedium, centrato              |
|                                          |
|     Descrizione esplicativa e            |
|     suggerimento di azione.              |
|     bodyMedium, Neutral 500, centrato    |
|                                          |
|        [  Bottone CTA  ]                |
|        (opzionale)                       |
|                                          |
+------------------------------------------+
```

Empty states specifiche:

| Contesto | Illustrazione | Titolo | Descrizione | CTA |
|----------|--------------|--------|-------------|-----|
| Feed vuoto (nessun cane) | Cane con binocolo | "Nessun cane nelle vicinanze" | "Prova ad aumentare il raggio di ricerca o torna piu tardi" | "Aumenta raggio" |
| Feed esaurito (tutti visti) | Cane che dorme | "Hai visto tutti!" | "Torna domani per nuovi suggerimenti, o allarga il raggio" | "Modifica filtri" |
| Nessun match | Due cani che si guardano | "Nessun match ancora" | "Continua a esplorare per trovare il compagno perfetto" | "Vai al Discovery" |
| Chat vuota (match senza messaggi) | Cane con fumetto | "Inizia la conversazione!" | "Fai il primo passo e organizza una passeggiata" | Nessuno (focus sull'input) |
| Errore di rete | Cane con cavo spezzato | "Connessione persa" | "Controlla la tua connessione internet e riprova" | "Riprova" |

#### 4.6.13 Loading Skeleton

Utilizzare skeleton screens (shimmer) invece di spinner per tutti i caricamenti di contenuto.

- Colore base: `Neutral 200` (light) / `Neutral 100` (dark)
- Colore shimmer: `Neutral 100` (light) / `Neutral 200` (dark)
- Animazione: shimmer da sinistra a destra, durata 1.5s, loop infinito
- Forma: replica la forma del contenuto che sta caricando (rettangoli per testo, cerchi per avatar, rettangoli con border radius per card)

Skeleton specifici:
- **Swipe card skeleton:** rettangolo full size con gradient shimmer
- **Lista conversazioni skeleton:** 5 righe con cerchio 48px + 2 linee di testo
- **Profilo cane skeleton:** immagine placeholder + 4 linee di testo

Implementazione consigliata: `react-native-skeleton-placeholder` o `moti/skeleton` (integrato con Moti/Reanimated).

### 4.7 Iconografia

#### Icon Set: Lucide Icons

Motivazioni della scelta:
- Open source (ISC license)
- Peso leggero (~24KB per il set completo tree-shaken)
- Stile outline coerente, stroke 2px
- Ampio catalogo (1400+ icone)
- Ottima integrazione con React Native via `lucide-react-native`
- Design pulito e moderno, leggibile anche a dimensioni ridotte

Dimensioni standard icone:
- 16px: inline nel testo, badge
- 20px: dentro bottoni, input
- 24px: tab bar, azioni principali, lista
- 32px: icone prominenti, empty state secondarie

#### Mappatura Icone Lucide

| Funzione | Icona Lucide | Nome |
|----------|-------------|------|
| Discovery / Home | `search` | Search |
| Mappa | `map-pin` | MapPin |
| Chat | `message-circle` | MessageCircle |
| Profilo | `user` | User |
| Cuore / Like | `heart` | Heart |
| Rifiuta / X | `x` | X |
| Impostazioni | `settings` | Settings |
| Notifiche | `bell` | Bell |
| Foto / Camera | `camera` | Camera |
| Modifica | `edit-3` | Edit3 |
| Filtri | `sliders-horizontal` | SlidersHorizontal |
| Posizione | `map-pin` | MapPin |
| Distanza | `navigation` | Navigation |
| Tempo / Orario | `clock` | Clock |
| Calendario | `calendar` | Calendar |
| Check / Verifica | `check-circle` | CheckCircle |
| Errore / Alert | `alert-circle` | AlertCircle |
| Info | `info` | Info |
| Chiudi | `x` | X |
| Indietro | `chevron-left` | ChevronLeft |
| Espandi | `chevron-down` | ChevronDown |
| Menu azioni | `more-horizontal` | MoreHorizontal |
| Segnala | `flag` | Flag |
| Blocca | `shield-off` | ShieldOff |
| Invia messaggio | `send` | Send |
| Immagine | `image` | Image |
| Condividi | `share` | Share |
| Stella (premium) | `star` | Star |
| Percorso / Trail | `route` | Route |
| Montagna | `mountain` | Mountain |
| Albero / Parco | `trees` | Trees |
| Spiaggia | `waves` | Waves |
| Citta / Urbano | `building-2` | Building2 |
| Peso | `scale` | Scale (o custom) |
| Energia bassa | `battery-low` | BatteryLow |
| Energia media | `battery-medium` | BatteryMedium |
| Energia alta | `battery-full` | BatteryFull |
| Maschio | `circle-dot` | Custom (vedi sotto) |
| Femmina | `circle` | Custom (vedi sotto) |

#### Custom Icons (SVG)

Icone specifiche per il dominio canino non disponibili in Lucide, da creare come SVG custom:

| Icona | Descrizione | Utilizzo |
|-------|-------------|----------|
| **paw** | Zampa di cane (stilizzata) | Logo app, icona tab Discovery, placeholder avatar cane |
| **bone** | Osso (stilizzato) | Gamification, reward, empty state |
| **leash** | Guinzaglio | Indicatore comportamento al guinzaglio |
| **dog-face** | Muso di cane (stilizzato) | Placeholder profilo cane |
| **two-dogs** | Due cani affiancati | Animazione match, illustrazione |
| **dog-size-toy** | Silhouette cane toy | Selettore taglia |
| **dog-size-small** | Silhouette cane piccolo | Selettore taglia |
| **dog-size-medium** | Silhouette cane medio | Selettore taglia |
| **dog-size-large** | Silhouette cane grande | Selettore taglia |
| **dog-size-giant** | Silhouette cane gigante | Selettore taglia |
| **sociable** | Cane con coda scodinzolante | Badge comportamento socievole |
| **reactive** | Cane con postura allerta | Badge comportamento reattivo |
| **male** | Simbolo maschio (cerchio con freccia) | Indicatore sesso |
| **female** | Simbolo femmina (cerchio con croce) | Indicatore sesso |

Le icone custom devono seguire le stesse linee guida delle icone Lucide:
- Viewbox: 24x24
- Stroke width: 2px
- Stroke linecap: round
- Stroke linejoin: round
- Nessun fill (solo stroke), salvo eccezioni esplicite

---

## 5. Screen Inventory

Lista completa di tutte le schermate dell'MVP con descrizione, componenti chiave e note implementative.

### 5.1 Onboarding

| # | Schermata | Descrizione | Componenti Chiave | Note |
|---|-----------|-------------|-------------------|------|
| O-01 | **Splash Screen** | Logo PawMeet centrato, sfondo `Primary`. Mostrato durante il caricamento iniziale dell'app | Logo, sfondo colore | Durata max 2s. Animazione fade-out |
| O-02 | **Welcome Slide 1** | "Trova il compagno perfetto per il tuo cane" + illustrazione cani che passeggiano | Illustrazione, titolo, descrizione, page indicator, bottone "Avanti" | Pager orizzontale con 3 slide |
| O-03 | **Welcome Slide 2** | "Matching intelligente" + illustrazione algoritmo/compatibilita | Come O-02 | Swipe o tap "Avanti" |
| O-04 | **Welcome Slide 3** | "Chat sicura per organizzare passeggiate" + illustrazione chat | Come O-02 + bottone "Inizia" e link "Hai gia un account?" | Ultima slide, CTA prominente |
| O-05 | **Login** | Form di accesso con email/password, social login (Google, Apple) | Input email, input password, bottone "Accedi", divider "oppure", bottoni social, link "Registrati", link "Password dimenticata?" | Apple Sign-In obbligatorio su iOS |
| O-06 | **Registrazione** | Form di registrazione | Input email, input password, input conferma password, checkbox T&C, checkbox marketing (opt.), bottone "Registrati", bottoni social | Validazione real-time password |
| O-07 | **Verifica OTP** | Inserimento codice OTP inviato via email | 6 input singoli per cifra OTP, timer resend, bottone "Verifica", link "Reinvia codice" | Auto-advance quando si digita ogni cifra |
| O-08 | **Recupero Password** | Inserimento email per reset password | Input email, bottone "Invia link", link "Torna al login" | Conferma generica (non rivela se email esiste) |
| O-09 | **Profilo Proprietario** | Nome e foto del proprietario | Input nome, avatar picker (camera/gallery), bottone "Continua" | Foto opzionale, non bloccante |
| O-10 | **Wizard Cane - Step 1/4: Info Base** | Nome, data nascita, sesso, sterilizzazione | Input nome, date picker, selettore sesso (2 opzioni), toggle sterilizzato, progress bar (1/4), bottone "Continua" | Tutti i campi obbligatori |
| O-11 | **Wizard Cane - Step 2/4: Fisico** | Razza, taglia, peso | Autocomplete razza con ricerca, selettore taglia (5 silhouette cane), input peso con slider, progress bar (2/4) | Warning se peso incoerente con taglia |
| O-12 | **Wizard Cane - Step 3/4: Comportamento** | Energia, socialita, guinzaglio, bio | 4 selettori orizzontali con icone e descrizione per ciascun livello, textarea bio (opz.), progress bar (3/4) | Ogni opzione ha una breve descrizione sotto |
| O-13 | **Wizard Cane - Step 4/4: Foto & Preferenze** | Foto, orari, durata, terreno | Griglia foto 3x2 (prima = principale), multi-select chip per orari, range slider per durata, multi-select chip per terreno, progress bar (4/4) | Minimo 1 foto obbligatoria |
| O-14 | **Richiesta Permessi** | Spiegazione e richiesta permessi di geolocalizzazione e notifiche | Illustrazione, testo esplicativo per ogni permesso, bottone "Attiva Posizione", bottone "Attiva Notifiche", link "Dopo" | Due step sequenziali. Se rifiuta, l'app funziona ma con limitazioni |
| O-15 | **Tutorial Overlay** | Overlay semitrasparente sul feed di swipe che spiega i gesti | Overlay con frecce e testo: "Scorri a destra = interessato", "Scorri a sinistra = passa", "Tocca = dettagli" | Skippabile. Mostrato solo al primo accesso |

### 5.2 App Principale

| # | Schermata | Descrizione | Componenti Chiave | Note |
|---|-----------|-------------|-------------------|------|
| M-01 | **Home / Discovery (Swipe Feed)** | Schermata principale. Stack di card cane da valutare con swipe | SwipeCard stack (3 visibili), bottoni Like/Dislike sotto le card, filtri (icona top-right), contatore "X cani da scoprire" | Schermata piu critica per la retention |
| M-02 | **Profilo Cane Espanso** | Dettaglio completo del cane, aperto con tap sulla card o swipe up | Bottom sheet espandibile (50% -> 90%). Gallery foto scorrevole, nome + eta + razza, tutte le info comportamentali, punteggio compatibilita dettagliato, nome proprietario, distanza | Bottoni Like/Pass sempre visibili in basso |
| M-03 | **Filtri Discovery** | Bottom sheet con filtri per raffinare i suggerimenti | Slider raggio (1-25km), multi-select taglia, multi-select energia, multi-select orari, bottone "Applica", bottone "Reset" | I filtri riducono la coda, non ricalcolano il punteggio |
| M-04 | **Mappa** | Vista mappa con marker dei cani nelle vicinanze | Mappa (MapView), marker cane, marker posizione utente, cerchio raggio, slider raggio, card preview on tap marker | Usare `react-native-maps` con provider Google/Apple |
| M-05 | **Card Cane da Mappa** | Card compatta che appare tappando un marker | Bottom sheet compatto (25%): foto + nome + razza + compatibilita + distanza + bottone "Vedi profilo" | Tap apre il profilo espanso (M-02) |
| M-06 | **Match & Chat List** | Lista dei match e delle conversazioni attive | Scroll orizzontale match (senza chat avviata), lista verticale conversazioni (ordinate per ultimo messaggio), badge non letti | Tab singolo che combina match e chat |
| M-07 | **Chat** | Conversazione con un match | Header (avatar cane + nome + azioni), lista messaggi (bolle), input messaggio + bottone invio + allegato foto, typing indicator | Pull-up per storico. Auto-scroll su nuovo messaggio |
| M-08 | **Chat - Profilo da Header** | Accesso rapido al profilo cane dall'header della chat | Stesso di M-02 ma aperto come modal stack push | Accessibile tappando l'avatar nell'header chat |
| M-09 | **Profilo Utente** | Profilo del proprietario con i propri cani | Avatar grande, nome, data iscrizione, lista card cani (con badge e stats ciascuno), bottone "Modifica profilo", bottone "Impostazioni", link "Aggiungi cane" | Hub personale |
| M-10 | **Modifica Profilo Proprietario** | Form di modifica dati proprietario | Input nome, avatar picker, bottone "Salva" | Salvataggio immediato con feedback toast |
| M-11 | **Modifica Profilo Cane** | Form di modifica dati cane (stessa struttura del wizard, ma tutti i campi su una schermata scrollabile) | Tutti i campi del wizard in sezioni collapsabili, gestione foto (riordina, aggiungi, rimuovi), bottone "Salva" | Modifica non richiede ri-approvazione foto se non cambiate |
| M-12 | **Aggiungi Nuovo Cane** | Wizard identico a O-10/O-13 | Come il wizard onboarding | Max 5 cani per account |
| M-13 | **Impostazioni** | Lista di opzioni di configurazione | Lista con icone: Notifiche, Privacy, Raggio di Ricerca, Aspetto, Lingua, Info App, Supporto, Gestione Blocchi, Elimina Account | Sezioni separate con header |
| M-14 | **Impostazioni - Notifiche** | Toggle granulari per ogni tipo di notifica | Toggle per: match, messaggi, suggerimenti, orario silenzioso (time picker inizio/fine) | Default tutti attivi |
| M-15 | **Impostazioni - Privacy** | Opzioni di privacy | Toggle: visibilita profilo, distanza approssimativa, ultimo accesso in chat | Spiegazione sotto ogni toggle |
| M-16 | **Impostazioni - Raggio di Ricerca** | Slider per impostare il raggio | Slider 1-25km con valore visualizzato, anteprima mappa con cerchio | Aggiornamento in tempo reale sulla mappa |
| M-17 | **Impostazioni - Aspetto** | Selezione tema | 3 opzioni: Chiaro, Scuro, Sistema (default) | Anteprima in tempo reale |
| M-18 | **Impostazioni - Elimina Account** | Conferma eliminazione account | Warning, spiegazione conseguenze, input "ELIMINA" per conferma, bottone distruttivo | Double confirmation pattern. Irreversibile |

### 5.3 Flussi Modali e Overlay

| # | Schermata | Descrizione | Componenti Chiave | Note |
|---|-----------|-------------|-------------------|------|
| X-01 | **Animazione Match** | Schermata celebrativa quando avviene un match reciproco | Due foto cane affiancate con animazione, testo "E' un Match!", nome dei due cani, bottone "Scrivi un messaggio", bottone ghost "Continua a esplorare" | Modal trasparente sovrapposto. Confetti/particelle animate |
| X-02 | **Segnala Profilo** | Form di segnalazione di un profilo | Titolo "Segnala [NomeCane]", radio list categorie (profilo falso, foto inappropriata, info fuorvianti, comportamento sospetto, altro), textarea note (opz.), bottone "Invia Segnalazione" | Bottom sheet. Conferma con toast dopo invio |
| X-03 | **Segnala Messaggio** | Segnalazione di un messaggio specifico | Come X-02 ma con preview del messaggio segnalato e categorie chat (molestia, spam, contenuto esplicito, minaccia, altro) | Long press sul messaggio per attivare |
| X-04 | **Blocca Utente** | Conferma blocco | Modal centrato: "Vuoi bloccare [Nome]?", spiegazione conseguenze, bottone "Blocca" (distruttivo), bottone "Annulla" | Azione immediata, reversibile da impostazioni |
| X-05 | **Conferma Unmatch** | Conferma annullamento match | Modal centrato: "Vuoi annullare il match con [NomeCane]?", spiegazione (chat sara eliminata), bottone "Annulla match" (distruttivo), bottone "Torna alla chat" | Azione irreversibile |
| X-06 | **Aggiornamento Richiesto** | Force update quando la versione e troppo vecchia | Modal non dismissabile: icona aggiornamento, testo "Aggiorna PawMeet", descrizione, bottone "Aggiorna" (link allo store) | Bloccante. Solo per breaking changes API |
| X-07 | **Errore di Rete** | Overlay quando non c'e connessione | Banner top: icona wifi-off, "Nessuna connessione", bottone "Riprova" | Non bloccante, sovrapposto al contenuto cached |
| X-08 | **Permessi Mancanti** | Schermata quando un permesso necessario e stato negato | Illustrazione, spiegazione, bottone "Apri Impostazioni" (link alle impostazioni di sistema) | Per geolocalizzazione negata nel tab Discovery |

### 5.4 Conteggio Totale Schermate MVP

| Categoria | Schermate | Range ID |
|-----------|:---------:|----------|
| Onboarding | 15 | O-01 -- O-15 |
| App Principale | 18 | M-01 -- M-18 |
| Modali e Overlay | 8 | X-01 -- X-08 |
| **Totale** | **41** | |

---

## 6. Micro-interactions & Animations

Tutte le animazioni usano `react-native-reanimated` (v3+) per performance native. Configurazioni spring consigliate:

| Profilo | damping | stiffness | mass | Utilizzo |
|---------|---------|-----------|------|----------|
| **snappy** | 15 | 300 | 1 | Swipe, bottoni, toggle |
| **gentle** | 20 | 150 | 1 | Transizioni pagina, bottom sheet |
| **bouncy** | 10 | 200 | 1 | Match animation, celebrazioni |
| **slow** | 25 | 100 | 1 | Fade in/out, overlay |

### 6.1 Swipe Animation

| Fase | Proprieta | Da | A | Easing/Config |
|------|-----------|----|----|---------------|
| **Drag** | translateX | 0 | finger position | Segue il dito (gesture) |
| **Drag** | rotate | 0deg | +/-12deg | Proporzionale a translateX: `rotation = translateX / screenWidth * 12` |
| **Drag** | overlay opacity (like/nope) | 0 | 1 | Proporzionale a translateX: `opacity = Math.abs(translateX) / threshold` |
| **Release - Confermato** | translateX | posizione corrente | +/- screenWidth * 1.5 | Spring `snappy` |
| **Release - Confermato** | rotate | corrente | +/- 30deg | Spring `snappy` |
| **Release - Annullato** | translateX | corrente | 0 | Spring `snappy` |
| **Release - Annullato** | rotate | corrente | 0deg | Spring `snappy` |
| **Card successiva** | scale | 0.95 | 1.0 | Spring `gentle` |
| **Card successiva** | translateY | 8 | 0 | Spring `gentle` |
| **Card successiva** | opacity | 0.8 | 1.0 | Spring `gentle` |

Overlay feedback durante il drag:
- Swipe destro: icona cuore + testo "LIKE" in verde, rotazione leggera, opacita crescente
- Swipe sinistro: icona X + testo "NOPE" in rosso, rotazione leggera, opacita crescente

### 6.2 Match Animation ("E' un Match!")

Sequenza temporale (durata totale: ~2 secondi):

| Tempo | Elemento | Animazione |
|-------|----------|-----------|
| 0ms | Backdrop | Fade in `rgba(0,0,0,0.7)` -- timing 300ms |
| 100ms | Foto cane 1 (sinistra) | Slide in da sinistra + scale da 0.5 a 1.0 -- spring `bouncy` |
| 200ms | Foto cane 2 (destra) | Slide in da destra + scale da 0.5 a 1.0 -- spring `bouncy` |
| 400ms | Testo "E' un Match!" | Scale da 0 a 1.0 + opacity 0 a 1 -- spring `bouncy` |
| 500ms | Nomi dei cani | Fade in + translateY da 20 a 0 -- spring `gentle` |
| 600ms | Confetti / Particelle | Emissione particelle (cuori, zampe, stelline) per 1.5s |
| 800ms | Bottoni CTA | Fade in + translateY da 30 a 0 -- spring `gentle` |

Layout dell'animazione match:
```
+------------------------------------------+
|              [backdrop scuro]             |
|                                          |
|     +------+          +------+           |
|     |Foto 1|   [zampa] |Foto 2|          |
|     | cane  |          | cane  |          |
|     +------+          +------+           |
|                                          |
|          E' un Match!                    |
|     Luna & Biscotto                      |
|                                          |
|     [  Scrivi un messaggio  ]            |
|        Continua a esplorare              |
|                                          |
+------------------------------------------+
```

Foto: 120x120px, circolari, con bordo 3px `White`. L'icona zampa al centro (32px) fa da connettore visivo tra le due foto.

Per le particelle, usare `react-native-reanimated` con `createAnimatedComponent` su componenti `View` posizionati in modo assoluto, o la libreria `react-native-confetti-cannon`.

### 6.3 Chat Typing Indicator

```
[Avatar]  ...
          (tre puntini che pulsano in sequenza)
```

- Tre cerchi di 8px diametro, `Neutral 400`
- Animazione: scale pulsante 1.0 -> 1.4 -> 1.0, timing 600ms, loop
- Delay sequenziale: cerchio 1 (0ms), cerchio 2 (150ms), cerchio 3 (300ms)
- Fade in/out dell'intero indicatore: timing 200ms

### 6.4 Pull to Refresh

- Indicatore custom: icona zampa che ruota (non lo spinner di sistema)
- Fase pull: l'icona zampa appare dall'alto, scala da 0.5 a 1.0 proporzionale al pull
- Fase refresh: la zampa ruota 360deg in loop (timing 800ms, linear)
- Fase completamento: la zampa fa un "bounce" (scale 1.0 -> 1.2 -> 1.0) poi scompare
- Colore: `Primary`

### 6.5 Tab Transitions

- Nessuna animazione di transizione tra tab (cambio istantaneo) per semplicita e velocita percepita
- L'icona del tab attivo cambia da outline a filled, con transizione opacity 150ms
- Il contenuto di ogni tab e mantenuto in memoria (lazy: false per le prime 3 tab, lazy: true per Profilo)

### 6.6 Loading States

| Contesto | Tipo | Dettaglio |
|----------|------|----------|
| Apertura app (cold start) | Splash screen | Logo con pulse animation, poi fade out |
| Caricamento feed swipe | Skeleton | Card skeleton con shimmer |
| Caricamento lista chat | Skeleton | 5 righe skeleton con shimmer |
| Caricamento profilo espanso | Skeleton | Immagine placeholder + testo skeleton |
| Invio messaggio | Inline | Bolla messaggio con opacita 0.5 + piccolo spinner, poi piena opacita |
| Caricamento mappa | Spinner | Spinner centrato sulla mappa, markers appaiono con fade in |
| Azioni bottone (salva, invia) | Bottone loading | Testo sostituito da spinner, bottone disabilitato |
| Upload foto | Progress | Barra di progresso lineare sopra la foto |

### 6.7 Altre Micro-interactions

| Interazione | Animazione |
|-------------|-----------|
| **Tap bottone** | Scale 1.0 -> 0.97 -> 1.0, spring `snappy` (haptic feedback: light impact) |
| **Toggle switch** | Thumb slide con spring, track color change timing 200ms |
| **Apertura bottom sheet** | Slide up con spring `gentle`, backdrop fade in timing 200ms |
| **Chiusura bottom sheet** | Slide down (gesture o tap backdrop), spring `gentle` |
| **Nuovo messaggio in chat** | Bolla appare con translateY 20 -> 0, opacity 0 -> 1, spring `snappy` |
| **Badge notifica appare** | Scale 0 -> 1.0 con bounce (spring `bouncy`) |
| **Successo (salvataggio)** | Toast slide in dall'alto, spring `gentle`, auto-dismiss dopo 3s |
| **Errore input** | Shake orizzontale (translateX: 0 -> -10 -> 10 -> -5 -> 5 -> 0, timing 400ms) + bordo rosso |
| **Like con bottone** | Icona cuore: scale 1.0 -> 1.3 -> 1.0, spring `bouncy` + colore fill transition |
| **Scroll lista** | Momentum nativo di React Native ScrollView, no custom physics |

---

## 7. Accessibility

### 7.1 Conformita WCAG 2.1 AA

PawMeet deve essere conforme al livello AA delle Web Content Accessibility Guidelines 2.1 adattate al contesto mobile.

#### Contrasto Colori

| Elemento | Requisito Minimo | Verifica |
|----------|-----------------|----------|
| Testo normale (< 18px) | 4.5:1 su sfondo | `Neutral 900` su `White` = 15.4:1 (passa) |
| Testo grande (>= 18px bold o >= 24px) | 3:1 su sfondo | `Primary` su `White` = 7.68:1 (passa AAA) |
| Elementi UI (icone, bordi, controlli) | 3:1 su sfondo | `Neutral 500` su `White` = 4.0:1 (passa) |
| Testo su `Primary` background | 4.5:1 | `White` su `Primary (#065F46)` = 7.68:1 (passa AAA) |
| Testo bolla chat inviata | 4.5:1 | `White` su `#065F46` = 7.68:1 (passa AAA) |
| Testo `Secondary Dark` su sfondo chiaro | 4.5:1 | `Secondary Dark (#8B6914)` su `White` = 4.86:1 (passa AA) |

#### Contrasto in Dark Mode

Le stesse regole si applicano in dark mode. Tutti i colori semantici hanno varianti dark mode con contrasto verificato.

### 7.2 Touch Target

| Requisito | Valore | Implementazione |
|-----------|--------|----------------|
| Dimensione minima area tappabile | 44x44 pt | Applicare `minHeight: 44, minWidth: 44` o `hitSlop` su tutti gli elementi interattivi |
| Spaziatura minima tra target | 8px | Garantire che non ci siano sovrapposizioni di hit area |
| Bottoni della tab bar | 48x48 pt | Area tab includes padding |
| Bottoni azione swipe (like/dislike) | 56x56 pt | Sovradimensionati per facilita d'uso |
| Chip di selezione | 36px altezza, min 44px area tap | Usare `hitSlop` per estendere l'area se necessario |
| Icone azione nell'header | 44x44 pt | Anche se l'icona e 24px, l'area tappabile e 44x44 |

### 7.3 Screen Reader (VoiceOver / TalkBack)

#### Principi generali

- Ogni elemento interattivo deve avere un `accessibilityLabel` descrittivo in italiano
- Le immagini decorative hanno `accessibilityElementsHidden: true` (iOS) / `importantForAccessibility: 'no'` (Android)
- Le foto dei cani hanno un label generico: "Foto di [NomeCane], [razza]"
- L'ordine di lettura segue l'ordine visivo logico (top-to-bottom, left-to-right)

#### Label specifici per componente

| Componente | accessibilityLabel | accessibilityRole | accessibilityHint |
|------------|-------------------|-------------------|-------------------|
| **Swipe Card** | "[NomeCane], [razza], [taglia], compatibilita [X]%, a [distanza]" | "button" | "Tocca due volte per vedere il profilo. Scorri a destra per mostrare interesse, a sinistra per passare" |
| **Bottone Like** | "Mi piace, mostra interesse per [NomeCane]" | "button" | "" |
| **Bottone Dislike** | "Passa, non interessato a [NomeCane]" | "button" | "" |
| **Badge Compatibilita** | "Compatibilita [X] percento" | "text" | "" |
| **Chat - Bolla inviata** | "Tu hai scritto: [messaggio], alle [ora]" | "text" | "" |
| **Chat - Bolla ricevuta** | "[Nome] ha scritto: [messaggio], alle [ora]" | "text" | "" |
| **Tab Discovery** | "Scopri" | "tab" | "Esplora cani nelle vicinanze" |
| **Tab Mappa** | "Mappa" | "tab" | "Visualizza cani sulla mappa" |
| **Tab Chat** | "Chat, [N] messaggi non letti" | "tab" | "I tuoi match e conversazioni" |
| **Tab Profilo** | "Profilo" | "tab" | "Il tuo profilo e impostazioni" |

#### Gesti accessibili per lo swipe

Per utenti che non possono eseguire il gesto di swipe:
- Bottoni Like e Dislike sempre visibili sotto la card (non solo in overlay)
- `accessibilityActions` sulla card con azioni "like" e "dislike"
- In modalita screen reader, il tap sulla card legge le info e propone le azioni

### 7.4 Dynamic Type / Font Scaling

- Tutti i testi usano `allowFontScaling: true`
- `maxFontSizeMultiplier: 1.5` per evitare che i layout si rompano (testare a 1.5x)
- I container devono accomodare testo piu grande con `flexWrap` e altezze dinamiche
- Le card di swipe mantengono la dimensione foto ma espandono l'area testo
- Testare l'app con le impostazioni di accessibilita del dispositivo a dimensione massima

### 7.5 Motion / Reduced Motion

- Rispettare la preferenza "Reduce Motion" del sistema operativo
- Se attiva: sostituire le animazioni spring con transizioni opacity (fade in/out, timing 200ms)
- La swipe animation resta funzionale ma senza rotazione e bounce
- L'animazione match diventa un fade-in degli elementi senza slide e confetti
- Usare `useReducedMotion()` hook di `react-native-reanimated` v3

### 7.6 Altre Considerazioni

- **Daltonismo:** Non usare solo il colore per comunicare informazioni. Badge compatibilita mostrano anche il valore numerico. Successo/errore hanno anche icone distinte (check / X)
- **Orientamento:** L'app funziona solo in portrait (coerente con il target mobile-first)
- **Lingua:** Italiano come lingua default, predisporre l'architettura per i18n (usare `i18next` + `react-i18next`)

---

## 8. Design Tokens (per Expo/RN)

### 8.1 Struttura dei File

```
src/
  design-system/
    tokens/
      colors.ts          -- Palette colori light/dark
      typography.ts       -- Font family, scale tipografica
      spacing.ts          -- Spacing scale
      borderRadius.ts     -- Border radius scale
      shadows.ts          -- Ombre per piattaforma
      index.ts            -- Barrel export
    theme/
      theme.ts            -- Composizione tema completo
      ThemeProvider.tsx    -- Context provider con supporto dark mode
      useTheme.ts         -- Hook per consumare il tema
    components/
      Button.tsx
      Card.tsx
      Input.tsx
      Avatar.tsx
      Badge.tsx
      SwipeCard.tsx
      ChatBubble.tsx
      TabBar.tsx
      BottomSheet.tsx
      Toast.tsx
      EmptyState.tsx
      Skeleton.tsx
```

### 8.2 Design Tokens -- colors.ts

```typescript
// src/design-system/tokens/colors.ts

export const palette = {
  // Primary
  primary: '#065F46',
  primaryLight: '#059669',
  primaryDark: '#064E3B',
  primary50: '#ECFDF5',

  // Secondary
  secondary: '#C9A84C',
  secondaryLight: '#E0B04E',
  secondaryDark: '#8B6914',
  secondary50: '#FDF8EF',

  // Neutrals
  neutral900: '#1A1A2E',
  neutral700: '#4A4A5A',
  neutral500: '#8E8E93',
  neutral300: '#C7C7CC',
  neutral200: '#E5E5EA',
  neutral100: '#F2F2F7',
  neutral50: '#FAFAFA',
  white: '#FFFFFF',
  black: '#000000',

  // Semantic
  success: '#34C759',
  successDark: '#30D158',
  error: '#FF3B30',
  errorDark: '#FF453A',
  warning: '#FF9500',
  warningDark: '#FFD60A',
  info: '#007AFF',
  infoDark: '#0A84FF',

  // PawMeet specifici
  premiumGold: '#FFD700',
  compatibilityHigh: '#34C759',
  compatibilityMedium: '#FF9500',
  compatibilityLow: '#FF3B30',
} as const;

export type ColorToken = keyof typeof palette;

export const lightColors = {
  // Backgrounds
  background: palette.neutral50,
  backgroundSecondary: palette.neutral100,
  surface: palette.white,
  surfaceSecondary: palette.neutral100,

  // Text
  textPrimary: palette.neutral900,
  textSecondary: palette.neutral700,
  textTertiary: palette.neutral500,
  textInverse: palette.white,

  // Brand
  primary: palette.primary,
  primaryLight: palette.primaryLight,
  primaryDark: palette.primaryDark,
  primaryTinted: palette.primary50,
  secondary: palette.secondary,
  secondaryLight: palette.secondaryLight,
  secondaryTinted: palette.secondary50,

  // Semantic
  success: palette.success,
  error: palette.error,
  warning: palette.warning,
  info: palette.info,

  // Borders
  border: palette.neutral300,
  borderLight: palette.neutral200,
  borderFocus: palette.primary,

  // Specific
  chatBubbleSent: palette.primary,
  chatBubbleSentText: palette.white,
  chatBubbleReceived: palette.neutral100,
  chatBubbleReceivedText: palette.neutral900,
  tabBarBackground: palette.white,
  tabBarActive: palette.primary,
  tabBarInactive: palette.neutral500,
  mapRadius: 'rgba(6, 95, 70, 0.12)',
  overlay: 'rgba(0, 0, 0, 0.5)',
  shimmerBase: palette.neutral200,
  shimmerHighlight: palette.neutral100,
} as const;

export const darkColors: typeof lightColors = {
  // Backgrounds
  background: '#1C1C1E',
  backgroundSecondary: '#2C2C2E',
  surface: '#2C2C2E',
  surfaceSecondary: '#38383A',

  // Text
  textPrimary: '#F5F5F7',
  textSecondary: '#D1D1D6',
  textTertiary: '#8E8E93',
  textInverse: '#1A1A2E',

  // Brand
  primary: palette.primary,
  primaryLight: palette.primaryLight,
  primaryDark: palette.primaryDark,
  primaryTinted: '#1A2E28',
  secondary: palette.secondaryLight,
  secondaryLight: palette.secondaryLight,
  secondaryTinted: '#2E2A1A',

  // Semantic
  success: '#30D158',
  error: '#FF453A',
  warning: '#FFD60A',
  info: '#0A84FF',

  // Borders
  border: '#48484A',
  borderLight: '#38383A',
  borderFocus: palette.primary,

  // Specific
  chatBubbleSent: palette.primary,
  chatBubbleSentText: palette.white,
  chatBubbleReceived: '#2C2C2E',
  chatBubbleReceivedText: '#F5F5F7',
  tabBarBackground: '#1C1C1E',
  tabBarActive: palette.primary,
  tabBarInactive: '#8E8E93',
  mapRadius: 'rgba(6, 95, 70, 0.20)',
  overlay: 'rgba(0, 0, 0, 0.7)',
  shimmerBase: '#38383A',
  shimmerHighlight: '#48484A',
} as const;

export type ThemeColors = typeof lightColors;
```

### 8.3 Design Tokens -- typography.ts

```typescript
// src/design-system/tokens/typography.ts

import { TextStyle, Platform } from 'react-native';

export const fontFamily = {
  regular: 'Inter_400Regular',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

// Fallback per quando Inter non e caricato
export const fontFamilyFallback = Platform.select({
  ios: 'System',
  android: 'Roboto',
  default: 'System',
});

export type TypographyToken = keyof typeof typography;

export const typography = {
  displayLarge: {
    fontFamily: fontFamily.bold,
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700' as TextStyle['fontWeight'],
  },
  displayMedium: {
    fontFamily: fontFamily.bold,
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '700' as TextStyle['fontWeight'],
  },
  headingLarge: {
    fontFamily: fontFamily.semiBold,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '600' as TextStyle['fontWeight'],
  },
  headingMedium: {
    fontFamily: fontFamily.semiBold,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600' as TextStyle['fontWeight'],
  },
  headingSmall: {
    fontFamily: fontFamily.semiBold,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '600' as TextStyle['fontWeight'],
  },
  bodyLarge: {
    fontFamily: fontFamily.regular,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '400' as TextStyle['fontWeight'],
  },
  bodyMedium: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400' as TextStyle['fontWeight'],
  },
  bodySmall: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400' as TextStyle['fontWeight'],
  },
  labelLarge: {
    fontFamily: fontFamily.semiBold,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600' as TextStyle['fontWeight'],
  },
  labelMedium: {
    fontFamily: fontFamily.semiBold,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600' as TextStyle['fontWeight'],
  },
  labelSmall: {
    fontFamily: fontFamily.semiBold,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600' as TextStyle['fontWeight'],
  },
  caption: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '400' as TextStyle['fontWeight'],
  },
} as const;
```

### 8.4 Design Tokens -- spacing.ts

```typescript
// src/design-system/tokens/spacing.ts

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
} as const;

export type SpacingToken = keyof typeof spacing;
```

### 8.5 Design Tokens -- borderRadius.ts

```typescript
// src/design-system/tokens/borderRadius.ts

export const borderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
  full: 9999,
} as const;

export type BorderRadiusToken = keyof typeof borderRadius;
```

### 8.6 Design Tokens -- shadows.ts

```typescript
// src/design-system/tokens/shadows.ts

import { Platform, ViewStyle } from 'react-native';

type ShadowStyle = {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
};

const createShadow = (
  offsetY: number,
  radius: number,
  opacity: number,
  elevation: number
): ShadowStyle => ({
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: offsetY },
  shadowOpacity: Platform.OS === 'ios' ? opacity : 0,
  shadowRadius: Platform.OS === 'ios' ? radius : 0,
  elevation: Platform.OS === 'android' ? elevation : 0,
});

export const shadows = {
  sm: createShadow(1, 2, 0.06, 2),
  md: createShadow(2, 8, 0.10, 4),
  lg: createShadow(4, 16, 0.12, 8),
  xl: createShadow(8, 32, 0.16, 12),
} as const;

export type ShadowToken = keyof typeof shadows;
```

### 8.7 Design Tokens -- index.ts (Barrel Export)

```typescript
// src/design-system/tokens/index.ts

export { palette, lightColors, darkColors } from './colors';
export type { ColorToken, ThemeColors } from './colors';

export { fontFamily, fontFamilyFallback, typography } from './typography';
export type { TypographyToken } from './typography';

export { spacing } from './spacing';
export type { SpacingToken } from './spacing';

export { borderRadius } from './borderRadius';
export type { BorderRadiusToken } from './borderRadius';

export { shadows } from './shadows';
export type { ShadowToken } from './shadows';
```

### 8.8 Composizione Tema -- theme.ts

```typescript
// src/design-system/theme/theme.ts

import { lightColors, darkColors, ThemeColors } from '../tokens/colors';
import { typography } from '../tokens/typography';
import { spacing } from '../tokens/spacing';
import { borderRadius } from '../tokens/borderRadius';
import { shadows } from '../tokens/shadows';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface Theme {
  mode: 'light' | 'dark';
  colors: ThemeColors;
  typography: typeof typography;
  spacing: typeof spacing;
  borderRadius: typeof borderRadius;
  shadows: typeof shadows;
}

export const lightTheme: Theme = {
  mode: 'light',
  colors: lightColors,
  typography,
  spacing,
  borderRadius,
  shadows,
};

export const darkTheme: Theme = {
  mode: 'dark',
  colors: darkColors,
  typography,
  spacing,
  borderRadius,
  shadows,
};
```

### 8.9 Theme Provider -- ThemeProvider.tsx

```typescript
// src/design-system/theme/ThemeProvider.tsx

import React, { createContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { Theme, ThemeMode, lightTheme, darkTheme } from './theme';

interface ThemeContextValue {
  theme: Theme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  theme: lightTheme,
  themeMode: 'system',
  setThemeMode: () => {},
});

interface ThemeProviderProps {
  children: React.ReactNode;
  initialMode?: ThemeMode;
}

export function ThemeProvider({
  children,
  initialMode = 'system',
}: ThemeProviderProps) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<ThemeMode>(initialMode);

  const theme = useMemo(() => {
    if (themeMode === 'system') {
      return systemColorScheme === 'dark' ? darkTheme : lightTheme;
    }
    return themeMode === 'dark' ? darkTheme : lightTheme;
  }, [themeMode, systemColorScheme]);

  const value = useMemo(
    () => ({ theme, themeMode, setThemeMode }),
    [theme, themeMode]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}
```

### 8.10 useTheme Hook -- useTheme.ts

```typescript
// src/design-system/theme/useTheme.ts

import { useContext } from 'react';
import { ThemeContext } from './ThemeProvider';

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Shortcut per accedere direttamente ai colori
export function useColors() {
  const { theme } = useTheme();
  return theme.colors;
}

// Shortcut per accedere direttamente allo spacing
export function useSpacing() {
  const { theme } = useTheme();
  return theme.spacing;
}
```

### 8.11 Esempio di Utilizzo in un Componente

```typescript
// Esempio: uso del design system in un componente Button

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../design-system/theme/useTheme';

interface ButtonProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  size?: 'compact' | 'standard' | 'large';
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
}

export function Button({
  title,
  variant = 'primary',
  size = 'standard',
  loading = false,
  disabled = false,
  onPress,
}: ButtonProps) {
  const { theme } = useTheme();
  const { colors, typography: typo, spacing, borderRadius } = theme;

  const heights = { compact: 40, standard: 48, large: 56 };

  const variantStyles: Record<string, ViewStyle> = {
    primary: {
      backgroundColor: colors.primary,
    },
    secondary: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.primary,
    },
    ghost: {
      backgroundColor: 'transparent',
    },
    destructive: {
      backgroundColor: colors.error,
    },
  };

  const textColor =
    variant === 'secondary'
      ? colors.primary
      : variant === 'ghost'
        ? colors.textSecondary
        : colors.textInverse;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || loading }}
      style={[
        {
          height: heights[size],
          borderRadius: borderRadius['2xl'],
          paddingHorizontal: spacing.xl,
          justifyContent: 'center',
          alignItems: 'center',
          minWidth: 44,
          minHeight: 44,
          opacity: disabled ? 0.4 : 1,
        },
        variantStyles[variant],
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text
          style={[
            typo.labelLarge,
            { color: textColor },
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}
```

### 8.12 Dipendenze Npm Consigliate

| Pacchetto | Versione | Scopo |
|-----------|---------|-------|
| `@expo-google-fonts/inter` | latest | Font Inter |
| `expo-font` | latest | Caricamento font |
| `react-native-reanimated` | ^3.x | Animazioni performanti |
| `react-native-gesture-handler` | ^2.x | Gesti (swipe) |
| `@gorhom/bottom-sheet` | ^4.x | Bottom sheet |
| `react-native-maps` | latest | Mappe |
| `lucide-react-native` | latest | Icone |
| `react-native-svg` | latest | Rendering SVG (icone custom + Lucide) |
| `react-native-safe-area-context` | latest | Safe area |
| `@react-navigation/native` | ^6.x | Navigazione |
| `@react-navigation/bottom-tabs` | ^6.x | Tab navigator |
| `@react-navigation/native-stack` | ^6.x | Stack navigator |
| `react-native-skeleton-placeholder` | latest | Loading skeleton |
| `expo-haptics` | latest | Feedback aptico |
| `expo-blur` | latest | BlurView per tab bar |

---

> **Documento preparato da:** UX/UI Design & Service Design Team - PawMeet
> **Prossima revisione:** Aprile 2026 (dopo primo round di user testing su prototipo)
> **Distribuzione:** Team di sviluppo frontend, Product Owner, QA

# PawMeet - UX/UI Design System

> **Versione:** 2.0
> **Data:** 12 marzo 2026
> **Autore:** UX/UI Design & Service Design Team
> **Stato:** Active
> **Target:** Sviluppatori frontend Expo/React Native

---

## Indice

1. [Design Principles](#1-design-principles)
2. [Service Blueprint](#2-service-blueprint)
3. [Information Architecture](#3-information-architecture)
4. [Design System Specification](#4-design-system-specification)
5. [Screen Inventory](#5-screen-inventory)
6. [Micro-interactions & Animations](#6-micro-interactions--animations)
7. [Accessibility](#7-accessibility)
8. [Design Tokens (per Expo/RN)](#8-design-tokens-per-exporn)

---

## 1. Design Principles

Sei principi guida che informano ogni decisione di design in PawMeet. Devono essere applicati in ordine di priorita in caso di conflitto.

### 1.1 Fiducia prima di tutto (Trust First)

Ogni interazione deve trasmettere sicurezza e affidabilita. L'utente affida a PawMeet la sicurezza del proprio cane e di se stesso. Questo si traduce in: informazioni chiare prima del match, identita verificabili, comunicazione trasparente sugli algoritmi, e un sistema di segnalazione sempre accessibile.

*Applicazione pratica:* Il punteggio di compatibilita e sempre visibile. I badge di verifica sono prominenti. Il pulsante "Segnala" non e mai a piu di 2 tap di distanza.

### 1.2 Semplicita progressiva (Progressive Simplicity)

L'interfaccia deve essere immediatamente comprensibile per Roberto (52 anni, tech savviness media-bassa) ma offrire profondita per Sofia (24 anni, nativa digitale). Le funzionalita avanzate si rivelano progressivamente, senza sovraccaricare la prima esperienza.

*Applicazione pratica:* Onboarding a 4 step con campi essenziali. Filtri avanzati accessibili ma non obbligatori. Tooltip contestuali al primo utilizzo di ogni sezione.

### 1.3 Il cane al centro (Dog-Centric)

Il cane e il protagonista dell'esperienza. Ogni schermata che mostra un profilo mette il cane in primo piano: foto grandi, nome in evidenza, informazioni comportamentali immediate. Il proprietario e contestuale, non primario.

*Applicazione pratica:* Le card di swipe mostrano la foto del cane a pieno schermo. Il nome del cane e piu grande del nome del proprietario. L'avatar del cane accompagna ogni interazione in chat.

### 1.4 Informazione prima dell'azione (Informed Decisions)

L'utente non deve mai trovarsi in una situazione imprevista. Prima di ogni azione significativa (swipe, incontro, condivisione posizione), le informazioni necessarie sono gia visibili e chiare.

*Applicazione pratica:* La card di swipe mostra taglia, energia e comportamento con icone immediate. Prima di concedere i permessi, una schermata spiega il perche con linguaggio umano.

### 1.5 Calore e giocosita (Warm & Playful)

L'esperienza deve evocare la gioia di una passeggiata con il proprio cane. Colori caldi, angoli arrotondati, micro-animazioni giocose (non infantili), illustrazioni amichevoli. Il tono e quello di un amico che ti presenta qualcuno, non di un'app aziendale.

*Applicazione pratica:* L'animazione di match mostra due cani che si annusano. Le empty states usano illustrazioni con cani. I messaggi di sistema usano un tono colloquiale ("Nessun cane nelle vicinanze... per ora!").

### 1.6 Rispetto del tempo (Respect Time)

Ogni flusso deve essere completabile nel minor numero di tap possibile, senza sacrificare la qualita dell'informazione. Le attese sono sempre comunicate. Le azioni distruttive richiedono conferma, quelle costruttive no.

*Applicazione pratica:* L'onboarding completo richiede meno di 3 minuti. Lo swipe e fluido e senza interruzioni. La chat si apre con un tap dal match. I loading state sono sempre skeletons, mai spinner.

---

## 2. Service Blueprint

### 2.1 Customer Journey Map -- Flusso Principale

Il flusso principale copre il percorso dalla scoperta dell'app fino alla prima passeggiata completata.

```
FASI:          SCOPERTA       REGISTRAZIONE      PROFILING        DISCOVERY        MATCHING         CHAT          PASSEGGIATA
               ----------     --------------     ----------       ----------       ----------      ------        ------------
TEMPO:         Giorno 0       Giorno 0           Giorno 0         Giorno 0-1       Giorno 1-3      Giorno 1-5    Giorno 3-7
               (5 min)        (2 min)            (3 min)          (5-10 min)       (variabile)     (variabile)   (30-90 min)
```

#### Fase 1: Scoperta

| Livello | Dettaglio |
|---------|-----------|
| **Azioni utente** | Vede un post su Instagram / riceve un invito da amico / trova l'app nello store |
| **Touchpoint digitale** | App Store / Google Play listing, landing page, social ads, deep link referral |
| **Touchpoint fisico** | Volantino dal veterinario, QR code al parco cani, passaparola |
| **Pensiero utente** | "Sembra interessante, potrebbe risolvere il mio problema" |
| **Emozione** | Curiosita, leggero scetticismo |
| **Frontstage** | Store listing con screenshot, rating, descrizione. Landing page con video demo |
| **Backstage** | ASO (App Store Optimization), A/B test su screenshot e descrizione |
| **Support** | Campagne marketing geo-targetizzate, partnership veterinari, programma Ambassador |

#### Fase 2: Registrazione

| Livello | Dettaglio |
|---------|-----------|
| **Azioni utente** | Scarica l'app, vede le 3 slide di welcome, sceglie metodo di registrazione |
| **Touchpoint digitale** | Welcome slides, form di registrazione, OAuth flow (Google/Apple) |
| **Pensiero utente** | "Deve essere veloce e non chiedermi troppe cose subito" |
| **Emozione** | Impazienza, aspettativa |
| **Frontstage** | 3 slide animate con illustrazioni, bottoni social login prominenti, email come alternativa |
| **Backstage** | Auth service (Firebase/Supabase), verifica email OTP, creazione record utente |
| **Support** | Provider OAuth (Google, Apple), servizio email transazionale, anti-fraud |

#### Fase 3: Profiling (Creazione Profilo Cane)

| Livello | Dettaglio |
|---------|-----------|
| **Azioni utente** | Inserisce nome e foto del cane, seleziona taglia/razza, descrive comportamento, imposta preferenze passeggiata |
| **Touchpoint digitale** | Wizard a 4 step con progress bar, camera/gallery picker, selettori visivi, slider |
| **Pensiero utente** | "Devo descrivere bene il mio cane per trovare compagni adatti" |
| **Emozione** | Coinvolgimento (parla del proprio cane), leggera fatica se troppo lungo |
| **Frontstage** | Form a step con illustrazioni guida, feedback visivo immediato, salvataggio automatico |
| **Backstage** | Validazione dati, moderazione foto (AI), salvataggio profilo, calcolo iniziale pool matching |
| **Support** | Servizio moderazione immagini (AWS Rekognition), CDN per foto, lista razze FCI |

#### Fase 4: Discovery (Esplorazione)

| Livello | Dettaglio |
|---------|-----------|
| **Azioni utente** | Concede permesso geolocalizzazione, visualizza il feed di swipe, esplora profili |
| **Touchpoint digitale** | Permission request screen, swipe feed, profilo espanso del cane |
| **Pensiero utente** | "Vediamo chi c'e nella mia zona... questo cane sembra perfetto per il mio!" |
| **Emozione** | Eccitazione, valutazione, a volte delusione (se pochi risultati) |
| **Frontstage** | Card con foto grande, badge compatibilita, info chiave. Gesti swipe fluidi |
| **Backstage** | Match engine che calcola compatibilita, geolocation service, coda suggerimenti ordinata |
| **Support** | API geolocalizzazione, algoritmo matching, CDN immagini, cache Redis |

#### Fase 5: Matching

| Livello | Dettaglio |
|---------|-----------|
| **Azioni utente** | Fa swipe destro su un cane, riceve notifica di match reciproco |
| **Touchpoint digitale** | Animazione swipe, animazione "It's a Match!", push notification, match list |
| **Pensiero utente** | "Match! Ora possiamo organizzare una passeggiata!" |
| **Emozione** | Soddisfazione, entusiasmo, leggera ansia sociale |
| **Frontstage** | Animazione celebrativa con i due cani, CTA "Scrivi un messaggio" o "Continua a esplorare" |
| **Backstage** | Match service registra il match, trigger notifica push a entrambi, apertura canale chat |
| **Support** | Push notification service (Expo Notifications), WebSocket per real-time |

#### Fase 6: Chat

| Livello | Dettaglio |
|---------|-----------|
| **Azioni utente** | Apre la chat, si presenta, propone luogo/orario per la passeggiata |
| **Touchpoint digitale** | Chat interface, profilo cane visibile in header, suggerimenti contestuali |
| **Pensiero utente** | "Dove ci troviamo? A che ora? Il mio cane va d'accordo con cani di questa taglia?" |
| **Emozione** | Eccitazione, prudenza, organizzazione |
| **Frontstage** | Chat bubble con typing indicator, profilo cane accessibile dall'header, aree suggerite sulla mappa |
| **Backstage** | Chat service WebSocket, moderazione automatica messaggi, filtro contenuti |
| **Support** | Infrastruttura WebSocket, content moderation, sistema segnalazione |

#### Fase 7: Prima Passeggiata

| Livello | Dettaglio |
|---------|-----------|
| **Azioni utente** | Si incontra con l'altro proprietario, passeggia insieme, (futuro: traccia la passeggiata) |
| **Touchpoint digitale** | (Futuro: tracking GPS, timer passeggiata). MVP: la passeggiata avviene offline |
| **Touchpoint fisico** | Incontro al punto concordato, passeggiata con i cani, socializzazione |
| **Pensiero utente** | "Speriamo che i cani vadano d'accordo! L'app aveva ragione sulla compatibilita" |
| **Emozione** | Nervosismo iniziale, poi rilassamento e soddisfazione (se positiva) |
| **Frontstage** | (Futuro: bottone "Inizia passeggiata", mappa percorso, feedback post-passeggiata) |
| **Backstage** | (Futuro: GPS tracking, calcolo distanza/durata, prompt per feedback) |
| **Support** | (Futuro: feedback system, badge assignment, aggiornamento punteggio matching) |

### 2.2 Momenti di Verita (Moments of Truth)

| Momento | Fase | Impatto | Cosa puo andare storto | Mitigazione UX |
|---------|------|---------|------------------------|----------------|
| Primo profilo visualizzato | Discovery | Alto | Profilo scarno, foto di bassa qualita | Mostrare prima i profili piu completi e con foto migliori |
| Primo match | Matching | Critico | Nessun match per giorni | Notifica "Hai nuovi cani da scoprire", ampliamento raggio suggerito |
| Primo messaggio inviato | Chat | Alto | Ansia da primo contatto | Suggerimenti di icebreaker ("Ciao! Dove portate di solito [NomeCane]?") |
| Primo incontro fisico | Passeggiata | Critico | Cani incompatibili nella realta | Consigli pre-incontro in chat ("Suggerimenti per il primo incontro") |

---

## 3. Information Architecture

### 3.1 Sitemap dell'App

```
PawMeet App
|
+-- Splash Screen
|
+-- Onboarding (stack, non autenticato)
|   +-- Welcome Slides (3 pagine, pager orizzontale)
|   +-- Login
|   |   +-- Login con Email
|   |   +-- Recupero Password
|   +-- Registrazione
|   |   +-- Registrazione Email
|   |   +-- Verifica OTP
|   +-- Creazione Profilo Proprietario
|   +-- Wizard Profilo Cane
|   |   +-- Step 1: Informazioni Base (nome, data nascita, sesso, sterilizzazione)
|   |   +-- Step 2: Fisico (razza, taglia, peso)
|   |   +-- Step 3: Comportamento (energia, socialita, guinzaglio, bio)
|   |   +-- Step 4: Foto & Preferenze (foto, orari, durata, terreno)
|   +-- Richiesta Permessi (geolocalizzazione, notifiche)
|   +-- Tutorial Overlay
|
+-- App Principale (tab navigator, autenticato)
|   |
|   +-- [TAB 1] Home / Discovery
|   |   +-- Swipe Feed (stack di card)
|   |   +-- Profilo Cane Espanso (modal bottom sheet)
|   |   +-- Empty State (nessun cane / tutti visti)
|   |   +-- Filtri (bottom sheet)
|   |
|   +-- [TAB 2] Mappa
|   |   +-- Vista Mappa con marker
|   |   +-- Card Cane da marker (bottom sheet compatto)
|   |   +-- Filtro raggio (slider overlay)
|   |
|   +-- [TAB 3] Match / Chat
|   |   +-- Lista Match (griglia orizzontale, match senza chat)
|   |   +-- Lista Conversazioni (lista verticale, chat attive)
|   |   +-- Singola Chat (stack push)
|   |   |   +-- Header con profilo cane
|   |   |   +-- Messaggi (testo + immagini)
|   |   |   +-- Azioni: Profilo, Segnala, Blocca, Unmatch
|   |   +-- Empty State (nessun match)
|   |
|   +-- [TAB 4] Profilo
|       +-- Profilo Proprietario
|       +-- Lista Cani (con card per ogni cane)
|       +-- Modifica Profilo Proprietario
|       +-- Modifica Profilo Cane
|       +-- Aggiungi Nuovo Cane
|       +-- Impostazioni
|       |   +-- Notifiche
|       |   +-- Privacy
|       |   +-- Raggio di Ricerca
|       |   +-- Aspetto (Light/Dark/System)
|       |   +-- Lingua
|       |   +-- Informazioni App (versione, T&C, Privacy Policy)
|       |   +-- Supporto / FAQ
|       |   +-- Elimina Account
|       +-- Gestione Blocchi
|
+-- Modali Globali (accessibili ovunque)
    +-- Animazione Match ("It's a Match!")
    +-- Segnala Profilo / Messaggio
    +-- Blocca Utente
    +-- Conferma Unmatch
    +-- Aggiornamento Richiesto (force update)
    +-- Errore di Rete
    +-- Permessi Mancanti
```

### 3.2 Navigation Model

L'app utilizza un modello di navigazione ibrido ottimizzato per React Navigation (Expo):

```
NavigationContainer
|
+-- RootStack (Stack.Navigator, screenOptions: { headerShown: false })
    |
    +-- AuthStack (Stack.Navigator) -- se utente non autenticato
    |   +-- WelcomeScreen
    |   +-- LoginScreen
    |   +-- RegisterScreen
    |   +-- OTPVerificationScreen
    |   +-- OwnerProfileScreen
    |   +-- DogWizardScreen (step interni gestiti con state locale)
    |   +-- PermissionsScreen
    |
    +-- MainTabs (Bottom Tab Navigator) -- se utente autenticato
    |   +-- DiscoveryStack (Stack.Navigator)
    |   |   +-- SwipeFeedScreen
    |   |   +-- DogProfileDetailScreen (presentazione modal)
    |   |
    |   +-- MapScreen (singola schermata)
    |   |
    |   +-- ChatStack (Stack.Navigator)
    |   |   +-- MatchListScreen
    |   |   +-- ChatScreen
    |   |
    |   +-- ProfileStack (Stack.Navigator)
    |       +-- ProfileScreen
    |       +-- EditOwnerProfileScreen
    |       +-- EditDogProfileScreen
    |       +-- AddDogScreen
    |       +-- SettingsScreen
    |       +-- SubSettingsScreens (notifiche, privacy, etc.)
    |
    +-- MatchModal (Stack.Screen, presentation: 'transparentModal')
    +-- ReportModal (Stack.Screen, presentation: 'modal')
    +-- BlockConfirmModal (Stack.Screen, presentation: 'transparentModal')
```

**Principi di navigazione:**

- **Tab bar** sempre visibile nelle 4 sezioni principali (Discovery, Mappa, Chat, Profilo)
- **Stack navigation** per drill-down all'interno di ogni tab
- **Modal presentation** per azioni overlay (match animation, report, block)
- **Bottom sheet** per contenuti espandibili (profilo cane espanso, filtri)
- **Gesti nativi** per tornare indietro (swipe edge su iOS, back button su Android)

---

## 4. Design System Specification

### 4.1 Colori

#### Palette Primaria

| Nome | Hex | Utilizzo |
|------|-----|----------|
| **Primary** | `#065F46` | CTA principali, accenti, tab attivo, link |
| **Primary Light** | `#059669` | Hover/press state, background leggero |
| **Primary Dark** | `#064E3B` | Testo su sfondo chiaro quando serve piu contrasto |
| **Primary 50** | `#ECFDF5` | Background tinted, card selezionate, badge background |

Il verde smeraldo profondo e stato scelto perche evoca la natura, la fiducia e un senso di qualita premium -- in linea con il mood "vita nella natura di lusso". E sufficientemente distinto dal rosso (errore) e dal giallo (warning) per evitare ambiguita semantiche.

#### Palette Secondaria

| Nome | Hex | Utilizzo |
|------|-----|----------|
| **Secondary** | `#C9A84C` | Elementi secondari, badge compatibilita alta, accenti dorati |
| **Secondary Light** | `#E0B04E` | Background secondari, indicatori positivi |
| **Secondary Dark** | `#8B6914` | Testo secondario su sfondo chiaro (secondary-text) |
| **Secondary 50** | `#FDF8EF` | Background sezione, card sfondo alternativo |

Il champagne gold richiama eleganza e calore, bilanciando il verde smeraldo primario con un accento luminoso e premium.

**Nota accessibilita:** Il colore `Secondary (#C9A84C)` non deve MAI essere usato come testo su sfondi chiari (contrasto 2.29:1 FAIL). Per testo su sfondo chiaro, usare `Secondary Dark (#8B6914)` che ha contrasto 4.86:1 (AA).

#### Palette Neutra

| Nome | Light Mode | Dark Mode | Utilizzo |
|------|-----------|-----------|----------|
| **Neutral 900** | `#1A1A2E` | `#F5F5F7` | Testo primario |
| **Neutral 700** | `#4A4A5A` | `#D1D1D6` | Testo secondario |
| **Neutral 500** | `#8E8E93` | `#8E8E93` | Testo placeholder, icone inattive |
| **Neutral 300** | `#C7C7CC` | `#48484A` | Bordi, divisori |
| **Neutral 200** | `#E5E5EA` | `#38383A` | Background secondario |
| **Neutral 100** | `#F2F2F7` | `#2C2C2E` | Background card |
| **Neutral 50** | `#FAFAFA` | `#1C1C1E` | Background principale |
| **White** | `#FFFFFF` | `#000000` | Card background, superfici elevate |

#### Colori Semantici

| Nome | Light Mode | Dark Mode | Utilizzo |
|------|-----------|-----------|----------|
| **Success** | `#34C759` | `#30D158` | Match confermato, profilo verificato, azione completata |
| **Error** | `#FF3B30` | `#FF453A` | Errori, segnalazioni, eliminazione, cane reattivo |
| **Warning** | `#FF9500` | `#FFD60A` | Attenzione, profilo incompleto, compatibilita bassa |
| **Info** | `#007AFF` | `#0A84FF` | Informazioni, tooltip, link, messaggi di sistema |

#### Colori Specifici PawMeet

| Nome | Hex | Utilizzo |
|------|-----|----------|
| **Compatibility High** | `#34C759` | Badge compatibilita >= 75% |
| **Compatibility Medium** | `#FF9500` | Badge compatibilita 50-74% |
| **Compatibility Low** | `#FF3B30` | Badge compatibilita < 50% (raramente mostrato) |
| **Premium Gold** | `#FFD700` | Badge premium, feature premium |
| **Chat Bubble Sent** | `#065F46` | Bolla messaggio inviato |
| **Chat Bubble Received** | `#F2F2F7` (light) / `#2C2C2E` (dark) | Bolla messaggio ricevuto |
| **Map Radius** | `#065F4620` | Area raggio di ricerca sulla mappa (20% opacita) |

#### Light/Dark Mode

Il supporto dark mode e implementato tramite il sistema di design tokens (vedi sezione 8). L'app rispetta la preferenza di sistema come default, con possibilita di override manuale nelle impostazioni (Light / Dark / System).

Regole per il dark mode:
- Le superfici usano grigi scuri, MAI nero puro (#000000) per le superfici elevate
- Il colore Primary resta invariato (#065F46) -- ha contrasto sufficiente su sfondo scuro
- Le ombre diventano piu sottili e scure
- Le immagini e le foto non vengono alterate
- Le illustrazioni hanno una variante dark mode con sfondi adattati

### 4.2 Tipografia

#### Font Family

**Font primario: Inter**

Motivazioni:
- Open source e gratuito (Google Fonts), nessun costo di licenza
- Eccellente leggibilita su schermi piccoli
- Ampio range di pesi (100-900)
- Supporto ottimo per caratteri latini estesi (accenti italiani)
- Facilmente integrabile con Expo (`expo-font` + `@expo-google-fonts/inter`)
- Tono professionale ma amichevole, adatto sia a Roberto che a Sofia

**Font fallback:** System (San Francisco su iOS, Roboto su Android)

#### Scala Tipografica

| Token | Dimensione | Line Height | Weight | Utilizzo |
|-------|-----------|-------------|--------|----------|
| **displayLarge** | 32px | 40px | 700 (Bold) | Titolo schermata principale, "It's a Match!" |
| **displayMedium** | 28px | 36px | 700 (Bold) | Titolo sezione principale |
| **headingLarge** | 24px | 32px | 600 (SemiBold) | Nome cane su card espansa |
| **headingMedium** | 20px | 28px | 600 (SemiBold) | Titolo sezione, heading schermata |
| **headingSmall** | 17px | 24px | 600 (SemiBold) | Sottotitolo, nome in lista |
| **bodyLarge** | 17px | 24px | 400 (Regular) | Testo corpo principale, messaggi chat |
| **bodyMedium** | 15px | 22px | 400 (Regular) | Testo corpo secondario, descrizione card |
| **bodySmall** | 13px | 18px | 400 (Regular) | Testo di supporto, timestamp, distanza |
| **labelLarge** | 17px | 22px | 600 (SemiBold) | Label bottone, tab label attivo |
| **labelMedium** | 13px | 18px | 600 (SemiBold) | Badge, chip, tag, tab label inattivo |
| **labelSmall** | 11px | 16px | 600 (SemiBold) | Caption, helper text, contatori |
| **caption** | 11px | 16px | 400 (Regular) | Timestamp, note, disclaimer |

**Note implementative:**
- Tutte le dimensioni sono in punti logici (scalano con Dynamic Type)
- Usare `allowFontScaling: true` su tutti i componenti `Text`
- Definire `maxFontSizeMultiplier: 1.5` per evitare layout break su scale estreme

### 4.3 Spacing & Grid

#### Spacing Scale (base 4px)

| Token | Valore | Utilizzo |
|-------|--------|----------|
| `xxs` | 2px | Micro-spacing, gap tra icona e badge |
| `xs` | 4px | Padding interno badge, gap minimo |
| `sm` | 8px | Padding interno bottoni piccoli, gap tra elementi inline |
| `md` | 12px | Padding interno card, gap tra elementi di lista |
| `base` | 16px | Padding standard, margini orizzontali dello schermo |
| `lg` | 20px | Spazio tra sezioni minori |
| `xl` | 24px | Spazio tra componenti principali |
| `2xl` | 32px | Spazio tra sezioni maggiori |
| `3xl` | 40px | Padding top/bottom di schermate |
| `4xl` | 48px | Spazio prominente, separatori di sezione |
| `5xl` | 64px | Spazio massimo, top di schermate con header grande |

#### Grid System

```
Schermo mobile (375px reference width - iPhone 13/14)
|
+-- Margini laterali: 16px (base) per lato
+-- Area contenuto: 343px
+-- Colonne: 4 colonne con 8px gutter
|   +-- Colonna singola: ~78px
|   +-- 2 colonne: ~164px
|   +-- 3 colonne: ~250px
|   +-- Full width: 343px
+-- Safe area top: rispetta il notch/dynamic island
+-- Safe area bottom: rispetta la home indicator (34px su iPhone con notch)
```

**Breakpoint per tablet (iPad):**

| Breakpoint | Larghezza | Layout |
|------------|-----------|--------|
| Mobile | < 768px | 4 colonne, layout standard |
| Tablet | >= 768px | 8 colonne, split view (lista + dettaglio) |

In Expo, usare `useWindowDimensions()` per il layout responsivo.

### 4.4 Border Radius

| Token | Valore | Utilizzo |
|-------|--------|----------|
| `none` | 0px | Nessun arrotondamento |
| `sm` | 4px | Badge piccoli, chip |
| `md` | 8px | Input field, card secondarie |
| `lg` | 12px | Card principali, bottom sheet |
| `xl` | 16px | Card di swipe, modal |
| `2xl` | 24px | Bottoni pill, avatar |
| `full` | 9999px | Avatar circolari, bottoni rotondi, badge circolari |

### 4.5 Ombre (Shadows)

| Token | Light Mode | Dark Mode | Utilizzo |
|-------|-----------|-----------|----------|
| `sm` | `0 1px 2px rgba(0,0,0,0.06)` | `0 1px 2px rgba(0,0,0,0.3)` | Card in lista, input focus |
| `md` | `0 2px 8px rgba(0,0,0,0.10)` | `0 2px 8px rgba(0,0,0,0.4)` | Card swipe, bottom sheet peek |
| `lg` | `0 4px 16px rgba(0,0,0,0.12)` | `0 4px 16px rgba(0,0,0,0.5)` | Modal, bottom sheet espanso |
| `xl` | `0 8px 32px rgba(0,0,0,0.16)` | `0 8px 32px rgba(0,0,0,0.6)` | Card swipe in movimento, overlay |

**Nota RN:** React Native non supporta `box-shadow` come CSS. Usare le proprieta `shadowColor`, `shadowOffset`, `shadowOpacity`, `shadowRadius` su iOS e `elevation` su Android. Per coerenza cross-platform, usare la libreria `react-native-shadow-2` o implementare le ombre con `elevation` + `shadowColor`.

### 4.6 Componenti UI Core

#### 4.6.1 Button

Quattro varianti principali:

| Variante | Background | Testo | Border | Utilizzo |
|----------|-----------|-------|--------|----------|
| **Primary** | `Primary (#065F46)` | `White` | Nessuno | CTA principali: "Registrati", "Invia messaggio", "Salva" |
| **Secondary** | `Transparent` | `Primary` | `1px Primary` | Azioni secondarie: "Annulla", "Modifica", "Vedi profilo" |
| **Ghost** | `Transparent` | `Neutral 700` | Nessuno | Azioni terziarie: "Salta", "Dopo", link inline |
| **Destructive** | `Error` | `White` | Nessuno | Azioni distruttive: "Blocca", "Elimina account", "Segnala" |

**Proprieta comuni:**
- Altezza: 48px (standard), 40px (compact), 56px (large)
- Border radius: `2xl` (24px) -- stile pill per coerenza con il tono amichevole
- Padding orizzontale: 24px (standard), 16px (compact)
- Font: `labelLarge` (17px, Medium)
- Touch target minimo: 48x48px (superiore al minimo di 44x44)
- Stato disabled: opacita 0.4
- Stato pressed: opacita 0.8 + scale(0.97) con animazione spring
- Stato loading: spinner al posto del testo, dimensione invariata
- Supporto icona: sinistra o destra del testo, 20x20px, gap 8px

#### 4.6.2 Card

**Dog Profile Card (Swipe Card)**

```
+------------------------------------------+
|                                          |
|          [FOTO CANE FULL BLEED]          |
|              (aspect 3:4)                |
|                                          |
|   [Badge Compatibilita]                 |
|                                          |
|  +--------------------------------------+|
|  | Luna, 2 anni              ~1.2 km   ||
|  | Labrador  |  Media  |  Alta energia  ||
|  | [Icona zampa] Molto socievole        ||
|  +--------------------------------------+|
+------------------------------------------+
```

- Dimensione: full width meno 16px per lato, altezza ~80% dello schermo
- Border radius: `xl` (16px)
- Ombra: `lg` a riposo, `xl` durante il drag
- Gradient overlay in basso sulla foto per leggibilita del testo (linear-gradient da transparent a rgba(0,0,0,0.6))
- Badge compatibilita: angolo in alto a destra, 48px, circolare
- Informazioni in overlay sul gradient: nome + eta, razza, taglia + energia, comportamento

**Match Card (nella lista match)**

```
+----------+
| [Avatar  |
|  cane]   |
| Luna     |
+----------+
```

- Dimensione: 72x96px
- Avatar cane circolare: 64x64px
- Nome sotto: `labelSmall`, centrato, max 1 riga con ellipsis
- Border: 2px `Primary` se match nuovo (non ancora aperta la chat)
- Scroll orizzontale nella lista match

**User/Chat Card (nella lista conversazioni)**

```
+-----------------------------------------------+
| [Avatar] Luna & Giulia           14:32        |
|          Ci vediamo al parco alle 18?          |
|          [Badge non letto]                     |
+-----------------------------------------------+
```

- Altezza: 72px
- Avatar cane: 48x48px, circolare
- Nome cane + proprietario: `headingSmall`, 1 riga
- Anteprima messaggio: `bodyMedium`, `Neutral 500`, 1 riga con ellipsis
- Timestamp: `caption`, allineato a destra
- Badge non letto: cerchio `Primary`, 20x20px, con contatore

#### 4.6.3 Input

**Text Input**

- Altezza: 48px
- Border: 1px `Neutral 300`, border radius `md` (8px)
- Focus: border 2px `Primary`, ombra `sm`
- Error: border 2px `Error`, messaggio errore sotto in `Error` + `caption`
- Placeholder: `Neutral 500`, `bodyMedium`
- Label sopra: `labelMedium`, `Neutral 700`, margin bottom 4px
- Padding interno: 12px orizzontale
- Icona opzionale a sinistra (20x20, `Neutral 500`) o a destra (azione: clear, toggle password)

**Select / Dropdown**

- Stesso stile del Text Input
- Icona chevron-down a destra
- Apre un bottom sheet con lista di opzioni (non il picker nativo, per coerenza cross-platform)

**Slider**

- Track height: 4px, `Neutral 200`
- Track filled: `Primary`
- Thumb: 24x24px, `White`, ombra `md`, bordo 2px `Primary`
- Label valore: sopra il thumb durante il drag, `labelMedium`, background `Primary`, testo `White`
- Range slider (per durata passeggiata): due thumb

**Multi-Select (Chip Group)**

- Chip non selezionato: background `Neutral 100`, testo `Neutral 700`, border 1px `Neutral 300`
- Chip selezionato: background `Primary 50`, testo `Primary`, border 1px `Primary`
- Chip dimensione: altezza 36px, padding orizzontale 12px, border radius `full`
- Gap tra chip: 8px
- Layout: flex wrap

**Date Picker**

- Bottone che mostra la data selezionata nel formato "GG/MM/AAAA"
- Apre il date picker nativo del sistema operativo (rispetta la piattaforma)
- Validazione: non futura, non oltre 25 anni fa

#### 4.6.4 Avatar

**Avatar Utente (Proprietario)**

| Dimensione | Pixel | Utilizzo |
|------------|-------|----------|
| XS | 24x24px | Inline nel testo, menzioni |
| SM | 32x32px | Lista compatta |
| MD | 40x40px | Header chat, commenti |
| LG | 48x48px | Lista conversazioni |
| XL | 64x64px | Profilo, match card |
| 2XL | 96x96px | Profilo proprietario espanso |

- Forma: circolare (border radius `full`)
- Placeholder: icona utente generica su sfondo `Neutral 200`
- Border opzionale: 2px `White` quando sovrapposto a immagini

**Avatar Cane**

Stesse dimensioni dell'avatar utente, con distinzione:

- Forma: circolare (come l'utente)
- Placeholder: icona zampa su sfondo `Primary 50`
- Badge angolare possibile (vedi sotto)

**Badge su Avatar**

- Posizione: angolo in basso a destra dell'avatar
- Dimensione: 33% del diametro dell'avatar (minimo 16px)
- Tipi: verificato (check verde), premium (stella dorata), online (cerchio verde)

#### 4.6.5 Badge

| Tipo | Background | Testo/Icona | Border Radius | Utilizzo |
|------|-----------|-------------|---------------|----------|
| **Compatibilita Alta** | `Success 10%` | `Success` + "85%" | `full` | Punteggio match >= 75% |
| **Compatibilita Media** | `Warning 10%` | `Warning` + "62%" | `full` | Punteggio match 50-74% |
| **Verificato** | `Info 10%` | `Info` + icona check | `full` | Utente con identita verificata |
| **Premium** | `#FFF8E1` | `Premium Gold` + icona stella | `full` | Utente premium |
| **Taglia** | `Neutral 100` | `Neutral 700` + "Media" | `sm` | Informazione taglia sulla card |
| **Energia** | `Neutral 100` | `Neutral 700` + "Alta" | `sm` | Informazione energia sulla card |
| **Nuovo** | `Primary` | `White` + "Nuovo" | `full` | Match nuovi, funzionalita nuove |
| **Contatore** | `Primary` | `White` + numero | `full` | Messaggi non letti, notifiche |

Dimensioni badge:
- Piccolo: altezza 20px, padding orizzontale 6px, font `labelSmall`
- Medio: altezza 24px, padding orizzontale 8px, font `labelMedium`
- Grande: altezza 32px, padding orizzontale 12px, font `labelMedium`

#### 4.6.6 SwipeCard (Componente Principale)

Il componente di swipe e il cuore dell'esperienza PawMeet. Implementazione consigliata: `react-native-gesture-handler` + `react-native-reanimated`.

```
Struttura dello stack di card:

   [Card 3] -- scala 0.90, translateY +16, opacity 0.5
  [Card 2]  -- scala 0.95, translateY +8, opacity 0.8
 [Card 1]   -- scala 1.0, interattiva (draggable)
```

**Specifiche tecniche:**

- Stack visibile: 3 card (solo la prima interattiva)
- Soglia swipe: 120px orizzontale per confermare l'azione
- Rotazione durante drag: max +/- 12 gradi, proporzionale allo spostamento
- Overlay di feedback:
  - Swipe destro: overlay verde con icona cuore, opacita proporzionale allo spostamento
  - Swipe sinistro: overlay rosso con icona X, opacita proporzionale allo spostamento
- Animazione di uscita: spring animation con `damping: 15`, `stiffness: 150`
- Animazione di entrata della card successiva: spring animation con scale da 0.95 a 1.0
- Tap sulla card: espande il profilo in un bottom sheet (non interferisce con il gesto di swipe)
- Bottoni alternativi allo swipe (per accessibilita): bottone X a sinistra, cuore a destra sotto la card
- Dimensioni bottoni azione: 56x56px, circolari, con ombra `md`

#### 4.6.7 Map Markers

**Marker Cane**

```
    +--------+
    |[Avatar]|  40x40px, circolare, con bordo
    +--------+
        V       puntatore triangolare 8px
```

- Avatar cane: 36x36px, circolare, dentro un contenitore 40x40 con bordo 2px `White`
- Puntatore: triangolo 8px sotto il cerchio, stesso colore del bordo
- Stato default: bordo `White`
- Stato selezionato: bordo `Primary`, dimensione 48x48, ombra `lg`
- Stato cluster: cerchio `Primary`, 40x40, con numero al centro in `White`

**Marker Posizione Utente**

- Cerchio pieno `Primary`, 16x16
- Cerchio pulsante intorno: `Primary 20%`, animazione pulse che va da 16px a 48px
- Cerchio raggio di ricerca: fill `Map Radius`, stroke `Primary 40%`, 1px dashed

#### 4.6.8 Chat Bubble

**Messaggio Inviato (destra)**

```
                        +--------------------+
                        | Ci vediamo alle 18 |
                        | al parco Sempione? |
                        +--------------------+
                                    14:32  vv
```

- Background: `Chat Bubble Sent` (#065F46)
- Testo: `White`, `bodyLarge`
- Border radius: 16px top-left, 16px top-right, 4px bottom-right, 16px bottom-left
- Padding: 12px orizzontale, 8px verticale
- Max width: 75% dello schermo
- Timestamp: `caption`, `White 70%`, allineato a destra sotto la bolla
- Read receipt: doppio check, `White 70%`

**Messaggio Ricevuto (sinistra)**

- Background: `Chat Bubble Received`
- Testo: `Neutral 900`, `bodyLarge`
- Border radius: 4px top-left, 16px top-right, 16px bottom-right, 16px bottom-left
- Avatar cane: 28x28 a sinistra della bolla (solo sul primo messaggio di un gruppo)
- Timestamp: `caption`, `Neutral 500`

**Messaggio con Immagine**

- Immagine con border radius della bolla, max width 240px
- Aspect ratio originale mantenuto
- Tap per espandere a full screen (lightbox)

#### 4.6.9 Bottom Tab Bar

```
+-------------------------------------------------------+
|  [Zampa]      [Mappa]       [Chat]       [Utente]     |
|  Scopri       Mappa         Chat         Profilo      |
+-------------------------------------------------------+
```

- Altezza: 49px (standard iOS) + safe area bottom
- Background: `White` (light) / `#1C1C1E` (dark), con blur effect (`BlurView`)
- Bordo top: 0.5px `Neutral 300`
- Icone: 24x24px
- Icona attiva: `Primary`, label `Primary`
- Icona inattiva: `Neutral 500`, label `Neutral 500`
- Label: `labelSmall` (11px)
- Badge notifica su Chat: cerchio `Primary` con contatore, 18px, posizione top-right dell'icona
- Animazione cambio tab: nessuna animazione sull'icona (evitare distrazioni per Roberto)

#### 4.6.10 Modal / Bottom Sheet

**Bottom Sheet**

Implementazione: `@gorhom/bottom-sheet`

- Handle: 36x4px, `Neutral 300`, border radius `full`, centrato, margin top 8px
- Background: `White` / `Neutral 50` (dark)
- Border radius top: `lg` (12px)
- Ombra: `xl`
- Snap points configurabili per sheet (tipicamente 25%, 50%, 90%)
- Backdrop: `rgba(0,0,0,0.5)`, tap per chiudere
- Gesture: drag per espandere/ridurre/chiudere

**Modal Centrato**

- Background: `White`, border radius `xl`
- Padding: 24px
- Max width: 320px, centrato verticalmente e orizzontalmente
- Backdrop: `rgba(0,0,0,0.5)`, tap per chiudere (se non critico)
- Utilizzato per: conferme distruttive (blocco, elimina), match animation

#### 4.6.11 Toast / Snackbar

- Posizione: top dello schermo, sotto la safe area
- Altezza: auto (min 48px)
- Margin: 16px laterale
- Border radius: `lg` (12px)
- Ombra: `lg`
- Durata: 3 secondi (auto-dismiss), swipe up per chiudere
- Varianti:

| Tipo | Icona Sinistra | Background | Bordo Sinistro |
|------|---------------|-----------|----------------|
| Success | check-circle | `White` | 3px `Success` |
| Error | alert-circle | `White` | 3px `Error` |
| Warning | alert-triangle | `White` | 3px `Warning` |
| Info | info | `White` | 3px `Info` |

- Testo: `bodyMedium`, `Neutral 900`
- Azione opzionale: link `Ghost` a destra ("Annulla", "Vedi")

#### 4.6.12 Empty State

Layout standard per tutte le empty states:

```
+------------------------------------------+
|                                          |
|          [Illustrazione]                 |
|            160x160px                     |
|                                          |
|     Titolo dell'empty state              |
|     headingMedium, centrato              |
|                                          |
|     Descrizione esplicativa e            |
|     suggerimento di azione.              |
|     bodyMedium, Neutral 500, centrato    |
|                                          |
|        [  Bottone CTA  ]                |
|        (opzionale)                       |
|                                          |
+------------------------------------------+
```

Empty states specifiche:

| Contesto | Illustrazione | Titolo | Descrizione | CTA |
|----------|--------------|--------|-------------|-----|
| Feed vuoto (nessun cane) | Cane con binocolo | "Nessun cane nelle vicinanze" | "Prova ad aumentare il raggio di ricerca o torna piu tardi" | "Aumenta raggio" |
| Feed esaurito (tutti visti) | Cane che dorme | "Hai visto tutti!" | "Torna domani per nuovi suggerimenti, o allarga il raggio" | "Modifica filtri" |
| Nessun match | Due cani che si guardano | "Nessun match ancora" | "Continua a esplorare per trovare il compagno perfetto" | "Vai al Discovery" |
| Chat vuota (match senza messaggi) | Cane con fumetto | "Inizia la conversazione!" | "Fai il primo passo e organizza una passeggiata" | Nessuno (focus sull'input) |
| Errore di rete | Cane con cavo spezzato | "Connessione persa" | "Controlla la tua connessione internet e riprova" | "Riprova" |

#### 4.6.13 Loading Skeleton

Utilizzare skeleton screens (shimmer) invece di spinner per tutti i caricamenti di contenuto.

- Colore base: `Neutral 200` (light) / `Neutral 100` (dark)
- Colore shimmer: `Neutral 100` (light) / `Neutral 200` (dark)
- Animazione: shimmer da sinistra a destra, durata 1.5s, loop infinito
- Forma: replica la forma del contenuto che sta caricando (rettangoli per testo, cerchi per avatar, rettangoli con border radius per card)

Skeleton specifici:
- **Swipe card skeleton:** rettangolo full size con gradient shimmer
- **Lista conversazioni skeleton:** 5 righe con cerchio 48px + 2 linee di testo
- **Profilo cane skeleton:** immagine placeholder + 4 linee di testo

Implementazione consigliata: `react-native-skeleton-placeholder` o `moti/skeleton` (integrato con Moti/Reanimated).

### 4.7 Iconografia

#### Icon Set: Lucide Icons

Motivazioni della scelta:
- Open source (ISC license)
- Peso leggero (~24KB per il set completo tree-shaken)
- Stile outline coerente, stroke 2px
- Ampio catalogo (1400+ icone)
- Ottima integrazione con React Native via `lucide-react-native`
- Design pulito e moderno, leggibile anche a dimensioni ridotte

Dimensioni standard icone:
- 16px: inline nel testo, badge
- 20px: dentro bottoni, input
- 24px: tab bar, azioni principali, lista
- 32px: icone prominenti, empty state secondarie

#### Mappatura Icone Lucide

| Funzione | Icona Lucide | Nome |
|----------|-------------|------|
| Discovery / Home | `search` | Search |
| Mappa | `map-pin` | MapPin |
| Chat | `message-circle` | MessageCircle |
| Profilo | `user` | User |
| Cuore / Like | `heart` | Heart |
| Rifiuta / X | `x` | X |
| Impostazioni | `settings` | Settings |
| Notifiche | `bell` | Bell |
| Foto / Camera | `camera` | Camera |
| Modifica | `edit-3` | Edit3 |
| Filtri | `sliders-horizontal` | SlidersHorizontal |
| Posizione | `map-pin` | MapPin |
| Distanza | `navigation` | Navigation |
| Tempo / Orario | `clock` | Clock |
| Calendario | `calendar` | Calendar |
| Check / Verifica | `check-circle` | CheckCircle |
| Errore / Alert | `alert-circle` | AlertCircle |
| Info | `info` | Info |
| Chiudi | `x` | X |
| Indietro | `chevron-left` | ChevronLeft |
| Espandi | `chevron-down` | ChevronDown |
| Menu azioni | `more-horizontal` | MoreHorizontal |
| Segnala | `flag` | Flag |
| Blocca | `shield-off` | ShieldOff |
| Invia messaggio | `send` | Send |
| Immagine | `image` | Image |
| Condividi | `share` | Share |
| Stella (premium) | `star` | Star |
| Percorso / Trail | `route` | Route |
| Montagna | `mountain` | Mountain |
| Albero / Parco | `trees` | Trees |
| Spiaggia | `waves` | Waves |
| Citta / Urbano | `building-2` | Building2 |
| Peso | `scale` | Scale (o custom) |
| Energia bassa | `battery-low` | BatteryLow |
| Energia media | `battery-medium` | BatteryMedium |
| Energia alta | `battery-full` | BatteryFull |
| Maschio | `circle-dot` | Custom (vedi sotto) |
| Femmina | `circle` | Custom (vedi sotto) |

#### Custom Icons (SVG)

Icone specifiche per il dominio canino non disponibili in Lucide, da creare come SVG custom:

| Icona | Descrizione | Utilizzo |
|-------|-------------|----------|
| **paw** | Zampa di cane (stilizzata) | Logo app, icona tab Discovery, placeholder avatar cane |
| **bone** | Osso (stilizzato) | Gamification, reward, empty state |
| **leash** | Guinzaglio | Indicatore comportamento al guinzaglio |
| **dog-face** | Muso di cane (stilizzato) | Placeholder profilo cane |
| **two-dogs** | Due cani affiancati | Animazione match, illustrazione |
| **dog-size-toy** | Silhouette cane toy | Selettore taglia |
| **dog-size-small** | Silhouette cane piccolo | Selettore taglia |
| **dog-size-medium** | Silhouette cane medio | Selettore taglia |
| **dog-size-large** | Silhouette cane grande | Selettore taglia |
| **dog-size-giant** | Silhouette cane gigante | Selettore taglia |
| **sociable** | Cane con coda scodinzolante | Badge comportamento socievole |
| **reactive** | Cane con postura allerta | Badge comportamento reattivo |
| **male** | Simbolo maschio (cerchio con freccia) | Indicatore sesso |
| **female** | Simbolo femmina (cerchio con croce) | Indicatore sesso |

Le icone custom devono seguire le stesse linee guida delle icone Lucide:
- Viewbox: 24x24
- Stroke width: 2px
- Stroke linecap: round
- Stroke linejoin: round
- Nessun fill (solo stroke), salvo eccezioni esplicite

---

## 5. Screen Inventory

Lista completa di tutte le schermate dell'MVP con descrizione, componenti chiave e note implementative.

### 5.1 Onboarding

| # | Schermata | Descrizione | Componenti Chiave | Note |
|---|-----------|-------------|-------------------|------|
| O-01 | **Splash Screen** | Logo PawMeet centrato, sfondo `Primary`. Mostrato durante il caricamento iniziale dell'app | Logo, sfondo colore | Durata max 2s. Animazione fade-out |
| O-02 | **Welcome Slide 1** | "Trova il compagno perfetto per il tuo cane" + illustrazione cani che passeggiano | Illustrazione, titolo, descrizione, page indicator, bottone "Avanti" | Pager orizzontale con 3 slide |
| O-03 | **Welcome Slide 2** | "Matching intelligente" + illustrazione algoritmo/compatibilita | Come O-02 | Swipe o tap "Avanti" |
| O-04 | **Welcome Slide 3** | "Chat sicura per organizzare passeggiate" + illustrazione chat | Come O-02 + bottone "Inizia" e link "Hai gia un account?" | Ultima slide, CTA prominente |
| O-05 | **Login** | Form di accesso con email/password, social login (Google, Apple) | Input email, input password, bottone "Accedi", divider "oppure", bottoni social, link "Registrati", link "Password dimenticata?" | Apple Sign-In obbligatorio su iOS |
| O-06 | **Registrazione** | Form di registrazione | Input email, input password, input conferma password, checkbox T&C, checkbox marketing (opt.), bottone "Registrati", bottoni social | Validazione real-time password |
| O-07 | **Verifica OTP** | Inserimento codice OTP inviato via email | 6 input singoli per cifra OTP, timer resend, bottone "Verifica", link "Reinvia codice" | Auto-advance quando si digita ogni cifra |
| O-08 | **Recupero Password** | Inserimento email per reset password | Input email, bottone "Invia link", link "Torna al login" | Conferma generica (non rivela se email esiste) |
| O-09 | **Profilo Proprietario** | Nome e foto del proprietario | Input nome, avatar picker (camera/gallery), bottone "Continua" | Foto opzionale, non bloccante |
| O-10 | **Wizard Cane - Step 1/4: Info Base** | Nome, data nascita, sesso, sterilizzazione | Input nome, date picker, selettore sesso (2 opzioni), toggle sterilizzato, progress bar (1/4), bottone "Continua" | Tutti i campi obbligatori |
| O-11 | **Wizard Cane - Step 2/4: Fisico** | Razza, taglia, peso | Autocomplete razza con ricerca, selettore taglia (5 silhouette cane), input peso con slider, progress bar (2/4) | Warning se peso incoerente con taglia |
| O-12 | **Wizard Cane - Step 3/4: Comportamento** | Energia, socialita, guinzaglio, bio | 4 selettori orizzontali con icone e descrizione per ciascun livello, textarea bio (opz.), progress bar (3/4) | Ogni opzione ha una breve descrizione sotto |
| O-13 | **Wizard Cane - Step 4/4: Foto & Preferenze** | Foto, orari, durata, terreno | Griglia foto 3x2 (prima = principale), multi-select chip per orari, range slider per durata, multi-select chip per terreno, progress bar (4/4) | Minimo 1 foto obbligatoria |
| O-14 | **Richiesta Permessi** | Spiegazione e richiesta permessi di geolocalizzazione e notifiche | Illustrazione, testo esplicativo per ogni permesso, bottone "Attiva Posizione", bottone "Attiva Notifiche", link "Dopo" | Due step sequenziali. Se rifiuta, l'app funziona ma con limitazioni |
| O-15 | **Tutorial Overlay** | Overlay semitrasparente sul feed di swipe che spiega i gesti | Overlay con frecce e testo: "Scorri a destra = interessato", "Scorri a sinistra = passa", "Tocca = dettagli" | Skippabile. Mostrato solo al primo accesso |

### 5.2 App Principale

| # | Schermata | Descrizione | Componenti Chiave | Note |
|---|-----------|-------------|-------------------|------|
| M-01 | **Home / Discovery (Swipe Feed)** | Schermata principale. Stack di card cane da valutare con swipe | SwipeCard stack (3 visibili), bottoni Like/Dislike sotto le card, filtri (icona top-right), contatore "X cani da scoprire" | Schermata piu critica per la retention |
| M-02 | **Profilo Cane Espanso** | Dettaglio completo del cane, aperto con tap sulla card o swipe up | Bottom sheet espandibile (50% -> 90%). Gallery foto scorrevole, nome + eta + razza, tutte le info comportamentali, punteggio compatibilita dettagliato, nome proprietario, distanza | Bottoni Like/Pass sempre visibili in basso |
| M-03 | **Filtri Discovery** | Bottom sheet con filtri per raffinare i suggerimenti | Slider raggio (1-25km), multi-select taglia, multi-select energia, multi-select orari, bottone "Applica", bottone "Reset" | I filtri riducono la coda, non ricalcolano il punteggio |
| M-04 | **Mappa** | Vista mappa con marker dei cani nelle vicinanze | Mappa (MapView), marker cane, marker posizione utente, cerchio raggio, slider raggio, card preview on tap marker | Usare `react-native-maps` con provider Google/Apple |
| M-05 | **Card Cane da Mappa** | Card compatta che appare tappando un marker | Bottom sheet compatto (25%): foto + nome + razza + compatibilita + distanza + bottone "Vedi profilo" | Tap apre il profilo espanso (M-02) |
| M-06 | **Match & Chat List** | Lista dei match e delle conversazioni attive | Scroll orizzontale match (senza chat avviata), lista verticale conversazioni (ordinate per ultimo messaggio), badge non letti | Tab singolo che combina match e chat |
| M-07 | **Chat** | Conversazione con un match | Header (avatar cane + nome + azioni), lista messaggi (bolle), input messaggio + bottone invio + allegato foto, typing indicator | Pull-up per storico. Auto-scroll su nuovo messaggio |
| M-08 | **Chat - Profilo da Header** | Accesso rapido al profilo cane dall'header della chat | Stesso di M-02 ma aperto come modal stack push | Accessibile tappando l'avatar nell'header chat |
| M-09 | **Profilo Utente** | Profilo del proprietario con i propri cani | Avatar grande, nome, data iscrizione, lista card cani (con badge e stats ciascuno), bottone "Modifica profilo", bottone "Impostazioni", link "Aggiungi cane" | Hub personale |
| M-10 | **Modifica Profilo Proprietario** | Form di modifica dati proprietario | Input nome, avatar picker, bottone "Salva" | Salvataggio immediato con feedback toast |
| M-11 | **Modifica Profilo Cane** | Form di modifica dati cane (stessa struttura del wizard, ma tutti i campi su una schermata scrollabile) | Tutti i campi del wizard in sezioni collapsabili, gestione foto (riordina, aggiungi, rimuovi), bottone "Salva" | Modifica non richiede ri-approvazione foto se non cambiate |
| M-12 | **Aggiungi Nuovo Cane** | Wizard identico a O-10/O-13 | Come il wizard onboarding | Max 5 cani per account |
| M-13 | **Impostazioni** | Lista di opzioni di configurazione | Lista con icone: Notifiche, Privacy, Raggio di Ricerca, Aspetto, Lingua, Info App, Supporto, Gestione Blocchi, Elimina Account | Sezioni separate con header |
| M-14 | **Impostazioni - Notifiche** | Toggle granulari per ogni tipo di notifica | Toggle per: match, messaggi, suggerimenti, orario silenzioso (time picker inizio/fine) | Default tutti attivi |
| M-15 | **Impostazioni - Privacy** | Opzioni di privacy | Toggle: visibilita profilo, distanza approssimativa, ultimo accesso in chat | Spiegazione sotto ogni toggle |
| M-16 | **Impostazioni - Raggio di Ricerca** | Slider per impostare il raggio | Slider 1-25km con valore visualizzato, anteprima mappa con cerchio | Aggiornamento in tempo reale sulla mappa |
| M-17 | **Impostazioni - Aspetto** | Selezione tema | 3 opzioni: Chiaro, Scuro, Sistema (default) | Anteprima in tempo reale |
| M-18 | **Impostazioni - Elimina Account** | Conferma eliminazione account | Warning, spiegazione conseguenze, input "ELIMINA" per conferma, bottone distruttivo | Double confirmation pattern. Irreversibile |

### 5.3 Flussi Modali e Overlay

| # | Schermata | Descrizione | Componenti Chiave | Note |
|---|-----------|-------------|-------------------|------|
| X-01 | **Animazione Match** | Schermata celebrativa quando avviene un match reciproco | Due foto cane affiancate con animazione, testo "E' un Match!", nome dei due cani, bottone "Scrivi un messaggio", bottone ghost "Continua a esplorare" | Modal trasparente sovrapposto. Confetti/particelle animate |
| X-02 | **Segnala Profilo** | Form di segnalazione di un profilo | Titolo "Segnala [NomeCane]", radio list categorie (profilo falso, foto inappropriata, info fuorvianti, comportamento sospetto, altro), textarea note (opz.), bottone "Invia Segnalazione" | Bottom sheet. Conferma con toast dopo invio |
| X-03 | **Segnala Messaggio** | Segnalazione di un messaggio specifico | Come X-02 ma con preview del messaggio segnalato e categorie chat (molestia, spam, contenuto esplicito, minaccia, altro) | Long press sul messaggio per attivare |
| X-04 | **Blocca Utente** | Conferma blocco | Modal centrato: "Vuoi bloccare [Nome]?", spiegazione conseguenze, bottone "Blocca" (distruttivo), bottone "Annulla" | Azione immediata, reversibile da impostazioni |
| X-05 | **Conferma Unmatch** | Conferma annullamento match | Modal centrato: "Vuoi annullare il match con [NomeCane]?", spiegazione (chat sara eliminata), bottone "Annulla match" (distruttivo), bottone "Torna alla chat" | Azione irreversibile |
| X-06 | **Aggiornamento Richiesto** | Force update quando la versione e troppo vecchia | Modal non dismissabile: icona aggiornamento, testo "Aggiorna PawMeet", descrizione, bottone "Aggiorna" (link allo store) | Bloccante. Solo per breaking changes API |
| X-07 | **Errore di Rete** | Overlay quando non c'e connessione | Banner top: icona wifi-off, "Nessuna connessione", bottone "Riprova" | Non bloccante, sovrapposto al contenuto cached |
| X-08 | **Permessi Mancanti** | Schermata quando un permesso necessario e stato negato | Illustrazione, spiegazione, bottone "Apri Impostazioni" (link alle impostazioni di sistema) | Per geolocalizzazione negata nel tab Discovery |

### 5.4 Conteggio Totale Schermate MVP

| Categoria | Schermate | Range ID |
|-----------|:---------:|----------|
| Onboarding | 15 | O-01 -- O-15 |
| App Principale | 18 | M-01 -- M-18 |
| Modali e Overlay | 8 | X-01 -- X-08 |
| **Totale** | **41** | |

---

## 6. Micro-interactions & Animations

Tutte le animazioni usano `react-native-reanimated` (v3+) per performance native. Configurazioni spring consigliate:

| Profilo | damping | stiffness | mass | Utilizzo |
|---------|---------|-----------|------|----------|
| **snappy** | 15 | 300 | 1 | Swipe, bottoni, toggle |
| **gentle** | 20 | 150 | 1 | Transizioni pagina, bottom sheet |
| **bouncy** | 10 | 200 | 1 | Match animation, celebrazioni |
| **slow** | 25 | 100 | 1 | Fade in/out, overlay |

### 6.1 Swipe Animation

| Fase | Proprieta | Da | A | Easing/Config |
|------|-----------|----|----|---------------|
| **Drag** | translateX | 0 | finger position | Segue il dito (gesture) |
| **Drag** | rotate | 0deg | +/-12deg | Proporzionale a translateX: `rotation = translateX / screenWidth * 12` |
| **Drag** | overlay opacity (like/nope) | 0 | 1 | Proporzionale a translateX: `opacity = Math.abs(translateX) / threshold` |
| **Release - Confermato** | translateX | posizione corrente | +/- screenWidth * 1.5 | Spring `snappy` |
| **Release - Confermato** | rotate | corrente | +/- 30deg | Spring `snappy` |
| **Release - Annullato** | translateX | corrente | 0 | Spring `snappy` |
| **Release - Annullato** | rotate | corrente | 0deg | Spring `snappy` |
| **Card successiva** | scale | 0.95 | 1.0 | Spring `gentle` |
| **Card successiva** | translateY | 8 | 0 | Spring `gentle` |
| **Card successiva** | opacity | 0.8 | 1.0 | Spring `gentle` |

Overlay feedback durante il drag:
- Swipe destro: icona cuore + testo "LIKE" in verde, rotazione leggera, opacita crescente
- Swipe sinistro: icona X + testo "NOPE" in rosso, rotazione leggera, opacita crescente

### 6.2 Match Animation ("E' un Match!")

Sequenza temporale (durata totale: ~2 secondi):

| Tempo | Elemento | Animazione |
|-------|----------|-----------|
| 0ms | Backdrop | Fade in `rgba(0,0,0,0.7)` -- timing 300ms |
| 100ms | Foto cane 1 (sinistra) | Slide in da sinistra + scale da 0.5 a 1.0 -- spring `bouncy` |
| 200ms | Foto cane 2 (destra) | Slide in da destra + scale da 0.5 a 1.0 -- spring `bouncy` |
| 400ms | Testo "E' un Match!" | Scale da 0 a 1.0 + opacity 0 a 1 -- spring `bouncy` |
| 500ms | Nomi dei cani | Fade in + translateY da 20 a 0 -- spring `gentle` |
| 600ms | Confetti / Particelle | Emissione particelle (cuori, zampe, stelline) per 1.5s |
| 800ms | Bottoni CTA | Fade in + translateY da 30 a 0 -- spring `gentle` |

Layout dell'animazione match:
```
+------------------------------------------+
|              [backdrop scuro]             |
|                                          |
|     +------+          +------+           |
|     |Foto 1|   [zampa] |Foto 2|          |
|     | cane  |          | cane  |          |
|     +------+          +------+           |
|                                          |
|          E' un Match!                    |
|     Luna & Biscotto                      |
|                                          |
|     [  Scrivi un messaggio  ]            |
|        Continua a esplorare              |
|                                          |
+------------------------------------------+
```

Foto: 120x120px, circolari, con bordo 3px `White`. L'icona zampa al centro (32px) fa da connettore visivo tra le due foto.

Per le particelle, usare `react-native-reanimated` con `createAnimatedComponent` su componenti `View` posizionati in modo assoluto, o la libreria `react-native-confetti-cannon`.

### 6.3 Chat Typing Indicator

```
[Avatar]  ...
          (tre puntini che pulsano in sequenza)
```

- Tre cerchi di 8px diametro, `Neutral 400`
- Animazione: scale pulsante 1.0 -> 1.4 -> 1.0, timing 600ms, loop
- Delay sequenziale: cerchio 1 (0ms), cerchio 2 (150ms), cerchio 3 (300ms)
- Fade in/out dell'intero indicatore: timing 200ms

### 6.4 Pull to Refresh

- Indicatore custom: icona zampa che ruota (non lo spinner di sistema)
- Fase pull: l'icona zampa appare dall'alto, scala da 0.5 a 1.0 proporzionale al pull
- Fase refresh: la zampa ruota 360deg in loop (timing 800ms, linear)
- Fase completamento: la zampa fa un "bounce" (scale 1.0 -> 1.2 -> 1.0) poi scompare
- Colore: `Primary`

### 6.5 Tab Transitions

- Nessuna animazione di transizione tra tab (cambio istantaneo) per semplicita e velocita percepita
- L'icona del tab attivo cambia da outline a filled, con transizione opacity 150ms
- Il contenuto di ogni tab e mantenuto in memoria (lazy: false per le prime 3 tab, lazy: true per Profilo)

### 6.6 Loading States

| Contesto | Tipo | Dettaglio |
|----------|------|----------|
| Apertura app (cold start) | Splash screen | Logo con pulse animation, poi fade out |
| Caricamento feed swipe | Skeleton | Card skeleton con shimmer |
| Caricamento lista chat | Skeleton | 5 righe skeleton con shimmer |
| Caricamento profilo espanso | Skeleton | Immagine placeholder + testo skeleton |
| Invio messaggio | Inline | Bolla messaggio con opacita 0.5 + piccolo spinner, poi piena opacita |
| Caricamento mappa | Spinner | Spinner centrato sulla mappa, markers appaiono con fade in |
| Azioni bottone (salva, invia) | Bottone loading | Testo sostituito da spinner, bottone disabilitato |
| Upload foto | Progress | Barra di progresso lineare sopra la foto |

### 6.7 Altre Micro-interactions

| Interazione | Animazione |
|-------------|-----------|
| **Tap bottone** | Scale 1.0 -> 0.97 -> 1.0, spring `snappy` (haptic feedback: light impact) |
| **Toggle switch** | Thumb slide con spring, track color change timing 200ms |
| **Apertura bottom sheet** | Slide up con spring `gentle`, backdrop fade in timing 200ms |
| **Chiusura bottom sheet** | Slide down (gesture o tap backdrop), spring `gentle` |
| **Nuovo messaggio in chat** | Bolla appare con translateY 20 -> 0, opacity 0 -> 1, spring `snappy` |
| **Badge notifica appare** | Scale 0 -> 1.0 con bounce (spring `bouncy`) |
| **Successo (salvataggio)** | Toast slide in dall'alto, spring `gentle`, auto-dismiss dopo 3s |
| **Errore input** | Shake orizzontale (translateX: 0 -> -10 -> 10 -> -5 -> 5 -> 0, timing 400ms) + bordo rosso |
| **Like con bottone** | Icona cuore: scale 1.0 -> 1.3 -> 1.0, spring `bouncy` + colore fill transition |
| **Scroll lista** | Momentum nativo di React Native ScrollView, no custom physics |

---

## 7. Accessibility

### 7.1 Conformita WCAG 2.1 AA

PawMeet deve essere conforme al livello AA delle Web Content Accessibility Guidelines 2.1 adattate al contesto mobile.

#### Contrasto Colori

| Elemento | Requisito Minimo | Verifica |
|----------|-----------------|----------|
| Testo normale (< 18px) | 4.5:1 su sfondo | `Neutral 900` su `White` = 15.4:1 (passa) |
| Testo grande (>= 18px bold o >= 24px) | 3:1 su sfondo | `Primary` su `White` = 7.68:1 (passa AAA) |
| Elementi UI (icone, bordi, controlli) | 3:1 su sfondo | `Neutral 500` su `White` = 4.0:1 (passa) |
| Testo su `Primary` background | 4.5:1 | `White` su `Primary (#065F46)` = 7.68:1 (passa AAA) |
| Testo bolla chat inviata | 4.5:1 | `White` su `#065F46` = 7.68:1 (passa AAA) |
| Testo `Secondary Dark` su sfondo chiaro | 4.5:1 | `Secondary Dark (#8B6914)` su `White` = 4.86:1 (passa AA) |

#### Contrasto in Dark Mode

Le stesse regole si applicano in dark mode. Tutti i colori semantici hanno varianti dark mode con contrasto verificato.

### 7.2 Touch Target

| Requisito | Valore | Implementazione |
|-----------|--------|----------------|
| Dimensione minima area tappabile | 44x44 pt | Applicare `minHeight: 44, minWidth: 44` o `hitSlop` su tutti gli elementi interattivi |
| Spaziatura minima tra target | 8px | Garantire che non ci siano sovrapposizioni di hit area |
| Bottoni della tab bar | 48x48 pt | Area tab includes padding |
| Bottoni azione swipe (like/dislike) | 56x56 pt | Sovradimensionati per facilita d'uso |
| Chip di selezione | 36px altezza, min 44px area tap | Usare `hitSlop` per estendere l'area se necessario |
| Icone azione nell'header | 44x44 pt | Anche se l'icona e 24px, l'area tappabile e 44x44 |

### 7.3 Screen Reader (VoiceOver / TalkBack)

#### Principi generali

- Ogni elemento interattivo deve avere un `accessibilityLabel` descrittivo in italiano
- Le immagini decorative hanno `accessibilityElementsHidden: true` (iOS) / `importantForAccessibility: 'no'` (Android)
- Le foto dei cani hanno un label generico: "Foto di [NomeCane], [razza]"
- L'ordine di lettura segue l'ordine visivo logico (top-to-bottom, left-to-right)

#### Label specifici per componente

| Componente | accessibilityLabel | accessibilityRole | accessibilityHint |
|------------|-------------------|-------------------|-------------------|
| **Swipe Card** | "[NomeCane], [razza], [taglia], compatibilita [X]%, a [distanza]" | "button" | "Tocca due volte per vedere il profilo. Scorri a destra per mostrare interesse, a sinistra per passare" |
| **Bottone Like** | "Mi piace, mostra interesse per [NomeCane]" | "button" | "" |
| **Bottone Dislike** | "Passa, non interessato a [NomeCane]" | "button" | "" |
| **Badge Compatibilita** | "Compatibilita [X] percento" | "text" | "" |
| **Chat - Bolla inviata** | "Tu hai scritto: [messaggio], alle [ora]" | "text" | "" |
| **Chat - Bolla ricevuta** | "[Nome] ha scritto: [messaggio], alle [ora]" | "text" | "" |
| **Tab Discovery** | "Scopri" | "tab" | "Esplora cani nelle vicinanze" |
| **Tab Mappa** | "Mappa" | "tab" | "Visualizza cani sulla mappa" |
| **Tab Chat** | "Chat, [N] messaggi non letti" | "tab" | "I tuoi match e conversazioni" |
| **Tab Profilo** | "Profilo" | "tab" | "Il tuo profilo e impostazioni" |

#### Gesti accessibili per lo swipe

Per utenti che non possono eseguire il gesto di swipe:
- Bottoni Like e Dislike sempre visibili sotto la card (non solo in overlay)
- `accessibilityActions` sulla card con azioni "like" e "dislike"
- In modalita screen reader, il tap sulla card legge le info e propone le azioni

### 7.4 Dynamic Type / Font Scaling

- Tutti i testi usano `allowFontScaling: true`
- `maxFontSizeMultiplier: 1.5` per evitare che i layout si rompano (testare a 1.5x)
- I container devono accomodare testo piu grande con `flexWrap` e altezze dinamiche
- Le card di swipe mantengono la dimensione foto ma espandono l'area testo
- Testare l'app con le impostazioni di accessibilita del dispositivo a dimensione massima

### 7.5 Motion / Reduced Motion

- Rispettare la preferenza "Reduce Motion" del sistema operativo
- Se attiva: sostituire le animazioni spring con transizioni opacity (fade in/out, timing 200ms)
- La swipe animation resta funzionale ma senza rotazione e bounce
- L'animazione match diventa un fade-in degli elementi senza slide e confetti
- Usare `useReducedMotion()` hook di `react-native-reanimated` v3

### 7.6 Altre Considerazioni

- **Daltonismo:** Non usare solo il colore per comunicare informazioni. Badge compatibilita mostrano anche il valore numerico. Successo/errore hanno anche icone distinte (check / X)
- **Orientamento:** L'app funziona solo in portrait (coerente con il target mobile-first)
- **Lingua:** Italiano come lingua default, predisporre l'architettura per i18n (usare `i18next` + `react-i18next`)

---

## 8. Design Tokens (per Expo/RN)

### 8.1 Struttura dei File

```
src/
  design-system/
    tokens/
      colors.ts          -- Palette colori light/dark
      typography.ts       -- Font family, scale tipografica
      spacing.ts          -- Spacing scale
      borderRadius.ts     -- Border radius scale
      shadows.ts          -- Ombre per piattaforma
      index.ts            -- Barrel export
    theme/
      theme.ts            -- Composizione tema completo
      ThemeProvider.tsx    -- Context provider con supporto dark mode
      useTheme.ts         -- Hook per consumare il tema
    components/
      Button.tsx
      Card.tsx
      Input.tsx
      Avatar.tsx
      Badge.tsx
      SwipeCard.tsx
      ChatBubble.tsx
      TabBar.tsx
      BottomSheet.tsx
      Toast.tsx
      EmptyState.tsx
      Skeleton.tsx
```

### 8.2 Design Tokens -- colors.ts

```typescript
// src/design-system/tokens/colors.ts

export const palette = {
  // Primary
  primary: '#065F46',
  primaryLight: '#059669',
  primaryDark: '#064E3B',
  primary50: '#ECFDF5',

  // Secondary
  secondary: '#C9A84C',
  secondaryLight: '#E0B04E',
  secondaryDark: '#8B6914',
  secondary50: '#FDF8EF',

  // Neutrals
  neutral900: '#1A1A2E',
  neutral700: '#4A4A5A',
  neutral500: '#8E8E93',
  neutral300: '#C7C7CC',
  neutral200: '#E5E5EA',
  neutral100: '#F2F2F7',
  neutral50: '#FAFAFA',
  white: '#FFFFFF',
  black: '#000000',

  // Semantic
  success: '#34C759',
  successDark: '#30D158',
  error: '#FF3B30',
  errorDark: '#FF453A',
  warning: '#FF9500',
  warningDark: '#FFD60A',
  info: '#007AFF',
  infoDark: '#0A84FF',

  // PawMeet specifici
  premiumGold: '#FFD700',
  compatibilityHigh: '#34C759',
  compatibilityMedium: '#FF9500',
  compatibilityLow: '#FF3B30',
} as const;

export type ColorToken = keyof typeof palette;

export const lightColors = {
  // Backgrounds
  background: palette.neutral50,
  backgroundSecondary: palette.neutral100,
  surface: palette.white,
  surfaceSecondary: palette.neutral100,

  // Text
  textPrimary: palette.neutral900,
  textSecondary: palette.neutral700,
  textTertiary: palette.neutral500,
  textInverse: palette.white,

  // Brand
  primary: palette.primary,
  primaryLight: palette.primaryLight,
  primaryDark: palette.primaryDark,
  primaryTinted: palette.primary50,
  secondary: palette.secondary,
  secondaryLight: palette.secondaryLight,
  secondaryTinted: palette.secondary50,

  // Semantic
  success: palette.success,
  error: palette.error,
  warning: palette.warning,
  info: palette.info,

  // Borders
  border: palette.neutral300,
  borderLight: palette.neutral200,
  borderFocus: palette.primary,

  // Specific
  chatBubbleSent: palette.primary,
  chatBubbleSentText: palette.white,
  chatBubbleReceived: palette.neutral100,
  chatBubbleReceivedText: palette.neutral900,
  tabBarBackground: palette.white,
  tabBarActive: palette.primary,
  tabBarInactive: palette.neutral500,
  mapRadius: 'rgba(6, 95, 70, 0.12)',
  overlay: 'rgba(0, 0, 0, 0.5)',
  shimmerBase: palette.neutral200,
  shimmerHighlight: palette.neutral100,
} as const;

export const darkColors: typeof lightColors = {
  // Backgrounds
  background: '#1C1C1E',
  backgroundSecondary: '#2C2C2E',
  surface: '#2C2C2E',
  surfaceSecondary: '#38383A',

  // Text
  textPrimary: '#F5F5F7',
  textSecondary: '#D1D1D6',
  textTertiary: '#8E8E93',
  textInverse: '#1A1A2E',

  // Brand
  primary: palette.primary,
  primaryLight: palette.primaryLight,
  primaryDark: palette.primaryDark,
  primaryTinted: '#1A2E28',
  secondary: palette.secondaryLight,
  secondaryLight: palette.secondaryLight,
  secondaryTinted: '#2E2A1A',

  // Semantic
  success: '#30D158',
  error: '#FF453A',
  warning: '#FFD60A',
  info: '#0A84FF',

  // Borders
  border: '#48484A',
  borderLight: '#38383A',
  borderFocus: palette.primary,

  // Specific
  chatBubbleSent: palette.primary,
  chatBubbleSentText: palette.white,
  chatBubbleReceived: '#2C2C2E',
  chatBubbleReceivedText: '#F5F5F7',
  tabBarBackground: '#1C1C1E',
  tabBarActive: palette.primary,
  tabBarInactive: '#8E8E93',
  mapRadius: 'rgba(6, 95, 70, 0.20)',
  overlay: 'rgba(0, 0, 0, 0.7)',
  shimmerBase: '#38383A',
  shimmerHighlight: '#48484A',
} as const;

export type ThemeColors = typeof lightColors;
```

### 8.3 Design Tokens -- typography.ts

```typescript
// src/design-system/tokens/typography.ts

import { TextStyle, Platform } from 'react-native';

export const fontFamily = {
  regular: 'Inter_400Regular',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

// Fallback per quando Inter non e caricato
export const fontFamilyFallback = Platform.select({
  ios: 'System',
  android: 'Roboto',
  default: 'System',
});

export type TypographyToken = keyof typeof typography;

export const typography = {
  displayLarge: {
    fontFamily: fontFamily.bold,
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700' as TextStyle['fontWeight'],
  },
  displayMedium: {
    fontFamily: fontFamily.bold,
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '700' as TextStyle['fontWeight'],
  },
  headingLarge: {
    fontFamily: fontFamily.semiBold,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '600' as TextStyle['fontWeight'],
  },
  headingMedium: {
    fontFamily: fontFamily.semiBold,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600' as TextStyle['fontWeight'],
  },
  headingSmall: {
    fontFamily: fontFamily.semiBold,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '600' as TextStyle['fontWeight'],
  },
  bodyLarge: {
    fontFamily: fontFamily.regular,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '400' as TextStyle['fontWeight'],
  },
  bodyMedium: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400' as TextStyle['fontWeight'],
  },
  bodySmall: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400' as TextStyle['fontWeight'],
  },
  labelLarge: {
    fontFamily: fontFamily.semiBold,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600' as TextStyle['fontWeight'],
  },
  labelMedium: {
    fontFamily: fontFamily.semiBold,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600' as TextStyle['fontWeight'],
  },
  labelSmall: {
    fontFamily: fontFamily.semiBold,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600' as TextStyle['fontWeight'],
  },
  caption: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '400' as TextStyle['fontWeight'],
  },
} as const;
```

### 8.4 Design Tokens -- spacing.ts

```typescript
// src/design-system/tokens/spacing.ts

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
} as const;

export type SpacingToken = keyof typeof spacing;
```

### 8.5 Design Tokens -- borderRadius.ts

```typescript
// src/design-system/tokens/borderRadius.ts

export const borderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
  full: 9999,
} as const;

export type BorderRadiusToken = keyof typeof borderRadius;
```

### 8.6 Design Tokens -- shadows.ts

```typescript
// src/design-system/tokens/shadows.ts

import { Platform, ViewStyle } from 'react-native';

type ShadowStyle = {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
};

const createShadow = (
  offsetY: number,
  radius: number,
  opacity: number,
  elevation: number
): ShadowStyle => ({
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: offsetY },
  shadowOpacity: Platform.OS === 'ios' ? opacity : 0,
  shadowRadius: Platform.OS === 'ios' ? radius : 0,
  elevation: Platform.OS === 'android' ? elevation : 0,
});

export const shadows = {
  sm: createShadow(1, 2, 0.06, 2),
  md: createShadow(2, 8, 0.10, 4),
  lg: createShadow(4, 16, 0.12, 8),
  xl: createShadow(8, 32, 0.16, 12),
} as const;

export type ShadowToken = keyof typeof shadows;
```

### 8.7 Design Tokens -- index.ts (Barrel Export)

```typescript
// src/design-system/tokens/index.ts

export { palette, lightColors, darkColors } from './colors';
export type { ColorToken, ThemeColors } from './colors';

export { fontFamily, fontFamilyFallback, typography } from './typography';
export type { TypographyToken } from './typography';

export { spacing } from './spacing';
export type { SpacingToken } from './spacing';

export { borderRadius } from './borderRadius';
export type { BorderRadiusToken } from './borderRadius';

export { shadows } from './shadows';
export type { ShadowToken } from './shadows';
```

### 8.8 Composizione Tema -- theme.ts

```typescript
// src/design-system/theme/theme.ts

import { lightColors, darkColors, ThemeColors } from '../tokens/colors';
import { typography } from '../tokens/typography';
import { spacing } from '../tokens/spacing';
import { borderRadius } from '../tokens/borderRadius';
import { shadows } from '../tokens/shadows';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface Theme {
  mode: 'light' | 'dark';
  colors: ThemeColors;
  typography: typeof typography;
  spacing: typeof spacing;
  borderRadius: typeof borderRadius;
  shadows: typeof shadows;
}

export const lightTheme: Theme = {
  mode: 'light',
  colors: lightColors,
  typography,
  spacing,
  borderRadius,
  shadows,
};

export const darkTheme: Theme = {
  mode: 'dark',
  colors: darkColors,
  typography,
  spacing,
  borderRadius,
  shadows,
};
```

### 8.9 Theme Provider -- ThemeProvider.tsx

```typescript
// src/design-system/theme/ThemeProvider.tsx

import React, { createContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { Theme, ThemeMode, lightTheme, darkTheme } from './theme';

interface ThemeContextValue {
  theme: Theme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  theme: lightTheme,
  themeMode: 'system',
  setThemeMode: () => {},
});

interface ThemeProviderProps {
  children: React.ReactNode;
  initialMode?: ThemeMode;
}

export function ThemeProvider({
  children,
  initialMode = 'system',
}: ThemeProviderProps) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<ThemeMode>(initialMode);

  const theme = useMemo(() => {
    if (themeMode === 'system') {
      return systemColorScheme === 'dark' ? darkTheme : lightTheme;
    }
    return themeMode === 'dark' ? darkTheme : lightTheme;
  }, [themeMode, systemColorScheme]);

  const value = useMemo(
    () => ({ theme, themeMode, setThemeMode }),
    [theme, themeMode]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}
```

### 8.10 useTheme Hook -- useTheme.ts

```typescript
// src/design-system/theme/useTheme.ts

import { useContext } from 'react';
import { ThemeContext } from './ThemeProvider';

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Shortcut per accedere direttamente ai colori
export function useColors() {
  const { theme } = useTheme();
  return theme.colors;
}

// Shortcut per accedere direttamente allo spacing
export function useSpacing() {
  const { theme } = useTheme();
  return theme.spacing;
}
```

### 8.11 Esempio di Utilizzo in un Componente

```typescript
// Esempio: uso del design system in un componente Button

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../design-system/theme/useTheme';

interface ButtonProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  size?: 'compact' | 'standard' | 'large';
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
}

export function Button({
  title,
  variant = 'primary',
  size = 'standard',
  loading = false,
  disabled = false,
  onPress,
}: ButtonProps) {
  const { theme } = useTheme();
  const { colors, typography: typo, spacing, borderRadius } = theme;

  const heights = { compact: 40, standard: 48, large: 56 };

  const variantStyles: Record<string, ViewStyle> = {
    primary: {
      backgroundColor: colors.primary,
    },
    secondary: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.primary,
    },
    ghost: {
      backgroundColor: 'transparent',
    },
    destructive: {
      backgroundColor: colors.error,
    },
  };

  const textColor =
    variant === 'secondary'
      ? colors.primary
      : variant === 'ghost'
        ? colors.textSecondary
        : colors.textInverse;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || loading }}
      style={[
        {
          height: heights[size],
          borderRadius: borderRadius['2xl'],
          paddingHorizontal: spacing.xl,
          justifyContent: 'center',
          alignItems: 'center',
          minWidth: 44,
          minHeight: 44,
          opacity: disabled ? 0.4 : 1,
        },
        variantStyles[variant],
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text
          style={[
            typo.labelLarge,
            { color: textColor },
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}
```

### 8.12 Dipendenze Npm Consigliate

| Pacchetto | Versione | Scopo |
|-----------|---------|-------|
| `@expo-google-fonts/inter` | latest | Font Inter |
| `expo-font` | latest | Caricamento font |
| `react-native-reanimated` | ^3.x | Animazioni performanti |
| `react-native-gesture-handler` | ^2.x | Gesti (swipe) |
| `@gorhom/bottom-sheet` | ^4.x | Bottom sheet |
| `react-native-maps` | latest | Mappe |
| `lucide-react-native` | latest | Icone |
| `react-native-svg` | latest | Rendering SVG (icone custom + Lucide) |
| `react-native-safe-area-context` | latest | Safe area |
| `@react-navigation/native` | ^6.x | Navigazione |
| `@react-navigation/bottom-tabs` | ^6.x | Tab navigator |
| `@react-navigation/native-stack` | ^6.x | Stack navigator |
| `react-native-skeleton-placeholder` | latest | Loading skeleton |
| `expo-haptics` | latest | Feedback aptico |
| `expo-blur` | latest | BlurView per tab bar |

---

> **Documento preparato da:** UX/UI Design & Service Design Team - PawMeet
> **Prossima revisione:** Aprile 2026 (dopo primo round di user testing su prototipo)
> **Distribuzione:** Team di sviluppo frontend, Product Owner, QA

NOT FOUND
