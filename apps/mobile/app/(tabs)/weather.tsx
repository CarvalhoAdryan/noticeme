import { Ionicons } from '@expo/vector-icons';
import type {
  DailyQuoteResponse,
  GeocodingResult,
  WeatherForecastResponse,
  WeatherLocation,
} from '@dailybrief/shared';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DailyQuoteCard } from '../../src/components/DailyQuoteCard';
import { StateView } from '../../src/components/StateView';
import { useAppTheme } from '../../src/hooks/useAppTheme';
import {
  getCachedDailyQuote,
  syncDailyQuote,
} from '../../src/services/dailyQuote.service';
import { requestDeviceLocation } from '../../src/services/location.service';
import {
  getCachedForecastForLocation,
  getSavedWeatherLocation,
  hydrateWeatherLocation,
  saveWeatherLocation,
  searchCities,
  syncWeatherForecast,
} from '../../src/services/weather.service';
import { openArticleInBrowser } from '../../src/utils';

const WEATHER_API_URL = 'https://www.weatherapi.com/';

function formatHourLabel(isoTime: string): string {
  const timePart = isoTime.split('T')[1];
  return timePart ? timePart.slice(0, 5) : isoTime;
}

function formatDayLabel(isoDate: string, index: number): string {
  if (index === 0) return 'Hoje';
  if (index === 1) return 'Amanhã';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  const dateObj = new Date(
    Number(parts[0]),
    Number(parts[1]) - 1,
    Number(parts[2]),
  );
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  }).format(dateObj);
}

function formatUpdatedAt(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  }).format(date);
}

function formatLocationName(loc: WeatherLocation): string {
  const extras = [loc.admin1, loc.country].filter(Boolean);
  return extras.length > 0 ? `${loc.name}, ${extras.join(' - ')}` : loc.name;
}

