'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { useSidebarViewModel } from './sidebar.view-model';

export function Sidebar() {
  const vm = useSidebarViewModel();
  const t = useTranslations('auth');

  return (
    <aside className="flex h-full min-h-0 w-64 flex-col border-r border-neutral-200 bg-white dark:border-neutral-300 dark:bg-neutral-100">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-neutral-200 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-800 text-white font-bold text-sm">
          PM
        </div>
        <span className="text-lg font-semibold text-neutral-900">PawMeet</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto space-y-1 px-3 py-4">
        {vm.navigation.map((item) => {
          const isActive = vm.isNavActive(item.href);
          const hasChildren = !!item.children;

          return (
            <div key={item.name}>
              {hasChildren ? (
                <button
                  type="button"
                  onClick={() => vm.toggleSection(item.href)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900',
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </button>
              ) : (
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900',
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              )}

              {/* Sub-navigation */}
              {hasChildren && (isActive || vm.isSectionOpen(item.href)) && (
                <div className="ml-8 mt-1 space-y-1">
                  {item.children.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      className={cn(
                        'block rounded-lg px-3 py-1.5 text-sm transition-colors',
                        vm.isChildActive(child.href)
                          ? 'text-primary-700 font-medium'
                          : 'text-neutral-500 hover:text-neutral-900',
                      )}
                    >
                      {child.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-neutral-200 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">
            {vm.userInitial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-neutral-900 truncate">{vm.userName}</p>
            <p className="text-xs text-neutral-500 truncate">{vm.userEmail}</p>
          </div>
          <button
            onClick={vm.logout}
            type="button"
            className="text-xs text-neutral-400 hover:text-red-500 transition-colors"
          >
            {t('logout')}
          </button>
        </div>
      </div>
    </aside>
  );
}
