import type { PaginatedResult } from '@dogwalk/types';

export interface AdminUserListItem {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'suspended' | 'banned';
  dogsCount: number;
  followersCount: number;
  followingCount: number;
  createdAt: string;
}

export interface AdminUserDetail {
  id: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  status: 'active' | 'suspended' | 'banned';
  authProvider: string;
  createdAt: string;
  lastLoginAt: string | null;
  dogs: {
    id: string;
    name: string;
    breed: string;
    isActive: boolean;
  }[];
  followersCount: number;
  followingCount: number;
  reportsReceived: number;
  matchesCount: number;
}

export interface ListUsersParams {
  page: number;
  pageSize: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AdminUserRepository {
  list(params: ListUsersParams): Promise<PaginatedResult<AdminUserListItem>>;
  getById(id: string): Promise<AdminUserDetail>;
  suspend(id: string): Promise<void>;
  ban(id: string): Promise<void>;
  reactivate(id: string): Promise<void>;
}
