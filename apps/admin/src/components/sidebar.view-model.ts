import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import {
  ActivityIcon,
  AlertTriangleIcon,
  BellIcon,
  BrainIcon,
  BuildingIcon,
  CalendarIcon,
  LayoutDashboardIcon,
  ListIcon,
  PawPrintIcon,
  ScrollTextIcon,
  SettingsIcon,
  ShieldIcon,
  TrophyIcon,
  UsersIcon,
  UserXIcon,
} from '@/components/icons';
import { canAccessRoute } from '@/lib/auth';
import { useAuthContext } from '@/lib/auth-store';

function getNavigation(t: ReturnType<typeof useTranslations<'nav'>>) {
  return [
    { name: t('dashboard'), href: '/', icon: LayoutDashboardIcon },
    { name: t('users'), href: '/users', icon: UsersIcon },
    {
      name: t('moderation'),
      href: '/moderation',
      icon: ShieldIcon,
      children: [
        { name: t('moderationFeed'), href: '/moderation/feed' },
        { name: t('moderationStories'), href: '/moderation/stories' },
        { name: t('moderationPhotos'), href: '/moderation/photos' },
        { name: t('moderationContent'), href: '/moderation/content' },
        { name: t('moderationReports'), href: '/moderation/reports' },
      ],
    },
    { name: t('dogs'), href: '/dogs', icon: PawPrintIcon },
    { name: t('breeds'), href: '/breeds', icon: ListIcon },
    { name: t('events'), href: '/group-events', icon: CalendarIcon },
    { name: t('challenges'), href: '/challenges', icon: TrophyIcon },
    { name: t('fitness'), href: '/fitness', icon: ActivityIcon },
    { name: t('organizations'), href: '/organizations', icon: BuildingIcon },
    {
      name: t('safety'),
      href: '/safety',
      icon: AlertTriangleIcon,
      children: [
        { name: t('safetySos'), href: '/safety/sos' },
        { name: t('safetyContacts'), href: '/safety/contacts' },
      ],
    },
    {
      name: t('aiMatching'),
      href: '/ai-matching',
      icon: BrainIcon,
      children: [
        { name: t('aiMatchingAbTests'), href: '/ai-matching/ab-tests' },
        { name: t('aiMatchingPerformance'), href: '/ai-matching/performance' },
        { name: t('aiMatchingFlags'), href: '/ai-matching/flags' },
      ],
    },
    { name: t('notifications'), href: '/notifications', icon: BellIcon },
    { name: t('accountDeletions'), href: '/account-deletions', icon: UserXIcon },
    {
      name: t('settings'),
      href: '/settings',
      icon: SettingsIcon,
      children: [
        { name: t('settingsGeneral'), href: '/settings' },
        { name: t('settingsAdmins'), href: '/settings/admins' },
      ],
    },
    { name: t('auditLog'), href: '/audit-log', icon: ScrollTextIcon },
  ];
}

export function useSidebarViewModel() {
  const pathname = usePathname();
  const { user, logout } = useAuthContext();
  const t = useTranslations('nav');
  const allNavigation = getNavigation(t);
  const navigation = allNavigation.filter((item) =>
    canAccessRoute(user?.role ?? 'viewer', item.href),
  );
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
