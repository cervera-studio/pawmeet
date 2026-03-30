export interface TimeSeriesPoint {
  date: string;
  count: number;
}

export interface DashboardStats {
  totalUsers: number;
  totalDogs: number;
  totalMatches: number;
  activeMatches: number;
  pendingPhotos: number;
  pendingReports: number;
  userRegistrations: TimeSeriesPoint[];
  dailyMatches: TimeSeriesPoint[];
}

export interface AnalyticsKpis {
  dauToday: number;
  registrationsToday: number;
  matchesToday: number;
  dauTimeSeries: TimeSeriesPoint[];
}

export interface StatsRepository {
  getStats(): Promise<DashboardStats>;
  getAnalyticsKpis(): Promise<AnalyticsKpis>;
}
