# Design System Audit — Systems Designer (Giulia Neri)

> School of Dieter Rams
> Date: 2026-03-12
> Scope: PawMeet Web App (Astro Landing) + packages/ui/
> Verdict: **PARTIAL REBUILD — Tokenization First**

---

## Executive Summary

The web landing page shows a **lackluster and inconsistent** implementation compared to the design system documented in `docs/06-ux-ui-design-system.md`. While the general structure is clean and well-organized, there are **significant issues** with token architecture, lack of systematic component composition, and disconnection between the web app and the design system defined for mobile/admin.

---

## 1. Token Architecture — Critical Issues

### 1.1 Tokens Defined But NOT Centralized

Colors were defined in `global.css` as CSS variables but there was **no cross-platform structure** as documented in `docs/06` section 8. The variables were CSS-only, not consumable by React Native or admin app.

**Resolution (2026-03-12):** Created `packages/design-tokens/` with TypeScript tokens for colors, typography, spacing, radius, and shadows. All `packages/ui/` components now import from `@pawmeet/design-tokens`.

### 1.2 Hardcoded Values in React Native Components (FIXED)

All components in `packages/ui/` had hardcoded hex colors and pixel values:

| Component | Before | After |
|-----------|--------|-------|
| `Button.tsx:11` | `backgroundColor: '#065F46'` | `backgroundColor: lightColors.primary` |
| `Button.tsx:16` | `borderColor: '#065F46'` | `borderColor: lightColors.primary` |
| `Button.tsx:22` | `backgroundColor: '#FF3B30'` | `backgroundColor: lightColors.error` |
| `Input.tsx:62` | `color: '#4A4A5A'` | `color: lightColors.textSecondary` |
| `Input.tsx:70` | `color: '#1A1A2E'` | `color: lightColors.textPrimary` |
| `Input.tsx:76` | `borderColor: '#065F46'` | `borderColor: lightColors.primary` |
| `Badge.tsx:16` | `color: '#34C759'` | `color: lightColors.success` |
| `Badge.tsx:22` | `backgroundColor: '#065F46'` | `backgroundColor: lightColors.primary` |
| `Avatar.tsx:31` | `'#FFF3ED'` | `lightColors.primary50` |

### 1.3 Missing Tokens in Web Design System (FIXED)

Web app had no TypeScript token files. Only partial CSS variables in `global.css`. No dark mode support. Spacing tokens were not standardized.

**Resolution:** `global.css` now defines complete token set including `secondary-text`, `accent`, full neutral scale, semantic colors, and shadow tokens.

---

## 2. Palette Inconsistency (RESOLVED)

Three versions of the color palette were in use simultaneously:

| Source | Primary | Secondary |
|--------|---------|-----------|
| Web (`global.css`) | `#065F46` | `#C9A84C` |
| Mobile (`packages/ui`) | `#065F46` | N/A |
| Doc (`docs/06`) | `#FF6B35` | `#2D6A4F` |

**Resolution (2026-03-12):** Decided on **Palette A — Deep Forest & Champagne**. All platforms will use `#065F46` primary + `#C9A84C` secondary. Doc needs updating.

---

## 3. Cross-Platform Consistency Check

### 3.1 Typography
- **Mobile:** No centralized typography tokens (was hardcoded in StyleSheet.create)
- **Web:** Tailwind default typography scale
- **Doc:** 15 preset definitions (displayLarge through caption)

**Resolution:** `packages/design-tokens/src/typography.ts` now defines all 11 presets. `packages/ui/` components consume them. Web needs to consume in Fase 2.

### 3.2 Spacing
- **Mobile:** Was hardcoded in StyleSheet
- **Web:** Tailwind defaults + arbitrary values (py-20, py-28 — non-standard)
- **Doc:** Base 4px scale

**Resolution:** `packages/design-tokens/src/spacing.ts` defines the canonical scale. `packages/ui/` components now use it. Web still uses Tailwind values (to be aligned in Fase 2).

---

## 4. Responsive Design

