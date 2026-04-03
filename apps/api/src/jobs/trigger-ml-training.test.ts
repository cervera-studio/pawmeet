import process from 'node:process';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let capturedProcessor: (job: { data: unknown; id?: string }) => Promise<void>;

vi.mock('bullmq', () => {
  const WorkerMock = function (
    this: { on: ReturnType<typeof vi.fn> },
    _name: string,
    processor: typeof capturedProcessor,
  ) {
    capturedProcessor = processor;
    this.on = vi.fn();
  };
  return { Worker: WorkerMock };
});

vi.mock('./queues/index.js', () => ({
  getRedisConnection: vi.fn().mockReturnValue({}),
  moveToAnalyticsDlq: vi.fn().mockResolvedValue(undefined),
  QUEUE_NAMES: { ML_TRAINING: 'ml-training' },
}));

vi.mock('@pawmeet/utils', () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}));

const mockBeginCreateOrUpdateAndWait = vi.fn().mockResolvedValue({});

vi.mock('@azure/arm-containerinstance', () => {
  function ContainerInstanceManagementClientMock() {
    return {
      containerGroups: {
        beginCreateOrUpdateAndWait: mockBeginCreateOrUpdateAndWait,
      },
    };
  }
  return { ContainerInstanceManagementClient: ContainerInstanceManagementClientMock };
});

vi.mock('@azure/identity', () => {
  function DefaultAzureCredentialMock() {
    return {};
  }
  return { DefaultAzureCredential: DefaultAzureCredentialMock };
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe('createMlTrainingWorker', () => {
  const originalEnv = process.env;

  beforeEach(async () => {
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      AZURE_SUBSCRIPTION_ID: 'sub-123',
      DATABASE_URL: 'postgres://test',
      R2_ENDPOINT: 'https://r2.test',
      R2_ACCESS_KEY_ID: 'key',
      R2_SECRET_ACCESS_KEY: 'secret',
    };

    const { createMlTrainingWorker } = await import('./trigger-ml-training.js');
    createMlTrainingWorker();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('spawns ACI container group with correct configuration', async () => {
    await capturedProcessor({ data: {}, id: 'job-1' });

    expect(mockBeginCreateOrUpdateAndWait).toHaveBeenCalledTimes(1);
    const [resourceGroup, _containerName, config] = mockBeginCreateOrUpdateAndWait.mock
      .calls[0] as [string, string, Record<string, unknown>];

    expect(resourceGroup).toBe('rg-pawmeet-prod');
    expect(config.osType).toBe('Linux');
    expect(config.restartPolicy).toBe('Never');
  });

  it('throws when AZURE_SUBSCRIPTION_ID is missing', async () => {
    process.env.AZURE_SUBSCRIPTION_ID = undefined;

    await expect(capturedProcessor({ data: {}, id: 'job-2' })).rejects.toThrow(
      'AZURE_SUBSCRIPTION_ID is required',
    );
  });

  it('includes job ID in container tags', async () => {
    await capturedProcessor({ data: {}, id: 'job-42' });

    const config = mockBeginCreateOrUpdateAndWait.mock.calls[0]![2] as {
      tags: Record<string, string>;
    };
    expect(config.tags.jobId).toBe('job-42');
  });

  it('uses "unknown" when job ID is undefined', async () => {
    await capturedProcessor({ data: {} });

    const config = mockBeginCreateOrUpdateAndWait.mock.calls[0]![2] as {
      tags: Record<string, string>;
    };
    expect(config.tags.jobId).toBe('unknown');
  });

  it('propagates ACI creation errors', async () => {
    mockBeginCreateOrUpdateAndWait.mockRejectedValue(new Error('ACI quota exceeded'));

    await expect(capturedProcessor({ data: {}, id: 'job-3' })).rejects.toThrow(
      'ACI quota exceeded',
    );
  });
});
