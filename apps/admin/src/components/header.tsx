'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthContext } from '@/lib/auth-store';

function useTheme() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggle = useCallback(() => {
    const next = !isDark;
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('pawmeet-admin-theme', next ? 'dark' : 'light');
    setIsDark(next);
  }, [isDark]);

  return { isDark, toggle };
}

function useClickOutside(ref: React.RefObject<HTMLElement | null>, handler: () => void) {
  useEffect(() => {
    function listener(e: MouseEvent) {
      if (!ref.current || ref.current.contains(e.target as Node)) return;
      handler();
    }
    document.addEventListener('mousedown', listener);
    return () => document.removeEventListener('mousedown', listener);
  }, [ref, handler]);
}

export function Header() {
  const { isDark, toggle } = useTheme();
  const { user, logout } = useAuthContext();
  const t = useTranslations('header');
  const ta = useTranslations('auth');
  const router = useRouter();

  const [profileOpen, setProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  useClickOutside(dropdownRef, () => setProfileOpen(false));

  const userInitial = user?.name?.charAt(0)?.toUpperCase() ?? 'A';
  const userName = user?.name ?? 'Admin';
  const userEmail = user?.email ?? '';

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    router.push(`/users?search=${encodeURIComponent(trimmed)}`);
    setSearchQuery('');
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-950 px-6">
      {/* Search */}
      <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md">
        <Input
          type="search"
          placeholder={t('searchPlaceholder')}
          className="w-full"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </form>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <LocaleSwitcher />

        {/* Notifications */}
        <Button variant="ghost" size="icon">
          <BellIcon
            className="h-5 w-5 text-neutral-600 dark:text-neutral-300"
            title={t('notifications')}
          />
        </Button>

        {/* Profile dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setProfileOpen((prev) => !prev)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700 dark:bg-primary-900 dark:text-primary-200 transition-opacity hover:opacity-80"
          >
            {userInitial}
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-900 z-50">
              {/* User info */}
              <div className="border-b border-neutral-100 dark:border-neutral-800 px-4 py-3">
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50 truncate">
                  {userName}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                  {userEmail}
                </p>
              </div>

              {/* Actions */}
              <div className="py-1">
                <button
                  type="button"
                  onClick={() => {
                    toggle();
                    setProfileOpen(false);
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                >
                  {isDark ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
                  {isDark ? t('lightTheme') : t('darkTheme')}
                </button>
              </div>

              {/* Logout */}
              <div className="border-t border-neutral-100 dark:border-neutral-800 py-1">
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    logout();
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                >
                  {ta('logout')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function BellIcon({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <title>{title}</title>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

function MoonIcon({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <title>{title ?? 'Dark mode'}</title>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function SunIcon({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <title>{title ?? 'Light mode'}</title>
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}
