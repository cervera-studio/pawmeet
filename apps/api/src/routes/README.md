# DogWalk API Endpoints

Base URL: `/api` (all routes are prefixed via the app router)

## Authentication

All endpoints marked with **Auth: required** expect a Bearer token in the `Authorization` header:

```
Authorization: Bearer <accessToken>
```

Tokens are JWTs (HS256) with a `sub` claim containing the user ID.

---

## Auth Routes (`/auth`)

### POST `/auth/register`

Register a new user account.

- **Auth**: none
- **Body** (`registerSchema`):
  | Field | Type | Constraints |
  |---|---|---|
  | `email` | string | Valid email |
  | `password` | string | Min 8 chars, 1 uppercase, 1 number |
  | `displayName` | string | 2-50 chars |
- **Success**: `201`
  ```json
  { "user": { ... }, "accessToken": "...", "refreshToken": "..." }
  ```
- **Errors**:
  | Code | Error | Description |
  |---|---|---|
  | 409 | `Email gia registrata` | Email already in use |

---

### POST `/auth/login`

Authenticate with email and password.

- **Auth**: none
- **Body** (`loginSchema`):
  | Field | Type | Constraints |
  |---|---|---|
  | `email` | string | Valid email |
  | `password` | string | Min 1 char |
- **Success**: `200`
  ```json
  { "user": { ... }, "accessToken": "...", "refreshToken": "..." }
  ```
- **Errors**:
  | Code | Error | Description |
  |---|---|---|
  | 401 | `Credenziali non valide` | Wrong email or password |
  | 403 | `Account disattivato` | Account deactivated |

---

### POST `/auth/refresh`

Rotate refresh token and get new token pair.

- **Auth**: none
- **Body**:
  | Field | Type | Constraints |
  |---|---|---|
  | `refreshToken` | string | Min 1 char |
- **Success**: `200`
  ```json
  { "accessToken": "...", "refreshToken": "..." }
  ```
- **Errors**:
  | Code | Error | Description |
  |---|---|---|
  | 401 | `Token non valido` | Invalid, revoked, or expired token |

---

### POST `/auth/logout`

Revoke a refresh token.

- **Auth**: none
- **Body**:
  | Field | Type | Constraints |
  |---|---|---|
  | `refreshToken` | string | Min 1 char |
- **Success**: `200`
  ```json
  { "message": "Logout effettuato" }
  ```

---

### POST `/auth/verify-email`

Verify user email with token sent via email.

- **Auth**: none
- **Body**:
  | Field | Type | Constraints |
  |---|---|---|
  | `token` | string | Min 1 char |
- **Success**: `200`
  ```json
  { "message": "Email verificata con successo" }
  ```
- **Errors**:
  | Code | Error | Description |
  |---|---|---|
  | 400 | `Token non valido o scaduto` | Invalid or expired token |

---

### POST `/auth/forgot-password`

Request a password reset email. Always returns success (prevents email enumeration).

- **Auth**: none
- **Body**:
  | Field | Type | Constraints |
  |---|---|---|
  | `email` | string | Valid email |
- **Success**: `200`
  ```json
  { "message": "Se l'email esiste, riceverai un link per il reset" }
  ```

---

### POST `/auth/reset-password`

Reset password using token from email. Revokes all refresh tokens (forces re-login).

- **Auth**: none
- **Body**:
  | Field | Type | Constraints |
  |---|---|---|
  | `token` | string | Min 1 char |
  | `password` | string | Min 8 chars, 1 uppercase, 1 number |
- **Success**: `200`
  ```json
  { "message": "Password reimpostata con successo" }
  ```
- **Errors**:
  | Code | Error | Description |
  |---|---|---|
  | 400 | `Token non valido o scaduto` | Invalid or expired token |

---

## User Routes (`/users`)

All user routes require authentication.

### GET `/users/me`

Get current authenticated user profile (excludes `passwordHash`).

- **Auth**: required
- **Success**: `200`
  ```json
  { "user": { "id": "...", "email": "...", "displayName": "...", ... } }
  ```
- **Errors**:
  | Code | Error | Description |
  |---|---|---|
  | 404 | `Utente non trovato` | User not found |

