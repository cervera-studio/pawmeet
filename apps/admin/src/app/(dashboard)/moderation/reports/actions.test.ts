import { fetchAllReportsForExport, fetchReports, resolveReport } from './actions';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

const mockMutate = vi.fn();
const mockQuery = vi.fn();

vi.mock('@/lib/server-api', () => ({
  getServerTrpcClient: vi.fn(() => ({
    admin: {
      resolveReport: { mutate: mockMutate },
      listReports: { query: mockQuery },
    },
  })),
}));

// ── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe('resolveReport', () => {
  it('calls mutate with id and action', async () => {
    mockMutate.mockResolvedValueOnce(undefined);
    await resolveReport('r1', 'dismiss');
    expect(mockMutate).toHaveBeenCalledWith({ id: 'r1', action: 'dismiss' });
  });
});

describe('fetchReports', () => {
  it('maps report data correctly', async () => {
    mockQuery.mockResolvedValueOnce({
      data: [
        {
          id: 'r1',
          status: 'pending',
          resolvedAt: null,
          createdAt: new Date('2026-01-15T10:00:00Z'),
          reason: 'spam',
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    });

    const result = await fetchReports({ page: 1, pageSize: 20 });
    expect(result.data[0].status).toBe('pending');
    expect(result.data[0].resolvedAt).toBeNull();
    expect(typeof result.data[0].createdAt).toBe('string');
    expect(result.hasMore).toBe(false);
  });

  it('converts resolvedAt to string when present', async () => {
    mockQuery.mockResolvedValueOnce({
      data: [
        {
          id: 'r2',
          status: 'resolved',
          resolvedAt: new Date('2026-01-16T10:00:00Z'),
          createdAt: new Date('2026-01-15T10:00:00Z'),
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    });

    const result = await fetchReports({ page: 1, pageSize: 20 });
    expect(typeof result.data[0].resolvedAt).toBe('string');
  });
});

describe('fetchAllReportsForExport', () => {
  it('paginates through all pages', async () => {
    mockQuery
      .mockResolvedValueOnce({
        data: [{ id: 'r1', status: 'pending', resolvedAt: null, createdAt: new Date() }],
        total: 2,
        page: 1,
        pageSize: 200,
        totalPages: 2,
      })
      .mockResolvedValueOnce({
        data: [{ id: 'r2', status: 'resolved', resolvedAt: new Date(), createdAt: new Date() }],
        total: 2,
        page: 2,
        pageSize: 200,
        totalPages: 2,
      });

    const result = await fetchAllReportsForExport();
    expect(result).toHaveLength(2);
    expect(mockQuery).toHaveBeenCalledTimes(2);
  });
});
