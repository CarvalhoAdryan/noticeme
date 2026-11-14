import type {
  GeocodingResult,
  WeatherForecastResponse,
  WeatherLocation,
} from '@dailybrief/shared';
import { apiRequest } from './api';
import {
  getRegionKey,
  hydrateCachedWeatherLocation,
  readCachedWeatherForecast,
  readCachedWeatherLocation,
  writeCachedWeatherForecast,
  writeCachedWeatherLocation,
} from './weatherCache';

const CLIENT_CACHE_TTL_MS = 30 * 60 * 1000;
const inFlightWeatherRequests = new Map<
  string,
  Promise<{ forecast: WeatherForecastResponse | null; offline: boolean }>
>();

export function getSavedWeatherLocation(): WeatherLocation | null {
  return readCachedWeatherLocation();
}

export async function hydrateWeatherLocation(): Promise<WeatherLocation | null> {
  return hydrateCachedWeatherLocation();
}

export function saveWeatherLocation(location: WeatherLocation): void {
  writeCachedWeatherLocation(location);
}

export function getCachedForecastForLocation(
  location: WeatherLocation | null,
): WeatherForecastResponse | null {
  return readCachedWeatherForecast(location);
}

export function isForecastFresh(
  forecast: WeatherForecastResponse | null,
  nowMs: number = Date.now(),
): boolean {
  if (!forecast) return false;
  const fetchedMs = Date.parse(forecast.fetchedAt);
  if (Number.isNaN(fetchedMs)) return false;
  return nowMs - fetchedMs < CLIENT_CACHE_TTL_MS;
}

export async function searchCities(name: string): Promise<GeocodingResult[]> {
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return [];
  }
  const params = new URLSearchParams({ name: trimmed });
  return apiRequest<GeocodingResult[]>(`/weather/geocoding?${params.toString()}`);
}

export async function syncWeatherForecast(
  location: WeatherLocation,
  forceRefresh = false,
): Promise<{ forecast: WeatherForecastResponse | null; offline: boolean }> {
  const cached = readCachedWeatherForecast(location);

  if (!forceRefresh && isForecastFresh(cached)) {
    return { forecast: cached, offline: false };
  }

  const regionKey = getRegionKey(location.latitude, location.longitude);
  const existing = inFlightWeatherRequests.get(regionKey);
  if (existing) {
    return existing;
  }

  const promise = (async () => {
    try {
      const params = new URLSearchParams({
        latitude: String(location.latitude),
        longitude: String(location.longitude),
      });
      const fresh = await apiRequest<WeatherForecastResponse>(
        `/weather?${params.toString()}`,
      );
      writeCachedWeatherForecast(fresh);
      return { forecast: fresh, offline: false };
    } catch {
      return { forecast: cached, offline: true };
    } finally {
      inFlightWeatherRequests.delete(regionKey);
    }
  })();

  inFlightWeatherRequests.set(regionKey, promise);
  return promise;
}
