import { usePathname } from 'next/navigation';
import { useCallback, useState } from 'react';
import {
  BuildingIcon,
  CalendarIcon,
  LayoutDashboardIcon,
  PawPrintIcon,
  SettingsIcon,
  ShieldIcon,
  UsersIcon,
  UserXIcon,
} from '@/components/icons';
import { useAuthContext } from '@/lib/auth-store';

export const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboardIcon },
  { name: 'Utenti', href: '/users', icon: UsersIcon },
  {
    name: 'Moderazione',
    href: '/moderation',
    icon: ShieldIcon,
    children: [
      { name: 'Feed', href: '/moderation/feed' },
      { name: 'Storie', href: '/moderation/stories' },
      { name: 'Foto', href: '/moderation/photos' },
      { name: 'Contenuti', href: '/moderation/content' },
      { name: 'Segnalazioni', href: '/moderation/reports' },
    ],
  },
  { name: 'Cani', href: '/dogs', icon: PawPrintIcon },
  { name: 'Eventi', href: '/group-events', icon: CalendarIcon },
  { name: 'Organizzazioni', href: '/organizations', icon: BuildingIcon },
  { name: 'Eliminazioni', href: '/account-deletions', icon: UserXIcon },
  { name: 'Impostazioni', href: '/settings', icon: SettingsIcon },
];

export function useSidebarViewModel() {
  const pathname = usePathname();
  const { user, logout } = useAuthContext();
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());

  function isNavActive(href: string) {
    return href === '/' ? pathname === '/' : pathname.startsWith(href);
  }

  function isChildActive(href: string) {
    return pathname === href;
  }

  const toggleSection = useCallback((href: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(href)) {
        next.delete(href);
      } else {
        next.add(href);
      }
      return next;
    });
  }, []);

  const isSectionOpen = useCallback((href: string) => openSections.has(href), [openSections]);

  const userInitial = user?.name?.charAt(0)?.toUpperCase() ?? 'A';
  const userName = user?.name ?? 'Admin';
  const userEmail = user?.email ?? '';

  return {
    pathname,
    navigation,
    isNavActive,
    isChildActive,
    toggleSection,
    isSectionOpen,
    userInitial,
    userName,
    userEmail,
    logout,
  };
}
