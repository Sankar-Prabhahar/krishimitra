import React, { useState, useEffect } from 'react';
import {
  Sprout, TrendingUp, CloudSun, Droplets, Target, RefreshCw,
  AlertTriangle, CheckCircle, Calendar, ThermometerSun, Leaf,
  MapPin, Zap, TrendingDown, Info, Award
} from 'lucide-react';
import { getAICropRecommendation } from '../services/aiService';
import { useLanguage } from '../context/LanguageContext';
import { useFarm } from '../context/FarmContext';

const SOIL_TYPES = ['Loamy', 'Sandy', 'Clay', 'Sandy Loam', 'Clay Loam', 'Black', 'Red', 'Alluvial'];

// Map farm profile soil types to display names
const SOIL_TYPE_MAP = {
  'black': 'Black',
  'red': 'Red',
  'alluvial': 'Alluvial',
  'sandy': 'Sandy',
  'clayey': 'Clay',
  'loamy': 'Loamy'
};

// Map farm profile water availability to display names
const WATER_MAP = {
  'abundant': 'High',
  'moderate': 'Medium',
  'limited': 'Low'
};

const CropRecommendation = () => {
  const { farmProfile, farmSize: profileFarmSize, soilType: profileSoilType, waterAvailability: profileWater } = useFarm();
  
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState(null);
  // Initialize with farm profile values
  const [soilType, setSoilType] = useState(SOIL_TYPE_MAP[profileSoilType] || 'Loamy');
  const [farmArea, setFarmArea] = useState(profileFarmSize || 1);
  const [waterAvailability, setWaterAvailability] = useState(WATER_MAP[profileWater] || 'Medium');
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [season, setSeason] = useState('Rabi');
  const [location, setLocation] = useState('Gujarat, India');
  const [error, setError] = useState(null);
  
  const { t, language } = useLanguage();

  // Update when farm profile changes
  useEffect(() => {
    if (profileSoilType) setSoilType(SOIL_TYPE_MAP[profileSoilType] || 'Loamy');
    if (profileFarmSize) setFarmArea(profileFarmSize);
    if (profileWater) setWaterAvailability(WATER_MAP[profileWater] || 'Medium');
  }, [profileSoilType, profileFarmSize, profileWater]);

  useEffect(() => {
    // Determine current season
    const month = new Date().getMonth() + 1;
    if (month >= 6 && month <= 10) setSeason('Kharif');
    else if (month >= 11 || month <= 3) setSeason('Rabi');
    else setSeason('Zaid');
    
    fetchWeatherData();
  }, []);

  const fetchWeatherData = async () => {
    try {
      // Fetch current weather
      const weatherRes = await fetch(
        'https://api.openweathermap.org/data/2.5/weather?lat=23.0225&lon=72.5714&appid=1c0ff9c24c32fb28e6644ec4110fd944&units=metric'
      );
      const weatherData = await weatherRes.json();
      
      if (weatherData.main) {
        setWeather({
          temp: Math.round(weatherData.main.temp),
          humidity: weatherData.main.humidity,
          condition: weatherData.weather?.[0]?.main || 'Clear',
          icon: weatherData.weather?.[0]?.icon || '01d'
        });
        setLocation(weatherData.name ? `${weatherData.name}, India` : 'Gujarat, India');
      }

      // Fetch 5-day forecast
      const forecastRes = await fetch(
        'https://api.openweathermap.org/data/2.5/forecast?lat=23.0225&lon=72.5714&appid=1c0ff9c24c32fb28e6644ec4110fd944&units=metric'
      );
      const forecastData = await forecastRes.json();
      
      if (forecastData.list) {
        // Get one forecast per day (noon)
        const dailyForecast = [];
        const seen = new Set();
        for (const item of forecastData.list) {
          const date = new Date(item.dt * 1000).toLocaleDateString(language === 'hi-IN' ? 'hi-IN' : 'en-IN', { weekday: 'short', day: 'numeric' });
          if (!seen.has(date) && dailyForecast.length < 5) {
            seen.add(date);
            dailyForecast.push({
              date,
              temp: Math.round(item.main.temp),
              condition: item.weather?.[0]?.main || 'Clear',
              icon: item.weather?.[0]?.icon || '01d',
              rain: item.pop > 0.3
            });
          }
        }
        setForecast(dailyForecast);
      }
    } catch (err) {
      console.error('Weather fetch error:', err);
      // Fallback
      setWeather({ temp: 25, humidity: 60, condition: 'Clear', icon: '01d' });
    }
  };

  const analyzeAndRecommend = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await getAICropRecommendation({
        soilType,
        farmArea,
        waterAvailability,
        weather,
        forecast,
        season,
        location
      }, language);
      
      setRecommendations(result);
    } catch (err) {
      console.error('AI recommendation error:', err);
      setError('Failed to get AI recommendations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
    return `₹${amount}`;
  };

  return (
    <div className="crop-rec-page">
      <div className="rec-header">
        <div>
          <h1>🌱 {t('ai_crop_advisor')}</h1>
          
        </div>
        <div className="location-badge">
          <MapPin size={16} />
          <span>{location}</span>
        </div>
      </div>

      {/* Weather & Forecast Card */}
      <div className="weather-forecast-card card">
        <div className="weather-current">
          {weather && (
            <>
              <img src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`} alt="weather" className="weather-main-icon" />
              <div className="weather-info">
                <span className="weather-temp">{weather.temp}°C</span>
                <span className="weather-cond">{weather.condition}</span>
                <span className="weather-humidity"><Droplets size={14} /> {weather.humidity}%</span>
              </div>
            </>
          )}
          <div className="season-badge">
            <Calendar size={16} />
            <span>{season} {t('season') || 'Season'}</span>
          </div>
        </div>
        
        {forecast.length > 0 && (
          <div className="forecast-mini">
            <h4>{t('forecast_7day')}</h4>
            <div className="forecast-days">
              {forecast.map((day, i) => (
                <div key={i} className={`forecast-day ${day.rain ? 'rainy' : ''}`}>
                  <span className="day-name">{day.date}</span>
                  <img src={`https://openweathermap.org/img/wn/${day.icon}.png`} alt="" />
                  <span className="day-temp">{day.temp}°</span>
                  {day.rain && <span className="rain-indicator">🌧️</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Farm Input Section */}
      <div className="inputs-card card">
        <h3 className="card-title"><Sprout size={20} /> {t('farm_details')}</h3>
        <div className="inputs-grid">
          <div className="input-group">
            <label>{t('soil_type')}</label>
            <select value={soilType} onChange={(e) => setSoilType(e.target.value)} className="rec-select">
              {SOIL_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="input-group">
            <label>{t('farm_area')}</label>
            <input 
              type="number" 
              value={farmArea} 
              onChange={(e) => setFarmArea(Math.max(0.1, parseFloat(e.target.value) || 0.1))} 
              className="rec-input" 
              min="0.1" 
              step="0.1" 
            />
          </div>
          <div className="input-group">
            <label>{t('water_avail')}</label>
            <select value={waterAvailability} onChange={(e) => setWaterAvailability(e.target.value)} className="rec-select">
              <option value="Low">🌧️ {t('low') || 'Low'} ({t('rainfed') || 'Rainfed'})</option>
              <option value="Medium">💧 {t('medium') || 'Medium'} ({t('borewell') || 'Borewell'})</option>
              <option value="High">🌊 {t('high') || 'High'} ({t('canal') || 'Canal'})</option>
            </select>
          </div>
        </div>
        <button className="btn btn-primary analyze-btn" onClick={analyzeAndRecommend} disabled={loading}>
          {loading ? (
            <><RefreshCw size={18} className="spin" /> {t('analyzing')}</>
          ) : (
            <><Zap size={18} /> {t('analyze_btn')}</>
          )}
        </button>
        {error && <p className="error-msg">{error}</p>}
      </div>

      {/* AI Recommendations */}
      {recommendations && (
        <div className="recommendations-section">
          {/* AI Insights Banner */}
          <div className="ai-insights card">
            <div className="insight-item">
              <Info size={18} />
              <div>
                <strong>{t('seasonal_advice')}:</strong>
                <span>{recommendations.seasonalAdvice}</span>
              </div>
            </div>
            <div className="insight-item">
              <TrendingUp size={18} />
              <div>
                <strong>{t('market_trend')}:</strong>
                <span>{recommendations.marketTrend}</span>
              </div>
            </div>
            <div className="insight-item">
              <Calendar size={18} />
              <div>
                <strong>{t('best_time')}:</strong>
                <span>{recommendations.bestTime}</span>
              </div>
            </div>
          </div>

          <h2 className="section-title"><Award size={24} /> {t('ai_recs')} ({farmArea} {t('hectares')})</h2>
          
          <div className="rec-cards">
            {recommendations.recommendations?.map((rec, index) => (
              <div key={rec.crop} className={`rec-card card ${index === 0 ? 'top-pick' : ''}`}>
                {index === 0 && <div className="top-badge">🏆 {t('best_choice')}</div>}
                {index === 1 && <div className="second-badge">🥈 2ND {t('best_choice')}</div>}
                
                <div className="rec-card-header">
                  <div className="crop-info">
                    <Leaf size={32} color={index === 0 ? 'var(--color-success)' : 'var(--color-primary)'} />
                    <div>
                      <h3>{rec.crop}</h3>
                      <span className="crop-duration">{rec.duration} {t('days_to_harvest')}</span>
                      <span className={`verdict ${rec.verdict?.toLowerCase().replace(' ', '-')}`}>{rec.verdict}</span>
                    </div>
                  </div>
                  <div className="score-circle" style={{ '--score': rec.score }}>
                    <span>{rec.score}%</span>
                  </div>
                </div>

                {/* Compatibility Tags */}
                <div className="compatibility-checks">
                  <span className={rec.seasonMatch ? 'check-pass' : 'check-fail'}>
                    {rec.seasonMatch ? <CheckCircle size={14} /> : <AlertTriangle size={14} />} {t('season')}
                  </span>
                  <span className={rec.soilMatch ? 'check-pass' : 'check-fail'}>
                    {rec.soilMatch ? <CheckCircle size={14} /> : <AlertTriangle size={14} />} {t('soil')}
                  </span>
                  <span className={rec.waterMatch ? 'check-pass' : 'check-fail'}>
                    {rec.waterMatch ? <CheckCircle size={14} /> : <AlertTriangle size={14} />} {t('water')}
                  </span>
                </div>

                {/* Why this crop */}
                {rec.reasons && (
                  <div className="reasons-section">
                    <strong>Why {rec.crop}?</strong>
                    <ul>
                      {rec.reasons.slice(0, 2).map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  </div>
                )}

                {/* Financial Stats */}
                <div className="rec-stats">
                  <div className="rec-stat">
                    <span className="stat-label">{t('yield')}</span>
                    <span className="stat-value">{rec.yieldPerHectare}</span>
                  </div>
                  <div className="rec-stat">
                    <span className="stat-label">{t('price')}</span>
                    <span className="stat-value">₹{rec.currentMarketPrice}/kg</span>
                  </div>
                  <div className="rec-stat">
                    <span className="stat-label">{t('revenue')}</span>
                    <span className="stat-value">{formatCurrency(rec.expectedRevenue)}</span>
                  </div>
                  <div className="rec-stat">
                    <span className="stat-label">{t('investment')}</span>
                    <span className="stat-value">{formatCurrency(rec.cultivationCost)}</span>
                  </div>
                </div>
                   {/* Nearest Mandi */}
{rec.nearestMandi && (
  <div className="mandi-info">
    <div className="mandi-header">
      <MapPin size={14} />
      <strong>Best Mandi to Sell</strong>
    </div>
    <div className="mandi-details">
      <div className="mandi-row">
        <span>📍 Market</span>
        <span>{rec.nearestMandi.mandiName}, {rec.nearestMandi.mandiDistrict}</span>
      </div>
      <div className="mandi-row">
        <span>📏 Distance</span>
        <span>{rec.nearestMandi.distance != null ? `${rec.nearestMandi.distance} km` : "N/A"}</span>
      </div>
      <div className="mandi-row">
        <span>🏪 Mandi Price</span>
        <span style={{color: 'var(--color-text-secondary)', textDecoration: 'line-through'}}>₹{rec.nearestMandi.mandiPricePerKg}/kg</span>
      </div>
      <div className="mandi-row">
        <span>💰 You Receive</span>
        <span style={{color: 'var(--color-success)', fontWeight: '600'}}>₹{rec.nearestMandi.farmerPricePerKg}/kg <span style={{fontSize:'10px', fontWeight:'normal', color:'var(--color-text-secondary)'}}>(-50% fees)</span></span>
      </div>
      <div className="mandi-row">
        <span>🚛 Transport</span>
        <span>₹{rec.nearestMandi.transportCost} via {rec.nearestMandi.vehicle}</span>
      </div>
      <div className="mandi-row">
        <span>📅 Last Updated</span>
        <span>{rec.nearestMandi.arrivalDate}</span>
      </div>
    </div>
  </div>
)}
                {/* Profit Summary */}
                <div className="profit-box">
                  <div className="profit-main">
                    <span className="profit-label">{t('profit')}</span>
                    <span className={`profit-value ${rec.netProfit > 0 ? 'positive' : 'negative'}`}>
                      {formatCurrency(rec.netProfit)}
                    </span>
                  </div>
                  <div className="roi-display">
                    <TrendingUp size={16} />
                    <span>{rec.roi}% {t('roi')}</span>
                  </div>
                </div>

                {/* Risks & Tips */}
                {rec.risks && rec.risks.length > 0 && (
                  <div className="risks-tips">
                    <div className="risk-item">
                      <AlertTriangle size={14} />
                      <span>{rec.risks[0]}</span>
                    </div>
                    {rec.tips && rec.tips[0] && (
                      <div className="tip-item">
                        <Info size={14} />
                        <span>{rec.tips[0]}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Harvest Date */}
                <div className="harvest-info">
                  <Calendar size={16} />
                  <span>{t('harvest_by')} <strong>{new Date(Date.now() + rec.duration * 86400000).toLocaleDateString(language === 'hi-IN' ? 'hi-IN' : 'en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !recommendations && (
        <div className="empty-state card">
          <Zap size={48} color="var(--color-primary)" />
          <h3>{t('ai_crop_advisor')}</h3>
        </div>
      )}
    </div>
  );
};

export default CropRecommendation;