---

### PUT `/users/me`

Update current user profile. (TODO: not yet implemented)

- **Auth**: required

---

### PUT `/users/me/location`

Update current user's geolocation.

- **Auth**: required
- **Body**:
  | Field | Type | Constraints |
  |---|---|---|
  | `latitude` | number | -90 to 90 |
  | `longitude` | number | -180 to 180 |
- **Success**: `200`
  ```json
  { "latitude": 45.4642, "longitude": 9.1900, "updatedAt": "2026-03-10T..." }
  ```

---

### PUT `/users/me/preferences`

Update user search preferences.

- **Auth**: required
- **Body**:
  | Field | Type | Constraints |
  |---|---|---|
  | `searchRadiusKm` | number | 1-50 km |
- **Success**: `200`
  ```json
  { "searchRadiusKm": 15 }
  ```

---

### GET `/users/nearby`

Find nearby active users using Haversine distance formula.

- **Auth**: required
- **Query params**:
  | Param | Type | Default | Constraints |
  |---|---|---|---|
  | `radiusKm` | number | User's `searchRadiusKm` or 10 | 1-50 |
  | `limit` | integer | 20 | 1-50 |
  | `offset` | integer | 0 | >= 0 |
- **Success**: `200`
  ```json
  {
    "users": [{ "id": "...", "displayName": "...", "avatarUrl": "...", "distanceKm": 2.3 }],
    "radius": 10,
    "total": 5
  }
  ```
- **Errors**:
  | Code | Error | Description |
  |---|---|---|
  | 400 | `Posizione non impostata` | User has no location set |

---

### POST `/users/me/avatar/upload-url`

Get a presigned URL to upload an avatar image to R2.

- **Auth**: required
- **Body**:
  | Field | Type | Constraints |
  |---|---|---|
  | `contentType` | string | Allowed image MIME types |
  | `fileSize` | integer | 1 to MAX_FILE_SIZE |
- **Success**: `200`
  ```json
  { "uploadUrl": "https://...", "key": "avatars/userId/..." }
  ```

---

### POST `/users/me/avatar/confirm`

Confirm avatar upload after uploading to the presigned URL.

- **Auth**: required
- **Body**:
  | Field | Type | Constraints |
  |---|---|---|
  | `key` | string | Must start with `avatars/{userId}/` |
- **Success**: `200`
  ```json
  { "avatarUrl": "https://..." }
  ```
- **Errors**:
  | Code | Error | Description |
  |---|---|---|
  | 403 | `Chiave non valida` | Key does not belong to user |

---

### DELETE `/users/me/avatar`

Delete current user's avatar from R2 and DB.

- **Auth**: required
- **Success**: `200`
  ```json
  { "message": "Avatar eliminato" }
  ```
- **Errors**:
  | Code | Error | Description |
  |---|---|---|
  | 404 | `Nessun avatar da eliminare` | No avatar set |

---

### DELETE `/users/me`

Delete user account. (TODO: not yet implemented)

- **Auth**: required

---

## Dog Routes (`/dogs`)

### GET `/dogs/breeds` (Public)

Search dog breeds by name (English or Italian). No auth required.

- **Auth**: none
- **Query params**:
  | Param | Type | Constraints |
  |---|---|---|
  | `q` | string | 1-100 chars, optional |
- **Success**: `200`
  ```json
  { "breeds": [{ "id": "...", "name": "Labrador", "nameIt": "Labrador", ... }] }
  ```
  Without `q`: returns all breeds. With `q`: case-insensitive search, max 20 results.

---

All routes below require authentication.

### GET `/dogs/`

List current user's active dog profiles.

- **Auth**: required
- **Success**: `200`
  ```json
  { "dogs": [{ "id": "...", "name": "Rex", ... }] }
  ```

---

### POST `/dogs/`

Create a new dog profile. Max 5 dogs per user.

