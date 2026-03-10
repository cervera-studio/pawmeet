import { storage } from '@/lib/storage';
import { useAuthStore } from '@/stores/auth';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
};

class ApiClient {
  private baseUrl: string;
  private isRefreshing = false;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getAuthHeaders(): Record<string, string> {
    const token = useAuthStore.getState().token;
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
    return {};
  }

  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {} } = options;

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    // Attempt token refresh on 401
    if (response.status === 401 && !this.isRefreshing) {
      const refreshed = await this.tryRefreshToken();
      if (refreshed) {
        return this.request<T>(endpoint, options);
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Errore sconosciuto' }));
      throw new Error(error.message ?? `HTTP ${response.status}`);
    }

    return response.json();
  }

  private async tryRefreshToken(): Promise<boolean> {
    this.isRefreshing = true;
    try {
      const refreshToken = await storage.getRefreshToken();
      if (!refreshToken) return false;

      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) return false;

      const data = await response.json();
      useAuthStore.getState().setToken(data.accessToken);
      await storage.setToken(data.accessToken);
      if (data.refreshToken) {
        await storage.setRefreshToken(data.refreshToken);
      }
      return true;
    } catch {
      return false;
    } finally {
      this.isRefreshing = false;
    }
  }

  get<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  post<T>(endpoint: string, body: unknown) {
    return this.request<T>(endpoint, { method: 'POST', body });
  }

  put<T>(endpoint: string, body: unknown) {
    return this.request<T>(endpoint, { method: 'PUT', body });
  }

  patch<T>(endpoint: string, body: unknown) {
    return this.request<T>(endpoint, { method: 'PATCH', body });
  }

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const api = new ApiClient(API_URL);
