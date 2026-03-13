'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function useTheme() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggle = () => {
    const next = !isDark;
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('pawmeet-admin-theme', next ? 'dark' : 'light');
    setIsDark(next);
  };

  return { isDark, toggle };
}

export function Header() {
  const { isDark, toggle } = useTheme();
  const t = useTranslations('header');

  return (
    <header className="flex h-16 items-center justify-between border-b border-neutral-200 bg-white dark:bg-neutral-100 px-6">
      {/* Search */}
      <div className="flex-1 max-w-md">
        <Input type="search" placeholder={t('searchPlaceholder')} className="w-full" />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        <LocaleSwitcher />

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          title={isDark ? t('lightTheme') : t('darkTheme')}
        >
          {isDark ? (
            <SunIcon className="h-5 w-5 text-neutral-600" title={t('lightTheme')} />
          ) : (
            <MoonIcon className="h-5 w-5 text-neutral-600" title={t('darkTheme')} />
          )}
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <BellIcon className="h-5 w-5 text-neutral-600" title={t('notifications')} />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
        </Button>

        {/* Profile */}
        <Button variant="ghost" size="icon">
          <div className="h-8 w-8 rounded-full bg-neutral-200" />
        </Button>
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
      <title>{title}</title>
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
      <title>{title}</title>
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
