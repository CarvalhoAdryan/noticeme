import type {
  GeocodingResult,
  WeatherForecastResponse,
} from '@dailybrief/shared';
import { Controller, Get, Query } from '@nestjs/common';
import {
  GeocodingQueryDto,
  GetWeatherQueryDto,
} from './dto/weather-query.dto';
import { WeatherService } from './weather.service';

@Controller('weather')
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) {}

  @Get()
  async getForecast(
    @Query() query: GetWeatherQueryDto,
  ): Promise<WeatherForecastResponse> {
    return this.weatherService.getForecast(query.latitude, query.longitude);
  }

  @Get('geocoding')
  async searchLocations(
    @Query() query: GeocodingQueryDto,
  ): Promise<GeocodingResult[]> {
    return this.weatherService.searchLocations(query.name);
  }
}
