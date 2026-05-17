import React, { useState, useEffect } from 'react';
import { 
  CloudSun, 
  Droplets, 
  Wind, 
  Thermometer,
  Sun,
  CloudRain,
  AlertTriangle,
  CheckCircle,
  Info,
  MapPin,
  RefreshCw
} from 'lucide-react';
import { getCurrentWeather, getForecast, getFarmingAlerts } from '../services/weatherService';
import { useLanguage } from '../context/LanguageContext';

const Weather = () => {
  const [currentWeather, setCurrentWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [farmingAlerts, setFarmingAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState(true);
  const [error, setError] = useState(null);
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);

  const { t } = useLanguage();

  // Get user's real location on mount
  useEffect(() => {
    setLocationLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('Got user location:', position.coords);
          setLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude
          });
          setLocationLoading(false);
        },
        (err) => {
          console.error('Geolocation error:', err);
          setLocationError('Location access denied. Using default location (Ahmedabad).');
          // Fallback to Ahmedabad
          setLocation({ lat: 23.0225, lon: 72.5714 });
          setLocationLoading(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      setLocationError('Geolocation not supported. Using default location.');
      setLocation({ lat: 23.0225, lon: 72.5714 });
      setLocationLoading(false);
    }
  }, []);

  // Fetch weather data when location is available
  useEffect(() => {
    if (location) {
      fetchWeatherData();
    }
  }, [location]);

  const fetchWeatherData = async () => {
    if (!location) return;
    
    setLoading(true);
    setError(null);
    try {
      const [weather, forecastData] = await Promise.all([
        getCurrentWeather(location.lat, location.lon),
        getForecast(location.lat, location.lon)
      ]);
      
      setCurrentWeather(weather);
      setForecast(forecastData);
      setFarmingAlerts(getFarmingAlerts(weather, forecastData));
    } catch (err) {
      setError('Failed to fetch weather data. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getWeatherIcon = (iconCode) => {
    return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'warning': return <AlertTriangle size={18} />;
      case 'success': return <CheckCircle size={18} />;
      case 'info': return <Info size={18} />;
      default: return <Info size={18} />;
    }
  };

  if (locationLoading || loading) {
    return (
      <div className="weather-page">
        <div className="loading-state">
          <RefreshCw className="spin" size={32} />
          <p>{locationLoading ? t('locating') : t('loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="weather-page">
        <div className="error-state">
          <AlertTriangle size={48} color="var(--color-error)" />
          <p>{error}</p>
          <button className="btn btn-primary" onClick={fetchWeatherData}>
            {t('try_again') || 'Try Again'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="weather-page">
      {/* Header */}
      <div className="weather-header">
        <div>
          <h1>{t('weather_home')}</h1>
          <p className="weather-location">
            <MapPin size={16} />
            {currentWeather?.location}, {currentWeather?.country}
          </p>
        </div>
        <button className="btn btn-outline refresh-btn" onClick={fetchWeatherData}>
          <RefreshCw size={18} />
          {t('refresh')}
        </button>
      </div>

      {/* Current Weather Card */}
      <div className="current-weather-card card">
        <div className="current-weather-main">
          <img 
            src={getWeatherIcon(currentWeather?.icon)} 
            alt={currentWeather?.description}
            className="weather-icon-large"
          />
          <div className="current-temp">
            <span className="temp-value">{currentWeather?.temperature}°</span>
            <span className="temp-unit">C</span>
          </div>
          <div className="current-details">
            <p className="weather-description">{currentWeather?.description}</p>
            <p className="feels-like">Feels like {currentWeather?.feelsLike}°C</p>
          </div>
        </div>
        
        <div className="weather-stats-grid">
          <div className="weather-stat">
            <Droplets size={20} color="var(--color-accent)" />
            <div>
              <span className="stat-value">{currentWeather?.humidity}%</span>
              <span className="stat-label">{t('humidity')}</span>
            </div>
          </div>
          <div className="weather-stat">
            <Wind size={20} color="var(--color-secondary)" />
            <div>
              <span className="stat-value">{currentWeather?.windSpeed} km/h</span>
              <span className="stat-label">{t('wind_speed')}</span>
            </div>
          </div>
          <div className="weather-stat">
            <Sun size={20} color="var(--color-warning)" />
            <div>
              <span className="stat-value">{currentWeather?.visibility} km</span>
              <span className="stat-label">{t('rain_prob')}</span>
            </div>
          </div>
          <div className="weather-stat">
            <Thermometer size={20} color="var(--color-error)" />
            <div>
              <span className="stat-value">{currentWeather?.pressure} hPa</span>
              <span className="stat-label">{t('pressure')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Farming Alerts */}
      {farmingAlerts.length > 0 && (
        <div className="farming-alerts-section">
          <h2 className="section-title">{t('alerts')}</h2>
          <div className="alerts-list">
            {farmingAlerts.map((alert, index) => (
              <div key={index} className={`alert-item alert-${alert.type}`}>
                {getAlertIcon(alert.type)}
                <div className="alert-content">
                  <strong>{alert.title}</strong>
                  <p>{alert.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7-Day Forecast */}
      <div className="forecast-section">
        <h2 className="section-title">{t('forecast_7day')}</h2>
        <div className="forecast-grid">
          {forecast.map((day, index) => (
            <div key={index} className="card forecast-card">
              <p className="forecast-date">{day.date}</p>
              <img 
                src={getWeatherIcon(day.icon)} 
                alt={day.description}
                className="forecast-icon"
              />
              <div className="forecast-temps">
                <span className="temp-high">{day.tempMax}°</span>
                <span className="temp-low">{day.tempMin}°</span>
              </div>
              <p className="forecast-desc">{day.description}</p>
              {day.rain > 0 && (
                <p className="forecast-rain">
                  <CloudRain size={14} /> {day.rain}mm
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Farming Tips based on weather */}
      <div className="farming-tips card">
        <h3 className="card-title">{t('weather_tips')}</h3>
        <ul className="tips-list">
          {currentWeather?.humidity > 70 && (
            <li>🌿 High humidity detected - watch for fungal diseases</li>
          )}
          {currentWeather?.windSpeed < 15 && (
            <li>✅ Good conditions for spraying pesticides</li>
          )}
          {currentWeather?.temperature > 30 && (
            <li>💧 Hot weather - irrigate crops in morning or evening</li>
          )}
          {forecast.some(d => d.rain > 5) && (
            <li>🌧️ Rain expected soon - postpone fertilizer application</li>
          )}
          {currentWeather?.windSpeed > 20 && (
            <li>💨 High winds - avoid spraying, secure tall crops</li>
          )}
          {currentWeather?.humidity < 50 && currentWeather?.temperature < 30 && (
            <li>🌾 Good drying conditions - ideal for harvest activities</li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default Weather;
