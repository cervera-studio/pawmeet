import type { AuthenticationResponseJSON, RegistrationResponseJSON } from '@simplewebauthn/server';
import { DrizzlePasskeyRepository } from '../infra/drizzle-passkey-repository.js';
import { RedisChallengeStore } from '../infra/redis-challenge-store.js';
import { createPasskeyDelete } from '../use-cases/passkey-delete.js';
import { createPasskeyList } from '../use-cases/passkey-list.js';
import { createPasskeyLoginOptions } from '../use-cases/passkey-login-options.js';
import { createPasskeyLoginVerify } from '../use-cases/passkey-login-verify.js';
import { createPasskeyRegisterOptions } from '../use-cases/passkey-register-options.js';
import { createPasskeyRegisterVerify } from '../use-cases/passkey-register-verify.js';
import { authService, oauthAccountRepo, tokenRepo, userRepo } from './services.js';

// Lazy-init to avoid import-time crashes in tests
let _passkeyRepo: DrizzlePasskeyRepository | null = null;
let _challengeStore: RedisChallengeStore | null = null;

async function getPasskeyRepo(): Promise<DrizzlePasskeyRepository> {
  if (!_passkeyRepo) {
    const { db } = await import('../lib/db.js');
    _passkeyRepo = new DrizzlePasskeyRepository(db);
  }
  return _passkeyRepo;
}

async function getChallengeStore(): Promise<RedisChallengeStore> {
  if (!_challengeStore) {
    const { redis } = await import('../lib/redis.js');
    _challengeStore = new RedisChallengeStore(redis);
  }
  return _challengeStore;
}

// Lazy factory to avoid blocking startup
function lazyDeps() {
  let _deps: ReturnType<typeof buildDeps> | null = null;
  return () => {
    if (!_deps) _deps = buildDeps();
    return _deps;
  };
}

function buildDeps() {
  const passkeyRepoP = getPasskeyRepo();
  const challengeStoreP = getChallengeStore();

  return {
    passkeyRepoP,
    challengeStoreP,
  };
}

export const passkeyDeps = {
  async registerOptions(userId: string) {
    const { passkeyRepoP, challengeStoreP } = lazyDeps()();
    const [passkeyRepo, challengeStore] = await Promise.all([passkeyRepoP, challengeStoreP]);
    return createPasskeyRegisterOptions({ userRepo, passkeyRepo, challengeStore })(userId);
  },

  async registerVerify(
    userId: string,
    input: { response: RegistrationResponseJSON; friendlyName?: string },
  ) {
    const { passkeyRepoP, challengeStoreP } = lazyDeps()();
    const [passkeyRepo, challengeStore] = await Promise.all([passkeyRepoP, challengeStoreP]);
    return createPasskeyRegisterVerify({ passkeyRepo, challengeStore })(userId, input);
  },

  async loginOptions(email?: string) {
    const { passkeyRepoP, challengeStoreP } = lazyDeps()();
    const [passkeyRepo, challengeStore] = await Promise.all([passkeyRepoP, challengeStoreP]);
    return createPasskeyLoginOptions({ userRepo, passkeyRepo, challengeStore })(email);
  },

  async loginVerify(response: AuthenticationResponseJSON) {
    const { passkeyRepoP, challengeStoreP } = lazyDeps()();
    const [passkeyRepo, challengeStore] = await Promise.all([passkeyRepoP, challengeStoreP]);
    return createPasskeyLoginVerify({
      userRepo,
      passkeyRepo,
      tokenRepo,
      authService,
      challengeStore,
    })(response);
  },

  async list(userId: string) {
    const passkeyRepo = await getPasskeyRepo();
    return createPasskeyList({ passkeyRepo })(userId);
  },

  async delete(userId: string, passkeyId: string) {
    const passkeyRepo = await getPasskeyRepo();
    return createPasskeyDelete({ passkeyRepo, userRepo, oauthAccountRepo })(userId, passkeyId);
  },
};