- **Auth**: required
- **Body** (`createDogSchema`):
  | Field | Type | Constraints |
  |---|---|---|
  | `name` | string | 2-50 chars |
  | `birthDate` | date | Coerced |
  | `breed` | string | 1-100 chars |
  | `breedSecondary` | string? | Max 100 chars |
  | `size` | enum | `toy`, `piccola`, `media`, `grande`, `gigante` |
  | `weightKg` | number | 0.5-100 |
  | `gender` | enum | `maschio`, `femmina` |
  | `isNeutered` | boolean | |
  | `energyLevel` | enum | `bassa`, `media`, `alta`, `molto_alta` |
  | `behaviorWithDogs` | enum | `molto_socievole`, `socievole`, `selettivo`, `reattivo` |
  | `behaviorWithPeople` | enum | `molto_socievole`, `socievole`, `timido`, `diffidente` |
  | `leashBehavior` | enum | `eccellente`, `buono`, `in_addestramento`, `difficile` |
  | `recallReliability` | enum? | `affidabile`, `parziale`, `non_affidabile` |
  | `bio` | string? | Max 500 chars |
  | `walkPrefTime` | enum[] | Min 1. Values: `mattina_presto`, `mattina`, `pomeriggio`, `sera`, `sera_tardi` |
  | `walkPrefDurationMin` | number | 15-180 minutes |
  | `walkPrefDurationMax` | number | 15-180 minutes |
  | `walkPrefTerrain` | enum[] | Min 1. Values: `urbano`, `parco`, `campagna`, `spiaggia`, `montagna` |
- **Success**: `201`
  ```json
  { "dog": { ... } }
  ```
- **Errors**:
  | Code | Error | Description |
  |---|---|---|
  | 400 | `Puoi registrare al massimo 5 cani` | Max dogs limit reached |

---

### GET `/dogs/:id`

Get a single dog profile with photos.

- **Auth**: required
- **Success**: `200`
  ```json
  { "dog": { ... }, "photos": [{ "id": "...", "url": "...", "position": 0, "isPrimary": true }] }
  ```
- **Errors**:
  | Code | Error | Description |
  |---|---|---|
  | 404 | `Profilo cane non trovato` | Dog not found or soft-deleted |

---

### PUT `/dogs/:id`

Update a dog profile. Owner only. All fields optional (partial update).

- **Auth**: required
- **Body**: Same fields as `createDogSchema` but all optional (`updateDogSchema`)
- **Success**: `200`
  ```json
  { "dog": { ... } }
  ```
- **Errors**:
  | Code | Error | Description |
  |---|---|---|
  | 404 | `Profilo cane non trovato` | Not found or not owner |

---

### DELETE `/dogs/:id`

Soft-delete a dog profile. Owner only. Sets `isActive = false`.

- **Auth**: required
- **Success**: `200`
  ```json
  { "message": "Profilo cane eliminato" }
  ```
- **Errors**:
  | Code | Error | Description |
  |---|---|---|
  | 404 | `Profilo cane non trovato` | Not found or not owner |

---

### POST `/dogs/:id/photos/upload-url`

Get presigned URL to upload a dog photo. Max 6 photos per dog.

- **Auth**: required
- **Body**:
  | Field | Type | Constraints |
  |---|---|---|
  | `contentType` | string | Allowed image MIME types |
  | `fileSize` | integer | 1 to MAX_FILE_SIZE |
- **Success**: `200`
  ```json
  { "uploadUrl": "https://...", "key": "dogs/{dogId}/..." }
  ```
- **Errors**:
  | Code | Error | Description |
  |---|---|---|
  | 400 | `Puoi caricare al massimo 6 foto` | Max photos limit |
  | 404 | `Profilo cane non trovato` | Not owner |

---

### POST `/dogs/:id/photos/confirm`

Confirm a dog photo upload. First photo becomes primary.

- **Auth**: required
- **Body**:
  | Field | Type | Constraints |
  |---|---|---|
  | `key` | string | Must start with `dogs/{dogId}/` |
- **Success**: `201`
  ```json
  { "photo": { "id": "...", "url": "...", "position": 0, "isPrimary": true } }
  ```
- **Errors**:
  | Code | Error | Description |
  |---|---|---|
  | 400 | `Puoi caricare al massimo 6 foto` | Max photos limit |
  | 403 | `Chiave non valida` | Key mismatch |
  | 404 | `Profilo cane non trovato` | Not owner |

