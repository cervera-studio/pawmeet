import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import {
  ActivityIcon,
  AlertTriangleIcon,
  AwardIcon,
  BellIcon,
  BrainIcon,
  BuildingIcon,
  CalendarIcon,
  LayoutDashboardIcon,
  ListIcon,
  MailIcon,
  MessageCircleIcon,
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

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: { name: string; href: string }[];
}

interface NavSection {
  label?: string;
  items: NavItem[];
  collapsedByDefault?: boolean;
}

function getNavigation(t: ReturnType<typeof useTranslations<'nav'>>): NavSection[] {
  return [
    // Dashboard — ungrouped
    {
      items: [{ name: t('dashboard'), href: '/', icon: LayoutDashboardIcon }],
    },

    // OPERAZIONI
    {
      label: t('sectionOperations'),
      items: [
        {
          name: t('moderation'),
          href: '/moderation',
          icon: ShieldIcon,
          children: [
            { name: t('moderationFeed'), href: '/moderation/feed' },
            { name: t('moderationStories'), href: '/moderation/stories' },
            { name: t('moderationPhotos'), href: '/moderation/photos' },
            { name: t('moderationContent'), href: '/moderation/content' },
            { name: t('moderationChat'), href: '/moderation/chat' },
            { name: t('moderationReports'), href: '/moderation/reports' },
          ],
        },
        { name: t('accountDeletions'), href: '/account-deletions', icon: UserXIcon },
        { name: t('support'), href: '/support', icon: MessageCircleIcon },
        { name: t('waitlist'), href: '/waitlist', icon: MailIcon },
      ],
    },

    // PERSONE
    {
      label: t('sectionPeople'),
      items: [
        { name: t('users'), href: '/users', icon: UsersIcon },
        { name: t('organizations'), href: '/organizations', icon: BuildingIcon },
      ],
    },

    // ANIMALI
    {
      label: t('sectionAnimals'),
      items: [
        { name: t('dogs'), href: '/dogs', icon: PawPrintIcon },
        { name: t('breeds'), href: '/breeds', icon: ListIcon },
      ],
    },

    // COMMUNITY
    {
      label: t('sectionCommunity'),
      collapsedByDefault: true,
      items: [
        { name: t('events'), href: '/group-events', icon: CalendarIcon },
        { name: t('challenges'), href: '/challenges', icon: TrophyIcon },
        { name: t('badges'), href: '/badges', icon: AwardIcon },
        { name: t('fitness'), href: '/fitness', icon: ActivityIcon },
      ],
    },

    // SISTEMA
    {
      label: t('sectionSystem'),
      collapsedByDefault: true,
      items: [
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
      ],
    },

    // Bottom — ungrouped
    {
      items: [
        {
          name: t('settings'),
          href: '/settings',
          icon: SettingsIcon,
          children: [
            { name: t('settingsGeneral'), href: '/settings' },
            { name: t('settingsAdmins'), href: '/settings/admins' },
            { name: t('settingsRoles'), href: '/settings/roles' },
            { name: t('settingsRateLimits'), href: '/settings/rate-limits' },
            { name: t('settingsMfa'), href: '/settings/mfa' },
          ],
        },
        { name: t('auditLog'), href: '/audit-log', icon: ScrollTextIcon },
      ],
    },
  ];
}

export type { NavItem, NavSection };

export function useSidebarViewModel() {
  const pathname = usePathname();
  const { user, logout } = useAuthContext();
  const t = useTranslations('nav');
  const allSections = getNavigation(t);

  // Filter items by role
  const sections = allSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => canAccessRoute(user?.role ?? 'viewer', item.href)),
    }))
    .filter((section) => section.items.length > 0);

  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    for (const section of allSections) {
      if (section.label && section.collapsedByDefault) {
        initial.add(section.label);
      }
    }
    return initial;
  });

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

  const toggleGroup = useCallback((label: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  }, []);

  const isSectionOpen = useCallback((href: string) => openSections.has(href), [openSections]);
  const isGroupCollapsed = useCallback(
    (label: string) => collapsedGroups.has(label),
    [collapsedGroups],
  );

  const userInitial = user?.name?.charAt(0)?.toUpperCase() ?? 'A';
  const userName = user?.name ?? 'Admin';
  const userEmail = user?.email ?? '';

  return {
    pathname,
    sections,
    isNavActive,
    isChildActive,
    toggleSection,
    isSectionOpen,
    toggleGroup,
    isGroupCollapsed,
    userInitial,
    userName,
    userEmail,
    logout,
  };
}
