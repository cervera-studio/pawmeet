export interface Feature {
  id: string;
  iconName: string;
  highlighted?: boolean;
  comingSoon?: boolean;
}

/** App features displayed on the landing page */
export const features: readonly Feature[] = [
  { id: 'smartMatch', iconName: 'Sparkles', highlighted: true },
  { id: 'interactiveMap', iconName: 'MapPin' },
  { id: 'secureChat', iconName: 'MessageCircle' },
  { id: 'detailedProfiles', iconName: 'Dog' },
  { id: 'sharedCalendar', iconName: 'CalendarDays' },
  { id: 'routeTracking', iconName: 'Route', comingSoon: true },
];