---

### DELETE `/dogs/:id/photos/:photoId`

Delete a dog photo. Removes from R2 and reorders remaining photos.

- **Auth**: required
- **Success**: `200`
  ```json
  { "message": "Foto eliminata" }
  ```
- **Errors**:
  | Code | Error | Description |
  |---|---|---|
  | 404 | `Profilo cane non trovato` / `Foto non trovata` | Not owner or photo not found |

---

### PUT `/dogs/:id/photos/reorder`

Reorder dog photos. First photo becomes primary.

- **Auth**: required
- **Body**:
  | Field | Type | Constraints |
  |---|---|---|
  | `photoIds` | string[] | UUIDs, 1-6 items, must match all existing photos |
- **Success**: `200`
  ```json
  { "photos": [{ "id": "...", "position": 0, "isPrimary": true }, ...] }
  ```
- **Errors**:
  | Code | Error | Description |
  |---|---|---|
  | 400 | `Lista foto non valida` | IDs don't match existing photos |
  | 404 | `Profilo cane non trovato` | Not owner |

---

## Match Routes (`/matches`)

All match routes require authentication.

### GET `/matches/`

List current user's active mutual matches.

- **Auth**: required
- **Success**: `200`
  ```json
  { "matches": [{ "id": "...", "dogAId": "...", "dogBId": "...", "compatibilityScore": 0.85, ... }] }
  ```

---

### GET `/matches/discover`

Discover candidate dogs for matching. Returns dogs scored and ranked by compatibility.

**Scoring weights**: size 25%, energy 25%, behavior 20%, walk prefs 15%, distance 10%, leash 5%.
Minimum compatibility threshold: 0.4 (40%).

- **Auth**: required
- **Query params**:
  | Param | Type | Default | Constraints |
  |---|---|---|---|
  | `dogId` | string (UUID) | - | Required, must be owned by user |
  | `limit` | integer | 20 | 1-50 |
- **Success**: `200`
  ```json
  {
    "suggestions": [{
      "dog": { ... },
      "distanceKm": 3.2,
      "compatibilityScore": 0.78
    }]
  }
  ```
- **Errors**:
  | Code | Error | Description |
  |---|---|---|
  | 400 | `Posizione non impostata` | User location not set |
  | 404 | `Profilo cane non trovato` | Dog not found or not owned |

---

### POST `/matches/like`

Like a dog profile. If mutual, creates a match.

- **Auth**: required
- **Body**:
  | Field | Type | Constraints |
  |---|---|---|
  | `dogId` | string | UUID, must be owned by user |
  | `targetDogId` | string | UUID |
- **Success (no match)**: `200`
  ```json
  { "isMatch": false }
  ```
- **Success (mutual match)**: `201`
  ```json
  { "match": { "id": "...", "dogAId": "...", "dogBId": "..." }, "isMatch": true }
  ```
- **Errors**:
  | Code | Error | Description |
  |---|---|---|
  | 404 | `Profilo cane non trovato` | Dog not owned by user |
  | 409 | `Gia votato per questo profilo` | Already swiped |
  | 429 | `Limite giornaliero di swipe raggiunto` | Daily limit of 100 swipes |

---

### POST `/matches/pass`

Pass on a dog profile.

- **Auth**: required
- **Body**:
  | Field | Type | Constraints |
  |---|---|---|
  | `dogId` | string | UUID, must be owned by user |
  | `targetDogId` | string | UUID |
- **Success**: `200`
  ```json
  { "message": "Passato" }
  ```
- **Errors**:
  | Code | Error | Description |
  |---|---|---|
  | 404 | `Profilo cane non trovato` | Dog not owned by user |
  | 409 | `Gia votato per questo profilo` | Already swiped |
  | 429 | `Limite giornaliero di swipe raggiunto` | Daily limit of 100 swipes |

---

### DELETE `/matches/:id`

Unmatch (soft-delete a match). User must own one of the matched dogs.

- **Auth**: required
- **Success**: `200`
  ```json
  { "message": "Match annullato" }
  ```
