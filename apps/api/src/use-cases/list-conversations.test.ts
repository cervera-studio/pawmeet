import type { DogProfile } from '@dogwalk/types';
import { isSuccess } from '@dogwalk/types';
import { describe, expect, it, vi } from 'vitest';
import type { ChatService, ConversationSummary, DogRepository, MessageRepository } from '../ports/index.js';
import { createListConversations } from './list-conversations.js';

function buildDog(overrides: Partial<DogProfile> = {}): DogProfile {
  return {
    id: 'dog-1',
    ownerId: 'user-1',
    name: 'Rex',
    birthDate: new Date('2022-01-01'),
    breed: 'Labrador',
    breedSecondary: null,
    size: 'grande',
    weightKg: 30,
    gender: 'maschio',
    isNeutered: true,
    energyLevel: 'alta',
    behaviorWithDogs: 'socievole',
    behaviorWithPeople: 'molto_socievole',
    leashBehavior: 'buono',
    recallReliability: 'affidabile',
    bio: null,
    walkPrefTime: ['mattina'],
    walkPrefDurationMin: 30,
    walkPrefDurationMax: 60,
    walkPrefTerrain: ['parco'],
    isActive: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function buildConversation(overrides: Partial<ConversationSummary> = {}): ConversationSummary {
  return {
    matchId: 'match-1',
    compatibilityScore: 0.85,
    otherUser: { id: 'user-2', displayName: 'Luigi Verdi', avatarUrl: null },
    otherDogName: 'Bella',
    lastMessage: null,
    unreadCount: 0,
    ...overrides,
  };
}

function buildDogRepo(overrides: Partial<DogRepository> = {}): DogRepository {
  return {
    findById: vi.fn(),
    findByIds: vi.fn(),
    findByOwner: vi.fn(),
    findByIdAndOwner: vi.fn(),
    countByOwner: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    findPhotos: vi.fn(),
    countPhotos: vi.fn(),
    addPhoto: vi.fn(),
    findPhoto: vi.fn(),
    deletePhoto: vi.fn(),
    updatePhotoPositions: vi.fn(),
    ...overrides,
  };
}

function buildMessageRepo(overrides: Partial<MessageRepository> = {}): MessageRepository {
  return {
    getConversationsForUser: vi.fn().mockResolvedValue([]),
    findByMatch: vi.fn(),
    create: vi.fn(),
    markAsRead: vi.fn(),
    isMatchParticipant: vi.fn(),
    ...overrides,
  };
}

function buildChat(overrides: Partial<ChatService> = {}): ChatService {
  return {
    joinRoom: vi.fn(),
    sendToRoom: vi.fn(),
    ...overrides,
  };
}

describe('listConversations', () => {
  it('returns conversations and joins WS rooms', async () => {
    const conv = buildConversation();
    const dogRepo = buildDogRepo({
      findByOwner: vi.fn().mockResolvedValue([buildDog()]),
    });
    const messageRepo = buildMessageRepo({
      getConversationsForUser: vi.fn().mockResolvedValue([conv]),
    });
    const chat = buildChat();

    const listConversations = createListConversations({ dogRepo, messageRepo, chat });
    const result = await listConversations('user-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.conversations).toHaveLength(1);
    expect(result.data.conversations[0].matchId).toBe('match-1');
    expect(chat.joinRoom).toHaveBeenCalledWith('match-1', 'user-1');
  });

  it('returns empty conversations when user has no dogs', async () => {
    const dogRepo = buildDogRepo({
      findByOwner: vi.fn().mockResolvedValue([]),
    });
    const messageRepo = buildMessageRepo();
    const chat = buildChat();

    const listConversations = createListConversations({ dogRepo, messageRepo, chat });
    const result = await listConversations('user-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.conversations).toHaveLength(0);
    expect(messageRepo.getConversationsForUser).not.toHaveBeenCalled();
  });
});