**Positive:**
- Correct Tailwind breakpoints: `sm:`, `md:`, `lg:`
- Mobile-first approach respected
- Good examples: Header (`hidden md:flex`), Hero (`text-4xl sm:text-5xl lg:text-6xl`)

**Still Missing:**
- No `xl:` breakpoint (landing responsive only up to lg)
- No dark mode support (`dark:` classes)

---

## 5. Accessibility (a11y) Audit

| Criterion | Before | After (Fase 1) |
|-----------|--------|----------------|
| ARIA labels | Minimal (2/10) | Improved (5/10) |
| Focus management | Partial (3/10) | Better (5/10) |
| Color contrast | Not validated (0/10) | Fixed footer (4/10) |
| Semantic HTML | Mostly divs (4/10) | Same (4/10) |
| Skip-to-content | Missing | Added |
| `aria-expanded` | Missing | Added |
| Form labels | Placeholder only | Explicit `<label>` added |

### Still Needed (Fase 2+)
- Focus trap in mobile menu
- Full WCAG 2.1 AA validation with Pa11y
- `aria-describedby` for form error messages
- Color contrast validation across all combinations

---

## 6. Component Reusability

**Problem:** Web app does NOT use any components from `packages/ui/`. Every component is reinvented with inline Tailwind classes.

| Web Component | Equivalent in packages/ui | Shared? |
|---------------|--------------------------|---------|
| `<a class="...btn...">` | `Button.tsx` | No |
| `<input class="...">` | `Input.tsx` | No |
| Feature cards | N/A | No |
| Badge-like elements | `Badge.tsx` | No |

**Reason:** `packages/ui/` is React Native only. Web uses Astro (static HTML).

**Future Resolution Options:**
1. Create `packages/ui-web/` with web-specific components
2. Use shadcn/ui (already used in admin app)
3. Extract headless logic into shared package

---

## 7. Component Audit Checklist (Rams' Principles)

| # | Criterion | Score | Notes |
|---|-----------|-------|-------|
| 1 | Does it already exist in packages/ui? | 1/10 | No sharing |
| 2 | Tokens only (no hardcoded)? | 8/10 | Fixed in Fase 1 |
| 3 | All states covered? | 3/10 | Missing error, loading, disabled |
| 4 | Responsive? | 7/10 | Good mobile-first |
| 5 | Accessible? | 5/10 | Improved but incomplete |
| 6 | Composable? | 1/10 | Monolithic Astro components |
| 7 | Documented? | 2/10 | No JSDoc, no README |
| 8 | Platform-adapted? | 3/10 | Zero shared component library |
| 9 | Bundle impact? | 6/10 | Astro SSG is light |
| 10 | Naming consistent? | 7/10 | PascalCase, kebab-case files |

---

## 8. Recommended Phases

### Phase 1 — Tokenization (DONE)
- [x] Create `packages/design-tokens/`
- [x] Update `packages/ui/` to consume tokens
- [x] Update `global.css` with full token set
- [x] Fix critical a11y (aria-expanded, labels, skip-to-content, contrast)

### Phase 2 — Component Extraction (Fase 2)
- [ ] Extract reusable Astro components (FormInput, Card, Button)
- [ ] Implement dark mode
- [ ] Refactor spacing scale (base-4)
- [ ] Add focus management (mobile menu trap)
- [ ] Setup Pa11y WCAG testing

### Phase 3 — Cross-Platform (Fase 3+)
- [ ] Typography scale standardization in web
- [ ] Storybook or Astro testing setup
- [ ] Cross-platform design token consumption
- [ ] Admin app integration (shadcn/ui vs custom tokens)

---

## 9. Launch Readiness

| Criteria | Status | Blocker? |
|----------|--------|----------|
| Forms accessible (WCAG 2.1 AA) | Partial | YES — needs error states |
| Color palette aligned | Done | No |
| Responsive tested | OK | No |
| Privacy/Terms pages | OK | No |
| Token architecture | Done | No |
| Dark mode | Missing | No (nice to have for launch) |
