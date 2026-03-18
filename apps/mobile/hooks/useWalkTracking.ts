import type { RouterOutput } from '@pawmeet/api-client';
import { calculateDistance, logger } from '@pawmeet/utils';
import * as Location from 'expo-location';
import type { MutableRefObject } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { api } from '@/lib/trpc';

type WalkTrack = RouterOutput['fitness']['startTracking']['track'];

interface TrackingState {
  isTracking: boolean;
  track: WalkTrack | null;
  elapsedSeconds: number;
  distanceKm: number;
  currentSpeed: number;
  points: Array<{ latitude: number; longitude: number }>;
}

interface PointBufferEntry {
  latitude: number;
  longitude: number;
  altitude: number | null;
  timestamp: string;
  speedKmh: number | null;
  position: number;
}

const FLUSH_INTERVAL_MS = 10_000;

const INITIAL_TRACKING_STATE: TrackingState = {
  isTracking: false,
  track: null,
  elapsedSeconds: 0,
  distanceKm: 0,
  currentSpeed: 0,
  points: [],
};

/** Flush buffered GPS points to the API. Re-queues points on failure. */
async function flushPointBuffer(
  trackId: string | null,
  pointBuffer: MutableRefObject<PointBufferEntry[]>,
): Promise<void> {
  if (!trackId || pointBuffer.current.length === 0) return;

  const points = [...pointBuffer.current];
  pointBuffer.current = [];

  try {
    await api.fitness.addPoints.mutate({ trackId, points });
  } catch (e) {
    // Re-add points on failure
    pointBuffer.current = [...points, ...pointBuffer.current];
    logger.warn('useWalkTracking', 'Failed to flush points', e);
  }
}

/** Handle an incoming GPS location update: buffer the point and update tracking state. */
function handleLocationUpdate(
  location: Location.LocationObject,
  pointBuffer: MutableRefObject<PointBufferEntry[]>,
  positionCounter: MutableRefObject<number>,
  setState: React.Dispatch<React.SetStateAction<TrackingState>>,
): void {
  const { latitude, longitude, altitude, speed } = location.coords;
  const speedKmh = speed != null && speed >= 0 ? speed * 3.6 : null;

  pointBuffer.current.push({
    latitude,
    longitude,
    altitude: altitude ?? null,
    timestamp: new Date(location.timestamp).toISOString(),
    speedKmh,
    position: positionCounter.current,
  });
  positionCounter.current += 1;

  setState((prev) => {
    const prevPoints = prev.points;
    let addedDistance = 0;
    const last = prevPoints.at(-1);
    if (last) {
      addedDistance = calculateDistance(last.latitude, last.longitude, latitude, longitude);
    }
    return {
      ...prev,
      distanceKm: prev.distanceKm + addedDistance,
      currentSpeed: speedKmh ?? prev.currentSpeed,
      points: [...prevPoints, { latitude, longitude }],
    };
  });
}

/** Clear all active subscriptions and intervals. */
function cleanupResources(
  locationSubRef: MutableRefObject<Location.LocationSubscription | null>,
  timerRef: MutableRefObject<ReturnType<typeof setInterval> | null>,
  flushTimerRef: MutableRefObject<ReturnType<typeof setInterval> | null>,
): void {
  if (locationSubRef.current) {
    locationSubRef.current.remove();
    locationSubRef.current = null;
  }
  if (timerRef.current) {
    clearInterval(timerRef.current);
    timerRef.current = null;
  }
  if (flushTimerRef.current) {
    clearInterval(flushTimerRef.current);
    flushTimerRef.current = null;
  }
}

export function useWalkTracking() {
  const [state, setState] = useState<TrackingState>(INITIAL_TRACKING_STATE);
  const [loading, setLoading] = useState(false);

  const locationSubRef = useRef<Location.LocationSubscription | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pointBuffer = useRef<PointBufferEntry[]>([]);
  const positionCounter = useRef(0);
  const trackIdRef = useRef<string | null>(null);

  const flushPoints = useCallback(() => flushPointBuffer(trackIdRef.current, pointBuffer), []);

  const cleanup = useCallback(() => cleanupResources(locationSubRef, timerRef, flushTimerRef), []);

  const startTracking = useCallback(
    async (walkId?: string | null) => {
      setLoading(true);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return false;

        const result = await api.fitness.startTracking.mutate({
          walkId: walkId ?? undefined,
        });

        trackIdRef.current = result.track.id;
        positionCounter.current = 0;
        pointBuffer.current = [];

        setState({
          isTracking: true,
          track: result.track,
          elapsedSeconds: 0,
          distanceKm: 0,
          currentSpeed: 0,
          points: [],
        });

        // Location watcher
        locationSubRef.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            distanceInterval: 5,
            timeInterval: 3000,
          },
          (location) => handleLocationUpdate(location, pointBuffer, positionCounter, setState),
        );

        // Elapsed time counter
        timerRef.current = setInterval(() => {
          setState((prev) => ({ ...prev, elapsedSeconds: prev.elapsedSeconds + 1 }));
        }, 1000);

        // Periodic point flush
        flushTimerRef.current = setInterval(() => {
          void flushPoints();
        }, FLUSH_INTERVAL_MS);

        return true;
      } catch (e) {
        logger.warn('useWalkTracking', 'Failed to start tracking', e);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [flushPoints],
  );

  const stopTracking = useCallback(async () => {
    if (!trackIdRef.current) return null;
    setLoading(true);

    try {
      cleanup();
      await flushPoints();

      const result = await api.fitness.endTracking.mutate({
        trackId: trackIdRef.current,
      });

      trackIdRef.current = null;
      setState(INITIAL_TRACKING_STATE);

      return result.track;
    } catch (e) {
      logger.warn('useWalkTracking', 'Failed to stop tracking', e);
      return null;
    } finally {
      setLoading(false);
    }
  }, [cleanup, flushPoints]);

  // Cleanup on unmount
  useEffect(() => cleanup, [cleanup]);

  // Flush on background
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background' && trackIdRef.current) {
        void flushPoints();
      }
    });
    return () => sub.remove();
  }, [flushPoints]);

  return {
    ...state,
    loading,
    startTracking,
    stopTracking,
  };
}
