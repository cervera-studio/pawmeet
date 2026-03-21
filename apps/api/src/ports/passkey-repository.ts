export interface PasskeyCredentialRecord {
  id: string;
  userId: string;
  credentialId: string;
  publicKey: Buffer;
  counter: number;
  deviceType: string;
  backedUp: boolean;
  transports: string[] | null;
  friendlyName: string | null;
  createdAt: Date;
  lastUsedAt: Date | null;
}

export interface PasskeyRepository {
  findById(id: string): Promise<PasskeyCredentialRecord | null>;
  findByCredentialId(credentialId: string): Promise<PasskeyCredentialRecord | null>;
  findByUserId(userId: string): Promise<PasskeyCredentialRecord[]>;
  create(input: {
    userId: string;
    credentialId: string;
    publicKey: Buffer;
    counter: number;
    deviceType: string;
    backedUp: boolean;
    transports?: string[];
    friendlyName?: string;
  }): Promise<PasskeyCredentialRecord>;
  updateCounter(id: string, counter: number): Promise<void>;
  delete(id: string, userId: string): Promise<boolean>;
  countByUserId(userId: string): Promise<number>;
}
