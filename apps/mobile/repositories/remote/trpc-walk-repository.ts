import type { ApiClient } from '@dogwalk/api-client';
import type { ProposeWalkInput, WalkRepository } from '../interfaces';

export function createTrpcWalkRepository(api: ApiClient): WalkRepository {
  return {
    async listUpcoming() {
      return api.walks.listUpcoming.query();
    },
    async propose(input: ProposeWalkInput) {
      return api.walks.propose.mutate(input);
    },
    async respond(walkId, accept) {
      await api.walks.respond.mutate({ walkId, accept });
    },
    async cancel(walkId) {
      await api.walks.cancel.mutate({ walkId });
    },
    async listByMatch(matchId) {
      return api.walks.listByMatch.query({ matchId });
    },
  };
}
