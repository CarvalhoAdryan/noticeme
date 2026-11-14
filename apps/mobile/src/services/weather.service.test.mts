import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getCachedForecastForLocation,
  getSavedWeatherLocation,
  saveWeatherLocation,
  syncWeatherForecast,
} from './weather.service.ts';
import { writeCachedWeatherForecast } from './weatherCache.ts';

void describe('Weather Mobile Cache & Offline', () => {
  void it('salva cidade preferida, permite alterá-la e mantém previsão offline em cache', async () => {
    const saoLuis = {
      name: 'São Luís',
      admin1: 'Maranhão',
      country: 'Brasil',
      latitude: -2.53,
      longitude: -44.3,
    };

    saveWeatherLocation(saoLuis);
    assert.equal(getSavedWeatherLocation()?.name, 'São Luís');

    const cachedForecast = {
      location: {
        latitude: -2.53,
        longitude: -44.3,
        timezone: 'America/Fortaleza',
      },
      current: {
        temperature: 29,
        apparentTemperature: 33,
        humidity: 74,
        windSpeed: 16,
        precipitationProbability: 20,
        weatherCode: 2,
        description: 'Parcialmente nublado',
        icon: 'partly-sunny-outline',
        isDay: true,
      },
      hourly: [],
      daily: [],
      fetchedAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
      fromCache: false,
    };

    writeCachedWeatherForecast(cachedForecast);
    assert.equal(getCachedForecastForLocation(saoLuis)?.current.temperature, 29);

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      throw new Error('Offline');
    }) as typeof fetch;

    try {
      const offlineResult = await syncWeatherForecast(saoLuis, true);
      assert.equal(offlineResult.offline, true);
      assert.equal(offlineResult.forecast?.current.temperature, 29);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
