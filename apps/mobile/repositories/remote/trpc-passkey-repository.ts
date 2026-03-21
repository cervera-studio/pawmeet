import type { ApiClient } from '@pawmeet/api-client';
import type { AuthResult, PasskeyRepository } from '../interfaces';

export function createTrpcPasskeyRepository(api: ApiClient): PasskeyRepository {
  return {
    async getRegisterOptions() {
      return api.passkey.registerOptions.mutate({});
    },
    async verifyRegistration(response, friendlyName) {
      return api.passkey.registerVerify.mutate({ response, friendlyName });
    },
    async getLoginOptions(email) {
      return api.passkey.loginOptions.mutate({ email });
    },
    async verifyLogin(response) {
      const result = await api.passkey.loginVerify.mutate({ response });
      return result as unknown as AuthResult;
    },
    async list() {
      return api.passkey.list.query();
    },
    async remove(id) {
      return api.passkey.delete.mutate({ id });
    },
  };
}
