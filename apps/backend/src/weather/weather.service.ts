import type {
  GeocodingResult,
  WeatherDailyItem,
  WeatherForecastResponse,
  WeatherHourlyItem,
} from '@dailybrief/shared';
import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { mapWmoCode } from './wmo-weather.utils';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

interface OpenMeteoForecastPayload {
  latitude?: number;
  longitude?: number;
  timezone?: string;
  current?: {
    time?: string;
    temperature_2m?: number;
    apparent_temperature?: number;
    relative_humidity_2m?: number;
    wind_speed_10m?: number;
    weather_code?: number;
    is_day?: number;
  };
  hourly?: {
    time?: string[];
    temperature_2m?: number[];
    precipitation_probability?: Array<number | null>;
  };
  daily?: {
    time?: string[];
    weather_code?: number[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_probability_max?: Array<number | null>;
    sunrise?: string[];
    sunset?: string[];
  };
}

interface OpenMeteoGeocodingPayload {
  results?: Array<{
    id?: number;
    name?: string;
    admin1?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
    timezone?: string;
  }>;
}

const OPEN_METEO_FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const OPEN_METEO_GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const CACHE_TTL_MS = 30 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 10_000;

export function buildRegionCacheKey(latitude: number, longitude: number): string {
  // Arredonda para ~1,1 km para compartilhar cache entre usuários da mesma região sem guardar precisão exata
  const roundedLat = (Math.round(latitude * 100) / 100).toFixed(2);
  const roundedLon = (Math.round(longitude * 100) / 100).toFixed(2);
  return `${roundedLat},${roundedLon}`;
}

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);
  private readonly forecastCache = new Map<
    string,
    CacheEntry<WeatherForecastResponse>
  >();
  private readonly geocodingCache = new Map<
    string,
    CacheEntry<GeocodingResult[]>
  >();
  private readonly inFlightForecasts = new Map<
    string,
    Promise<WeatherForecastResponse>
  >();

  async getForecast(
    latitude: number,
    longitude: number,
  ): Promise<WeatherForecastResponse> {
    const regionKey = buildRegionCacheKey(latitude, longitude);
    const now = Date.now();
    const cached = this.forecastCache.get(regionKey);

    if (cached && cached.expiresAt > now) {
      return {
        ...cached.data,
        fromCache: true,
        isStale: false,
      };
    }

    const existingInFlight = this.inFlightForecasts.get(regionKey);
    if (existingInFlight) {
      return existingInFlight;
    }

    const requestPromise = this.fetchAndNormalizeForecast(
      latitude,
      longitude,
      regionKey,
      cached?.data,
    ).finally(() => {
      this.inFlightForecasts.delete(regionKey);
    });

    this.inFlightForecasts.set(regionKey, requestPromise);
    return requestPromise;
  }

  async searchLocations(name: string): Promise<GeocodingResult[]> {
    const normalizedQuery = name.trim().toLowerCase();
    const now = Date.now();
    const cached = this.geocodingCache.get(normalizedQuery);
    if (cached && cached.expiresAt > now) {
      return cached.data;
    }

    const url = new URL(OPEN_METEO_GEOCODING_URL);
    url.searchParams.set('name', name.trim());
    url.searchParams.set('count', '8');
    url.searchParams.set('language', 'pt');
    url.searchParams.set('format', 'json');

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'NoticeME-Weather/1.0',
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Erro ao consultar geocodificação Open-Meteo: ${msg}`);
      if (cached) {
        return cached.data;
      }
      throw new ServiceUnavailableException(
        'Serviço de busca de cidades temporariamente indisponível.',
      );
    }

    if (!response.ok) {
      if (cached) {
        return cached.data;
      }
      throw new ServiceUnavailableException(
        `Open-Meteo Geocoding retornou HTTP ${response.status}.`,
      );
    }

    const payload = (await response.json()) as OpenMeteoGeocodingPayload;
    const results: GeocodingResult[] = (payload.results ?? [])
      .filter(
        (item) =>
          typeof item.id === 'number' &&
          typeof item.name === 'string' &&
          typeof item.latitude === 'number' &&
          typeof item.longitude === 'number',
      )
      .map((item) => ({
        id: item.id as number,
        name: item.name as string,
        admin1: item.admin1 ?? null,
        country: item.country ?? null,
        latitude: Math.round((item.latitude as number) * 100) / 100,
        longitude: Math.round((item.longitude as number) * 100) / 100,
        timezone: item.timezone ?? null,
      }));

    this.geocodingCache.set(normalizedQuery, {
      data: results,
      expiresAt: now + CACHE_TTL_MS,
    });

    return results;
  }

  private async fetchAndNormalizeForecast(
    latitude: number,
    longitude: number,
    regionKey: string,
    staleFallback?: WeatherForecastResponse,
  ): Promise<WeatherForecastResponse> {
    const roundedLat = Math.round(latitude * 100) / 100;
    const roundedLon = Math.round(longitude * 100) / 100;

    const url = new URL(OPEN_METEO_FORECAST_URL);
    url.searchParams.set('latitude', String(roundedLat));
    url.searchParams.set('longitude', String(roundedLon));
    url.searchParams.set(
      'current',
      'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,is_day',
    );
    url.searchParams.set('hourly', 'temperature_2m,precipitation_probability');
    url.searchParams.set(
      'daily',
      'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset',
    );
    url.searchParams.set('timezone', 'auto');
    url.searchParams.set('forecast_days', '7');

    try {
      const response = await fetch(url.toString(), {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'NoticeME-Weather/1.0',
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (!response.ok) {
        throw new Error(`Open-Meteo retornou HTTP ${response.status}`);
      }

      const raw = (await response.json()) as OpenMeteoForecastPayload;
      if (!raw.current || typeof raw.current.temperature_2m !== 'number') {
        throw new Error('Resposta meteorológica incompleta da Open-Meteo.');
      }

      const isDay = raw.current.is_day !== 0;
      const currentCode = raw.current.weather_code ?? 0;
      const currentWmo = mapWmoCode(currentCode, isDay);

      const hourlyTimes = raw.hourly?.time ?? [];
      const hourlyTemps = raw.hourly?.temperature_2m ?? [];
      const hourlyPrecip = raw.hourly?.precipitation_probability ?? [];
      const currentTime = raw.current.time ?? '';

      const startHourIdx = Math.max(
        0,
        hourlyTimes.findIndex((t) => t >= currentTime),
      );
      const hourly: WeatherHourlyItem[] = hourlyTimes
        .slice(startHourIdx, startHourIdx + 12)
        .map((time, idx) => {
          const actualIdx = startHourIdx + idx;
          return {
            time,
            temperature: Math.round(hourlyTemps[actualIdx] ?? 0),
            precipitationProbability: Math.round(hourlyPrecip[actualIdx] ?? 0),
          };
        });

      const dailyDates = raw.daily?.time ?? [];
      const dailyCodes = raw.daily?.weather_code ?? [];
      const dailyMax = raw.daily?.temperature_2m_max ?? [];
      const dailyMin = raw.daily?.temperature_2m_min ?? [];
      const dailyPrecipMax = raw.daily?.precipitation_probability_max ?? [];
      const dailySunrise = raw.daily?.sunrise ?? [];
      const dailySunset = raw.daily?.sunset ?? [];

      const daily: WeatherDailyItem[] = dailyDates.map((date, idx) => {
        const code = dailyCodes[idx] ?? 0;
        const wmo = mapWmoCode(code, true);
        return {
          date,
          weatherCode: code,
          description: wmo.description,
          icon: wmo.icon,
          tempMax: Math.round(dailyMax[idx] ?? 0),
          tempMin: Math.round(dailyMin[idx] ?? 0),
          precipitationProbabilityMax: Math.round(dailyPrecipMax[idx] ?? 0),
          sunrise: dailySunrise[idx] ?? null,
          sunset: dailySunset[idx] ?? null,
        };
      });

      const normalized: WeatherForecastResponse = {
        location: {
          latitude: roundedLat,
          longitude: roundedLon,
          timezone: raw.timezone ?? 'America/Sao_Paulo',
        },
        current: {
          temperature: Math.round(raw.current.temperature_2m),
          apparentTemperature: Math.round(
            raw.current.apparent_temperature ?? raw.current.temperature_2m,
          ),
          humidity: Math.round(raw.current.relative_humidity_2m ?? 0),
          windSpeed: Math.round(raw.current.wind_speed_10m ?? 0),
          precipitationProbability:
            hourly[0]?.precipitationProbability ??
            daily[0]?.precipitationProbabilityMax ??
            null,
          weatherCode: currentCode,
          description: currentWmo.description,
          icon: currentWmo.icon,
          isDay,
        },
        hourly,
        daily,
        fetchedAt: new Date().toISOString(),
        fromCache: false,
        isStale: false,
      };

      this.forecastCache.set(regionKey, {
        data: normalized,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });

      return normalized;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Falha ao consultar previsão Open-Meteo (${regionKey}): ${msg}`,
      );

      if (staleFallback) {
        return {
          ...staleFallback,
          fromCache: true,
          isStale: true,
        };
      }

      throw new ServiceUnavailableException(
        'Não foi possível obter os dados meteorológicos no momento.',
      );
    }
  }
}
