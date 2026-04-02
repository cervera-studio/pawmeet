import { isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildSupportRepo } from '../test-utils/builders.js';
import { createListSupportTickets } from './list-support-tickets.js';

describe('createListSupportTickets', () => {
  it('returns paginated tickets', async () => {
    const paginated = { data: [{ id: 'ticket-1' }], total: 1 };
    const supportRepo = buildSupportRepo({
      listTickets: vi.fn().mockResolvedValue(paginated),
    });
    const execute = createListSupportTickets({ supportRepo });

    const result = await execute({ page: 1, pageSize: 10 });

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.total).toBe(1);
    expect(result.data.data).toHaveLength(1);
    expect(supportRepo.listTickets).toHaveBeenCalledWith({ page: 1, pageSize: 10 });
  });
});
