# PawMeet -- Low-Fidelity Wireframes

> **Version:** 1.0
> **Date:** 2026-03-12
> **Author:** Design Team
> **Status:** Draft
> **Purpose:** Guide frontend implementation for web landing and mobile app

---

## Table of Contents

1. [Landing Page (Web)](#1-landing-page-web)
2. [Onboarding Flow (Mobile)](#2-onboarding-flow-mobile)
3. [Discovery -- Swipe Feed](#3-discovery--swipe-feed)
4. [Dog Profile Expanded](#4-dog-profile-expanded)
5. [Map View](#5-map-view)
6. [Match Animation](#6-match-animation)
7. [Chat](#7-chat)
8. [User Profile](#8-user-profile)

---

## Design System Quick Reference

Throughout this document, design token references follow the conventions from `docs/06-ux-ui-design-system.md`.

**Palette A (Decided 2026-03-12):**
- Primary: Deep Emerald `#065F46` (web) / `#FF6B35` Orange Warm (mobile, pending alignment)
- Secondary: Gold `#C9A84C` (web warmth accent)
- Neutrals: `Neutral 900` (#1A1A2E) through `Neutral 50` (#FAFAFA)
- Success: `#34C759` | Error: `#FF3B30` | Warning: `#FF9500` | Info: `#007AFF`

**Typography:** Inter -- weights 400, 600, 700
**Spacing:** 4px base scale (xs=4, sm=8, md=12, base=16, lg=20, xl=24, 2xl=32)
**Border Radius:** sm=4, md=8, lg=12, xl=16, 2xl=24, full=9999
**Icons:** Lucide icon set + custom SVG (paw, bone, leash, dog-face, two-dogs)

---

## 1. Landing Page (Web)

The landing page redesign follows recommendations from the product designer and UI engineer reviews: clear CTA hierarchy, timeline-based "How It Works", differentiated feature cards, no emoji (use `[icon]` placeholders), warmer tone with brand personality, and proper form feedback.

### 1.1 Header / Navigation Bar

```
+------------------------------------------------------------------------+
|                                                                        |
|  [paw-icon] PawMeet          Come Funziona   Funzionalita   Contatti   |
|                                                          [Waitlist ->] |
|                                                                        |
+------------------------------------------------------------------------+
```

- **Position:** Sticky top, `z-50`
- **Background:** `White` with `blur(12px)` backdrop, border-bottom 0.5px `Neutral 300`
- **Logo:** Custom paw icon + "PawMeet" in `headingMedium` (20px/600) `Primary`
- **Nav links:** `bodyMedium` (15px/400) `Neutral 700`, hover underline reveal animation
- **CTA button:** "Iscriviti alla Waitlist" -- `Primary` filled, pill shape (radius `2xl`), `labelLarge`
- **Mobile:** Hamburger icon replaces nav links; slide-down menu with 300ms ease-out transition

**Navigation flow:**
- Logo tap -> scroll to top
- "Come Funziona" -> smooth scroll to How It Works section
- "Funzionalita" -> smooth scroll to Features section
- "Contatti" -> smooth scroll to footer contact
- "Waitlist" button -> smooth scroll to waitlist form

---

### 1.2 Hero Section

```
+------------------------------------------------------------------------+
|                                                                        |
|                                                                        |
|         Trova il compagno di                                           |
|         passeggiata perfetto                                           |
|         per il tuo cane                                                |
|                                                                        |
|         PawMeet connette proprietari di cani                           |
|         nella tua zona attraverso matching                             |
|         comportamentale intelligente.                                  |
|                                                                        |
|         [  Iscriviti alla Waitlist  ]                                  |
|          Scopri come funziona ->                                       |
|                                                                        |
|                                                [hero-illustration]     |
|                                                (two dogs walking       |
|                                                 together, warm         |
|                                                 watercolor style)      |
|                                                                        |
+------------------------------------------------------------------------+
```

- **Background:** `White` (no alternating colors -- per review recommendation, max 2-3 bg colors total)
- **Layout:** Two-column on desktop (text left, illustration right), single column stacked on mobile
- **Title:** `displayLarge` (32px/700) `Neutral 900`, keyword "perfetto" in `Primary` with slight scale bump
- **Subtitle:** `bodyLarge` (17px/400) `Neutral 700`, max-width 480px
- **Primary CTA:** "Iscriviti alla Waitlist" -- `Primary` filled button, shadow-lg, height 56px (large), pill radius
- **Secondary CTA:** "Scopri come funziona" -- ghost link with arrow (not a button), `Neutral 700`, hover `Primary`
- **Illustration:** High-quality illustration (not blobs) showing two dogs approaching each other, warm color palette
- **Animation:** Staggered reveal on load -- title (0ms), subtitle (200ms), CTA (400ms), illustration (300ms). Use Framer Motion via React island (`client:load`)

**Design notes:**
- Removed decorative blobs (review item #2)
- Clear CTA hierarchy: primary = filled button, secondary = ghost link with arrow (review item #3)
- Generous line-height on title for readability (not `tracking-tight`)
- No emoji anywhere -- illustrations and Lucide icons only

---

### 1.3 How It Works (Timeline)

```
+------------------------------------------------------------------------+
|                                                                        |
|                    Come Funziona                                       |
|                                                                        |
|   [illustration-1]        [illustration-2]        [illustration-3]     |
|   Owner creating           Swipe cards             Two owners walking  |
|   dog profile              with match badge        dogs together       |
|        |                        |                        |             |
|        * ---- connector --- * ---- connector --- *                     |
|        1                        2                        3             |
|                                                                        |
|   Crea il profilo          Trova cani              Organizza la        |
|   del tuo cane             compatibili             passeggiata         |
|                                                                        |
|   Descrivi il              L'algoritmo ti          Chatta e            |
|   carattere, la            mostra i cani piu       incontra nuovi      |
|   taglia e le              adatti nella tua        amici a 4 zampe     |
|   preferenze               zona                   vicino a te         |
|                                                                        |
+------------------------------------------------------------------------+
```

- **Background:** `Neutral 50` (#FAFAFA)
- **Section title:** `displayMedium` (28px/700) `Neutral 900`, centered
- **Layout:** Horizontal timeline with SVG connectors between steps (desktop); vertical timeline on mobile
- **Step numbers:** Circles 40x40, `Primary` fill, `White` number, `headingMedium` (20px/600)
- **Connectors:** SVG dashed line, 2px stroke `Primary` at 30% opacity, connecting the step circles
- **Step title:** `headingSmall` (17px/600) `Neutral 900`
- **Step description:** `bodyMedium` (15px/400) `Neutral 700`, max 2 lines
- **Illustrations:** Small contextual illustrations above each step (120x120px), warm art style
- **Animation:** Steps reveal sequentially on scroll (Intersection Observer), staggered 200ms each (`client:visible`)

**Design notes:**
- Redesigned from 3 numbered boxes to a visual timeline with connectors (review item #5)
- Illustrations show the action, not just decorative elements
- Connectors create narrative flow and sense of progression

---

### 1.4 Features Section

```
+------------------------------------------------------------------------+
|                                                                        |
|                    Funzionalita                                        |
|                                                                        |
|   +----------------------------------+                                 |
|   | [icon: brain]                    |  <- highlighted card             |
|   |                                  |     (border-2 Primary,          |
|   | Match Intelligente               |      slightly larger)           |
|   |                                  |                                 |
|   | L'algoritmo analizza taglia,     |                                 |
|   | energia e comportamento per      |                                 |
|   | trovare il compagno ideale.      |                                 |
|   +----------------------------------+                                 |
|                                                                        |
|   +----------------+  +----------------+  +----------------+           |
|   | [icon: map-pin]|  | [icon: shield] |  | [icon: msg]    |          |
|   |                |  |                |  |                |           |
|   | Mappa          |  | Profili        |  | Chat           |          |
|   | Interattiva    |  | Verificati     |  | Sicura         |          |
|   |                |  |                |  |                |           |
|   | Scopri cani    |  | Identita       |  | Messaggia in   |          |
|   | nelle tue      |  | verificate     |  | modo sicuro    |          |
|   | vicinanze      |  | per la tua     |  | e organizza    |          |
|   |                |  | tranquillita   |  | passeggiate    |          |
|   +----------------+  +----------------+  +----------------+           |
|                                                                        |
|   +----------------+  +----------------+                               |
|   | [icon: route]  |  | [icon: star]   |                              |
|   |                |  |                |                               |
|   | Tracciamento   |  | Community      |                              |
|   | Percorsi       |  |                |                               |
|   | [Coming Soon]  |  | [Coming Soon]  |                              |
|   +----------------+  +----------------+                               |
|                                                                        |
+------------------------------------------------------------------------+
```

- **Background:** `White`
- **Section title:** `displayMedium` (28px/700) `Neutral 900`, centered
- **Differentiator card (Match Intelligente):**
  - Full-width on mobile, prominent on desktop
  - `border-2` `Primary`, background `Primary` at 5% opacity
  - Larger icon (32px), `headingLarge` (24px/600) title
  - Animation: subtle pulse on the border
- **Standard feature cards:**
  - Grid: 3 columns desktop, 1 column mobile
  - Background `White`, border 1px `Neutral 200`, radius `lg` (12px)
  - Shadow: `sm` default, lift + `md` on hover (translateY -8px with spring)
  - Icon: 24px Lucide icon, `Primary` color
  - Title: `headingSmall` (17px/600) `Neutral 900`
  - Description: `bodyMedium` (15px/400) `Neutral 700`
  - Padding: `xl` (24px)
- **Future feature cards:**
  - Same style but `Neutral 500` icon color, `Neutral 300` border
  - "Coming Soon" badge: `labelSmall`, `Warning` background at 10%, `Warning` text, radius `full`
- **Animation:** Staggered card reveal on scroll, 100ms delay between cards (`client:visible`)

**Design notes:**
- Differentiator card highlighted with border and prominence (review item #4)
- Future features de-emphasized with "Coming Soon" badge
- Emoji replaced with Lucide icons throughout (review item from UI engineer)

---

### 1.5 Waitlist CTA Section

```
+------------------------------------------------------------------------+
|  (background: Primary at 5% opacity)                                   |
|                                                                        |
|         Unisciti alla Waitlist                                          |
|                                                                        |
|         Sii tra i primi a provare PawMeet.                             |
|         Ti avviseremo quando sara disponibile                          |
|         nella tua citta.                                               |
|                                                                        |
|         +--------------------------------------------+                 |
|         | [icon: mail]  La tua email                  |                 |
|         +--------------------------------------------+                 |
|                                                                        |
|         [     Iscriviti alla Waitlist     ]                             |
|                                                                        |
|         [icon: lock] I tuoi dati sono al sicuro.                       |
|         Niente spam, promesso.                                         |
|                                                                        |
+------------------------------------------------------------------------+
```

- **Background:** `Primary` at 5% opacity (#065F46 at 0.05) -- the only tinted section
- **Title:** `displayMedium` (28px/700) `Neutral 900`, centered
- **Subtitle:** `bodyLarge` (17px/400) `Neutral 700`, centered, max-width 440px
- **Email input:** Height 48px, border 1px `Neutral 300`, radius `md` (8px), Lucide `mail` icon left
  - Focus: border 2px `Primary`, shadow `sm`
  - Error: border 2px `Error`, error message below in `caption` `Error`
  - Width: 400px max, full-width on mobile
- **Submit button:** `Primary` filled, height 48px, full width matching input, pill radius
  - Loading state: spinner replaces text, button disabled, opacity 0.7
  - Success state: button transforms to checkmark icon + "Iscritto!" text, `Success` background, 2s then reset
  - Error state: toast notification at top (not alert()), `Error` variant
- **Privacy note:** `caption` (11px/400) `Neutral 500`, Lucide `lock` icon (16px), centered below button
- **Validation:** Client-side email format check, disable button during submit, prevent double submit

**Design notes:**
- Proper form UX replacing alert() (review item #6)
- Loading, success, and error states all handled visually
- Privacy reassurance below the form builds trust

---

### 1.6 Footer

```
+------------------------------------------------------------------------+
|  (background: gradient from Neutral 900 to Neutral 900 + subtle        |
|   Primary tint at top edge)                                            |
|                                                                        |
|  [paw-icon] PawMeet              Prodotto         Legale               |
|                                  Come Funziona    Privacy Policy       |
|  Connettere cani e i loro        Funzionalita     Termini di Servizio  |
|  proprietari, una passeggiata    Waitlist          Cookie Policy        |
|  alla volta.                                                           |
|                                  Contatti                              |
|                                  info@pawmeet.app                      |
|                                                                        |
|  +-------------------------------+                                     |
|  | [icon: mail] Resta aggiornato |                                     |
|  | [email input] [Iscriviti]     |                                     |
|  +-------------------------------+                                     |
|                                                                        |
|  ----------------------------------------------------------------      |
|                                                                        |
|  (c) 2026 PawMeet. Tutti i diritti riservati.                          |
|                                                                        |
+------------------------------------------------------------------------+
```

- **Background:** `Neutral 900` (#1A1A2E) with subtle gradient -- thin `Primary` line at top edge for brand warmth
- **Logo:** Paw icon + "PawMeet" in `headingSmall` (17px/600) `White`
- **Tagline:** `bodyMedium` (15px/400) `Neutral 200` (#E5E5EA) -- brand micro-copy, not generic
- **Column titles:** `labelMedium` (13px/500) `Neutral 400`, uppercase, letter-spacing 1px
- **Links:** `bodySmall` (13px/400) `Neutral 200`, hover `White` with underline transition
- **Newsletter mini-form:** Compact email input + small submit button, same validation as waitlist
- **Divider:** 1px `Neutral 700`
- **Copyright:** `caption` (11px/400) `Neutral 500`
- **Contrast:** All text meets WCAG AA on `Neutral 900` background (review item #12 -- fixed)

**Design notes:**
- Added brand personality with tagline and newsletter (review item #9)
- Gradient top edge adds warmth without being distracting
- Text contrast improved from `gray-300` to `Neutral 200` on `Neutral 900`

---

## 2. Onboarding Flow (Mobile)

### 2.1 Welcome Slide 1 of 3

```
+---------------------------+
|                    [Skip] |
|                           |
|                           |
|     [illustration]        |
|     Two dogs walking      |
|     together in a park    |
|     (warm watercolor)     |
|     200x200               |
|                           |
|                           |
|  Trova il compagno        |
|  perfetto per il          |
|  tuo cane                 |
|                           |
|  Connetti il tuo cane     |
|  con amici a 4 zampe      |
|  nella tua zona.          |
|                           |
|                           |
|        * o o              |
|                           |
|  [     Avanti      ]      |
|                           |
+---------------------------+
```

- **Layout:** Centered content, full-screen
- **Background:** `White`
- **Skip link:** Top-right, `Ghost` button, `bodyMedium` `Neutral 500`
- **Illustration:** 200x200px centered, warm watercolor style with nature palette
- **Title:** `displayLarge` (32px/700) `Neutral 900`, centered, max 3 lines
- **Description:** `bodyLarge` (17px/400) `Neutral 700`, centered, max 2 lines
- **Page indicator:** 3 dots, active = `Primary` 8px, inactive = `Neutral 300` 6px, gap 8px
- **Button:** "Avanti" -- `Primary` filled, full-width (minus 16px margins), height 48px, radius `2xl`
- **Spacing:** Illustration to title = `2xl` (32px), title to description = `md` (12px), dots to button = `xl` (24px)

**Navigation flow:**
- Swipe left or tap "Avanti" -> Slide 2
- Tap "Salta" -> Login screen (O-05)

---

### 2.2 Welcome Slide 2 of 3

```
+---------------------------+
|                    [Skip] |
|                           |
|                           |
|     [illustration]        |
|     Algorithm visual:     |
|     two dog cards with    |
|     compatibility badge   |
|     connecting them       |
|     200x200               |
|                           |
|                           |
|  Matching                 |
|  intelligente             |
|                           |
|  L'algoritmo analizza     |
|  comportamento e          |
|  preferenze per trovarti  |
|  i cani piu adatti.       |
|                           |
|        o * o              |
|                           |
|  [     Avanti      ]      |
|                           |
+---------------------------+
```

- Same layout and tokens as Slide 1
- Illustration: Shows two dog profile cards with a compatibility percentage badge and connecting lines

---

### 2.3 Welcome Slide 3 of 3

```
+---------------------------+
|                           |
|                           |
|     [illustration]        |
|     Chat bubbles with     |
|     dog avatars, map      |
|     pin showing meeting   |
|     point                 |
|     200x200               |
|                           |
|                           |
|  Chat sicura per          |
|  organizzare              |
|  passeggiate              |
|                           |
|  Messaggia, organizza     |
|  incontri e fai nuove     |
|  amicizie per te e il     |
|  tuo cane.                |
|                           |
|        o o *              |
|                           |
|  [     Inizia       ]     |
|                           |
|  Hai gia un account?      |
|  Accedi                   |
|                           |
+---------------------------+
```

- Same layout as previous slides
- "Salta" removed (this is the last slide)
- CTA changes to "Inizia" (same styling as previous "Avanti")
- Below CTA: "Hai gia un account? **Accedi**" -- `bodyMedium` `Neutral 700`, "Accedi" as `Primary` link

**Navigation flow:**
- "Inizia" -> Register screen (O-06)
- "Accedi" -> Login screen (O-05)

---

### 2.4 Login Screen

```
+---------------------------+
|  [<]                      |
|                           |
|  [paw-icon]               |
|                           |
|  Bentornato!              |
|                           |
|                           |
|  Email                    |
|  +----------------------+ |
|  | [icon: mail]         | |
|  +----------------------+ |
|                           |
|  Password                 |
|  +----------------------+ |
|  | [icon: lock]    [eye]| |
|  +----------------------+ |
|                           |
|  Password dimenticata?    |
|                           |
|  [      Accedi      ]     |
|                           |
|  -------- oppure -------- |
|                           |
|  [G  Continua con Google] |
|  [   Continua con Apple] |
|                           |
|                           |
|  Non hai un account?      |
|  Registrati               |
|                           |
+---------------------------+
```

- **Back button:** Lucide `chevron-left`, 24px, `Neutral 900`, top-left, padded for 48x48 touch target
- **Logo:** Paw icon 40px, `Primary`, centered or left-aligned
- **Title:** `displayMedium` (28px/700) `Neutral 900`
- **Inputs:** Standard text input per design system (height 48px, border 1px `Neutral 300`, radius `md`)
  - Email: Lucide `mail` icon left
  - Password: Lucide `lock` icon left, Lucide `eye`/`eye-off` toggle right
  - Focus: border 2px `Primary`
  - Error: border 2px `Error`, error message below in `caption` `Error`
- **"Password dimenticata?"**: `bodySmall` (13px) `Primary`, right-aligned
- **Login button:** `Primary` filled, full-width, height 48px, radius `2xl`
- **Divider:** Horizontal line with "oppure" centered, `Neutral 300` line, `caption` `Neutral 500`
- **Social buttons:** `Secondary` variant (outline), full-width, height 48px
  - Google: Google "G" logo left, text "Continua con Google"
  - Apple: Apple logo left, text "Continua con Apple" (iOS only: Apple Sign-In required)
- **Register link:** `bodyMedium` `Neutral 700`, "Registrati" in `Primary` as link

**Navigation flow:**
- Back -> previous screen (Welcome Slide 3 or Register)
- "Accedi" -> validate -> MainTabs (if profile complete) or Owner Profile (O-09)
- "Password dimenticata?" -> Password Recovery (O-08)
- Social buttons -> OAuth flow -> same as "Accedi" success
- "Registrati" -> Register screen (O-06)

---

### 2.5 Register Screen

```
+---------------------------+
|  [<]                      |
|                           |
|  Crea il tuo account      |
|                           |
|                           |
|  Email                    |
|  +----------------------+ |
|  | [icon: mail]         | |
|  +----------------------+ |
|                           |
|  Password                 |
|  +----------------------+ |
|  | [icon: lock]    [eye]| |
|  +----------------------+ |
|  Min. 8 caratteri         |
|                           |
|  Conferma Password        |
|  +----------------------+ |
|  | [icon: lock]    [eye]| |
|  +----------------------+ |
|                           |
|  [x] Accetto i Termini    |
|      e la Privacy Policy  |
|  [ ] Voglio ricevere      |
|      aggiornamenti        |
|                           |
|  [    Registrati     ]    |
|                           |
|  -------- oppure -------- |
|                           |
|  [G  Continua con Google] |
|  [   Continua con Apple] |
|                           |
+---------------------------+
```

- Same input styling as Login
- **Password helper:** `caption` (11px) `Neutral 500`, updates to `Success` when valid
- **Confirm password:** Error state if mismatch, shown on blur
- **Checkboxes:** 24x24 touch target, `Primary` fill when checked
  - T&C required (links to Privacy Policy and Terms)
  - Marketing optional, unchecked by default
- **Register button:** `Primary` filled, disabled (opacity 0.4) until form valid
- Real-time validation on each field

**Navigation flow:**
- "Registrati" -> OTP Verification (O-07)
- Social buttons -> OAuth -> Owner Profile (O-09)

---

### 2.6 Owner Profile Setup

```
+---------------------------+
|                           |
|  Il tuo profilo           |
|                           |
|                           |
|       +----------+        |
|       |          |        |
|       | [camera] |        |
|       |          |        |
|       +----------+        |
|       Aggiungi foto       |
|       (opzionale)         |
|                           |
|  Come ti chiami?          |
|  +----------------------+ |
|  | Nome                 | |
|  +----------------------+ |
|                           |
|                           |
|                           |
|                           |
|                           |
|                           |
|                           |
|  [    Continua      ]     |
|                           |
+---------------------------+
```

- **Title:** `displayMedium` (28px/700) `Neutral 900`
- **Avatar picker:** 96x96px circle, `Neutral 200` background, Lucide `camera` icon centered (32px, `Neutral 500`)
  - Tap -> Action sheet: "Scatta foto" / "Scegli dalla galleria" / "Annulla"
  - After selection: shows cropped photo, small edit icon overlay bottom-right
- **Label:** "Aggiungi foto" `bodySmall` `Neutral 500`, "(opzionale)" `caption` `Neutral 400`
- **Name input:** Standard text input, required
- **Continue button:** `Primary` filled, full-width, bottom-anchored with `base` (16px) margin

**Navigation flow:**
- "Continua" -> Dog Wizard Step 1 (O-10)

---

### 2.7 Dog Wizard -- Step 1/4: Basic Info

```
+---------------------------+
|  [<]                      |
|  ====______.______.______ |
|  1/4                      |
|                           |
|  Informazioni base        |
|                           |
|  Come si chiama?          |
|  +----------------------+ |
|  | Nome del cane        | |
|  +----------------------+ |
|                           |
|  Data di nascita          |
|  +----------------------+ |
|  | GG / MM / AAAA   [v] | |
|  +----------------------+ |
|                           |
|  Sesso                    |
|  +----------+----------+  |
|  | [male]   | [female] |  |
|  | Maschio  | Femmina  |  |
|  +----------+----------+  |
|                           |
|  Sterilizzato/a           |
|  +-----+                  |
|  | [o] |  Si              |
|  +-----+                  |
|                           |
|  [    Continua      ]     |
|                           |
+---------------------------+
```

- **Progress bar:** Full width, 4px height, `Neutral 200` track, `Primary` fill at 25%
- **Step indicator:** `caption` (11px) `Neutral 500`, "1/4"
- **Section title:** `headingLarge` (24px/600) `Neutral 900`
- **Sex selector:** Two-option toggle, pill shape, selected = `Primary` fill + `White` text, unselected = `Neutral 100` + `Neutral 700`
  - Custom male/female icons (24px)
- **Sterilization toggle:** Standard toggle switch, `Primary` when on, `Neutral 300` when off
- **Date picker:** Taps open native date picker. Validates: not future, not >25 years ago
- All fields required; "Continua" disabled until complete

**Navigation flow:**
- Back -> Owner Profile (O-09)
- "Continua" -> Step 2 (O-11)

---

### 2.8 Dog Wizard -- Step 2/4: Physical

```
+---------------------------+
|  [<]                      |
|  ========_______.________ |
|  2/4                      |
|                           |
|  Fisico                   |
|                           |
|  Razza                    |
|  +----------------------+ |
|  | [icon: search] Cerca | |
|  +----------------------+ |
|                           |
|  Taglia                   |
|  [toy] [small] [med] [lg] [giant]  |
|   Toy   Picc.  Media Grande Gig.  |
|                           |
|  (dog silhouettes that    |
|   scale in size, selected |
|   one highlighted)        |
|                           |
|  Peso                     |
|  +---------[o]----------+ |
|  1 kg              60 kg  |
|              23 kg        |
|                           |
|                           |
|  [    Continua      ]     |
|                           |
+---------------------------+
```

- **Progress bar:** `Primary` fill at 50%
- **Breed autocomplete:** Text input with search icon, opens bottom sheet with filtered breed list (FCI database)
- **Size selector:** 5 custom dog silhouette icons in a row
  - Each is a 56x56 tappable area with silhouette above and label below
  - Selected: `Primary` background at 10%, `Primary` border 2px, silhouette `Primary`
  - Unselected: `Neutral 100` background, silhouette `Neutral 500`
- **Weight slider:** Single thumb, track `Neutral 200`, filled portion `Primary`
  - Thumb: 24x24 `White` circle, border 2px `Primary`, shadow `md`
  - Value label above thumb during drag: `labelMedium`, `Primary` bg, `White` text, radius `sm`
  - Range: 1-60 kg
- **Warning:** If weight inconsistent with size, yellow info banner: `Warning` left border, `bodySmall`

**Navigation flow:**
- Back -> Step 1
- "Continua" -> Step 3 (O-12)

---

### 2.9 Dog Wizard -- Step 3/4: Behavior

```
+---------------------------+
|  [<]                      |
|  ============___.________ |
|  3/4                      |
|                           |
|  Comportamento            |
|                           |
|  Livello di energia       |
|  +----------------------+ |
|  | [icon: battery-low]  | |
|  | Bassa                | |
|  | Passeggiata tranquil.| |
|  +----------------------+ |
|  +----------------------+ |
|  | [icon: battery-med]  | |
|  | Media          [sel] | |
|  | Attivo ma equilibrato| |
|  +----------------------+ |
|  +----------------------+ |
|  | [icon: battery-full] | |
|  | Alta                 | |
|  | Sempre in movimento  | |
|  +----------------------+ |
|                           |
|  Socialita con altri cani |
|  +------+ +------+ +----+|
|  |Bassa | |Media | |Alta||
|  +------+ +------+ +----+|
|                           |
|  Comportamento guinzaglio |
|  +------+ +------+ +----+|
|  |Calmo | |Tira  | |Reat||
|  +------+ +------+ +----+|
|                           |
|  Bio (opzionale)          |
|  +----------------------+ |
|  | Racconta qualcosa    | |
|  | su di lui/lei...     | |
|  +----------------------+ |
|                           |
|  [    Continua      ]     |
|                           |
+---------------------------+
```

- **Progress bar:** `Primary` fill at 75%
- **Energy selector:** Vertical card list, each card 72px height
  - Icon (Lucide battery variants) + title `headingSmall` + description `bodySmall` `Neutral 500`
  - Selected: `Primary` left border 3px, `Primary 50` background, checkmark icon right
  - Unselected: `Neutral 200` border 1px, `White` background
- **Sociality & leash selectors:** Horizontal chip group (3 options each)
  - Chip: height 36px, padding 12px horizontal, radius `full`
  - Selected: `Primary 50` bg, `Primary` text, `Primary` border
  - Unselected: `Neutral 100` bg, `Neutral 700` text, `Neutral 300` border
  - Each option has a brief description appearing below when selected
- **Bio textarea:** 120px height, standard input styling, 300 char max, counter in `caption` bottom-right

**Navigation flow:**
- Back -> Step 2
- "Continua" -> Step 4 (O-13)

---

### 2.10 Dog Wizard -- Step 4/4: Photos & Preferences

```
+---------------------------+
|  [<]                      |
|  ======================== |
|  4/4                      |
|                           |
|  Foto e preferenze        |
|                           |
|  Foto del tuo cane        |
|  +------+ +------+ +----+|
|  |      | |      | |    ||
|  | [+]  | | [+]  | | [+]||
|  | MAIN | |      | |    ||
|  +------+ +------+ +----+|
|  +------+ +------+ +----+|
|  |      | |      | |    ||
|  | [+]  | | [+]  | | [+]||
|  |      | |      | |    ||
|  +------+ +------+ +----+|
|  Min. 1 foto              |
|                           |
|  Orari preferiti          |
|  [Mattina] [Pomeriggio]  |
|  [Sera] [Weekend]        |
|                           |
|  Durata passeggiata      |
|  +---[o]-------[o]-----+ |
|  15min            120min  |
|       30 - 60 min        |
|                           |
|  Terreno preferito        |
|  [Parco] [Urbano]        |
|  [Sentiero] [Spiaggia]   |
|                           |
|  [  Completa profilo  ]  |
|                           |
+---------------------------+
```

- **Progress bar:** `Primary` fill at 100%
- **Photo grid:** 3x2 grid, each cell ~100x100px, radius `md` (8px)
  - Empty: `Neutral 100` background, Lucide `plus` icon centered (24px, `Neutral 500`), dashed border `Neutral 300`
  - First cell labeled "Principale" in `caption`
  - Filled: photo with small `x` button top-right to remove
  - Tap empty -> camera/gallery action sheet
  - Drag to reorder (haptic feedback)
- **Time chips:** Multi-select chip group per design system spec
- **Duration range slider:** Two thumbs, same styling as weight slider
  - Range: 15-120 min, step 15 min
- **Terrain chips:** Multi-select chip group with Lucide icons (trees, building-2, route, waves)
- **Complete button:** `Primary` filled, full-width. Disabled if <1 photo

**Navigation flow:**
- Back -> Step 3
- "Completa profilo" -> Permissions screen (O-14)

---

### 2.11 Permissions Screen

```
+---------------------------+
|                           |
|                           |
|     [illustration]        |
|     Dog with map pin      |
|     and location rings    |
|     160x160               |
|                           |
|                           |
|  Posizione necessaria     |
|                           |
|  Per mostrarti i cani     |
|  nelle vicinanze,         |
|  abbiamo bisogno di       |
|  accedere alla tua        |
|  posizione.               |
|                           |
|  [icon: shield-check]     |
|  La tua posizione non     |
|  sara mai condivisa       |
|  con precisione.          |
|                           |
|  [  Attiva Posizione  ]   |
|                           |
|  Dopo ->                  |
|                           |
+---------------------------+
```

After location permission granted/denied, transitions to:

```
+---------------------------+
|                           |
|                           |
|     [illustration]        |
|     Dog with bell and     |
|     notification bubbles  |
|     160x160               |
|                           |
|                           |
|  Non perderti i match     |
|                           |
|  Ti avviseremo quando     |
|  un cane compatibile      |
|  vuole conoscerti.        |
|                           |
|                           |
|                           |
|  [  Attiva Notifiche  ]   |
|                           |
|  Dopo ->                  |
|                           |
+---------------------------+
```

- **Layout:** Centered, single-purpose screen -- one permission per step
- **Illustration:** 160x160, warm style, contextual to the permission
- **Title:** `headingLarge` (24px/600) `Neutral 900`
- **Description:** `bodyLarge` (17px/400) `Neutral 700`, human language explaining WHY
- **Trust note:** Lucide `shield-check` icon + `bodySmall` `Neutral 500` -- privacy reassurance
- **CTA button:** `Primary` filled, full-width, height 48px
- **Skip link:** "Dopo" ghost link with arrow, `bodyMedium` `Neutral 500`

**Navigation flow:**
- "Attiva Posizione" -> system permission dialog -> notification permission screen
- "Attiva Notifiche" -> system permission dialog -> Tutorial Overlay on Discovery
- "Dopo" -> skips that permission, continues to next step
- If both skipped -> goes to Discovery feed directly

---

## 3. Discovery -- Swipe Feed

### 3.1 Swipe Feed (Main Screen)

```
+---------------------------+
|  PawMeet    [icon: filter] |
|                           |
|  +----------------------+ |
|  |                      | |
|  |                      | |
|  |   [DOG PHOTO]        | |
|  |   Full bleed          | |
|  |   aspect 3:4          | |
|  |                      | |
|  |              [87%]   | |  <- compatibility badge
|  |                      | |
|  | +------------------+ | |
|  | | Luna, 2 anni     | | |  <- gradient overlay area
|  | | Labrador | Media  | | |
|  | | [paw] Socievole   | | |
|  | |          ~1.2 km  | | |
|  | +------------------+ | |
|  +----------------------+ |     <- Card 1 (interactive)
|   +--------------------+  |     <- Card 2 (scale 0.95)
|    +------------------+   |     <- Card 3 (scale 0.90)
|                           |
|    ( X )          ( <3 )  |
|    Passa          Like    |
|                           |
|  12 cani da scoprire      |
|                           |
+--[paw]--[map]--[chat]--[user]+
```

- **Header:** "PawMeet" in `headingMedium` (20px/600) `Neutral 900`, filter icon top-right (Lucide `sliders-horizontal`, 24px)
- **Card stack:** 3 cards visible, only top card interactive
  - Card 1: scale 1.0, full opacity, draggable
  - Card 2: scale 0.95, translateY +8px, opacity 0.8
  - Card 3: scale 0.90, translateY +16px, opacity 0.5
  - Card size: full width minus `base` (16px) margins each side, height ~80% screen
  - Border radius: `xl` (16px)
  - Shadow: `lg` at rest, `xl` during drag
- **Photo:** Full bleed within card, aspect ratio 3:4
- **Gradient overlay:** Bottom 40% of card, linear-gradient from transparent to rgba(0,0,0,0.6)
- **Compatibility badge:** Top-right of card, 48px circle
  - >= 75%: `Success` background, `White` text
  - 50-74%: `Warning` background, `White` text
  - Text: `labelMedium` (13px/500), bold percentage number
- **Info overlay on gradient:**
  - Name + age: `headingLarge` (24px/600) `White`
  - Breed + size: `bodyMedium` (15px/400) `White` at 80%
  - Behavior badge: paw icon + text, `labelMedium`, `White` at 80%
  - Distance: `bodySmall` (13px) `White` at 70%, right-aligned
- **Action buttons:** Below card stack
  - Pass (X): 56x56 circle, `White` background, shadow `md`, Lucide `x` icon 28px `Error`
  - Like (heart): 56x56 circle, `White` background, shadow `md`, Lucide `heart` icon 28px `Primary`
  - Pressed: scale(0.90) with spring animation
- **Counter:** `caption` (11px) `Neutral 500`, centered below buttons
- **Tab bar:** Standard per design system (see section 4.6.9 of design doc)

**Swipe behavior:**
- Drag threshold: 120px horizontal to confirm
- Rotation during drag: max +/- 12 degrees, proportional to displacement
- Right swipe overlay: green tint with Lucide `heart` icon, opacity proportional to displacement
- Left swipe overlay: red tint with Lucide `x` icon, opacity proportional to displacement
- Exit animation: spring with damping 15, stiffness 150
- Next card animation: spring scale from 0.95 to 1.0

**Navigation flow:**
- Swipe right -> Like (if mutual match, triggers Match Animation X-01)
- Swipe left -> Pass (card exits left, next card rises)
- Tap card -> Dog Profile Expanded (M-02, bottom sheet)
- Filter icon -> Filters bottom sheet (M-03)
- Tab bar -> navigate between main sections

---

### 3.2 Swipe Overlays (During Drag)

```
RIGHT SWIPE:                      LEFT SWIPE:
+----------------------+          +----------------------+
|  +--[LIKE]--+        |          |        +--[NOPE]--+  |
|  | [heart]  |        |          |        | [x]      |  |
|  +-----------+       |          |        +----------+  |
|                      |          |                      |
|   [DOG PHOTO]        |          |   [DOG PHOTO]        |
|   (green tint        |          |   (red tint          |
|    overlay,          |          |    overlay,          |
|    opacity grows     |          |    opacity grows     |
|    with drag)        |          |    with drag)        |
|                      |          |                      |
|  Card rotates        |          |  Card rotates        |
|  +12deg max          |          |  -12deg max          |
|                      |          |                      |
| +------------------+ |          | +------------------+ |
| | Luna, 2 anni     | |          | | Luna, 2 anni     | |
| +------------------+ |          | +------------------+ |
+----------------------+          +----------------------+
```

- **LIKE badge:** Top-left of card, rotated -15deg
  - Background: `Success` at 90%, border 3px `Success`
  - Text: "LIKE" in `headingLarge` (24px/600) `Success`
  - Lucide `heart` icon 32px
- **NOPE badge:** Top-right of card, rotated +15deg
  - Background: `Error` at 90%, border 3px `Error`
  - Text: "NOPE" in `headingLarge` (24px/600) `Error`
  - Lucide `x` icon 32px
- **Tint overlay:** Full card, `Success` at 20% (right) or `Error` at 20% (left)
- **Opacity:** Badge and tint opacity proportional to drag distance (0 at center, 1.0 at threshold)

---

### 3.3 Empty States

**No dogs nearby:**
```
+---------------------------+
|  PawMeet    [icon: filter] |
|                           |
|                           |
|                           |
|     [illustration]        |
|     Dog with binoculars   |
|     looking into          |
|     distance              |
|     160x160               |
|                           |
|  Nessun cane nelle        |
|  vicinanze                |
|                           |
|  Prova ad aumentare il    |
|  raggio di ricerca o      |
|  torna piu tardi.         |
|                           |
|  [  Aumenta raggio  ]     |
|                           |
|                           |
+--[paw]--[map]--[chat]--[user]+
```

**All dogs seen:**
```
+---------------------------+
|  PawMeet    [icon: filter] |
|                           |
|                           |
|                           |
|     [illustration]        |
|     Dog sleeping on a     |
|     cozy bed              |
|     160x160               |
|                           |
|  Hai visto tutti!         |
|                           |
|  Torna domani per nuovi   |
|  suggerimenti, o allarga  |
|  il raggio.               |
|                           |
|  [  Modifica filtri  ]    |
|                           |
|                           |
+--[paw]--[map]--[chat]--[user]+
```

- **Layout:** Standard empty state per design system (section 4.6.12)
- **Illustration:** 160x160, contextual, warm style
- **Title:** `headingMedium` (20px/600) `Neutral 900`, centered
- **Description:** `bodyMedium` (15px/400) `Neutral 500`, centered, max 3 lines
- **CTA button:** `Secondary` variant (outline), centered, height 48px

---

### 3.4 Tutorial Overlay (First Launch)

```
+---------------------------+
|  (semi-transparent        |
|   overlay on top of       |
|   swipe feed)             |
|                           |
|         <---              |
|   Scorri a sinistra       |
|   = Passa                 |
|                           |
|         --->              |
|   Scorri a destra         |
|   = Interessato           |
|                           |
|         [tap]             |
|   Tocca = Dettagli        |
|                           |
|                           |
|   [     Ho capito    ]    |
|                           |
+---------------------------+
```

- **Overlay:** `rgba(0,0,0,0.7)`, full screen
- **Arrows:** Animated directional arrows (left, right), `White`, 48px
- **Text:** `headingSmall` (17px/600) `White`
- **Dismiss button:** `Primary` filled, "Ho capito", centered
- Shown only on first app launch; `MMKV` flag `hasSeenTutorial`

---

## 4. Dog Profile Expanded

### 4.1 Full Profile Bottom Sheet

```
+---------------------------+
|  -----  (handle bar)      |
|                           |
|  +----------------------+ |
|  |                      | |
|  | [PHOTO GALLERY]      | |
|  | (horizontal scroll,  | |
|  |  dots indicator)     | |
|  |                      | |
|  |  o * o o o           | |
|  +----------------------+ |
|                           |
|  Luna                     |
|  Labrador Retriever       |
|  [female] 2 anni          |
|  [icon: map-pin] ~1.2 km  |
|                           |
|  Compatibilita    [87%]   |
|  +----------------------+ |
|  | Taglia      25/25    | |
|  | ===============      | |
|  | Energia     20/25    | |
|  | =============        | |
|  | Socialita   18/20    | |
|  | ============         | |
|  | Passeggiata 12/15    | |
|  | ==========           | |
|  | Distanza    8/10     | |
|  | ========             | |
|  | Guinzaglio  4/5      | |
|  | ======               | |
|  +----------------------+ |
|                           |
|  Comportamento            |
|  [Alta energia]           |
|  [Molto socievole]        |
|  [Calmo al guinzaglio]    |
|  [Sterilizzato]           |
|                           |
|  Bio                      |
|  "Luna adora correre al   |
|  parco e giocare con      |
|  cani di tutte le taglie. |
|  E dolcissima!"           |
|                           |
|  Preferenze passeggiata   |
|  [Mattina] [Pomeriggio]   |
|  30-60 min                |
|  [Parco] [Sentiero]       |
|                           |
|  Proprietario             |
|  [avatar] Giulia          |
|  Iscritta da marzo 2026   |
|  [icon: check-circle]     |
|  Verificata               |
|                           |
|  [icon: flag] Segnala     |
|                           |
|    ( X )          ( <3 )  |
|    Passa          Like    |
|                           |
+---------------------------+
```

- **Presentation:** Bottom sheet (`@gorhom/bottom-sheet`), snap points at 50% and 90%
  - Handle bar: 36x4px `Neutral 300`, centered, margin-top 8px
  - Backdrop: `rgba(0,0,0,0.5)`, tap to close
  - Drag to expand/collapse/dismiss
- **Photo gallery:** Horizontal scroll, full-width, aspect 4:3
  - Page indicator dots: active `Primary` 8px, inactive `Neutral 300` 6px
  - Tap photo -> full-screen lightbox
- **Dog name:** `displayLarge` (32px/700) `Neutral 900`
- **Breed:** `bodyLarge` (17px/400) `Neutral 700`
- **Sex + age:** Custom sex icon (16px) + `bodyMedium` `Neutral 700`
- **Distance:** Lucide `map-pin` (16px) + `bodySmall` `Neutral 500`
- **Compatibility breakdown:**
  - Overall badge: same as card (circle, color-coded by percentage)
  - Category bars: `Primary` fill proportional to score, `Neutral 200` track
  - Category labels: `bodySmall` `Neutral 700`, score `labelSmall` `Neutral 900`
  - Categories: Size (25%), Energy (25%), Behavior (20%), Walk prefs (15%), Distance (10%), Leash (5%)
- **Behavior chips:** `labelMedium`, `Primary 50` background, `Primary` text, radius `full`
- **Bio:** `bodyMedium` (15px/400) `Neutral 700`, italic styling, max 200 chars displayed
- **Walk preferences:** Chips in `Neutral 100` with icons, `bodySmall` for duration
- **Owner section:** Avatar (48px circle) + name `headingSmall` + join date `caption` `Neutral 500`
  - Verified badge: Lucide `check-circle` `Info` + "Verificato/a" `labelSmall`
- **Report link:** Lucide `flag` (20px) + "Segnala" `bodySmall` `Neutral 500`, always within 2 taps
- **Action buttons:** Fixed at bottom, same as swipe feed (X and heart circles)
  - Always visible even when scrolling the sheet content

**Navigation flow:**
- Drag down or tap backdrop -> close sheet, return to swipe feed
- Like button -> same as swipe right (may trigger Match Animation)
- Pass button -> same as swipe left
- "Segnala" -> Report modal (X-02)
- Owner avatar tap -> no action in MVP (future: owner profile)

---

## 5. Map View

### 5.1 Map Screen

```
+---------------------------+
|  PawMeet         [filter]  |
|                           |
|  +----------------------+ |
|  |                      | |
|  |    [marker]          | |
|  |         [marker]     | |
|  |                      | |
|  |      (  ( [you] )  ) | |  <- user position with
|  |      (  (       )  ) | |     pulse animation and
|  |      (  (       )  ) | |     radius circle
|  |                      | |
|  | [marker]    [marker] | |
|  |                      | |
|  |         [cluster: 3] | |
|  |                      | |
|  |                      | |
|  +----------------------+ |
|                           |
|  Raggio: 5 km             |
|  +---[o]---------------+  |
|  1km                25km  |
|                           |
+--[paw]--[map]--[chat]--[user]+
```

- **Map:** Full screen behind header and tab bar, using `react-native-maps`
  - Provider: Google Maps (Android) / Apple Maps (iOS)
- **User position marker:**
  - Center: 16px circle, `Primary` fill
  - Pulse ring: `Primary` at 20%, animation 16px -> 48px, 2s loop
  - Search radius circle: `Map Radius` (#FF6B3520) fill, `Primary` at 40% stroke, 1px dashed
- **Dog markers:**
  - 40x40 circle with dog avatar (36x36) + 2px `White` border
  - Triangle pointer 8px below
  - Tap -> selected state: border `Primary`, scale to 48x48, shadow `lg`
  - Tap -> card preview appears (bottom sheet compact)
- **Cluster marker:** 40x40 circle, `Primary` fill, `White` number centered `labelMedium`
  - Tap -> zoom into cluster area
- **Radius slider:** Bottom of screen, above tab bar
  - Label: "Raggio:" + value in km, `labelMedium` `Neutral 700`
  - Slider: same styling as other sliders, range 1-25 km
  - Updates radius circle on map in real-time
- **Filter icon:** Top-right, same as Discovery

**Navigation flow:**
- Tap marker -> Card preview bottom sheet (M-05)
- Tap cluster -> map zooms in
- Adjust slider -> radius circle updates, markers refresh
- Filter icon -> Filters bottom sheet (same as Discovery)

---

### 5.2 Map Card Preview

```
+---------------------------+
|                           |
|       (map visible        |
|        above)             |
|                           |
+---------------------------+
|  -----  (handle bar)      |
|                           |
|  +------+                 |
|  |[photo]| Luna, 2 anni   |
|  | 64x64 | Labrador       |
|  |       | ~1.2 km  [87%] |
|  +------+                 |
|                           |
|  [    Vedi profilo    ]   |
|                           |
+--[paw]--[map]--[chat]--[user]+
```

- **Presentation:** Bottom sheet compact, snap point at 25%
- **Photo:** 64x64 circle, dog avatar
- **Info:** Name + age `headingSmall`, breed `bodyMedium` `Neutral 700`, distance `bodySmall` `Neutral 500`
- **Compatibility badge:** Small (20px height), positioned after distance
- **CTA:** "Vedi profilo" -- `Secondary` variant (outline), full-width, height 40px (compact)

**Navigation flow:**
- "Vedi profilo" -> Dog Profile Expanded (M-02) as full bottom sheet
- Drag down -> dismiss card preview
- Tap another marker -> swap card preview content

---

## 6. Match Animation

### 6.1 "It's a Match!" Screen

```
+---------------------------+
|                           |
|  (transparent modal       |
|   over current screen,    |
|   confetti particles      |
|   falling)                |
|                           |
|                           |
|                           |
|    +------+  +------+     |
|    |[your |  |[their|     |
|    | dog  |  | dog  |     |
|    | photo|  | photo|     |
|    +------+  +------+     |
|       96x96    96x96      |
|                           |
|  E' un Match!             |
|                           |
|  Max e Luna sono          |
|  compatibili al 87%!      |
|                           |
|                           |
|  [ Scrivi un messaggio ]  |
|                           |
|  Continua a esplorare ->  |
|                           |
|                           |
+---------------------------+
```

- **Presentation:** `transparentModal` in navigation stack, overlays current screen
- **Backdrop:** `rgba(0,0,0,0.7)` with blur
- **Confetti:** Animated particles in `Primary`, `Secondary`, Gold (`#FFD700`), falling from top
- **Dog photos:** Two 96x96 circles side by side
  - Animation: Start separated (off-screen left and right), spring together to center
  - Border: 3px `White`
  - Slight overlap (16px) at final position
- **Title:** "E' un Match!" -- `displayLarge` (32px/700) `White`
  - Animation: scale from 0 to 1 with spring, 200ms delay after photos settle
- **Subtitle:** Dog names + compatibility -- `bodyLarge` (17px/400) `White` at 80%
- **Primary CTA:** "Scrivi un messaggio" -- `Primary` filled, full-width (minus 32px margins), height 48px
  - Animation: fade up from bottom, 400ms delay
- **Secondary CTA:** "Continua a esplorare" -- ghost link, `White` at 70%, with arrow
- **Auto-dismiss:** No auto-dismiss; user must choose an action

**Navigation flow:**
- "Scrivi un messaggio" -> dismiss modal, navigate to Chat screen with this match
- "Continua a esplorare" -> dismiss modal, return to swipe feed

---

## 7. Chat

### 7.1 Match List + Conversation List

```
+---------------------------+
|  Chat                      |
|                           |
|  Nuovi match              |
|  +----+ +----+ +----+    |
|  |ava | |ava | |ava |    |  <- horizontal scroll
|  |Luna| |Rex | |Mia |    |
|  +----+ +----+ +----+    |
|   NEW                     |
|                           |
|  Messaggi                 |
|  +----------------------+ |
|  | [ava] Luna & Giulia  | |
|  |       Ci vediamo al  | |
|  |       parco alle 18? | |
|  |              14:32  2| |  <- unread badge
|  +----------------------+ |
|  +----------------------+ |
|  | [ava] Rex & Marco    | |
|  |       Ciao! Come     | |
|  |       stai?          | |
|  |              Ieri    | |
|  +----------------------+ |
|  +----------------------+ |
|  | [ava] Mia & Sara     | |
|  |       [icon: image]  | |
|  |       Foto            | |
|  |              Lun     | |
|  +----------------------+ |
|                           |
|                           |
+--[paw]--[map]--[chat]--[user]+
```

- **Header:** "Chat" in `headingMedium` (20px/600) `Neutral 900`
- **Match section:**
  - Title: "Nuovi match" `labelMedium` (13px/500) `Neutral 500`, uppercase
  - Horizontal scroll of match cards (72x96px each)
  - Avatar: 64x64 circle, dog photo
  - Name: `labelSmall` (11px/500), centered, 1 line with ellipsis
  - New match border: 2px `Primary`
  - Gap between cards: `sm` (8px)
- **Conversation list:**
  - Title: "Messaggi" `labelMedium` (13px/500) `Neutral 500`, uppercase
  - Each row: 72px height
  - Avatar: 48x48 circle, dog photo
  - Name: `headingSmall` (17px/600) `Neutral 900`, "Dog & Owner"
  - Preview: `bodyMedium` (15px/400) `Neutral 500`, 1 line ellipsis
  - Timestamp: `caption` (11px/400) `Neutral 500`, right-aligned
  - Unread badge: 20px circle, `Primary` fill, `White` number `labelSmall`
  - If has unread: name and preview in `Neutral 900` (bolder), otherwise `Neutral 700`
  - Divider: 0.5px `Neutral 200`, indented to align with text (left 72px)
  - Swipe left on row -> reveal "Unmatch" action (red background)

**Navigation flow:**
- Tap match card -> Chat screen with that match
- Tap conversation row -> Chat screen
- Swipe left on conversation -> Unmatch confirmation (X-05)

---

### 7.2 Chat Screen

```
+---------------------------+
|  [<] [ava] Luna & Giulia  |
|                     [...] |
|                           |
|  +----------------------+ |
|  |    Mercoledi 12 Mar  | |
|  +----------------------+ |
|                           |
|       +----------------+  |
|       | Ciao! Che bello |  |
|       | il match!       |  |
|       +----------------+  |
|                 14:30     |
|                           |
|  +------------------+     |
|  | Ciao! Anche Luna |     |
|  | e entusiasta!    |     |
|  +------------------+     |
|  14:31                    |
|                           |
|       +----------------+  |
|       | Ci vediamo al  |  |
|       | parco Sempione |  |
|       | alle 18?       |  |
|       +----------------+  |
|                 14:32  vv |
|                           |
|  [ava] sta scrivendo...   |
|                           |
+---------------------------+
|  [+] [message input] [>] |
+---------------------------+
```

- **Header:**
  - Back: Lucide `chevron-left` 24px, `Neutral 900`
  - Avatar: 32x32 circle, dog photo (tappable)
  - Title: "Dog & Owner" in `headingSmall` (17px/600) `Neutral 900`
  - Actions: Lucide `more-horizontal` -> dropdown with "Vedi profilo", "Segnala", "Blocca", "Annulla match"
- **Date separator:** Centered, `caption` (11px/400) `Neutral 500`, with thin lines on each side
- **Sent messages (right-aligned):**
  - Background: `Chat Bubble Sent` (#FF6B35)
  - Text: `bodyLarge` (17px/400) `White`
  - Border radius: 16px top-left, 16px top-right, 4px bottom-right, 16px bottom-left
  - Padding: 12px horizontal, 8px vertical
  - Max width: 75% screen
  - Timestamp: `caption` `White` at 70%, right-aligned below bubble
  - Read receipt: double check marks, `White` at 70%
- **Received messages (left-aligned):**
  - Background: `Chat Bubble Received` (#F2F2F7 light / #2C2C2E dark)
  - Text: `bodyLarge` (17px/400) `Neutral 900`
  - Border radius: 4px top-left, 16px top-right, 16px bottom-right, 16px bottom-left
  - Avatar: 28x28 dog photo, only on first message of a group
  - Timestamp: `caption` `Neutral 500`
- **Typing indicator:** Dog avatar (28x28) + animated three dots, `bodySmall` `Neutral 500`
- **Input bar:**
  - Background: `White`, border-top 0.5px `Neutral 300`
  - Attach: Lucide `plus` in circle, 32px, `Neutral 500` -> action sheet (photo, camera)
  - Text input: flex-grow, min height 36px, max height 120px (multi-line), `bodyLarge`
  - Send: Lucide `send` in `Primary` circle, 32px, visible only when input has text
  - Safe area padding at bottom

**Navigation flow:**
- Back -> return to Match/Chat list
- Tap avatar in header -> Dog Profile Expanded (M-02)
- Tap "..." -> actions dropdown
- Tap "Vedi profilo" -> Dog Profile (M-02)
- Tap "Segnala" -> Report modal (X-02)
- Tap "Blocca" -> Block confirmation (X-04)
- Tap "Annulla match" -> Unmatch confirmation (X-05)
- Tap "+" -> attach photo (camera or gallery)
- Pull up -> load older messages

---

### 7.3 Chat Empty State

```
+---------------------------+
|  Chat                      |
|                           |
|                           |
|                           |
|     [illustration]        |
|     Two dogs looking      |
|     at each other         |
|     from a distance       |
|     160x160               |
|                           |
|  Nessun match ancora      |
|                           |
|  Continua a esplorare     |
|  per trovare il compagno  |
|  perfetto per il tuo      |
|  cane.                    |
|                           |
|  [  Vai al Discovery  ]   |
|                           |
|                           |
+--[paw]--[map]--[chat]--[user]+
```

- Standard empty state layout (section 4.6.12)
- CTA navigates to Discovery tab

---

## 8. User Profile

### 8.1 Profile Screen

```
+---------------------------+
|  Profilo         [gear]    |
|                           |
|       +----------+        |
|       |          |        |
|       | [owner   |        |
|       |  photo]  |        |
|       |          |        |
|       +----------+        |
|        96x96              |
|                           |
|       Marco Rossi         |
|       Iscritto da         |
|       marzo 2026          |
|       [icon: check]       |
|       Verificato          |
|                           |
|  [  Modifica profilo  ]   |
|                           |
|  I miei cani              |
|  +----------------------+ |
|  | [photo]  Max          | |
|  |  64x64   Labrador    | |
|  |           2 anni     | |
|  |           [edit] [>] | |
|  +----------------------+ |
|  +----------------------+ |
|  | [photo]  Bella        | |
|  |  64x64   Beagle      | |
|  |           4 anni     | |
|  |           [edit] [>] | |
|  +----------------------+ |
|                           |
|  [+] Aggiungi cane        |
|                           |
|                           |
+--[paw]--[map]--[chat]--[user]+
```

- **Header:** "Profilo" in `headingMedium`, settings gear icon (Lucide `settings`) top-right
- **Owner photo:** 96x96 circle (Avatar size `2XL`)
- **Name:** `headingLarge` (24px/600) `Neutral 900`, centered
- **Join date:** `bodySmall` (13px/400) `Neutral 500`
- **Verified badge:** Lucide `check-circle` `Info` + "Verificato" `labelSmall` `Info`
- **Edit profile button:** `Secondary` variant (outline), centered, width auto
- **Section title:** "I miei cani" `headingSmall` (17px/600) `Neutral 900`
- **Dog cards:** Horizontal layout
  - Photo: 64x64 circle
  - Name: `headingSmall` `Neutral 900`
  - Breed + age: `bodyMedium` `Neutral 700`
  - Edit icon: Lucide `edit-3` 20px `Neutral 500`
  - Chevron: Lucide `chevron-right` 20px `Neutral 400`
  - Background: `White`, border 1px `Neutral 200`, radius `lg`
  - Shadow: `sm`
  - Gap between cards: `md` (12px)
- **Add dog:** Lucide `plus` icon (20px, `Primary`) + "Aggiungi cane" `bodyMedium` `Primary`
  - Max 5 dogs per account; hidden if limit reached

**Navigation flow:**
- Settings gear -> Settings screen (M-13)
- "Modifica profilo" -> Edit Owner Profile (M-10)
- Tap dog card or edit icon -> Edit Dog Profile (M-11)
- Tap chevron on dog card -> Dog Profile Expanded (read-only view of own dog)
- "Aggiungi cane" -> Add Dog wizard (M-12, same as onboarding wizard)

---

### 8.2 Settings Screen

```
+---------------------------+
|  [<] Impostazioni          |
|                           |
|  PREFERENZE               |
|  +----------------------+ |
|  | [bell]   Notifiche  >| |
|  +----------------------+ |
|  | [shield] Privacy    >| |
|  +----------------------+ |
|  | [map-pin] Raggio    >| |
|  |           ricerca    | |
|  +----------------------+ |
|  | [sun]    Aspetto    >| |
|  +----------------------+ |
|  | [globe]  Lingua     >| |
|  +----------------------+ |
|                           |
|  SUPPORTO                 |
|  +----------------------+ |
|  | [info]   Info app   >| |
|  +----------------------+ |
|  | [help]   Supporto / >| |
|  |          FAQ         | |
|  +----------------------+ |
|                           |
|  ACCOUNT                  |
|  +----------------------+ |
|  | [shield-off] Blocchi>| |
|  +----------------------+ |
|  | [log-out] Esci       | |
|  +----------------------+ |
|  | [trash-2] Elimina   >| |
|  |           account    | |
|  +----------------------+ |
|                           |
|  PawMeet v1.0.0           |
|                           |
+---------------------------+
```

- **Header:** Back arrow + "Impostazioni" `headingMedium`
- **Section headers:** `labelMedium` (13px/500) `Neutral 500`, uppercase, letter-spacing 1px
  - Margin: `xl` (24px) top, `sm` (8px) bottom
- **Setting rows:** Height 52px
  - Icon: Lucide, 20px, `Neutral 700`, left
  - Label: `bodyLarge` (17px/400) `Neutral 900`
  - Chevron: Lucide `chevron-right` 20px `Neutral 400`, right (for drill-down rows)
  - Background: `White`, grouped with 1px `Neutral 200` dividers
  - Border radius `lg` on group container
- **Logout row:** Icon and text in `Neutral 700` (no chevron, immediate action)
- **Delete account row:** Icon and text in `Error` (drill-down to confirmation)
- **Version:** `caption` `Neutral 500`, centered at bottom

**Navigation flow:**
- Each row with chevron -> respective settings sub-screen
- "Esci" -> confirmation dialog -> logout -> Welcome screen
- "Elimina account" -> Delete Account confirmation (M-18)

---

## Navigation Flow Summary

```
                                   +-- Splash --+
                                        |
                                  +-----v------+
                                  | Welcome    |
                                  | Slides 1-3 |
                                  +-----+------+
                                        |
                              +---------+---------+
                              |                   |
                         +----v----+        +-----v-----+
                         | Login   |<------>| Register  |
                         +----+----+        +-----+-----+
                              |                   |
                              |             +-----v-----+
                              |             | OTP       |
                              |             | Verify    |
                              |             +-----+-----+
                              |                   |
                              +--------+----------+
                                       |
                                +------v-------+
                                | Owner        |
                                | Profile      |
                                +------+-------+
                                       |
                                +------v-------+
                                | Dog Wizard   |
                                | Steps 1-4    |
                                +------+-------+
                                       |
                                +------v-------+
                                | Permissions  |
                                | (Location +  |
                                |  Notifs)     |
                                +------+-------+
                                       |
                    +------------------v------------------+
                    |          Main Tab Navigator          |
                    |                                      |
          +---------+--------+---------+---------+         |
          |         |        |         |         |         |
     +----v---+ +---v--+ +--v---+ +---v----+    |         |
     |Discover| | Map  | | Chat | |Profile |    |         |
     |Swipe   | | View | | List | |        |    |         |
     +----+---+ +---+--+ +--+---+ +---+----+    |         |
          |         |        |         |         |         |
     +----v---+ +---v--+ +--v---+ +---v----+    |         |
     |Dog     | |Card  | |Chat  | |Settings|    |         |
     |Profile | |Prev. | |Screen| |Edit    |    |         |
     |Expand  | |      | |      | |Add Dog |    |         |
     +--------+ +------+ +------+ +--------+    |         |
                                                 |         |
          +--------------------------------------+         |
          |  Global Modals                        |         |
          |  - Match Animation                    |         |
          |  - Report                             |         |
          |  - Block Confirm                      |         |
          |  - Unmatch Confirm                    |         |
          |  - Network Error                      |         |
          +---------------------------------------+         |
                                                           |
                    +--------------------------------------+
```

---

## Design Implementation Checklist

Before starting frontend development, ensure:

- [ ] Design tokens defined as CSS custom properties (web) and RN StyleSheet constants (mobile)
- [ ] Lucide icons integrated (`lucide-react` for web, `lucide-react-native` for mobile)
- [ ] Custom SVG icons created (paw, bone, leash, dog-face, two-dogs, dog sizes, male/female)
- [ ] Illustrations commissioned/created for: onboarding slides, empty states, permissions screens
- [ ] Inter font loaded with weights 400, 600, 700 only
- [ ] Color palette aligned: web uses `#065F46` primary, mobile palette decision finalized
- [ ] Bottom sheet library integrated (`@gorhom/bottom-sheet`)
- [ ] Gesture handler + Reanimated configured for swipe cards
- [ ] Skeleton placeholder components built
- [ ] Toast notification component built (replacing all alert() calls)
- [ ] Dark mode token mapping completed
- [ ] All touch targets >= 48x48px verified
- [ ] `prefers-reduced-motion` support for web animations

---

## Appendix: Screen ID Cross-Reference

| Wireframe Section | Screen ID (from design system doc) | Priority |
|---|---|---|
| 1.1-1.6 Landing Page | N/A (web-only) | Critical |
| 2.1-2.3 Welcome Slides | O-02, O-03, O-04 | Critical |
| 2.4 Login | O-05 | Critical |
| 2.5 Register | O-06 | Critical |
| 2.6 Owner Profile | O-09 | Critical |
| 2.7-2.10 Dog Wizard | O-10, O-11, O-12, O-13 | Critical |
| 2.11 Permissions | O-14 | High |
| 3.1 Swipe Feed | M-01 | Critical |
| 3.3 Empty States | M-01 variants | High |
| 3.4 Tutorial Overlay | O-15 | Medium |
| 4.1 Dog Profile Expanded | M-02 | Critical |
| 5.1 Map Screen | M-04 | High |
| 5.2 Map Card Preview | M-05 | High |
| 6.1 Match Animation | X-01 | Critical |
| 7.1 Match + Chat List | M-06 | Critical |
| 7.2 Chat Screen | M-07 | Critical |
| 8.1 Profile Screen | M-09 | High |
| 8.2 Settings | M-13 | Medium |
