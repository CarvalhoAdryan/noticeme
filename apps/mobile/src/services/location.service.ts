export type DeviceLocationResult =
  | {
      status: 'granted';
      latitude: number;
      longitude: number;
      cityName: string | null;
      regionName: string | null;
    }
  | {
      status: 'denied' | 'unavailable';
      message: string;
    };

interface ExpoLocationModuleLike {
  requestForegroundPermissionsAsync: () => Promise<{ status: string }>;
  getCurrentPositionAsync: (options?: unknown) => Promise<{
    coords: { latitude: number; longitude: number };
  }>;
  reverseGeocodeAsync?: (coords: {
    latitude: number;
    longitude: number;
  }) => Promise<
    Array<{
      city?: string | null;
      subregion?: string | null;
      region?: string | null;
    }>
  >;
  Accuracy?: {
    Low?: number;
  };
}

function roundToRegion(value: number): number {
  return Math.round(value * 100) / 100;
}

export async function requestDeviceLocation(): Promise<DeviceLocationResult> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const expoLocation = require('expo-location') as ExpoLocationModuleLike;
    if (
      typeof expoLocation?.requestForegroundPermissionsAsync === 'function' &&
      typeof expoLocation?.getCurrentPositionAsync === 'function'
    ) {
      const perm = await expoLocation.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        return {
          status: 'denied',
          message:
            'Permissão de localização negada. Você pode buscar e escolher sua cidade manualmente.',
        };
      }

      const position = await expoLocation.getCurrentPositionAsync({
        accuracy: expoLocation.Accuracy?.Low,
      });

      const latitude = roundToRegion(position.coords.latitude);
      const longitude = roundToRegion(position.coords.longitude);

      let cityName: string | null = null;
      let regionName: string | null = null;
      if (typeof expoLocation.reverseGeocodeAsync === 'function') {
        try {
          const places = await expoLocation.reverseGeocodeAsync({
            latitude,
            longitude,
          });
          cityName = places[0]?.city ?? places[0]?.subregion ?? null;
          regionName = places[0]?.region ?? null;
        } catch {
          // Segue sem nome reverso
        }
      }

      return {
        status: 'granted',
        latitude,
        longitude,
        cityName,
        regionName,
      };
    }
  } catch {
    // Tenta Geolocation API do navegador (Web) ou retorna indisponível
  }

  const nav = (
    globalThis as {
      navigator?: {
        geolocation?: {
          getCurrentPosition: (
            success: (pos: {
              coords: { latitude: number; longitude: number };
            }) => void,
            error: (err: { code?: number }) => void,
            options?: { timeout?: number },
          ) => void;
        };
      };
    }
  ).navigator;

  if (nav?.geolocation) {
    return new Promise<DeviceLocationResult>((resolve) => {
      nav.geolocation?.getCurrentPosition(
        (pos) => {
          resolve({
            status: 'granted',
            latitude: roundToRegion(pos.coords.latitude),
            longitude: roundToRegion(pos.coords.longitude),
            cityName: null,
            regionName: null,
          });
        },
        (err) => {
          resolve({
            status: err.code === 1 ? 'denied' : 'unavailable',
            message:
              err.code === 1
                ? 'Permissão de localização negada. Você pode buscar sua cidade manualmente.'
                : 'Não foi possível obter sua localização atual.',
          });
        },
        { timeout: 8_000 },
      );
    });
  }

  return {
    status: 'unavailable',
    message:
      'Localização automática indisponível neste dispositivo. Selecione sua cidade manualmente.',
  };
}
