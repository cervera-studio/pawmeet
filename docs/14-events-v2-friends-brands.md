# 14 — Events v2, Friend System & Brand Partnerships

> **Status:** Draft
> **Author:** Auto-generated from team brainstorming session (2026-03-11)
> **Depends on:** Sprints 9-11 (group events, gamification — completed)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Audit: Current State vs Requirements](#2-audit-current-state-vs-requirements)
3. [Feature 1: Friend System](#3-feature-1-friend-system)
4. [Feature 2: Events v2 — Recurring, Visibility & Approval Flow](#4-feature-2-events-v2)
5. [Feature 3: Main Events — Official & Sponsored](#5-feature-3-main-events)
6. [Feature 4: Brand Partnerships](#6-feature-4-brand-partnerships)
7. [Schema Changes](#7-schema-changes)
8. [API Endpoints](#8-api-endpoints)
9. [Mobile Screens](#9-mobile-screens)
10. [Admin Backoffice](#10-admin-backoffice)
11. [Sprint Plan](#11-sprint-plan)
12. [Open Questions](#12-open-questions)

---

## 1. Overview

This document specifies four interconnected features requested by the team (Benny + collaborators):

1. **Friend System** — Users can follow each other and build a social graph
2. **Events v2** — Recurring events, friends-only visibility, request-to-join with host approval
3. **Main Events** — Official/sponsored events hosted by verified organizers (DogWalk team, associations, educators)
4. **Brand Partnerships** — Co-branded events with pet industry partners (Royal Canin, Purina, Monge, etc.)

### User Workflows (from team brainstorming)

```
Workflow 1: Matching (existing)
  Profilo cane → Matching → Like/Match → Chat → Passeggiata

Workflow 2: Events (enhanced)
  Creazione evento (unico o periodico)
  → Utenti vicini lo vedono (se pubblico) / Amici lo vedono (se limitato)
  → Richiesta partecipazione
  → Host approva/rifiuta (consultando profili cane + persona)
  → Chat evento (possibilità di chat 1:1 per conoscersi)
  → Passeggiata

Workflow 3: Discovery (existing + friends)
  Mappa → Profili vicino → Profilo cane → Invito passeggiata / Segui

Workflow 4: Main Events (new)
  Team DogWalk / Associazione / Brand crea evento ufficiale
  → Featured nella home + sezione dedicata
  → Partecipazione aperta (no approval) o con limite posti
  → Possibile co-branding con partner
  → Post-evento: foto, recap, badge speciale
```

---

## 2. Audit: Current State vs Requirements

### What exists (Sprint 9-11 completed)

| Component | Status | Details |
|-----------|--------|---------|
| `groupEvents` table | ✅ | title, description, scheduledAt, location, maxParticipants, visibility (public/private), status |
| `groupEventParticipants` table | ✅ | eventId, userId, dogId, status (accepted/declined/removed), isOrganizer |
| Group chat | ✅ | groupMessages + groupMessageReads tables, send/get/list/mark-read endpoints |
| Event CRUD API | ✅ | create, get, listNearby, listMine, join, leave, update, cancel |
| Event discovery | ✅ | PostGIS-based nearby search |

### What's missing

| Requirement | Gap | Impact |
|-------------|-----|--------|
| Recurring events | No recurrence fields in schema | Need `recurrenceRule`, `recurrenceEnd`, parent-child event pattern |
| Friends-only visibility | No friend system exists | Need friendship tables + visibility filter |
| Request-to-join | Participant status lacks `pending` | Need approval workflow + notifications |
| Host approval | No approve/reject endpoints | Need new use cases + notification triggers |
| Main Events | No organizer verification | Need organizations table + verified flag |
| Brand partnerships | No brand/sponsor tables | Need brands, sponsorships, featured events |
| Event categories | No category/type field | Need event types (walk, meetup, training, official) |

---

## 3. Feature 1: Friend System

### 3.1 Model

We use a **follow model** (asymmetric, like Instagram) rather than mutual friendship (like Facebook). Rationale:
- Simpler UX (one action: "Segui")
- No pending state for follow requests (public profiles)
- "Amici" = mutual follows (both follow each other)
- Friends-only events require mutual follow

### 3.2 User Stories

| ID | Story | Priority |
|----|-------|----------|
| FR-01 | Come utente, posso seguire un altro utente dal suo profilo | MUST |
| FR-02 | Come utente, posso smettere di seguire un utente | MUST |
| FR-03 | Come utente, vedo la lista dei miei follower e following | MUST |
| FR-04 | Come utente, vedo chi sono i miei "amici" (follow reciproco) | MUST |
| FR-05 | Come utente, ricevo una notifica quando qualcuno inizia a seguirmi | SHOULD |
| FR-06 | Come utente, posso bloccare un utente (impedisce follow e visibilità) | MUST |
| FR-07 | Come utente, posso cercare utenti per nome | SHOULD |

### 3.3 Schema: `userFollows`

```typescript
// packages/db/src/schema/user-follows.ts
export const userFollows = pgTable('user_follows', {
  id: uuid('id').defaultRandom().primaryKey(),
  followerId: uuid('follower_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  followingId: uuid('following_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('user_follows_pair_idx').on(table.followerId, table.followingId),
  index('user_follows_follower_idx').on(table.followerId),
  index('user_follows_following_idx').on(table.followingId),
  check('no_self_follow', sql`follower_id != following_id`),
]);
```

### 3.4 Schema: `userBlocks`

```typescript
// packages/db/src/schema/user-blocks.ts
export const userBlocks = pgTable('user_blocks', {
  id: uuid('id').defaultRandom().primaryKey(),
  blockerId: uuid('blocker_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  blockedId: uuid('blocked_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('user_blocks_pair_idx').on(table.blockerId, table.blockedId),
  check('no_self_block', sql`blocker_id != blocked_id`),
]);
```

### 3.5 Denormalized counters on `users`

Add to `users` table:
- `followersCount` (integer, default 0)
- `followingCount` (integer, default 0)

Updated via triggers or application-level increment/decrement.

### 3.6 "Friends" definition

A helper query/view: two users are **friends** when a mutual follow exists:
```sql
SELECT u.id FROM users u
WHERE EXISTS (
  SELECT 1 FROM user_follows f1
  WHERE f1.follower_id = :currentUserId AND f1.following_id = u.id
) AND EXISTS (
  SELECT 1 FROM user_follows f2
  WHERE f2.follower_id = u.id AND f2.following_id = :currentUserId
);
```

---

## 4. Feature 2: Events v2

### 4.1 Recurring Events

Add fields to `groupEvents`:

| Field | Type | Description |
|-------|------|-------------|
| `recurrenceRule` | varchar(255), nullable | RRULE string (e.g., `FREQ=WEEKLY;BYDAY=SA`) |
| `recurrenceEnd` | timestamp, nullable | End date for recurrence series |
| `parentEventId` | uuid, nullable, FK→groupEvents | Links occurrence to parent template |

**Logic:**
- When `recurrenceRule` is set, the event is a **template** (not directly joinable)
- System generates **occurrence** events from the template (parentEventId = template.id)
- Each occurrence is an independent event with its own participants, chat, status
- Occurrences are generated on-demand (4 ahead) via a BullMQ daily cron job (03:00 UTC)
- **Limit:** Max 3 active recurring event templates per basic user. Verified organizations: no limit.

### 4.2 Event Visibility

Extend `groupEvents.visibility` from `public | private` to:

| Value | Behavior |
|-------|----------|
| `public` | Visible to all users in radius |
| `friends_only` | Visible only to mutual follows of the creator |
| `invite_only` | Not discoverable; only via direct invite/link |

### 4.3 Event Categories

Add `category` field to `groupEvents`:

| Value | Description |
|-------|-------------|
| `walk` | Standard group walk |
| `meetup` | Social meetup (park, café) |
| `training` | Training session with educator |
| `official` | Official DogWalk event |
| `sponsored` | Brand-sponsored event |

### 4.4 Request-to-Join & Host Approval

**Current state:** `groupEventParticipants.status` = `accepted | declined | removed`

**New state machine:**

```
                    ┌──────────┐
     join request → │ pending  │
                    └────┬─────┘
                         │
              ┌──────────┼──────────┐
              ▼          ▼          ▼
         ┌────────┐ ┌────────┐ ┌──────────┐
         │accepted│ │declined│ │ cancelled │ (user cancels own request)
         └───┬────┘ └────────┘ └──────────┘
             │
             ▼
        ┌─────────┐
        │ removed │ (kicked by host)
        └─────────┘
```

Add to `groupEventParticipants.status`: `pending` and `cancelled`.

**Host approval settings** — Add `requiresApproval` boolean to `groupEvents` (default: true for user events, false for official events).

### 4.5 User Stories

| ID | Story | Priority |
|----|-------|----------|
| EV-01 | Come host, posso creare un evento ricorrente (es. ogni sabato mattina) | MUST |
| EV-02 | Come host, posso limitare l'evento ai soli amici | MUST |
| EV-03 | Come utente, posso richiedere di partecipare a un evento | MUST |
| EV-04 | Come host, ricevo notifica per ogni richiesta e posso consultare i profili | MUST |
| EV-05 | Come host, posso approvare o rifiutare le richieste | MUST |
| EV-06 | Come host, posso avviare una chat 1:1 con un richiedente per conoscerlo | SHOULD |
| EV-07 | Come utente, ricevo notifica quando la mia richiesta viene accettata/rifiutata | MUST |
| EV-08 | Come utente, posso annullare la mia richiesta di partecipazione | SHOULD |
| EV-09 | Come host, posso creare un evento invite-only condivisibile via link | COULD |

---

## 5. Feature 3: Main Events

### 5.1 Concept

Main Events are **official, high-profile events** that serve to:
- Build trust and community ("senso di fiducia")
- Grow the user base (audience acquisition)
- Enable brand collaborations

**Hosts:**
- DogWalk team (noi ideatori)
- Verified associations (associazioni cinofile, educatori)
- Brand partners (in collaboration)

### 5.2 Schema: `organizations`

```typescript
// packages/db/src/schema/organizations.ts
export const organizations = pgTable('organizations', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 200 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  type: varchar('type', { length: 30 }).notNull(), // 'dogwalk_team' | 'association' | 'educator' | 'brand'
  description: text('description'),
  logoUrl: varchar('logo_url', { length: 500 }),
  websiteUrl: varchar('website_url', { length: 500 }),
  contactEmail: varchar('contact_email', { length: 255 }),
  isVerified: boolean('is_verified').default(false).notNull(),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  verifiedBy: uuid('verified_by').references(() => adminUsers.id),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
```

### 5.3 Schema: `organizationMembers`

```typescript
export const organizationMembers = pgTable('organization_members', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 30 }).notNull(), // 'owner' | 'admin' | 'member'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('org_members_pair_idx').on(table.organizationId, table.userId),
]);
```

### 5.4 Link to Events

Add to `groupEvents`:

| Field | Type | Description |
|-------|------|-------------|
| `organizationId` | uuid, nullable, FK→organizations | Set when event is hosted by an org |
| `isOfficial` | boolean, default false | Flagged for featured placement |
| `coverImageUrl` | varchar(500), nullable | Hero image for main events |

### 5.5 Main Event characteristics

| Aspect | User Event | Main Event |
|--------|-----------|------------|
| Creator | Any user | Organization member (verified) |
| Max participants | 2-50 | 2-300 (up to 500 admin-approved mega) |
| Approval required | Yes (default) | No (open join, first-come) |
| Visibility | public / friends_only / invite_only | Always public |
| Discovery | Nearby events list | Featured section + nearby |
| Chat | Group chat | Group chat + announcements channel |
| Post-event | Recap | Recap + shared album + badge speciale |
| Category | walk / meetup | official / sponsored |

### 5.6 User Stories

| ID | Story | Priority |
|----|-------|----------|
| ME-01 | Come membro di un'organizzazione verificata, posso creare un Main Event | MUST |
| ME-02 | Come utente, vedo i Main Event in una sezione "In Evidenza" nella home | MUST |
| ME-03 | Come utente, posso partecipare a un Main Event senza approvazione | MUST |
| ME-04 | Come organizzatore, posso impostare un limite di posti (first-come) | MUST |
| ME-05 | Come utente, ricevo un badge speciale per aver partecipato a un Main Event | SHOULD |
| ME-06 | Come organizzatore, posso inviare annunci a tutti i partecipanti | SHOULD |
| ME-07 | Come utente, posso vedere il calendario dei Main Event futuri | SHOULD |

### 5.7 Examples of Main Events

- **Raduno Golden Retriever** — organized by association "Golden Retriever Club Italia"
- **Passeggiata urbana DogWalk** — organized by DogWalk team
- **Socializzazione cuccioli** — organized by certified educator
- **Royal Canin Day** — co-branded with Royal Canin (sponsored category)

---

## 6. Feature 4: Brand Partnerships

### 6.1 Concept

Brand partnerships enable pet industry companies to:
- Co-host Main Events (logo, branding, sponsorship)
- Get visibility in the app (featured events, brand page)
- Build PR and trust with the community

**This is NOT an ad platform.** Brand partnerships are curated, approved by DogWalk team, and always tied to real events that provide value to users.

### 6.2 Schema: `eventSponsors`

```typescript
export const eventSponsors = pgTable('event_sponsors', {
  id: uuid('id').defaultRandom().primaryKey(),
  eventId: uuid('event_id').notNull().references(() => groupEvents.id, { onDelete: 'cascade' }),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  tier: varchar('tier', { length: 30 }).notNull(), // 'title' | 'gold' | 'silver' | 'partner'
  logoPlacement: varchar('logo_placement', { length: 30 }).default('footer').notNull(), // 'header' | 'footer' | 'banner'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('event_sponsors_pair_idx').on(table.eventId, table.organizationId),
]);
```

### 6.3 Tier System

| Tier | Logo | Event title includes brand | Push to all nearby users | Max per event |
|------|------|---------------------------|--------------------------|---------------|
| `title` | Header banner | Yes ("Royal Canin presenta...") | Yes | 1 |
| `gold` | Event page header | No | No | 2 |
| `silver` | Event page footer | No | No | 5 |
| `partner` | "Con il supporto di..." section | No | No | Unlimited |

### 6.4 Brand examples (future partners)

- **Royal Canin** — breed-specific events, nutrition workshops
- **Purina** — community walks, adoption events
- **Monge** — local meetups, training sessions
- **Arcaplanet / Zooplus** — product sampling at events
- Local pet shops and veterinary clinics

### 6.5 User Stories

| ID | Story | Priority |
|----|-------|----------|
| BR-01 | Come admin, posso creare un'organizzazione di tipo "brand" e verificarla | MUST |
| BR-02 | Come admin, posso associare un brand come sponsor di un evento | MUST |
| BR-03 | Come utente, vedo il logo dello sponsor nell'evento (senza essere invasivo) | MUST |
| BR-04 | Come brand, posso vedere analytics dell'evento (partecipanti, engagement) | COULD |
| BR-05 | Come admin, posso gestire i tier di sponsorship | SHOULD |

---

## 7. Schema Changes — Summary

### New Tables

| Table | Purpose | Sprint |
|-------|---------|--------|
| `userFollows` | Follow relationships | 12 |
| `userBlocks` | Block relationships | 12 |
| `organizations` | Verified orgs (associations, brands, team) | 13 |
| `organizationMembers` | Org membership | 13 |
| `eventSponsors` | Brand sponsorship per event | 14 |

### Modified Tables

| Table | Change | Sprint |
|-------|--------|--------|
| `users` | Add `followersCount`, `followingCount` | 12 |
| `groupEvents` | Add `recurrenceRule`, `recurrenceEnd`, `parentEventId` | 13 |
| `groupEvents` | Add `category`, `requiresApproval` | 13 |
| `groupEvents` | Add `organizationId`, `isOfficial`, `coverImageUrl` | 13 |
| `groupEvents` | Extend `visibility` to include `friends_only`, `invite_only` | 13 |
| `groupEvents` | Increase `maxParticipants` upper bound to 500 for official events | 13 |
| `groupEventParticipants` | Add `pending`, `cancelled` to status | 13 |

---

## 8. API Endpoints

### Friend System (Sprint 12)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `follows.follow` | Follow a user |
| POST | `follows.unfollow` | Unfollow a user |
| GET | `follows.listFollowers` | Get user's followers |
| GET | `follows.listFollowing` | Get user's following |
| GET | `follows.listFriends` | Get mutual follows |
| POST | `blocks.block` | Block a user |
| POST | `blocks.unblock` | Unblock a user |
| GET | `blocks.list` | Get blocked users |

### Events v2 (Sprint 13)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `groupEvents.requestJoin` | Request to join (creates pending participant) |
| POST | `groupEvents.approveParticipant` | Host approves request |
| POST | `groupEvents.declineParticipant` | Host declines request |
| GET | `groupEvents.listPendingRequests` | Host views pending requests |
| POST | `groupEvents.cancelRequest` | User cancels own request |
| POST | `groupEvents.createRecurring` | Create recurring event template |
| GET | `groupEvents.listOccurrences` | List occurrences of a recurring event |

### Main Events & Brands (Sprint 14)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `events.listFeatured` | Get featured/official events |
| GET | `events.listByOrganization` | Events by org |
| POST | `organizations.create` | Admin creates org |
| PUT | `organizations.verify` | Admin verifies org |
| POST | `organizations.addMember` | Add member to org |
| POST | `eventSponsors.add` | Admin adds sponsor to event |
| GET | `eventSponsors.list` | Get sponsors for event |

---

## 9. Mobile Screens

### New Screens

| Screen | Feature | Sprint |
|--------|---------|--------|
| **Profilo utente — Segui/Seguiti** | Followers/following lists, follow button | 12 |
| **Ricerca utenti** | Search by name, suggested users | 12 |
| **Evento — Richiesta partecipazione** | Request form + status tracking | 13 |
| **Evento — Gestione richieste (host)** | Approve/decline with profile preview | 13 |
| **Evento — Crea ricorrente** | Recurrence rule picker (giornaliero, settimanale, mensile) | 13 |
| **Home — Sezione "In Evidenza"** | Featured Main Events carousel | 14 |
| **Main Event detail** | Hero image, org info, sponsor logos, participants count | 14 |
| **Calendario Main Events** | Monthly calendar view of upcoming official events | 14 |

### Modified Screens

| Screen | Change | Sprint |
|--------|--------|--------|
| **Profilo utente** | Add followers/following counts, follow button | 12 |
| **Crea evento** | Add visibility picker (public/friends/invite), category, recurrence | 13 |
| **Lista eventi nearby** | Add category filter, "In Evidenza" badge for official events | 13 |
| **Evento detail** | Show approval status, sponsor logos, org badge | 13-14 |

---

## 10. Admin Backoffice

### New Admin Pages

| Page | Purpose | Sprint |
|------|---------|--------|
| **Organizzazioni** | CRUD organizations, verify/unverify, manage members | 14 |
| **Main Events** | Create/manage official events, assign sponsors | 14 |
| **Sponsorships** | Manage brand sponsorship tiers per event | 14 |
| **Analytics — Eventi** | Participation stats, brand engagement metrics | 14 |

### Modified Admin Pages

| Page | Change | Sprint |
|------|--------|--------|
| **Eventi** | Add category filter, show recurring events, pending requests count | 13 |
| **Utenti** | Show followers/following count, block history | 12 |

---

## 11. Sprint Plan

### Sprint 12: Friend System + Feed (Weeks 25-28)

> **Note:** This sprint runs in parallel with the existing Sprint 12-13 (Feed Photos/Videos) from the original roadmap. The friend system is a natural complement to the social feed.

**Story Points: ~30 SP**

| Task | SP | Description |
|------|:--:|-------------|
| FR-01/02: Follow/unfollow | 5 | Schema, use cases, tRPC endpoints |
| FR-03: Followers/following lists | 5 | API + mobile UI (lists + profile counters) |
| FR-04: Friends (mutual follows) | 3 | Query helper + API endpoint |
| FR-05: Follow notification | 3 | Push notification on new follower |
| FR-06: Block/unblock | 5 | Schema, use cases, filter blocked users from all queries |
| FR-07: User search | 5 | Search by name (trigram index), suggested users |
| Mobile UI: profile follow button + lists | 4 | NativeWind components, MVVM |

### Sprint 13: Events v2 — Recurring, Visibility & Approval (Weeks 29-30)

**Story Points: ~35 SP**

| Task | SP | Description |
|------|:--:|-------------|
| Schema migration: groupEvents extensions | 3 | Add recurrence, visibility, category, approval fields |
| Schema migration: participant status extension | 2 | Add `pending`, `cancelled` statuses |
| EV-01: Recurring events | 8 | Template creation, occurrence generation (BullMQ cron), RRULE parsing |
| EV-02: Friends-only visibility | 5 | Filter events by mutual follow graph |
| EV-03/04/05: Request-to-join + approval | 8 | New endpoints, notifications to host, profile preview |
| EV-07: Notification on accept/decline | 3 | Push notification to requester |
| EV-08: Cancel own request | 2 | Use case + endpoint |
| Mobile UI: event creation flow updates | 4 | Visibility picker, category, recurrence UI |

### Sprint 14: Main Events & Brand Partnerships (Weeks 31-32)

**Story Points: ~35 SP**

| Task | SP | Description |
|------|:--:|-------------|
| Schema: organizations + members + sponsors | 5 | New tables, migrations |
| ME-01: Org-hosted event creation | 5 | Org member creates event with org context |
| ME-02: Featured events section | 5 | API endpoint + mobile carousel on home |
| ME-03/04: Open join + capacity limit | 3 | No-approval join for official events, first-come enforcement |
| ME-05: Main Event badge | 3 | Gamification integration, special badge for attendance |
| BR-01/02: Admin org + sponsor management | 5 | Admin pages: orgs CRUD, sponsor assignment |
| BR-03: Sponsor logos in event UI | 3 | Mobile event detail with tier-based logo placement |
| Admin backoffice pages | 6 | Organizations, Main Events, Sponsorships pages |

### Updated Roadmap Timeline

```
Phase 3 (continued from Sprint 11)
├─ Sprint 12    Weeks 25-28   Feed Photos/Videos + Friend System (merged)
├─ Sprint 13    Weeks 29-30   Events v2 (recurring, visibility, approval)
├─ Sprint 14    Weeks 31-32   Main Events + Brand Partnerships
├─ Sprint 15    Weeks 33-34   Fitness App Integration (from original plan)
└─ Sprint 16-17 Weeks 35-38   AI Matching Optimization (from original plan)
```

**Total new story points:** ~100 SP (30 + 35 + 35)
**Timeline impact:** Shifts fitness + AI sprints by ~4 weeks (2 additional sprints inserted)

---

## 12. Decisions (resolved 2026-03-11)

Team feedback integrated from Piero, Benedetta + collaborators.

### 1. Moderation for Main Events
**Decision:** Admin approves first 3 events per org, then self-publish for verified orgs with good track record.
**Status:** ✅ Agreed

### 2. Revenue model for brand partnerships
**Decision:** Start with **value exchange** (products, prizes for participants). Paid B2B tiers to be evaluated post-launch once the model is validated. Affiliate system also under evaluation (similar open question from affiliate system design — separate doc needed).
**Status:** ✅ Agreed

### 3. Recurring event limits
**Decision:** Max **3 active recurring events per basic user**. A basic user's typical use case is their own daily walk (3-4 times/day) that they want company for. Verified organizations: no limit. System generates **4 occurrences ahead**, checked daily by BullMQ cron.
**Status:** ✅ Agreed

### 4. Event visibility levels
**Decision:** 3 levels confirmed: `public`, `friends_only`, `invite_only`. Validated user journey:
1. Create **public** events (don't know anyone yet)
2. People join → you get along → mutual follow (become friends)
3. Create **friends_only** events (walk with your trusted group)
4. Create **invite_only** for selective walks with specific people from your circle
**Status:** ✅ Agreed

### 5. Main Event capacity
**Research completed:** See [`docs/research/main-event-capacity-research.md`](research/main-event-capacity-research.md) for full report.

**Key findings:**
- Largest Italian breed raduno: **300 dogs + 700 people** (Golden Retriever Family, Lignano Sabbiadoro 2024, sold out)
- Largest single-breed meetup worldwide: **2,397 dogs** (Buenos Aires 2025, pending Guinness)
- Italian raduni are **community-managed** by associations (~400 members) with sponsor support — no external logistics companies needed
- Volunteer ratio: ~1:15-20 (dogs per volunteer) for large events
- The community tends to be "tranquillo" — breed-specific events attract experienced, responsible owners

**Decision:** Tiered capacity system:
- User events: max **50** participants
- Main Events (verified org): default **100**, configurable up to **300**
- Mega Events (admin-approved only): up to **500** (requires safety plan)

Safety requirements scale with capacity (vet on-call >100, safety plan >200, admin-only >300).
**Status:** ✅ Research complete, ready for Sprint 14 implementation

### 6. Brand data access
**Decision:** Aggregate analytics only (headcount, engagement). No PII shared with brands (GDPR compliance).
**Status:** ✅ Agreed
