export interface HealthService {
  isAvailable(): Promise<boolean>;
  requestPermissions(): Promise<boolean>;
  getSteps(startDate: Date, endDate: Date): Promise<number>;
  getWalkingDistance(startDate: Date, endDate: Date): Promise<number>; // in km
  getActiveMinutes(startDate: Date, endDate: Date): Promise<number>;
}
