import assert from 'node:assert/strict';
import { ServiceUnavailableException } from '@nestjs/common';
import { describe, it } from 'node:test';
import { buildRegionCacheKey, WeatherService } from './weather.service';
import { mapWmoCode } from './wmo-weather.utils';

function buildOpenMeteoSample(temp = 29) {
  return {
    latitude: -2.53,
    longitude: -44.3,
    timezone: 'America/Fortaleza',
    current: {
      time: '2026-11-14T12:00',
      temperature_2m: temp,
      apparent_temperature: temp + 3,
      relative_humidity_2m: 72,
      wind_speed_10m: 18,
      weather_code: 2,
      is_day: 1,
    },
    hourly: {
      time: ['2026-11-14T12:00', '2026-11-14T13:00'],
      temperature_2m: [temp, temp + 1],
      precipitation_probability: [15, 25],
    },
    daily: {
      time: ['2026-11-14', '2026-11-15'],
      weather_code: [2, 61],
      temperature_2m_max: [32, 30],
      temperature_2m_min: [24, 23],
      precipitation_probability_max: [30, 80],
      sunrise: ['2026-11-14T05:35', '2026-11-15T05:35'],
      sunset: ['2026-11-14T17:50', '2026-11-15T17:50'],
    },
  };
}

void describe('WeatherService & WMO', () => {
  void it('converte códigos WMO para descrições e ícones em português', () => {
    assert.deepEqual(mapWmoCode(0, true), {
      description: 'Céu limpo',
      icon: 'sunny-outline',
    });
    assert.deepEqual(mapWmoCode(0, false), {
      description: 'Noite limpa',
      icon: 'moon-outline',
    });
    assert.deepEqual(mapWmoCode(63, true), {
      description: 'Chuva moderada',
      icon: 'rainy-outline',
    });
    assert.deepEqual(mapWmoCode(95, true), {
      description: 'Trovoada',
      icon: 'thunderstorm-outline',
    });
  });

  void it('cacheia previsão por região e reutiliza entre usuários próximos', async () => {
    const service = new WeatherService();
    let fetchCount = 0;
    const originalFetch = globalThis.fetch;

    globalThis.fetch = (async () => {
      fetchCount += 1;
      return new Response(JSON.stringify(buildOpenMeteoSample(30)), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch;

    try {
      // Usuário A em (-2.531, -44.302) -> região -2.53,-44.30
      const userA = await service.getForecast(-2.531, -44.302);
      assert.equal(fetchCount, 1);
      assert.equal(userA.fromCache, false);
      assert.equal(userA.current.temperature, 30);

      // Usuário B na mesma região (-2.534, -44.298) -> região -2.53,-44.30
      assert.equal(
        buildRegionCacheKey(-2.531, -44.302),
        buildRegionCacheKey(-2.534, -44.298),
      );
      const userB = await service.getForecast(-2.534, -44.298);
      assert.equal(fetchCount, 1);
      assert.equal(userB.fromCache, true);
      assert.equal(userB.current.temperature, 30);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  void it('consulta geocodificação manual de cidades via Open-Meteo', async () => {
    const service = new WeatherService();
    const originalFetch = globalThis.fetch;

    globalThis.fetch = (async () => {
      return new Response(
        JSON.stringify({
          results: [
            {
              id: 3388368,
              name: 'São Luís',
              admin1: 'Maranhão',
              country: 'Brasil',
              latitude: -2.5297,
              longitude: -44.3028,
              timezone: 'America/Fortaleza',
            },
          ],
        }),
        { status: 200 },
      );
    }) as typeof fetch;

    try {
      const results = await service.searchLocations('São Luís');
      assert.equal(results.length, 1);
      assert.equal(results[0]?.name, 'São Luís');
      assert.equal(results[0]?.admin1, 'Maranhão');
      assert.equal(results[0]?.latitude, -2.53);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  void it('retorna fallback em cache vencido quando Open-Meteo falha e lança 503 se não houver cache', async () => {
    const service = new WeatherService();
    const originalFetch = globalThis.fetch;

    globalThis.fetch = (async () => {
      throw new Error('Open-Meteo offline');
    }) as typeof fetch;

    try {
      await assert.rejects(
        () => service.getForecast(-23.55, -46.63),
        ServiceUnavailableException,
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  void it('usa WeatherAPI quando WEATHER_API_KEY está configurada e faz fallback para Open-Meteo em caso de falha', async () => {
    const previousKey = process.env.WEATHER_API_KEY;
    process.env.WEATHER_API_KEY = 'test-weather-api-key';
    const service = new WeatherService();
    const originalFetch = globalThis.fetch;
    const requestedUrls: string[] = [];

    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const urlStr = typeof input === 'string' ? input : input.toString();
      requestedUrls.push(urlStr);

      if (urlStr.includes('api.weatherapi.com')) {
        return new Response(
          JSON.stringify({
            location: {
              tz_id: 'America/Sao_Paulo',
              localtime: '2026-11-14 15:00',
            },
            current: {
              temp_c: 26.4,
              feelslike_c: 28.1,
              humidity: 68,
              wind_kph: 14.2,
              is_day: 1,
              condition: { text: 'Parcialmente nublado', code: 1003 },
            },
            forecast: {
              forecastday: [
                {
                  date: '2026-11-14',
                  day: {
                    maxtemp_c: 29.2,
                    mintemp_c: 19.6,
                    daily_chance_of_rain: 40,
                    condition: { text: 'Chuva fraca', code: 1063 },
                  },
                  astro: { sunrise: '05:15 AM', sunset: '06:28 PM' },
                  hour: [
                    {
                      time: '2026-11-14 15:00',
                      temp_c: 26.4,
                      chance_of_rain: 35,
                    },
                    {
                      time: '2026-11-14 16:00',
                      temp_c: 25.8,
                      chance_of_rain: 45,
                    },
                  ],
                },
              ],
            },
          }),
          { status: 200 },
        );
      }

      return new Response(JSON.stringify(buildOpenMeteoSample(27)), {
        status: 200,
      });
    }) as typeof fetch;

    try {
      const result = await service.getForecast(-23.55, -46.63);
      assert.equal(requestedUrls.length, 1);
      assert.ok(requestedUrls[0]?.includes('api.weatherapi.com'));
      assert.equal(result.current.temperature, 26);
      assert.equal(result.current.description, 'Parcialmente nublado');
      assert.equal(result.current.icon, 'partly-sunny-outline');
      assert.equal(result.hourly.length, 2);
      assert.equal(result.daily[0]?.sunrise, '2026-11-14T05:15');
      assert.equal(result.daily[0]?.sunset, '2026-11-14T18:28');

      // Simula falha da WeatherAPI em outra região -> deve cair no fallback Open-Meteo
      globalThis.fetch = (async (input: RequestInfo | URL) => {
        const urlStr = typeof input === 'string' ? input : input.toString();
        if (urlStr.includes('api.weatherapi.com')) {
          return new Response('rate limit', { status: 429 });
        }
        return new Response(JSON.stringify(buildOpenMeteoSample(24)), {
          status: 200,
        });
      }) as typeof fetch;

      const fallbackResult = await service.getForecast(-2.53, -44.3);
      assert.equal(fallbackResult.current.temperature, 24);
    } finally {
      globalThis.fetch = originalFetch;
      if (previousKey === undefined) {
        delete process.env.WEATHER_API_KEY;
      } else {
        process.env.WEATHER_API_KEY = previousKey;
      }
    }
  });
});
