import process from 'node:process';
import { hash } from 'bcryptjs';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { dogPhotos, dogProfiles } from '../schema/dogs';
import { users } from '../schema/users';

/**
 * Seeds 100 fake user+dog profiles across Lombardia and Liguria.
 *
 * All fake users have email `seed-NNN@pawmeet.fake` for easy identification.
 * Run `seed-fake-cleanup.ts` to remove them all.
 */

// ── Helpers ──────────────────────────────────────────────────────────────────

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function pickN<T>(arr: readonly T[], min: number, max: number): T[] {
  const n = min + Math.floor(Math.random() * (max - min + 1));
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function randFloat(min: number, max: number, decimals = 4): number {
  return Number((min + Math.random() * (max - min)).toFixed(decimals));
}

function randomDate(yearMin: number, yearMax: number): Date {
  const start = new Date(`${yearMin}-01-01`).getTime();
  const end = new Date(`${yearMax}-12-31`).getTime();
  return new Date(start + Math.random() * (end - start));
}

function pad(n: number): string {
  return n.toString().padStart(3, '0');
}

// ── Location data (city centers + radius jitter) ────────────────────────────

const LOCATIONS = [
  // Lombardia
  { city: 'Milano', lat: 45.4642, lng: 9.19, r: 0.06, weight: 25 },
  { city: 'Brescia', lat: 45.5416, lng: 10.2118, r: 0.04, weight: 8 },
  { city: 'Bergamo', lat: 45.6983, lng: 9.6773, r: 0.03, weight: 7 },
  { city: 'Monza', lat: 45.5845, lng: 9.2744, r: 0.02, weight: 5 },
  { city: 'Como', lat: 45.808, lng: 9.0852, r: 0.03, weight: 5 },
  { city: 'Varese', lat: 45.8206, lng: 8.8257, r: 0.03, weight: 4 },
  { city: 'Pavia', lat: 45.1847, lng: 9.1582, r: 0.03, weight: 4 },
  { city: 'Cremona', lat: 45.1333, lng: 10.0167, r: 0.03, weight: 3 },
  { city: 'Mantova', lat: 45.1564, lng: 10.7914, r: 0.03, weight: 3 },
  { city: 'Lecco', lat: 45.8566, lng: 9.3976, r: 0.02, weight: 3 },
  { city: 'Lodi', lat: 45.3097, lng: 9.5015, r: 0.02, weight: 2 },
  { city: 'Sondrio', lat: 46.1699, lng: 9.8715, r: 0.02, weight: 1 },
  // Liguria
  { city: 'Genova', lat: 44.4056, lng: 8.9463, r: 0.05, weight: 12 },
  { city: 'La Spezia', lat: 44.1024, lng: 9.824, r: 0.03, weight: 5 },
  { city: 'Savona', lat: 44.3091, lng: 8.4772, r: 0.03, weight: 4 },
  { city: 'Sanremo', lat: 43.8159, lng: 7.7762, r: 0.03, weight: 4 },
  { city: 'Imperia', lat: 43.8896, lng: 8.0386, r: 0.02, weight: 3 },
  { city: 'Rapallo', lat: 44.3495, lng: 9.2317, r: 0.02, weight: 2 },
] as const;

function pickLocation(): { city: string; lat: number; lng: number } {
  const totalWeight = LOCATIONS.reduce((sum, l) => sum + l.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const loc of LOCATIONS) {
    roll -= loc.weight;
    if (roll <= 0) {
      return {
        city: loc.city,
        lat: randFloat(loc.lat - loc.r, loc.lat + loc.r),
        lng: randFloat(loc.lng - loc.r, loc.lng + loc.r),
      };
    }
  }
  const fallback = LOCATIONS[0];
  return { city: fallback.city, lat: fallback.lat, lng: fallback.lng };
}

// ── Profile data pools ──────────────────────────────────────────────────────

const FIRST_NAMES_M = [
  'Marco',
  'Luca',
  'Alessandro',
  'Andrea',
  'Matteo',
  'Lorenzo',
  'Davide',
  'Simone',
  'Federico',
  'Giacomo',
  'Riccardo',
  'Tommaso',
  'Filippo',
  'Giovanni',
  'Antonio',
  'Giuseppe',
  'Stefano',
  'Roberto',
  'Fabio',
  'Daniele',
  'Nicola',
  'Emanuele',
  'Pietro',
  'Paolo',
  'Enrico',
  'Massimo',
  'Claudio',
  'Alberto',
  'Michele',
  'Giorgio',
];

const FIRST_NAMES_F = [
  'Giulia',
  'Sara',
  'Chiara',
  'Francesca',
  'Elena',
  'Valentina',
  'Martina',
  'Alessia',
  'Silvia',
  'Laura',
  'Anna',
  'Sofia',
  'Elisa',
  'Marta',
  'Federica',
  'Roberta',
  'Paola',
  'Monica',
  'Claudia',
  'Serena',
  'Ilaria',
  'Veronica',
  'Arianna',
  'Cristina',
  'Daniela',
  'Lucia',
  'Beatrice',
  'Camilla',
  'Aurora',
  'Giada',
];

const LAST_NAMES = [
  'Rossi',
  'Russo',
  'Ferrari',
  'Esposito',
  'Bianchi',
  'Romano',
  'Colombo',
  'Ricci',
  'Marino',
  'Greco',
  'Bruno',
  'Gallo',
  'Conti',
  'De Luca',
  'Mancini',
  'Costa',
  'Giordano',
  'Rizzo',
  'Lombardi',
  'Moretti',
  'Barbieri',
  'Fontana',
  'Santoro',
  'Mariani',
  'Rinaldi',
  'Caruso',
  'Ferrara',
  'Gatti',
  'Pellegrini',
  'Palumbo',
];

const DOG_NAMES = [
  'Luna',
  'Leo',
  'Birba',
  'Rocky',
  'Maya',
  'Thor',
  'Bella',
  'Max',
  'Lola',
  'Rex',
  'Kira',
  'Zeus',
  'Nina',
  'Jack',
  'Mia',
  'Oliver',
  'Stella',
  'Charlie',
  'Nala',
  'Lucky',
  'Toby',
  'Penny',
  'Buddy',
  'Ruby',
  'Oscar',
  'Margot',
  'Duke',
  'Daisy',
  'Simba',
  'Coco',
  'Argo',
  'Zara',
  'Bruno',
  'Milo',
  'Lilly',
  'Artù',
  'Perla',
  'Ringo',
  'Laika',
  'Pepe',
  'Fido',
  'Biscotto',
  'Cannella',
  'Briciola',
  'Pallina',
  'Pippo',
  'Maggie',
  'Neve',
  'Fulmine',
  'Tartufo',
];

// Breeds weighted by Italian popularity
const BREEDS = [
  { code: 'labrador_retriever', size: 'large', wMin: 25, wMax: 36 },
  { code: 'golden_retriever', size: 'large', wMin: 25, wMax: 34 },
  { code: 'german_shepherd', size: 'large', wMin: 30, wMax: 40 },
  { code: 'french_bulldog', size: 'small', wMin: 8, wMax: 14 },
  { code: 'english_bulldog', size: 'medium', wMin: 18, wMax: 25 },
  { code: 'beagle', size: 'medium', wMin: 10, wMax: 13 },
  { code: 'poodle', size: 'medium', wMin: 12, wMax: 22 },
  { code: 'jack_russell_terrier', size: 'small', wMin: 5, wMax: 8 },
  { code: 'border_collie', size: 'medium', wMin: 14, wMax: 22 },
  { code: 'cavalier_king_charles_spaniel', size: 'small', wMin: 5, wMax: 8 },
  { code: 'dachshund', size: 'small', wMin: 7, wMax: 15 },
  { code: 'shih_tzu', size: 'small', wMin: 4, wMax: 7 },
  { code: 'yorkshire_terrier', size: 'toy', wMin: 2, wMax: 3.5 },
  { code: 'chihuahua', size: 'toy', wMin: 1.5, wMax: 3 },
  { code: 'boxer', size: 'large', wMin: 25, wMax: 32 },
  { code: 'cocker_spaniel', size: 'medium', wMin: 12, wMax: 15 },
  { code: 'rottweiler', size: 'large', wMin: 35, wMax: 60 },
  { code: 'australian_shepherd', size: 'medium', wMin: 18, wMax: 29 },
  { code: 'siberian_husky', size: 'large', wMin: 20, wMax: 27 },
  { code: 'maltese', size: 'toy', wMin: 2, wMax: 4 },
  { code: 'pomeranian', size: 'toy', wMin: 1.5, wMax: 3.5 },
  { code: 'mixed_breed', size: 'medium', wMin: 8, wMax: 30 },
  { code: 'mixed_breed', size: 'large', wMin: 15, wMax: 35 },
  { code: 'mixed_breed', size: 'small', wMin: 5, wMax: 12 },
  { code: 'bernese_mountain_dog', size: 'giant', wMin: 36, wMax: 50 },
  { code: 'great_dane', size: 'giant', wMin: 50, wMax: 80 },
  { code: 'whippet', size: 'medium', wMin: 9, wMax: 13 },
  { code: 'lagotto_romagnolo', size: 'medium', wMin: 11, wMax: 16 },
  { code: 'italian_greyhound', size: 'small', wMin: 3, wMax: 5 },
  { code: 'cane_corso', size: 'giant', wMin: 40, wMax: 50 },
] as const;

const ENERGY_LEVELS = ['low', 'medium', 'high', 'very_high'] as const;
const BEHAVIOR_DOGS = ['very_friendly', 'friendly', 'selective', 'reactive'] as const;
const BEHAVIOR_PEOPLE = ['very_friendly', 'friendly', 'shy', 'wary'] as const;
const LEASH = ['excellent', 'good', 'in_training', 'difficult'] as const;
const RECALL = ['reliable', 'partial', 'unreliable'] as const;
const WALK_TIMES = ['early_morning', 'morning', 'afternoon', 'evening', 'late_evening'] as const;
const WALK_TERRAINS = ['urban', 'park', 'countryside', 'beach', 'mountain'] as const;
const GENDERS = ['male', 'female'] as const;

const BIOS_IT = [
  'Adora giocare con altri cani al parco!',
  'Cucciolo giocherellone, cerca amici per le passeggiate.',
  "Tranquillo e socievole, va d'accordo con tutti.",
  'Energico e sempre pronto per una corsa!',
  "Timido all'inizio ma poi diventa il tuo migliore amico.",
  'Campione di riporto, porta sempre la pallina.',
  'Pigrone di giorno, esploratore al tramonto.',
  "Ama l'acqua e le passeggiate in riva al lago.",
  'Dolcissimo con i bambini e gli altri cani.',
  'Atleta nato, perfetto per corse e escursioni.',
  'Golosone, farebbe qualsiasi cosa per un biscottino.',
  'Amante delle coccole e dei pisolini al sole.',
  'Instancabile, ha bisogno di lunghe passeggiate.',
  'Appena adottato, sta imparando a socializzare.',
  'Super affettuoso, vuole essere coccolato sempre.',
  'Cane da divano durante la settimana, esploratore nel weekend.',
  'Va pazzo per i bastoncini e le foglie autunnali.',
  'Protettivo con la famiglia, dolce con gli amici.',
  'Cerca compagni per passeggiate serali in zona.',
  'Il classico cane da passeggiata, sempre felice di uscire.',
  null,
  null,
  null,
  null,
  null, // Some dogs without bio
];

// Dog photos from Unsplash (free license, stable URLs)
// Format: https://images.unsplash.com/photo-{ID}?w=800&h=800&fit=crop&crop=face
const DOG_PHOTO_IDS = [
  // Golden retrievers & labs
  'photo-1552053831-71594a27632d', // golden retriever portrait
  'photo-1633722715463-d30f4f325e24', // golden retriever happy
  'photo-1612774412771-005ed8e861d2', // golden retriever puppy grass
  'photo-1601979031925-424e53b6caaa', // labrador yellow
  'photo-1587300003388-59208cc962cb', // labrador black
  'photo-1591856419156-2b61c0647470', // labrador chocolate
  // German shepherds
  'photo-1589941013453-ec89f33b5e95', // german shepherd
  'photo-1568572933382-74d440642584', // german shepherd puppy
  // French bulldogs
  'photo-1583337130417-13219ce08c42', // french bulldog
  'photo-1612536057832-2ff7ead58194', // french bulldog cute
  'photo-1622632169740-85d36ab9a397', // french bulldog brindle
  // Beagles
  'photo-1505628346881-b72b27e84530', // beagle
  'photo-1611003229286-de9a1f1c0c7b', // beagle puppy
  // Border collies
  'photo-1503256207526-0d5d80fa2f47', // border collie
  'photo-1576201836106-db1758fd1c97', // border collie portrait
  // Small dogs
  'photo-1615497001839-b0a0eac3274c', // chihuahua
  'photo-1583511655857-d19b40a7a54e', // yorkshire terrier
  'photo-1530281700549-e82e7bf110d6', // shih tzu
  'photo-1587764379990-03209deadb59', // maltese
  'photo-1546238232-20216dec9f72', // pomeranian
  'photo-1622020457014-aed22c16e406', // cavalier king charles
  // Huskies
  'photo-1547407139-3c921a66005c', // husky portrait
  'photo-1605568427561-40dd23c2acea', // husky blue eyes
  // Medium dogs
  'photo-1558929996-da64ba858215', // cocker spaniel
  'photo-1518717758536-85ae29035b6d', // poodle
  'photo-1534361960057-19889db9621e', // australian shepherd
  // Large & giant dogs
  'photo-1587402092301-725e37c70fd8', // rottweiler
  'photo-1596492784531-6e6eb5ea9993', // boxer
  'photo-1590419690008-905895e8fe0d', // bernese mountain dog
  'photo-1545212585-6d20f4e33b10', // great dane
  'photo-1568393691622-c7ba131d63b4', // cane corso
  // Mixed / misc cute dogs
  'photo-1517849845537-4d257902454a', // happy mixed dog
  'photo-1548199973-03cce0bbc87b', // two dogs running
  'photo-1537151625747-768eb6cf92b2', // mixed dog smile
  'photo-1494947665470-20322015e3a8', // puppy eyes
  'photo-1560807707-8cc77767d783', // cute mixed
  'photo-1477884213360-7e9d7dcc8f9b', // dog park
  'photo-1544568100-847a948585b9', // happy dog tongue
  'photo-1588943211346-0908a1fb0b01', // corgi
  'photo-1574158622682-e40e69881006', // cute puppy
  'photo-1561037404-61cd46aa615b', // dog portrait studio
];

function photoUrl(id: string): string {
  return `https://images.unsplash.com/${id}?w=800&h=800&fit=crop&crop=face&q=80`;
}

// ── Main ─────────────────────────────────────────────────────────────────────

const FAKE_EMAIL_DOMAIN = 'pawmeet.fake';
const FAKE_PASSWORD = 'FakeUser123!';
const PROFILE_COUNT = 100;

async function seed() {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  const pool = new pg.Pool({ connectionString: DATABASE_URL });
  const db = drizzle(pool);
  const passwordHash = await hash(FAKE_PASSWORD, 12);

  console.log(`[Seed] Creating ${PROFILE_COUNT} fake profiles (users + dogs)...`);
  console.log(`[Seed] Trackable via email domain: @${FAKE_EMAIL_DOMAIN}`);

  let created = 0;

  for (let i = 1; i <= PROFILE_COUNT; i++) {
    const isFemale = Math.random() < 0.5;
    const firstName = isFemale ? pick(FIRST_NAMES_F) : pick(FIRST_NAMES_M);
    const lastName = pick(LAST_NAMES);
    const displayName = `${firstName} ${lastName.charAt(0)}.`;
    const email = `seed-${pad(i)}@${FAKE_EMAIL_DOMAIN}`;
    const loc = pickLocation();

    // Create user
    const [user] = await db
      .insert(users)
      .values({
        email,
        displayName,
        authProvider: 'email',
        passwordHash,
        latitude: loc.lat,
        longitude: loc.lng,
        locationUpdatedAt: new Date(),
        searchRadiusKm: pick([5, 10, 10, 10, 15, 20]),
        emailVerified: true,
        isActive: true,
        dateOfBirth: randomDate(1975, 2004),
        locale: 'it',
        lastLoginAt: new Date(Date.now() - randInt(0, 7 * 86400000)),
        termsAcceptedAt: new Date(),
        onboardingCompletedAt: new Date(),
      })
      .onConflictDoNothing()
      .returning({ id: users.id });

    if (!user) {
      console.log(`[Seed] Skipped ${email} (already exists)`);
      continue;
    }

    // Create 1–2 dogs per user
    const dogCount = Math.random() < 0.7 ? 1 : 2;

    for (let d = 0; d < dogCount; d++) {
      const breed = pick(BREEDS);
      const dogGender = pick(GENDERS);
      const durationMin = pick([15, 20, 30, 30, 45]);
      const durationMax = pick([30, 45, 60, 60, 90, 120].filter((v) => v >= durationMin));

      const [dog] = await db
        .insert(dogProfiles)
        .values({
          ownerId: user.id,
          name: pick(DOG_NAMES),
          birthDate: randomDate(2018, 2025),
          breed: breed.code,
          breedSecondary:
            breed.code === 'mixed_breed'
              ? pick(BREEDS.filter((b) => b.code !== 'mixed_breed')).code
              : null,
          size: breed.size,
          weightKg: randFloat(breed.wMin, breed.wMax, 1),
          gender: dogGender,
          isNeutered: Math.random() < 0.65,
          energyLevel: pick(ENERGY_LEVELS),
          behaviorWithDogs: pick(BEHAVIOR_DOGS),
          behaviorWithPeople: pick(BEHAVIOR_PEOPLE),
          leashBehavior: pick(LEASH),
          recallReliability: Math.random() < 0.8 ? pick(RECALL) : null,
          bio: pick(BIOS_IT),
          walkPrefTime: pickN(WALK_TIMES, 1, 3),
          walkPrefDurationMin: durationMin,
          walkPrefDurationMax: durationMax,
          walkPrefTerrain: pickN(WALK_TERRAINS, 1, 3),
        })
        .returning({ id: dogProfiles.id });

      // Add 1–3 photos per dog
      if (dog) {
        const photoCount = pick([1, 1, 2, 2, 2, 3]);
        const selectedPhotos = pickN(DOG_PHOTO_IDS, photoCount, photoCount);
        for (let p = 0; p < selectedPhotos.length; p++) {
          await db.insert(dogPhotos).values({
            dogId: dog.id,
            url: photoUrl(selectedPhotos[p]!),
            position: p,
            isPrimary: p === 0,
            moderationStatus: 'approved',
          });
        }
      }
    }

    created++;
    if (created % 20 === 0) {
      console.log(`[Seed] Progress: ${created}/${PROFILE_COUNT} (${loc.city})`);
    }
  }

  console.log(`[Seed] Done. Created ${created} fake users with dogs.`);
  console.log(`[Seed] To clean up: pnpm tsx packages/db/src/seeds/seed-fake-cleanup.ts`);

  await pool.end();
}

seed().catch((err) => {
  console.error('[Seed] Seed failed', err);
  process.exit(1);
});
