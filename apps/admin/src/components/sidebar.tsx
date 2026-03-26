'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { NavItem } from './sidebar.view-model';
import { useSidebarViewModel } from './sidebar.view-model';

export function Sidebar() {
  const vm = useSidebarViewModel();

  return (
    <aside className="flex h-full min-h-0 w-64 flex-col border-r border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-950">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-neutral-200 dark:border-neutral-700 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-800 text-white font-bold text-sm">
          PM
        </div>
        <span className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">PawMeet</span>
      </div>

      {/* Navigation */}
      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        {vm.sections.map((section, sectionIdx) => {
          const isCollapsed = section.label ? vm.isGroupCollapsed(section.label) : false;

          return (
            <div key={section.label ?? `section-${sectionIdx}`} className="mb-1">
              {/* Section label */}
              {section.label ? (
                <button
                  type="button"
                  onClick={() => {
                    if (section.label) vm.toggleGroup(section.label);
                  }}
                  className="flex w-full items-center justify-between px-3 pb-1 pt-4 first:pt-0"
                >
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                    {section.label}
                  </span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    role="img"
                    aria-hidden="true"
                    className={cn(
                      'h-3 w-3 text-neutral-400 transition-transform dark:text-neutral-500',
                      isCollapsed && '-rotate-90',
                    )}
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>
              ) : null}

              {/* Section items */}
              {!isCollapsed &&
                section.items.map((item) => <NavItemRow key={item.href} item={item} vm={vm} />)}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

function NavItemRow({ item, vm }: { item: NavItem; vm: ReturnType<typeof useSidebarViewModel> }) {
  const isActive = vm.isNavActive(item.href);
  const hasChildren = !!item.children;

  return (
    <div>
      {hasChildren ? (
        <button
          type="button"
          onClick={() => vm.toggleSection(item.href)}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            isActive
              ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
              : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-50',
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
              ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
              : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-50',
          )}
        >
          <item.icon className="h-5 w-5" />
          {item.name}
        </Link>
      )}

      {/* Sub-navigation */}
      {hasChildren && (isActive || vm.isSectionOpen(item.href)) && (
        <div className="ml-8 mt-1 space-y-1">
          {item.children?.map((child) => (
            <Link
              key={child.href}
              href={child.href}
              className={cn(
                'block rounded-lg px-3 py-1.5 text-sm transition-colors',
                vm.isChildActive(child.href)
                  ? 'text-primary-700 font-medium dark:text-primary-300'
                  : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-50',
              )}
            >
              {child.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
