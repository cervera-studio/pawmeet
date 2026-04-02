import {
  banUser,
  fetchUser,
  fetchUserSessions,
  fetchUsers,
  impersonateUser,
  reactivateUser,
  requestGdprExport,
  revokeAllUserSessions,
  revokeUserSession,
  suspendUser,
} from './actions';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(() => (key: string) => `translated:${key}`),
}));

const mockMutate = vi.fn();
const mockQuery = vi.fn();

vi.mock('@/lib/server-api', () => ({
  getServerTrpcClient: vi.fn(() => ({
    admin: {
      suspendUser: { mutate: mockMutate },
      banUser: { mutate: mockMutate },
      reactivateUser: { mutate: mockMutate },
      requestGdprExport: { mutate: mockMutate },
      getUserSessions: { query: mockQuery },
      revokeUserSession: { mutate: mockMutate },
      revokeAllUserSessions: { mutate: mockMutate },
      getUserConsents: { query: mockQuery },
      impersonateUser: { mutate: mockMutate },
      getUser: { query: mockQuery },
      listUsers: { query: mockQuery },
    },
  })),
}));

vi.mock('@pawmeet/utils', () => ({
  logger: { error: vi.fn() },
}));

// ── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe('suspendUser', () => {
  it('returns success on successful mutation', async () => {
    mockMutate.mockResolvedValueOnce(undefined);
    const result = await suspendUser('user-1');
    expect(result).toEqual({ success: true });
    expect(mockMutate).toHaveBeenCalledWith({ userId: 'user-1' });
  });

  it('returns error message on failure', async () => {
    mockMutate.mockRejectedValueOnce(new Error('Network error'));
    const result = await suspendUser('user-1');
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe('banUser', () => {
  it('returns success on successful mutation', async () => {
    mockMutate.mockResolvedValueOnce(undefined);
    const result = await banUser('user-2');
    expect(result).toEqual({ success: true });
    expect(mockMutate).toHaveBeenCalledWith({ userId: 'user-2' });
  });

  it('returns error on failure', async () => {
    mockMutate.mockRejectedValueOnce(new Error('Forbidden'));
    const result = await banUser('user-2');
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe('reactivateUser', () => {
  it('returns success on successful mutation', async () => {
    mockMutate.mockResolvedValueOnce(undefined);
    const result = await reactivateUser('user-3');
    expect(result).toEqual({ success: true });
  });

  it('returns error on failure', async () => {
    mockMutate.mockRejectedValueOnce(new Error('fail'));
    const result = await reactivateUser('user-3');
    expect(result.success).toBe(false);
  });
});

describe('requestGdprExport', () => {
  it('returns success on successful mutation', async () => {
    mockMutate.mockResolvedValueOnce(undefined);
    const result = await requestGdprExport('user-4');
    expect(result).toEqual({ success: true });
  });

  it('returns error on failure', async () => {
    mockMutate.mockRejectedValueOnce(new Error('fail'));
    const result = await requestGdprExport('user-4');
    expect(result.success).toBe(false);
  });
});

describe('fetchUserSessions', () => {
  it('returns sessions on success', async () => {
    const sessions = [{ id: 's1', device: 'iPhone' }];
    mockQuery.mockResolvedValueOnce(sessions);
    const result = await fetchUserSessions('user-5');
    expect(result).toEqual(sessions);
  });

  it('returns empty array on failure', async () => {
    mockQuery.mockRejectedValueOnce(new Error('fail'));
    const result = await fetchUserSessions('user-5');
    expect(result).toEqual([]);
  });
});

describe('revokeUserSession', () => {
  it('returns success on successful mutation', async () => {
    mockMutate.mockResolvedValueOnce(undefined);
    const result = await revokeUserSession('user-6', 'session-1');
    expect(result).toEqual({ success: true });
    expect(mockMutate).toHaveBeenCalledWith({ userId: 'user-6', sessionId: 'session-1' });
  });

  it('returns error on failure', async () => {
    mockMutate.mockRejectedValueOnce(new Error('fail'));
    const result = await revokeUserSession('user-6', 'session-1');
    expect(result.success).toBe(false);
  });
});

describe('revokeAllUserSessions', () => {
  it('returns success on successful mutation', async () => {
    mockMutate.mockResolvedValueOnce(undefined);
    const result = await revokeAllUserSessions('user-7');
    expect(result).toEqual({ success: true });
  });

  it('returns error on failure', async () => {
    mockMutate.mockRejectedValueOnce(new Error('fail'));
    const result = await revokeAllUserSessions('user-7');
    expect(result.success).toBe(false);
  });
});

describe('impersonateUser', () => {
  it('returns success with token on success', async () => {
    mockMutate.mockResolvedValueOnce({ token: 'jwt-abc' });
    const result = await impersonateUser('user-8');
    expect(result).toEqual({ success: true, token: 'jwt-abc' });
  });

  it('returns error on failure', async () => {
    mockMutate.mockRejectedValueOnce(new Error('fail'));
    const result = await impersonateUser('user-8');
    expect(result.success).toBe(false);
  });
});

describe('fetchUser', () => {
  it('returns user on success', async () => {
    const user = { id: 'user-9', email: 'test@test.com' };
    mockQuery.mockResolvedValueOnce(user);
    const result = await fetchUser('user-9');
    expect(result).toEqual(user);
  });

  it('returns null on failure', async () => {
    mockQuery.mockRejectedValueOnce(new Error('fail'));
    const result = await fetchUser('user-9');
    expect(result).toBeNull();
  });
});

describe('fetchUsers', () => {
  it('returns paginated users', async () => {
    mockQuery.mockResolvedValueOnce({
      data: [{ id: 'u1' }],
      total: 50,
      page: 1,
      pageSize: 20,
      totalPages: 3,
    });
    const result = await fetchUsers({ page: 1, pageSize: 20 });
    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(50);
    expect(result.hasMore).toBe(true);
  });

  it('sets hasMore to false on last page', async () => {
    mockQuery.mockResolvedValueOnce({
      data: [],
      total: 20,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    });
    const result = await fetchUsers({ page: 1, pageSize: 20 });
    expect(result.hasMore).toBe(false);
  });
});
