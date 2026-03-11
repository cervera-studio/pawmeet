import { usePathname } from 'next/navigation';
import {
  LayoutDashboardIcon,
  PawPrintIcon,
  SettingsIcon,
  ShieldIcon,
  UsersIcon,
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
      { name: 'Foto', href: '/moderation/photos' },
      { name: 'Contenuti', href: '/moderation/content' },
      { name: 'Segnalazioni', href: '/moderation/reports' },
    ],
  },
  { name: 'Cani', href: '/dogs', icon: PawPrintIcon },
  { name: 'Impostazioni', href: '/settings', icon: SettingsIcon },
];

export function useSidebarViewModel() {
  const pathname = usePathname();
  const { user, logout } = useAuthContext();

  function isNavActive(href: string) {
    return href === '/' ? pathname === '/' : pathname.startsWith(href);
  }

  function isChildActive(href: string) {
    return pathname === href;
  }

  const userInitial = user?.name?.charAt(0)?.toUpperCase() ?? 'A';
  const userName = user?.name ?? 'Admin';
  const userEmail = user?.email ?? '';

  return {
    pathname,
    navigation,
    isNavActive,
    isChildActive,
    userInitial,
    userName,
    userEmail,
    logout,
  };
}
