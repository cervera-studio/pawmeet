import {
  addSponsorToEvent,
  cancelGroupEvent,
  createOfficialEvent,
  fetchEventSponsors,
  fetchGroupEvent,
  fetchGroupEvents,
  fetchVerifiedOrganizations,
  removeParticipant,
  removeSponsorFromEvent,
} from './actions';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

const mockMutate = vi.fn();
const mockQuery = vi.fn();

vi.mock('@/lib/server-api', () => ({
  getServerTrpcClient: vi.fn(() => ({
    admin: {
      listGroupEvents: { query: mockQuery },
      getGroupEvent: { query: mockQuery },
      cancelGroupEvent: { mutate: mockMutate },
      removeEventParticipant: { mutate: mockMutate },
      listEventSponsors: { query: mockQuery },
      addEventSponsor: { mutate: mockMutate },
      removeEventSponsor: { mutate: mockMutate },
      createOfficialEvent: { mutate: mockMutate },
      listOrganizations: { query: mockQuery },
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

describe('fetchGroupEvents', () => {
  it('returns paginated events', async () => {
    mockQuery.mockResolvedValueOnce({
      data: [{ id: 'e1' }],
      total: 30,
      page: 1,
      pageSize: 20,
      totalPages: 2,
    });
    const result = await fetchGroupEvents({ page: 1, pageSize: 20 });
    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(30);
    expect(result.hasMore).toBe(true);
  });

  it('sets hasMore to false on last page', async () => {
    mockQuery.mockResolvedValueOnce({
      data: [],
      total: 5,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    });
    const result = await fetchGroupEvents({ page: 1, pageSize: 20 });
    expect(result.hasMore).toBe(false);
  });
});

describe('fetchGroupEvent', () => {
  it('returns event on success', async () => {
    const event = { id: 'e1', title: 'Dog Walk' };
    mockQuery.mockResolvedValueOnce(event);
    const result = await fetchGroupEvent('e1');
    expect(result).toEqual(event);
  });

  it('returns null on failure', async () => {
    mockQuery.mockRejectedValueOnce(new Error('not found'));
    const result = await fetchGroupEvent('e1');
    expect(result).toBeNull();
  });
});

describe('cancelGroupEvent', () => {
  it('returns success after mutation', async () => {
    mockMutate.mockResolvedValueOnce(undefined);
    const result = await cancelGroupEvent('e1');
    expect(result).toEqual({ success: true });
    expect(mockMutate).toHaveBeenCalledWith({ eventId: 'e1' });
  });
});

describe('removeParticipant', () => {
  it('returns success after mutation', async () => {
    mockMutate.mockResolvedValueOnce(undefined);
    const result = await removeParticipant('p1', 'e1');
    expect(result).toEqual({ success: true });
    expect(mockMutate).toHaveBeenCalledWith({ participantId: 'p1' });
  });
});

describe('fetchEventSponsors', () => {
  it('returns sponsor data', async () => {
    const sponsors = [{ organizationId: 'org1', tier: 'gold' }];
    mockQuery.mockResolvedValueOnce({ data: sponsors });
    const result = await fetchEventSponsors('e1');
    expect(result).toEqual(sponsors);
  });
});

describe('addSponsorToEvent', () => {
  it('calls mutate with sponsor details', async () => {
    mockMutate.mockResolvedValueOnce(undefined);
    const result = await addSponsorToEvent('e1', 'org1', 'gold', 'header');
    expect(result).toEqual({ success: true });
    expect(mockMutate).toHaveBeenCalledWith({
      eventId: 'e1',
      organizationId: 'org1',
      tier: 'gold',
      logoPlacement: 'header',
    });
  });
});

describe('removeSponsorFromEvent', () => {
  it('calls mutate with event and org ids', async () => {
    mockMutate.mockResolvedValueOnce(undefined);
    const result = await removeSponsorFromEvent('e1', 'org1');
    expect(result).toEqual({ success: true });
    expect(mockMutate).toHaveBeenCalledWith({ eventId: 'e1', organizationId: 'org1' });
  });
});

describe('createOfficialEvent', () => {
  it('returns created event after mutation', async () => {
    const input = {
      title: 'Dog Walk Milan',
      scheduledAt: '2026-06-01T10:00:00Z',
      durationMin: 60,
      location: 'Parco Sempione',
      latitude: 45.4722,
      longitude: 9.1725,
      maxParticipants: 20,
      organizationId: 'org1',
      category: 'walk' as const,
    };
    const created = { id: 'e2', ...input };
    mockMutate.mockResolvedValueOnce(created);

    const result = await createOfficialEvent(input);
    expect(result).toEqual(created);
    expect(mockMutate).toHaveBeenCalledWith(input);
  });
});

describe('fetchVerifiedOrganizations', () => {
  it('returns only verified and active organizations', async () => {
    mockQuery.mockResolvedValueOnce({
      data: [
        { id: 'org1', isVerified: true, isActive: true },
        { id: 'org2', isVerified: false, isActive: true },
        { id: 'org3', isVerified: true, isActive: false },
        { id: 'org4', isVerified: true, isActive: true },
      ],
    });

    const result = await fetchVerifiedOrganizations();
    expect(result).toHaveLength(2);
    expect(result.map((o: { id: string }) => o.id)).toEqual(['org1', 'org4']);
  });
});
