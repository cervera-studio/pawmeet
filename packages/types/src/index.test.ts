import type {
  BehaviorWithDogs,
  BehaviorWithPeople,
  ChatMessage,
  DogPhoto,
  DogProfile,
  DogSize,
  EnergyLevel,
  Gender,
  LeashBehavior,
  Match,
  MessageStatus,
  RecallReliability,
  Swipe,
  User,
  WalkTerrain,
  WalkTime,
} from './index';

// -- Builders ----------------------------------------------------------------

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: 'usr_001',
    email: 'mario@example.com',
    displayName: 'Mario Rossi',
    passwordHash: null,
    authProvider: 'email',
    avatarUrl: null,
    latitude: null,
    longitude: null,
    locationUpdatedAt: null,
    searchRadiusKm: 10,
    emailVerified: false,
    isActive: true,
    createdAt: new Date('2025-01-01'),
    lastLoginAt: null,
    ...overrides,
  };
}

function buildDogProfile(overrides: Partial<DogProfile> = {}): DogProfile {
  return {
    id: 'dog_001',
    ownerId: 'usr_001',
    name: 'Fido',
    birthDate: new Date('2022-03-15'),
    breed: 'Labrador Retriever',
    breedSecondary: null,
    size: 'grande',
    weightKg: 30,
    gender: 'maschio',
    isNeutered: true,
    energyLevel: 'alta',
    behaviorWithDogs: 'socievole',
    behaviorWithPeople: 'molto_socievole',
    leashBehavior: 'buono',
    recallReliability: 'parziale',
    bio: null,
    walkPrefTime: ['mattina', 'sera'],
    walkPrefDurationMin: 30,
    walkPrefDurationMax: 60,
    walkPrefTerrain: ['parco', 'urbano'],
    isActive: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-06-01'),
    ...overrides,
  };
}

function buildDogPhoto(overrides: Partial<DogPhoto> = {}): DogPhoto {
  return {
    id: 'photo_001',
    dogId: 'dog_001',
    url: 'https://cdn.example.com/dogs/photo_001.jpg',
    position: 0,
    isPrimary: true,
    moderationStatus: 'pending',
    uploadedAt: new Date('2025-01-02'),
    ...overrides,
  };
}

function buildMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: 'match_001',
    dogAId: 'dog_001',
    dogBId: 'dog_002',
    compatibilityScore: 0.85,
    createdAt: new Date('2025-02-01'),
    isActive: true,
    ...overrides,
  };
}

function buildSwipe(overrides: Partial<Swipe> = {}): Swipe {
  return {
    id: 'swipe_001',
    swiperDogId: 'dog_001',
    swipedDogId: 'dog_002',
    direction: 'like',
    createdAt: new Date('2025-02-01'),
    ...overrides,
  };
}

function buildChatMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 'msg_001',
    matchId: 'match_001',
    senderId: 'usr_001',
    content: 'Ciao! Andiamo a passeggiare?',
    mediaUrl: null,
    status: 'sent',
    isDeleted: false,
    createdAt: new Date('2025-02-02'),
    ...overrides,
  };
}

// -- Tests -------------------------------------------------------------------

describe('User', () => {
  it('builds a valid user with defaults', () => {
    const user = buildUser();

    expect(user.id).toBe('usr_001');
    expect(user.email).toBe('mario@example.com');
    expect(user.authProvider).toBe('email');
    expect(user.isActive).toBe(true);
    expect(user.avatarUrl).toBeNull();
    expect(user.latitude).toBeNull();
    expect(user.longitude).toBeNull();
    expect(user.locationUpdatedAt).toBeNull();
    expect(user.lastLoginAt).toBeNull();
    expect(user.createdAt).toBeInstanceOf(Date);
  });

  it('accepts all auth provider variants', () => {
    const providers = ['email', 'google', 'apple'] satisfies User['authProvider'][];

    for (const provider of providers) {
      const user = buildUser({ authProvider: provider });
      expect(user.authProvider).toBe(provider);
    }
  });

  it('accepts location coordinates when provided', () => {
    const user = buildUser({
      latitude: 41.9028,
      longitude: 12.4964,
      locationUpdatedAt: new Date('2025-06-01'),
    });

    expect(user.latitude).toBe(41.9028);
    expect(user.longitude).toBe(12.4964);
    expect(user.locationUpdatedAt).toBeInstanceOf(Date);
  });

  it('overrides individual fields via builder', () => {
    const user = buildUser({ displayName: 'Giulia Bianchi', searchRadiusKm: 25 });

    expect(user.displayName).toBe('Giulia Bianchi');
    expect(user.searchRadiusKm).toBe(25);
    // Ensure non-overridden defaults remain
    expect(user.email).toBe('mario@example.com');
  });
});

