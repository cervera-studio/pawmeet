import type { AuthResult } from './auth-repository';

export interface PasskeySummary {
  id: string;
  friendlyName: string | null;
  deviceType: string;
  backedUp: boolean;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface PasskeyRepository {
  getRegisterOptions(): Promise<Record<string, unknown>>;
  verifyRegistration(
    response: Record<string, unknown>,
    friendlyName?: string,
  ): Promise<{ id: string; friendlyName: string | null }>;
  getLoginOptions(email?: string): Promise<Record<string, unknown>>;
  verifyLogin(response: Record<string, unknown>): Promise<AuthResult>;
  list(): Promise<PasskeySummary[]>;
  remove(id: string): Promise<{ message: string }>;
}
