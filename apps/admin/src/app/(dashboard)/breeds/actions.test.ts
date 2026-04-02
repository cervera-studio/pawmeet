import { createBreed, deleteBreed, fetchBreeds, updateBreed } from './actions';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockMutate = vi.fn();
const mockQuery = vi.fn();

vi.mock('@/lib/server-api', () => ({
  getServerTrpcClient: vi.fn(() => ({
    admin: {
      listBreeds: { query: mockQuery },
      createBreed: { mutate: mockMutate },
      updateBreed: { mutate: mockMutate },
      deleteBreed: { mutate: mockMutate },
    },
  })),
}));

// ── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe('fetchBreeds', () => {
  it('queries breeds with params', async () => {
    const mockResult = { data: [{ id: 1, code: 'labrador' }], total: 1 };
    mockQuery.mockResolvedValueOnce(mockResult);

    const result = await fetchBreeds({ page: 1, pageSize: 20, search: 'lab' });
    expect(result).toEqual(mockResult);
    expect(mockQuery).toHaveBeenCalledWith({ page: 1, pageSize: 20, search: 'lab' });
  });
});

describe('createBreed', () => {
  it('calls mutate with breed data', async () => {
    const input = {
      code: 'golden_retriever',
      group: 'Sporting',
      sizeCategory: 'large' as const,
      avgWeightKg: 30,
      energy: 4,
    };
    mockMutate.mockResolvedValueOnce({ id: 2, ...input });

    const result = await createBreed(input);
    expect(mockMutate).toHaveBeenCalledWith(input);
    expect(result).toHaveProperty('id', 2);
  });
});

describe('updateBreed', () => {
  it('calls mutate with updated fields', async () => {
    const input = { id: 1, avgWeightKg: 35 };
    mockMutate.mockResolvedValueOnce({ ...input });

    await updateBreed(input);
    expect(mockMutate).toHaveBeenCalledWith(input);
  });
});

describe('deleteBreed', () => {
  it('calls mutate with breed id', async () => {
    mockMutate.mockResolvedValueOnce(undefined);

    await deleteBreed({ id: 1 });
    expect(mockMutate).toHaveBeenCalledWith({ id: 1 });
  });
});
