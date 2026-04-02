import { fetchAnalyticsKpis, fetchDashboardStats } from './actions';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockQuery = vi.fn();

vi.mock('@/lib/server-api', () => ({
  getServerTrpcClient: vi.fn(() => ({
    admin: {
      getStats: { query: mockQuery },
      getAnalyticsKpis: { query: mockQuery },
    },
  })),
}));

// ── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe('fetchDashboardStats', () => {
  it('returns stats from the API', async () => {
    const stats = { totalUsers: 1000, totalDogs: 800, totalMatches: 200 };
    mockQuery.mockResolvedValueOnce(stats);
    const result = await fetchDashboardStats();
    expect(result).toEqual(stats);
  });
});

describe('fetchAnalyticsKpis', () => {
  it('returns KPI data from the API', async () => {
    const kpis = { dau: 150, wau: 600, retention7d: 0.45 };
    mockQuery.mockResolvedValueOnce(kpis);
    const result = await fetchAnalyticsKpis();
    expect(result).toEqual(kpis);
  });
});
