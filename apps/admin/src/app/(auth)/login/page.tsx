'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLoginViewModel } from './login.view-model';

export default function LoginPage() {
  const router = useRouter();
  const vm = useLoginViewModel();

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (!vm.isAuthLoading && vm.isAuthenticated) {
      router.push('/');
    }
  }, [vm.isAuthLoading, vm.isAuthenticated, router]);

  if (vm.isAuthLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <div className="text-neutral-500">Caricamento...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50">
      <div className="w-full max-w-sm space-y-6 rounded-lg border border-neutral-200 bg-white p-8 shadow-md">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-800 text-white font-bold text-lg">
            PM
          </div>
          <h1 className="text-2xl font-bold text-neutral-900">PawMeet Admin</h1>
          <p className="mt-1 text-sm text-neutral-500">Accedi al pannello di amministrazione</p>
        </div>

        <form onSubmit={vm.handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-neutral-700">
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="admin@pawmeet.io"
              value={vm.email}
              onChange={(e) => vm.setEmail(e.target.value)}
              required
              autoComplete="email"
              disabled={vm.isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-neutral-700">
              Password
            </label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={vm.password}
              onChange={(e) => vm.setPassword(e.target.value)}
              required
              autoComplete="current-password"
              disabled={vm.isSubmitting}
            />
          </div>

          {vm.error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{vm.error}</div>
          )}

          <Button type="submit" className="w-full" disabled={vm.isSubmitting}>
            {vm.isSubmitting ? 'Accesso in corso...' : 'Accedi'}
          </Button>
        </form>
      </div>
    </div>
  );
}