describe('DogProfile', () => {
  it('builds a valid dog profile with defaults', () => {
    const dog = buildDogProfile();

    expect(dog.name).toBe('Fido');
    expect(dog.breed).toBe('Labrador Retriever');
    expect(dog.breedSecondary).toBeNull();
    expect(dog.size).toBe('grande');
    expect(dog.weightKg).toBe(30);
    expect(dog.gender).toBe('maschio');
    expect(dog.isNeutered).toBe(true);
    expect(dog.birthDate).toBeInstanceOf(Date);
  });

  it('accepts all DogSize variants', () => {
    const sizes = ['toy', 'piccola', 'media', 'grande', 'gigante'] satisfies DogSize[];

    for (const size of sizes) {
      const dog = buildDogProfile({ size });
      expect(dog.size).toBe(size);
    }
  });

  it('accepts all EnergyLevel variants', () => {
    const levels = ['bassa', 'media', 'alta', 'molto_alta'] satisfies EnergyLevel[];

    for (const level of levels) {
      const dog = buildDogProfile({ energyLevel: level });
      expect(dog.energyLevel).toBe(level);
    }
  });

  it('accepts all BehaviorWithDogs variants', () => {
    const behaviors = [
      'molto_socievole',
      'socievole',
      'selettivo',
      'reattivo',
    ] satisfies BehaviorWithDogs[];

    for (const b of behaviors) {
      const dog = buildDogProfile({ behaviorWithDogs: b });
      expect(dog.behaviorWithDogs).toBe(b);
    }
  });

  it('accepts all BehaviorWithPeople variants', () => {
    const behaviors = [
      'molto_socievole',
      'socievole',
      'timido',
      'diffidente',
    ] satisfies BehaviorWithPeople[];

    for (const b of behaviors) {
      const dog = buildDogProfile({ behaviorWithPeople: b });
      expect(dog.behaviorWithPeople).toBe(b);
    }
  });

  it('accepts all LeashBehavior variants', () => {
    const values = [
      'eccellente',
      'buono',
      'in_addestramento',
      'difficile',
    ] satisfies LeashBehavior[];

    for (const v of values) {
      const dog = buildDogProfile({ leashBehavior: v });
      expect(dog.leashBehavior).toBe(v);
    }
  });

  it('accepts all RecallReliability variants including null', () => {
    const values = ['affidabile', 'parziale', 'non_affidabile'] satisfies RecallReliability[];

    for (const v of values) {
      const dog = buildDogProfile({ recallReliability: v });
      expect(dog.recallReliability).toBe(v);
    }

    const dogWithNull = buildDogProfile({ recallReliability: null });
    expect(dogWithNull.recallReliability).toBeNull();
  });

  it('accepts all Gender variants', () => {
    const genders = ['maschio', 'femmina'] satisfies Gender[];

    for (const g of genders) {
      const dog = buildDogProfile({ gender: g });
      expect(dog.gender).toBe(g);
    }
  });

  it('accepts all WalkTime variants', () => {
    const times = [
      'mattina_presto',
      'mattina',
      'pomeriggio',
      'sera',
      'sera_tardi',
    ] satisfies WalkTime[];

    const dog = buildDogProfile({ walkPrefTime: times });
    expect(dog.walkPrefTime).toEqual(times);
    expect(dog.walkPrefTime).toHaveLength(5);
  });

  it('accepts all WalkTerrain variants', () => {
    const terrains = [
      'urbano',
      'parco',
      'campagna',
      'spiaggia',
      'montagna',
    ] satisfies WalkTerrain[];

    const dog = buildDogProfile({ walkPrefTerrain: terrains });
    expect(dog.walkPrefTerrain).toEqual(terrains);
    expect(dog.walkPrefTerrain).toHaveLength(5);
  });

  it('supports mixed breed with secondary breed', () => {
    const dog = buildDogProfile({
      breed: 'Labrador Retriever',
      breedSecondary: 'Golden Retriever',
    });

    expect(dog.breedSecondary).toBe('Golden Retriever');
  });

  it('validates walk duration range makes sense', () => {
    const dog = buildDogProfile({ walkPrefDurationMin: 30, walkPrefDurationMax: 60 });

    expect(dog.walkPrefDurationMin).toBeLessThanOrEqual(dog.walkPrefDurationMax);
  });
});

