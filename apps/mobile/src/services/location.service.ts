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
      canOpenSettings?: boolean;
    };

interface ExpoLocationModuleLike {
  requestForegroundPermissionsAsync: () => Promise<{
    status: string;
    canAskAgain?: boolean;
  }>;
  hasServicesEnabledAsync?: () => Promise<boolean>;
  getLastKnownPositionAsync?: () => Promise<{
    coords: { latitude: number; longitude: number };
  } | null>;
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
            'Permissão de localização negada. Ative nas configurações do app ou busque sua cidade manualmente.',
          canOpenSettings: perm.canAskAgain === false,
        };
      }

      if (typeof expoLocation.hasServicesEnabledAsync === 'function') {
        const servicesEnabled = await expoLocation.hasServicesEnabledAsync();
        if (!servicesEnabled) {
          return {
            status: 'unavailable',
            message:
              'A localização (GPS) do aparelho está desativada. Ative nas configurações ou escolha sua cidade manualmente.',
            canOpenSettings: true,
          };
        }
      }

      let position: { coords: { latitude: number; longitude: number } } | null =
        null;
      try {
        position = await expoLocation.getCurrentPositionAsync({
          accuracy: expoLocation.Accuracy?.Low,
        });
      } catch {
        if (typeof expoLocation.getLastKnownPositionAsync === 'function') {
          position = await expoLocation.getLastKnownPositionAsync();
        }
      }

      if (!position) {
        return {
          status: 'unavailable',
          message:
            'Não foi possível obter sua posição agora. Verifique se o GPS está ativo ou busque sua cidade.',
          canOpenSettings: true,
        };
      }

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