- **Errors**:
  | Code | Error | Description |
  |---|---|---|
  | 404 | `Match non trovato` | Match not found, inactive, or not participant |

---

## Chat Routes (`/chat`)

All chat routes require authentication. Chat uses both REST API and WebSocket.

### GET `/chat/conversations`

List all conversations (active matches with last message and unread count). Sorted by most recent message.

- **Auth**: required
- **Success**: `200`
  ```json
  {
    "conversations": [{
      "matchId": "...",
      "compatibilityScore": 0.85,
      "otherUser": { "id": "...", "displayName": "...", "avatarUrl": "..." },
      "otherDogName": "Rex",
      "lastMessage": { "id": "...", "content": "...", "createdAt": "..." },
      "unreadCount": 3
    }]
  }
  ```

---

### GET `/chat/conversations/:matchId/messages`

Get message history for a conversation. Cursor-based pagination (older messages).

- **Auth**: required
- **Query params**:
  | Param | Type | Default | Constraints |
  |---|---|---|---|
  | `cursor` | string (UUID) | - | Message ID to paginate from |
  | `limit` | integer | 20 | 1-50 |
- **Success**: `200`
  ```json
  {
    "messages": [{ "id": "...", "senderId": "...", "content": "...", "createdAt": "..." }],
    "nextCursor": "...",
    "hasMore": true
  }
  ```
- **Errors**:
  | Code | Error | Description |
  |---|---|---|
  | 404 | `Conversazione non trovata` | Not a participant |

---

### POST `/chat/conversations/:matchId/messages`

Send a message in a conversation. Emits `new_message` via WebSocket.

- **Auth**: required
- **Body**:
  | Field | Type | Constraints |
  |---|---|---|
  | `content` | string | 1-2000 chars |
  | `mediaUrl` | string? | Valid URL |
- **Success**: `201`
  ```json
  { "message": { "id": "...", "matchId": "...", "senderId": "...", "content": "...", ... } }
  ```
- **Errors**:
  | Code | Error | Description |
  |---|---|---|
  | 404 | `Conversazione non trovata` | Not a participant |

---

### PATCH `/chat/conversations/:matchId/read`

Mark all unread messages from other users as read. Emits `message_read` via WebSocket.

- **Auth**: required
- **Success**: `200`
  ```json
  { "message": "Messaggi segnati come letti" }
  ```
- **Errors**:
  | Code | Error | Description |
  |---|---|---|
  | 404 | `Conversazione non trovata` | Not a participant |

---

## WebSocket (`/ws`)

Real-time chat events via WebSocket connection.

### Connection

```
ws://<host>/ws?token=<accessToken>
```

Authentication is done via the `token` query parameter (JWT access token).

### Events (Server to Client)

| Event | Payload | Description |
|---|---|---|
| `new_message` | `{ message: { ... } }` | New message in a conversation |
| `message_read` | `{ matchId, readBy }` | Messages marked as read |
| `typing_start` | `{ userId, matchId }` | User started typing |
| `typing_stop` | `{ userId, matchId }` | User stopped typing |
| `online_status` | `{ userId, online }` | User online/offline status change |
| `error` | `{ error: string }` | Error message |

### Events (Client to Server)

| Event | Payload | Description |
|---|---|---|
| `typing_start` | `{ matchId }` | Notify typing started |
| `typing_stop` | `{ matchId }` | Notify typing stopped |

Message format: `{ "type": "<event>", "payload": { ... } }`

---

## Constants

| Constant | Value | Description |
|---|---|---|
| `MAX_DOGS_PER_USER` | 5 | Max dog profiles per user |
| `MAX_PHOTOS_PER_DOG` | 6 | Max photos per dog profile |
| `DEFAULT_SEARCH_RADIUS_KM` | 10 | Default search radius |
| `MAX_SEARCH_RADIUS_KM` | 50 | Maximum search radius |
| `MIN_SEARCH_RADIUS_KM` | 1 | Minimum search radius |
| `SWIPE_DAILY_LIMIT` | 100 | Max swipes per dog per day |
| `COMPATIBILITY_THRESHOLD` | 0.4 | Minimum score to appear in discover |