describe('DogPhoto', () => {
  it('builds a valid dog photo with defaults', () => {
    const photo = buildDogPhoto();

    expect(photo.id).toBe('photo_001');
    expect(photo.dogId).toBe('dog_001');
    expect(photo.url).toContain('https://');
    expect(photo.position).toBe(0);
    expect(photo.isPrimary).toBe(true);
    expect(photo.moderationStatus).toBe('pending');
    expect(photo.uploadedAt).toBeInstanceOf(Date);
  });

  it('accepts all moderation status variants', () => {
    const statuses = ['pending', 'approved', 'rejected'] satisfies DogPhoto['moderationStatus'][];

    for (const status of statuses) {
      const photo = buildDogPhoto({ moderationStatus: status });
      expect(photo.moderationStatus).toBe(status);
    }
  });

  it('supports non-primary photos at different positions', () => {
    const photo = buildDogPhoto({ isPrimary: false, position: 3 });

    expect(photo.isPrimary).toBe(false);
    expect(photo.position).toBe(3);
  });
});

describe('Match', () => {
  it('builds a valid match with defaults', () => {
    const match = buildMatch();

    expect(match.id).toBe('match_001');
    expect(match.dogAId).toBe('dog_001');
    expect(match.dogBId).toBe('dog_002');
    expect(match.compatibilityScore).toBe(0.85);
    expect(match.isActive).toBe(true);
    expect(match.createdAt).toBeInstanceOf(Date);
  });

  it('compatibility score is a number between 0 and 1', () => {
    const match = buildMatch({ compatibilityScore: 0.72 });

    expect(match.compatibilityScore).toBeGreaterThanOrEqual(0);
    expect(match.compatibilityScore).toBeLessThanOrEqual(1);
  });

  it('can represent an inactive (unmatched) match', () => {
    const match = buildMatch({ isActive: false });

    expect(match.isActive).toBe(false);
  });

  it('references two different dogs', () => {
    const match = buildMatch();

    expect(match.dogAId).not.toBe(match.dogBId);
  });
});

describe('Swipe', () => {
  it('builds a valid swipe with defaults', () => {
    const swipe = buildSwipe();

    expect(swipe.id).toBe('swipe_001');
    expect(swipe.swiperDogId).toBe('dog_001');
    expect(swipe.swipedDogId).toBe('dog_002');
    expect(swipe.direction).toBe('like');
    expect(swipe.createdAt).toBeInstanceOf(Date);
  });

  it('accepts both swipe directions', () => {
    const directions = ['like', 'pass'] satisfies Swipe['direction'][];

    for (const direction of directions) {
      const swipe = buildSwipe({ direction });
      expect(swipe.direction).toBe(direction);
    }
  });

  it('swiper and swiped are different dogs', () => {
    const swipe = buildSwipe();

    expect(swipe.swiperDogId).not.toBe(swipe.swipedDogId);
  });
});

describe('ChatMessage', () => {
  it('builds a valid chat message with defaults', () => {
    const msg = buildChatMessage();

    expect(msg.id).toBe('msg_001');
    expect(msg.matchId).toBe('match_001');
    expect(msg.senderId).toBe('usr_001');
    expect(msg.content).toBeTruthy();
    expect(msg.mediaUrl).toBeNull();
    expect(msg.status).toBe('sent');
    expect(msg.isDeleted).toBe(false);
    expect(msg.createdAt).toBeInstanceOf(Date);
  });

  it('accepts all MessageStatus variants', () => {
    const statuses = ['sent', 'delivered', 'read'] satisfies MessageStatus[];

    for (const status of statuses) {
      const msg = buildChatMessage({ status });
      expect(msg.status).toBe(status);
    }
  });

  it('supports messages with media', () => {
    const msg = buildChatMessage({
      mediaUrl: 'https://cdn.example.com/media/photo.jpg',
      content: '',
    });

    expect(msg.mediaUrl).toBe('https://cdn.example.com/media/photo.jpg');
  });

  it('supports deleted messages', () => {
    const msg = buildChatMessage({ isDeleted: true });

    expect(msg.isDeleted).toBe(true);
  });
});

