# PawMeet Web — Redesign Tracker

> Palette: **A — Deep Forest & Champagne**
> Mood: *"Vita nella natura di lusso"*

---

## Fase 1 — Fondamenta

- [x] Decidere palette definitiva (A — Deep Forest & Champagne)
- [x] Creare `packages/design-tokens/` con:
  - [x] `colors.ts` — palette completa con light/dark mode + regole a11y
  - [x] `typography.ts` — scala tipografica (displayLarge → caption), 3 weights (400, 600, 700)
  - [x] `spacing.ts` — scala base-4 (xxs → 5xl)
  - [x] `radius.ts` — border radius tokens
  - [x] `shadows.ts` — shadow tokens light/dark (RN + CSS)
  - [x] `index.ts` — export unificato
- [x] Aggiornare `apps/web/src/styles/global.css` per consumare tokens (+ secondary-text, accent, neutrals, shadows)
- [x] Aggiornare `packages/ui/` per consumare tokens (Button, Input, Badge, Avatar, EmptyState) — zero hardcoded colors
- [x] Fix accessibilita critica web:
  - [x] `aria-expanded` + `aria-controls` menu mobile (Header.astro)
  - [x] `<label>` esplicita + `autocomplete` su WaitlistForm
  - [x] Skip-to-content link (BaseLayout.astro)
  - [x] Contrasto testo footer (neutral-200/300 su neutral-900)
- [x] Ridurre font weights da 5 a 3 (400, 600, 700)

## Fase 1.5 — Preparazione (GitHub Issues S0)

- [x] **#58** Code guidelines e code review standards → `docs/code-guidelines.md`
- [x] **#54** Wireframe a bassa fedelta dei flussi principali → `docs/wireframes-low-fidelity.md`
- [ ] **#56** Setup strumenti di progetto (Linear, Slack, Confluence) — manuale, non codice

## Fase 2 — Rebuild UI

- [x] Aggiungere Framer Motion + Lucide React (React islands in Astro)
- [x] Riprogettare Hero con staggered reveal + CTA hierarchy (`HeroClient.tsx`, `client:load`)
- [x] Feature cards differenziate con icone Lucide, highlight + comingSoon (`FeaturesClient.tsx`, `client:visible`)
- [x] "Come Funziona" come timeline narrativa (`HowItWorksClient.tsx`, `client:visible`)
- [x] Implementare dark mode (CSS custom properties, `prefers-color-scheme` + `data-theme`)
- [x] Form waitlist con state machine loading/success/error (`WaitlistFormClient.tsx`, `client:visible`)
- [x] Form contatti con state machine loading/success/error (`ContactFormClient.tsx`, `client:visible`)
- [x] `prefers-reduced-motion` support
- [x] Migrare classi `gray-*` → `neutral-*` nelle pagine secondarie (chi-siamo, blog, privacy, terms, cookie, waitlist, Header)

## Fase 3 — Polish

- [x] Footer con identità brand (grid 12 col, brand column con tagline + accent bar, P.IVA, email nel bottom bar)
- [x] Blog: convertito a "coming soon" con CTA waitlist (rimossi placeholder finti)
- [x] Privacy policy in accordion (`AccordionClient.tsx` + `PrivacyAccordionClient.tsx`, 13 sezioni collassabili con Framer Motion)
- [x] Lighthouse optimization (`meta theme-color`, font `display=swap`, `preconnect`)
- [x] Pa11y WCAG AA check in CI (`.pa11yci.json`, job `a11y` in `ci.yml`, tutte le 8 pagine)
- [x] Fix colori residui: `text-emerald-700` → `text-primary` in privacy, terms, cookie

---

## Palette A — Deep Forest & Champagne

### Primary (Emerald)
| Token | Hex | Ruolo |
|-------|-----|-------|
| primary-900 | `#064E3B` | Hover/press |
| **primary** | `#065F46` | CTA, testo, link |
| primary-600 | `#059669` | Accento secondario |
| accent | `#10B981` | Solo su scuro / come background |
| primary-50 | `#ECFDF5` | Background tinted |

### Secondary (Champagne Gold)
| Token | Hex | Ruolo |
|-------|-----|-------|
| secondary | `#C9A84C` | Solo decorativo / bg / testo su dark |
| **secondary-text** | `#8B6914` | Testo gold su sfondo chiaro (AA 4.86:1) |
| secondary-dark | `#A6872E` | Bordi gold, icone |
| secondary-50 | `#FDF8EF` | Background caldo |

### Regole a11y
- **Primary su bianco: 7.68:1 AAA** — usare liberamente per testo
- **Secondary-text su bianco: 4.86:1 AA** — usare per testo gold
- **Secondary su bianco: 2.29:1 FAIL** — MAI come testo, solo decorativo/bg
- **Accent su bianco: 2.54:1 FAIL** — MAI come testo su chiaro
- **Accent su dark (#1C1C1E): 6.71:1 AA** — ok per testo dark mode
- **Secondary su dark (#1C1C1E): 7.45:1 AAA** — ok per testo dark mode

### Typography
| Token | Size | Weight | Line Height | Uso |
|-------|------|--------|-------------|-----|
| displayLarge | 32px | 700 | 40px | Titoli pagina, hero |
| displayMedium | 28px | 700 | 36px | Titoli sezione |
| headingLarge | 24px | 600 | 32px | Sottotitoli |
| headingMedium | 20px | 600 | 28px | Heading card |
| headingSmall | 17px | 600 | 24px | Nome in lista |
| bodyLarge | 17px | 400 | 24px | Corpo principale |
| bodyMedium | 15px | 400 | 22px | Corpo secondario |
| bodySmall | 13px | 400 | 18px | Supporto, timestamp |
| labelLarge | 17px | 600 | 22px | Label bottone |
| labelMedium | 13px | 600 | 18px | Badge, chip |
| labelSmall | 11px | 600 | 16px | Caption, helper |

### Spacing (base 4px)
| Token | Value |
|-------|-------|
| xxs | 2px |
| xs | 4px |
| sm | 8px |
| md | 12px |
| base | 16px |
| lg | 20px |
| xl | 24px |
| 2xl | 32px |
| 3xl | 40px |
| 4xl | 48px |
| 5xl | 64px |
