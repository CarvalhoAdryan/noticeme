export interface WmoWeatherInfo {
  description: string;
  icon: string;
}

export function mapWmoCode(code: number, isDay = true): WmoWeatherInfo {
  switch (code) {
    case 0:
      return {
        description: isDay ? 'Céu limpo' : 'Noite limpa',
        icon: isDay ? 'sunny-outline' : 'moon-outline',
      };
    case 1:
      return {
        description: 'Predominantemente limpo',
        icon: isDay ? 'partly-sunny-outline' : 'cloudy-night-outline',
      };
    case 2:
      return {
        description: 'Parcialmente nublado',
        icon: isDay ? 'partly-sunny-outline' : 'cloudy-night-outline',
      };
    case 3:
      return {
        description: 'Nublado',
        icon: 'cloudy-outline',
      };
    case 45:
    case 48:
      return {
        description: 'Nevoeiro',
        icon: 'cloud-outline',
      };
    case 51:
    case 53:
    case 55:
      return {
        description: 'Garoa',
        icon: 'rainy-outline',
      };
    case 56:
    case 57:
      return {
        description: 'Garoa congelante',
        icon: 'rainy-outline',
      };
    case 61:
      return {
        description: 'Chuva fraca',
        icon: 'rainy-outline',
      };
    case 63:
      return {
        description: 'Chuva moderada',
        icon: 'rainy-outline',
      };
    case 65:
      return {
        description: 'Chuva forte',
        icon: 'rainy-outline',
      };
    case 66:
    case 67:
      return {
        description: 'Chuva congelante',
        icon: 'rainy-outline',
      };
    case 71:
    case 73:
    case 75:
    case 77:
      return {
        description: 'Neve',
        icon: 'snow-outline',
      };
    case 80:
    case 81:
    case 82:
      return {
        description: 'Pancadas de chuva',
        icon: 'rainy-outline',
      };
    case 85:
    case 86:
      return {
        description: 'Pancadas de neve',
        icon: 'snow-outline',
      };
    case 95:
      return {
        description: 'Trovoada',
        icon: 'thunderstorm-outline',
      };
    case 96:
    case 99:
      return {
        description: 'Trovoada com granizo',
        icon: 'thunderstorm-outline',
      };
    default:
      return {
        description: 'Condição variável',
        icon: 'cloud-outline',
      };
  }
}
