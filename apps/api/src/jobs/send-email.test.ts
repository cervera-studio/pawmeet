import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EmailJobData } from './queues/index.js';

let capturedProcessor: (job: { data: EmailJobData }) => Promise<void>;

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
  QUEUE_NAMES: { EMAIL: 'email' },
}));

vi.mock('@pawmeet/utils', () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}));

const mockSendEmail = vi.fn();
vi.mock('resend', () => {
  function ResendMock() {
    return { emails: { send: (...args: unknown[]) => mockSendEmail(...args) } };
  }
  return { Resend: ResendMock };
});

vi.mock('../constants/emails.js', () => ({
  FROM_EMAIL: 'PawMeet <noreply@pawmeet.io>',
}));

// ── Builders ───────────────────────────────────────────────────────────────

function buildJobData(overrides: Partial<EmailJobData> = {}): EmailJobData {
  return {
    to: 'user@example.com',
    subject: 'Welcome to PawMeet',
    html: '<h1>Benvenuto!</h1>',
    ...overrides,
  } satisfies EmailJobData;
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('createEmailWorker', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockSendEmail.mockResolvedValue({ id: 'email-1' });

    const { createEmailWorker } = await import('./send-email.js');
    createEmailWorker();
  });

  it('sends email via Resend with correct payload', async () => {
    await capturedProcessor({ data: buildJobData() });

    expect(mockSendEmail).toHaveBeenCalledWith({
      from: 'PawMeet <noreply@pawmeet.io>',
      to: 'user@example.com',
      subject: 'Welcome to PawMeet',
      html: '<h1>Benvenuto!</h1>',
    });
  });

  it('propagates Resend API errors (BullMQ retries)', async () => {
    mockSendEmail.mockRejectedValue(new Error('Resend rate limit'));

    await expect(capturedProcessor({ data: buildJobData() })).rejects.toThrow('Resend rate limit');
  });

  it('sends with different recipients and subjects', async () => {
    await capturedProcessor({
      data: buildJobData({
        to: 'other@example.com',
        subject: 'Password Reset',
        html: '<p>Reset link</p>',
      }),
    });

    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'other@example.com',
        subject: 'Password Reset',
      }),
    );
  });
});
