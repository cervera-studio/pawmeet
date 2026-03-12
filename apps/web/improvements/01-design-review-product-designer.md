# Design Review — Product Designer (Martina Colombo)

> School of Jony Ive
> Date: 2026-03-12
> Scope: PawMeet Web App (Astro Landing Page)
> Verdict: **IMPROVE, NOT REDO**

---

## What Works Well

### 1. Solid Information Hierarchy
Clear and logical structure. The user immediately understands what PawMeet is:
- Well-proportioned Hero section (title + description + double CTA)
- Linearly organized sections: How It Works → Features → Waitlist → Download
- Footer with transparent legal navigation

### 2. Appropriate Color Palette
- **Primary (Deep Emerald `#065F46`)**: evokes nature, safety, compatibility
- **Secondary (Gold `#C9A84C`)**: warmth, premium, walking
- Balanced neutral palette (`Neutral 900-50`) for readability

### 3. Professional Typography
- Inter is an excellent choice: readable, friendly, good Italian accent support
- Moderate and coherent type scale
- Varied font weights (400, 500, 600, 800) provide hierarchy

### 4. Mobile-First Responsiveness
- Coherent Tailwind usage: `sm:`, `md:`, `lg:` breakpoints
- Adaptive padding and margins
- Fluid typography (`text-3xl sm:text-4xl lg:text-6xl`)
- Sticky header with working mobile menu

### 5. Consistent Components
- Unified button design (rounded-full, padding 3, shadow-lg on primary CTAs)
- Subtle card hover states (shadow-sm → shadow-md)
- Clear input focus states with color ring

### 6. Basic Accessibility Present
- `alt` attributes on images
- Semantic HTML (header, footer, section, article)
- Visible focus states on inputs and buttons
- Associated labels in forms

### 7. SEO-Aware
- Base metadata present (og:image, og:description, twitter cards)
- Canonical URLs
- Astro-generated sitemap.xml

---

## Issues & Recommendations

### 1. CRITICAL — Color Palette Inconsistency with Mobile Design System

**Problem:** Web uses `#065F46` as primary, but mobile design system doc specifies `#FF6B35` (Orange Warm).

**Resolution (2026-03-12):** Decided on Palette A — Deep Forest & Champagne. Web and mobile will both use `#065F46` as primary. Design system doc (`docs/06`) needs updating to reflect this decision.

### 2. Decorative Blobs Without Intention
**File:** `Hero.astro:32-34`

The blob shapes in Hero are pleasant but don't serve the product's value. They're purely cosmetic.

**Recommendation:** Remove blobs or transform them into purposeful illustrations (e.g., two dogs approaching each other). If kept, add keyframe animation for energy.

### 3. Hero Double CTA Lacks Clear Hierarchy
**File:** `Hero.astro:15-28`

Both buttons have similar visual weight. On mobile (`flex-col`), both become full-width, diluting priority.

**Recommendation:** Make "Iscriviti alla waitlist" the primary (filled button with shadow), and "Scopri come funziona" a ghost link with arrow (`→`), not a button.

### 4. Feature Cards Too Uniform
**File:** `Features.astro:14-22`

All 6 cards are identical. No hierarchy of importance. "Match intelligente" (the key differentiator) looks the same as "Tracciamento percorsi" (future feature).

**Recommendation:** Highlight the differentiator card with `border-2 border-primary`. De-emphasize future features with a "Coming Soon" badge. Add distinct icons.

### 5. "How It Works" Too Schematic
**File:** `HowItWorks.astro:14-24`

3-column layout without visual connections. User sees 3 numbered boxes, not an experience flow. No sense of progression or narrative.

**Recommendation:** Redesign as a visual timeline with connectors (SVG paths) between steps. Use illustrations showing the action, not just numbers.

### 6. Waitlist Form — Superficial Feedback
**File:** `WaitlistForm.astro:38-48`

Uses `alert()` for success feedback. Has `// TODO: collegare al backend`. No client-side validation beyond HTML5 `required`. No loading state.

**Recommendation:** Implement proper form UX: loading spinner, disable button during submit, toast notification (not alert), error handling, prevent double submit.

### 7. Contact Form — Same Problem
**File:** `contatti.astro:65-72`

Same anti-pattern: TODO comment, alert(), no backend connection.

**Recommendation:** Implement properly or replace with a simple `mailto:` link.

### 8. Privacy Policy Too Long for Web
**File:** `privacy.astro` (626 lines)

Massive wall of legal text. Not mobile-friendly.

**Recommendation:** Use accordion/collapsible sections per chapter, add a table of contents with jump links, offer a downloadable PDF.

### 9. Generic Footer
**File:** `Footer.astro`

Standard dark footer, no PawMeet personality. Generic black background.

**Recommendation:** Add brand gradient, micro-copy that tells the PawMeet story, newsletter signup CTA.

### 10. Blog with Placeholder Content
**File:** `blog/index.astro:48-61`

All links point to `#` (placeholders). Posts are fake. "More articles coming" message suggests incomplete content.

**Recommendation:** Either remove the blog entirely, or populate with 3-5 real articles before launch. An empty blog transmits abandonment.

### 11. Inconsistent Spacing Between Sections

All sections use uniform `py-20/28` but alternate background colors continuously. The rhythm feels chaotic.

**Recommendation:** Max 2-3 background colors. Use spacing for breathing, not colors. Structure: white → neutral-50 → white → primary-50 (for CTA section only).

### 12. Borderline Text Contrast
- Footer text: `text-gray-300` on `bg-gray-900` — borderline contrast
- Secondary CTA text: `text-gray-700` on `border-gray-300` — too subtle

**Resolution (2026-03-12):** Fixed in Fase 1. Footer now uses `neutral-200` on `neutral-900`.

### 13. No Mobile Menu Transition
**File:** `Header.astro:69-75`

Menu shown/hidden without transition. Abrupt change on slow devices.

**Recommendation:** Add CSS transition with slide-down animation (300ms ease-out).

---

## Priority Matrix

| Priority | Task | Impact | Effort |
|----------|------|--------|--------|
| Critical | ~~Align color palette~~ | Brand consistency | ~~4h~~ Done |
| Critical | Connect waitlist form to backend | Lead capture | 8h |
| High | Redesign Hero CTA hierarchy | Conversion | 2h |
| High | Differentiate Feature cards | Visual hierarchy | 3h |
| High | Redesign "How It Works" as timeline | Narrative flow | 6h |
| High | Connect contact form to backend | Credibility | 4h |
| Medium | Remove/populate blog | Professionalism | 0-16h |
| Medium | Redesign footer with personality | Brand | 3h |
| Medium | Privacy policy in accordion | Mobile UX | 2h |
| Low | Remove decorative blobs | Minimalism | 0.5h |
| Low | Add mobile menu transitions | Polish | 1h |

---

## Conclusion

The landing page says today: *"We are professional, safe, reliable"* (green + white space).

It should say: *"We are energetic, friendly, the community of your friends who love dogs"* (warmth + motion + stories).

The landing is a symposium, not a party. Make the tone warmer.