export default function WeatherScreen() {
  const { colors } = useAppTheme();

  const [location, setLocation] = useState<WeatherLocation | null>(() =>
    getSavedWeatherLocation(),
  );
  const [forecast, setForecast] = useState<WeatherForecastResponse | null>(() =>
    getCachedForecastForLocation(getSavedWeatherLocation()),
  );
  const [dailyQuote, setDailyQuote] = useState<DailyQuoteResponse | null>(() =>
    getCachedDailyQuote(),
  );

  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [showCitySearch, setShowCitySearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const loadWeather = useCallback(
    async (targetLocation: WeatherLocation, forceRefresh = false) => {
      const cached = getCachedForecastForLocation(targetLocation);
      if (cached) {
        setForecast(cached);
      } else {
        setIsLoading(true);
      }

      setStatusMessage(null);
      const result = await syncWeatherForecast(targetLocation, forceRefresh);
      if (result.forecast) {
        setForecast(result.forecast);
      } else if (!cached) {
        setStatusMessage(
          'Não foi possível carregar os dados meteorológicos. Verifique sua conexão.',
        );
      }
      setIsOffline(result.offline || Boolean(result.forecast?.isStale));
      setIsLoading(false);
      setIsRefreshing(false);
    },
    [],
  );

  useEffect(() => {
    let active = true;
    void syncDailyQuote().then((quote) => {
      if (active && quote) {
        setDailyQuote(quote);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (location) {
      void loadWeather(location, false);
      return;
    }

    let active = true;
    void hydrateWeatherLocation().then((restored) => {
      if (active && restored) {
        setLocation(restored);
      }
    });
    return () => {
      active = false;
    };
  }, [location, loadWeather]);

  const handleUseDeviceLocation = async () => {
    setIsLocating(true);
    setStatusMessage(null);
    const result = await requestDeviceLocation();
    setIsLocating(false);

    if (result.status !== 'granted') {
      setStatusMessage(result.message);
      setShowCitySearch(true);
      if (result.canOpenSettings) {
        Alert.alert('Localização necessária', result.message, [
          { text: 'Buscar cidade', style: 'cancel' },
          {
            text: 'Abrir configurações',
            onPress: () => void Linking.openSettings(),
          },
        ]);
      }
      return;
    }

    const nextLocation: WeatherLocation = {
      name: result.cityName || 'Minha região',
      admin1: result.regionName,
      country: null,
      latitude: result.latitude,
      longitude: result.longitude,
      isAutomatic: true,
    };

    saveWeatherLocation(nextLocation);
    setLocation(nextLocation);
    setShowCitySearch(false);
  };

  const handleSearchCities = async () => {
    if (searchQuery.trim().length < 2) {
      setStatusMessage('Digite pelo menos 2 letras para buscar uma cidade.');
      return;
    }

    setIsSearching(true);
    setStatusMessage(null);
    try {
      const results = await searchCities(searchQuery);
      setSearchResults(results);
      if (results.length === 0) {
        setStatusMessage('Nenhuma cidade encontrada com esse nome.');
      }
    } catch {
      setStatusMessage(
        'Não foi possível buscar cidades agora. Verifique sua conexão.',
      );
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectCity = (city: GeocodingResult) => {
    const nextLocation: WeatherLocation = {
      name: city.name,
      admin1: city.admin1,
      country: city.country,
      latitude: city.latitude,
      longitude: city.longitude,
      timezone: city.timezone,
      isAutomatic: false,
    };
    saveWeatherLocation(nextLocation);
    setLocation(nextLocation);
    setShowCitySearch(false);
    setSearchResults([]);
    setSearchQuery('');
    setStatusMessage(null);
  };

  const handleRefresh = () => {
    if (!location) return;
    setIsRefreshing(true);
    void loadWeather(location, true);
  };

  const todaySummary = forecast?.daily[0];

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.text }]}>Clima</Text>

        {location ? (
          <Pressable
            onPress={() => setShowCitySearch((prev) => !prev)}
            accessibilityRole="button"
            accessibilityLabel="Alterar localização"
            style={[
              styles.changeLocationButton,
              {
                backgroundColor: colors.surfaceMuted,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons name="location-outline" size={16} color={colors.primary} />
            <Text style={[styles.changeLocationText, { color: colors.text }]}>
              Alterar região
            </Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          location ? (
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          ) : undefined
        }
      >
        {/* Pensamento do Dia no topo da aba Clima */}
        {dailyQuote ? (
          <View
            style={[
              styles.quoteWrapper,
              {
                borderColor: colors.border,
              },
            ]}
          >
            <DailyQuoteCard quote={dailyQuote} />
          </View>
        ) : (
          <View
            style={[
              styles.quotePlaceholder,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.quotePlaceholderEyebrow, { color: colors.primary }]}>
              Pensamento do Dia
            </Text>
            <Text
              style={[
                styles.quotePlaceholderText,
                { color: colors.textSecondary },
              ]}
            >
              Aguardando sincronização da citação diária no servidor.
            </Text>
          </View>
        )}

        {/* Painel de busca/permissão de localização */}
        {!location || showCitySearch ? (
          <View
            style={[
              styles.locationCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {location ? 'Alterar região' : 'Escolha sua localização'}
            </Text>
            <Text
              style={[styles.locationExplainer, { color: colors.textSecondary }]}
            >
              Usamos sua localização apenas para exibir a previsão da sua região,
              sem armazenar coordenadas precisas.
            </Text>

            <Pressable
              onPress={() => void handleUseDeviceLocation()}
              disabled={isLocating}
              accessibilityRole="button"
              style={[
                styles.gpsButton,
                { backgroundColor: colors.primary },
              ]}
            >
              {isLocating ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="navigate-outline" size={18} color="#FFFFFF" />
              )}
              <Text style={styles.gpsButtonText}>
                {isLocating ? 'Obtendo região...' : 'Usar minha localização'}
              </Text>
            </Pressable>

            <View style={styles.searchRow}>
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Buscar cidade e estado (ex.: São Luís)"
                placeholderTextColor={colors.textSecondary}
                returnKeyType="search"
                onSubmitEditing={() => void handleSearchCities()}
                style={[
                  styles.searchInput,
                  {
                    backgroundColor: colors.surfaceMuted,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
              />
              <Pressable
                onPress={() => void handleSearchCities()}
                disabled={isSearching}
                accessibilityRole="button"
                accessibilityLabel="Buscar cidade"
                style={[
                  styles.searchSubmitButton,
                  {
                    backgroundColor: colors.surfaceMuted,
                    borderColor: colors.border,
                  },
                ]}
              >
                {isSearching ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Ionicons name="search" size={18} color={colors.primary} />
                )}
              </Pressable>
            </View>

            {searchResults.map((city) => {
              const subtitle = [city.admin1, city.country]
                .filter(Boolean)
                .join(' · ');
              return (
                <Pressable
                  key={city.id}
                  onPress={() => handleSelectCity(city)}
                  style={[
                    styles.cityResultRow,
                    { borderTopColor: colors.border },
                  ]}
                >
                  <Ionicons
                    name="location-sharp"
                    size={16}
                    color={colors.primary}
                  />
                  <View style={styles.cityResultTextWrap}>
                    <Text style={[styles.cityName, { color: colors.text }]}>
                      {city.name}
                    </Text>
                    {subtitle ? (
                      <Text
                        style={[
                          styles.citySubtitle,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {subtitle}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {statusMessage ? (
          <View
            style={[
              styles.noticeBanner,
              {
                backgroundColor: colors.surfaceMuted,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons
              name="information-circle-outline"
              size={18}
              color={colors.primary}
            />
            <Text style={[styles.noticeText, { color: colors.text }]}>
              {statusMessage}
            </Text>
          </View>
        ) : null}

        {isOffline && forecast ? (
          <View
            style={[
              styles.noticeBanner,
              {
                backgroundColor: colors.surfaceMuted,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons
              name="cloud-offline-outline"
              size={18}
              color={colors.textSecondary}
            />
            <Text style={[styles.noticeText, { color: colors.textSecondary }]}>
              Exibindo última previsão salva em cache.
            </Text>
          </View>
        ) : null}

        {!location && !forecast ? (
          <StateView
            mode="empty"
            title="Nenhuma região configurada"
            description="Busque sua cidade acima ou autorize a localização para ver o clima."
          />
        ) : isLoading && !forecast ? (
          <StateView
            mode="loading"
            title="Carregando previsão"
            description="Consultando condições meteorológicas da sua região."
          />
        ) : forecast && location ? (
          <View style={styles.weatherContent}>
            {/* 1. Localização atual ou cidade selecionada */}
            <View
              style={[
                styles.heroCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.locationRow}>
                <Ionicons
                  name={location.isAutomatic ? 'navigate' : 'location'}
                  size={16}
                  color={colors.primary}
                />
                <Text
                  style={[styles.selectedLocation, { color: colors.text }]}
                  numberOfLines={2}
                >
                  {formatLocationName(location)}
                </Text>
              </View>

              {/* 2. Temperatura atual e 3. Condição climática */}
              <View style={styles.currentTempRow}>
                <Text style={[styles.currentTemp, { color: colors.text }]}>
                  {forecast.current.temperature}°C
                </Text>
                <View style={styles.conditionWrap}>
                  <Ionicons
                    name={
                      forecast.current.icon as keyof typeof Ionicons.glyphMap
                    }
                    size={40}
                    color={colors.primary}
                  />
                  <Text
                    style={[
                      styles.conditionText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {forecast.current.description}
                  </Text>
                </View>
              </View>

              {/* 4. Máxima e mínima do dia */}
              {todaySummary ? (
                <Text
                  style={[styles.minMaxText, { color: colors.textSecondary }]}
                >
                  Máx. {todaySummary.tempMax}°C · Mín. {todaySummary.tempMin}°C
                </Text>
              ) : null}

              {/* 5. Sensação térmica, 6. Umidade, 7. Vento, 8. Probabilidade de chuva */}
              <View
                style={[styles.metricsGrid, { borderTopColor: colors.border }]}
              >
                <View style={styles.metricCell}>
                  <Text
                    style={[
                      styles.metricLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Sensação
                  </Text>
                  <Text style={[styles.metricValue, { color: colors.text }]}>
                    {forecast.current.apparentTemperature}°C
                  </Text>
                </View>

                <View style={styles.metricCell}>
                  <Text
                    style={[
                      styles.metricLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Umidade
                  </Text>
                  <Text style={[styles.metricValue, { color: colors.text }]}>
                    {forecast.current.humidity}%
                  </Text>
                </View>

                <View style={styles.metricCell}>
                  <Text
                    style={[
                      styles.metricLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Vento
                  </Text>
                  <Text style={[styles.metricValue, { color: colors.text }]}>
                    {forecast.current.windSpeed} km/h
                  </Text>
                </View>

                <View style={styles.metricCell}>
                  <Text
                    style={[
                      styles.metricLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Chuva
                  </Text>
                  <Text style={[styles.metricValue, { color: colors.text }]}>
                    {forecast.current.precipitationProbability ?? 0}%
                  </Text>
                </View>
              </View>

              <Text
                style={[styles.updatedAtText, { color: colors.textSecondary }]}
              >
                Atualizado em {formatUpdatedAt(forecast.fetchedAt)}
              </Text>
            </View>

            {/* 9. Previsão das próximas horas */}
            <View
              style={[
                styles.sectionCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Próximas horas
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.hourlyList}
              >
                {forecast.hourly.map((hour) => (
                  <View
                    key={hour.time}
                    style={[
                      styles.hourlyItem,
                      {
                        backgroundColor: colors.surfaceMuted,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.hourlyTime,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {formatHourLabel(hour.time)}
                    </Text>
                    <Text style={[styles.hourlyTemp, { color: colors.text }]}>
                      {hour.temperature}°
                    </Text>
                    <Text
                      style={[styles.hourlyRain, { color: colors.primary }]}
                    >
                      {hour.precipitationProbability}%
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>

            {/* 10. Previsão dos próximos dias */}
            <View
              style={[
                styles.sectionCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Próximos dias
              </Text>
              {forecast.daily.map((day, idx) => (
                <View
                  key={day.date}
                  style={[
                    styles.dailyRow,
                    idx > 0 && { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth },
                  ]}
                >
                  <Text style={[styles.dailyDay, { color: colors.text }]}>
                    {formatDayLabel(day.date, idx)}
                  </Text>
                  <View style={styles.dailyCondition}>
                    <Ionicons
                      name={day.icon as keyof typeof Ionicons.glyphMap}
                      size={18}
                      color={colors.primary}
                    />
                    <Text
                      style={[
                        styles.dailyRain,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {day.precipitationProbabilityMax}%
                    </Text>
                  </View>
                  <Text style={[styles.dailyTemps, { color: colors.text }]}>
                    {day.tempMin}° / {day.tempMax}°
                  </Text>
                </View>
              ))}
            </View>

            {/* Atribuição WeatherAPI.com */}
            <Pressable
              onPress={() => void openArticleInBrowser(WEATHER_API_URL)}
              accessibilityRole="link"
              style={styles.attributionLink}
            >
              <Text
                style={[styles.attributionText, { color: colors.textSecondary }]}
              >
                Powered by WeatherAPI.com
              </Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  changeLocationButton: {
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  changeLocationText: {
    fontSize: 13,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  locationCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  locationExplainer: {
    fontSize: 13,
    lineHeight: 19,
  },
  gpsButton: {
    minHeight: 44,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
  },
  gpsButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  searchSubmitButton: {
    width: 44,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cityResultRow: {
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cityResultTextWrap: {
    flex: 1,
  },
  cityName: {
    fontSize: 14,
    fontWeight: '700',
  },
  citySubtitle: {
    fontSize: 12,
  },
  noticeBanner: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  noticeText: {
    fontSize: 13,
    flex: 1,
  },
  weatherContent: {
    gap: 14,
  },
  heroCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  selectedLocation: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  currentTempRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  currentTemp: {
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: -1.5,
  },
  conditionWrap: {
    alignItems: 'flex-end',
    gap: 4,
    maxWidth: '50%',
  },
  conditionText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
  minMaxText: {
    fontSize: 13,
    fontWeight: '600',
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  metricCell: {
    flex: 1,
    gap: 2,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  updatedAtText: {
    fontSize: 11,
  },
  sectionCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  hourlyList: {
    gap: 8,
  },
  hourlyItem: {
    width: 68,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  hourlyTime: {
    fontSize: 11,
    fontWeight: '600',
  },
  hourlyTemp: {
    fontSize: 16,
    fontWeight: '700',
  },
  hourlyRain: {
    fontSize: 11,
    fontWeight: '600',
  },
  dailyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  dailyDay: {
    fontSize: 13,
    fontWeight: '600',
    width: 110,
    textTransform: 'capitalize',
  },
  dailyCondition: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dailyRain: {
    fontSize: 12,
    fontWeight: '600',
  },
  dailyTemps: {
    fontSize: 13,
    fontWeight: '700',
    minWidth: 74,
    textAlign: 'right',
  },
  attributionLink: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  attributionText: {
    fontSize: 11,
    textDecorationLine: 'underline',
  },
  quoteWrapper: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  quotePlaceholder: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
  },
  quotePlaceholderEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  quotePlaceholderText: {
    fontSize: 13,
  },
});

