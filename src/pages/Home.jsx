import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Leaf, Target, Bug, Droplets, TrendingUp, CloudSun,
  AlertTriangle, CheckCircle, Calendar, ArrowRight, Sun,
  Package, Clock, ThermometerSun, BarChart3, Sprout,
  MapPin, IndianRupee, RefreshCw, Shield, Activity
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useFarm } from '../context/FarmContext';
import { useAuth } from '../context/AuthContext';

// Simple price chart component
const PriceChart = ({ data, crop }) => {
  const maxPrice = Math.max(...data.map(d => d.price));
  const minPrice = Math.min(...data.map(d => d.price));
  const range = maxPrice - minPrice || 1;

  return (
    <div className="price-chart">
      <div className="chart-header">
        <span className="chart-title">{crop} Price Trend (7 Days)</span>
        <span className="chart-current">₹{data[data.length - 1]?.price}/kg</span>
      </div>
      <div className="chart-bars">
        {data.map((d, i) => (
          <div key={i} className="chart-bar-container">
            <div
              className="chart-bar"
              style={{
                height: `${((d.price - minPrice) / range) * 100}%`,
                minHeight: '20%'
              }}
            >
              <span className="bar-value">₹{d.price}</span>
            </div>
            <span className="bar-label">{d.day}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const Home = () => {
  const { user } = useAuth();
  const { farmProfile, currentCrop, sowingDate, farmSize, getDaysSinceSowing, activeDisease } = useFarm();
  const { t } = useLanguage();

  const [weather, setWeather] = useState({ temp: 25, condition: 'Clear', icon: '01d', humidity: 55, city: 'India' });
  const [priceData, setPriceData] = useState([]);
  const [loading, setLoading] = useState(true);

  const daysSinceSowing = getDaysSinceSowing();
  const cropName = currentCrop || 'Tomato';

  // Mock crop stage calculation
  const getCropStage = () => {
    if (daysSinceSowing < 20) return { name: 'Seedling', progress: (daysSinceSowing / 20) * 100 };
    if (daysSinceSowing < 45) return { name: 'Vegetative', progress: ((daysSinceSowing - 20) / 25) * 100 };
    if (daysSinceSowing < 60) return { name: 'Flowering', progress: ((daysSinceSowing - 45) / 15) * 100 };
    if (daysSinceSowing < 75) return { name: 'Fruiting', progress: ((daysSinceSowing - 60) / 15) * 100 };
    return { name: 'Ripening', progress: Math.min(100, ((daysSinceSowing - 75) / 15) * 100) };
  };

  const cropStage = getCropStage();
  const overallProgress = Math.min(100, (daysSinceSowing / 90) * 100);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch weather
        const lat = farmProfile?.location?.lat || 23.0225;
        const lng = farmProfile?.location?.lng || 72.5714;
        const res = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=1c0ff9c24c32fb28e6644ec4110fd944&units=metric`
        );
        const data = await res.json();
        if (data.main) {
          setWeather({
            temp: Math.round(data.main.temp),
            condition: data.weather?.[0]?.main || 'Clear',
            icon: data.weather?.[0]?.icon || '01d',
            humidity: data.main.humidity || 55,
            city: data.name || 'India'
          });
        }
      } catch (err) {
        console.log('Using default weather');
      }

      // Generate mock price data for the crop
      const basePrice = { 'Tomato': 35, 'Potato': 22, 'Onion': 30, 'Wheat': 25, 'Rice': 45 }[cropName] || 30;
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Today'];
      const mockPrices = days.map((day, i) => ({
        day,
        price: Math.round(basePrice + (Math.random() - 0.5) * 10 + i * 0.5)
      }));
      setPriceData(mockPrices);
      setLoading(false);
    };

    fetchData();
  }, [farmProfile?.location, cropName]);

  const todaysTasks = [
    { task: 'Morning inspection', priority: 'high', done: true },
    { task: `Check ${cropName} for pests`, priority: 'medium', done: false },
    { task: 'Evening irrigation', priority: 'high', done: false },
  ];

  const quickStats = [
    { icon: Leaf, label: 'Current Crop', value: cropName, color: '#2E7D32' },
    { icon: Calendar, label: 'Days Since Sowing', value: `${daysSinceSowing} days`, color: '#0288D1' },
    { icon: Package, label: 'Farm Size', value: `${farmSize || 1} ha`, color: '#F57C00' },
    { icon: ThermometerSun, label: 'Temperature', value: `${weather.temp}°C`, color: '#D32F2F' },
  ];

  return (
    <div className="dashboard-page">
      {/* Welcome Header */}
      <div className="dash-header">
        <div className="welcome-text">
          <h1>👋 {t('welcome')}, {user?.name?.split(' ')[0] || 'Farmer'}!</h1>
          <p><MapPin size={14} /> {farmProfile?.farmName || 'Your Farm'} • {weather.city}</p>
        </div>
        <div className="weather-widget">
          <img src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`} alt="weather" />
          <div>
            <span className="temp">{weather.temp}°C</span>
            <span className="cond">{weather.condition}</span>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="quick-stats">
        {quickStats.map((stat, i) => (
          <div key={i} className="stat-card" style={{ '--accent': stat.color }}>
            <stat.icon size={20} />
            <div className="stat-info">
              <span className="stat-value">{stat.value}</span>
              <span className="stat-label">{stat.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Main Dashboard Grid */}
      <div className="dashboard-grid">
        {/* Crop Tracking Card */}
        <div className="dash-card crop-tracking-card">
          <div className="card-header">
            <h3><Sprout size={20} /> {t('crop_tracking') || 'Crop Tracking'}</h3>
            <Link to="/crop-tracking" className="card-link">View Details <ArrowRight size={16} /></Link>
          </div>

          <div className="crop-progress-section">
            <div className="crop-stage-info">
              <span className="stage-name">{cropStage.name} Stage</span>
              <span className="stage-progress">{Math.round(overallProgress)}% Complete</span>
            </div>

            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${overallProgress}%` }}></div>
              <div className="stage-markers">
                <span className={daysSinceSowing >= 0 ? 'active' : ''}>🌱</span>
                <span className={daysSinceSowing >= 20 ? 'active' : ''}>🌿</span>
                <span className={daysSinceSowing >= 45 ? 'active' : ''}>🌸</span>
                <span className={daysSinceSowing >= 60 ? 'active' : ''}>🍅</span>
                <span className={daysSinceSowing >= 75 ? 'active' : ''}>✅</span>
              </div>
            </div>

            <div className="crop-stats">
              <div className="crop-stat">
                <Clock size={16} />
                <span>Days Remaining: <strong>{Math.max(0, 90 - daysSinceSowing)}</strong></span>
              </div>
              <div className="crop-stat">
                <Target size={16} />
                <span>Expected Harvest: <strong>{new Date(Date.now() + (90 - daysSinceSowing) * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Price Chart Card */}
        <div className="dash-card price-chart-card">
          <div className="card-header">
            <h3><BarChart3 size={20} /> {t('market_prices') || 'Market Prices'}</h3>
            <Link to="/market" className="card-link">Find Mandis <ArrowRight size={16} /></Link>
          </div>

          {loading ? (
            <div className="chart-loading"><RefreshCw size={24} className="spin" /></div>
          ) : (
            <PriceChart data={priceData} crop={cropName} />
          )}

          <div className="price-insight">
            <TrendingUp size={16} />
            <span>Prices trending <strong>up 5%</strong> this week. Good time to sell!</span>
          </div>
        </div>

        {/* Today's Tasks */}
        <div className="dash-card tasks-card">
          <div className="card-header">
            <h3><CheckCircle size={20} /> {t('todays_tasks') || "Today's Tasks"}</h3>
            <span className="tasks-count">{todaysTasks.filter(t => !t.done).length} pending</span>
          </div>

          <div className="tasks-list">
            {todaysTasks.map((task, i) => (
              <div key={i} className={`task-item ${task.done ? 'done' : ''} priority-${task.priority}`}>
                <div className="task-check">
                  {task.done ? <CheckCircle size={18} /> : <div className="check-empty"></div>}
                </div>
                <span className="task-text">{task.task}</span>
                <span className={`task-priority ${task.priority}`}>{task.priority}</span>
              </div>
            ))}
          </div>

          <Link to="/crop-tracking" className="view-all-btn">
            View All Tasks <ArrowRight size={16} />
          </Link>
        </div>

        {/* Disease Health Card */}
        <div className={`dash-card disease-card ${activeDisease ? 'has-disease' : 'healthy'}`}>
          <div className="card-header">
            <h3><Shield size={20} /> Crop Health Status</h3>
            <a href="/scan.html" className="card-link">Full Diagnosis <ArrowRight size={16} /></a>
          </div>

          {activeDisease ? (
            <div className="disease-alert">
              <div className="disease-alert-header">
                <AlertTriangle size={24} color="var(--color-error)" />
                <div>
                  <span className="disease-name">{activeDisease.name}</span>
                  <span className="disease-stage">{activeDisease.stage} Stage</span>
                </div>
              </div>

              <div className="treatment-progress">
                <div className="progress-header">
                  <span>Treatment Progress</span>
                  <span>{activeDisease.treatmentProgress || 0}%</span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${activeDisease.treatmentProgress || 0}%` }}></div>
                </div>
              </div>

              <div className="disease-actions">
                <span className="next-action">
                  <Clock size={14} /> Next: {activeDisease.nextAction || 'Apply treatment'}
                </span>
              </div>
            </div>
          ) : (
            <div className="health-status-good">
              <CheckCircle size={48} color="var(--color-success)" />
              <div>
                <h4>All Clear! 🌿</h4>
                <p>No diseases detected. Your crops are healthy.</p>
              </div>
              <a href="/scan.html" className="scan-now-btn">
                <Bug size={16} /> Scan Now
              </a>
            </div>
          )}
        </div>


        {/* <div className="dash-card actions-card">
          <h3><Target size={20} /> Quick Actions</h3>
          <div className="action-buttons">
            <Link to="/crop-recommendation" className="action-btn recommend">
              <Target size={20} />
              <span>Get Recommendation</span>
            </Link>
            <Link to="/disease-detection" className="action-btn disease">
              <Bug size={20} />
              <span>Scan for Disease</span>
            </Link>
            <Link to="/soil-water" className="action-btn soil">
              <Droplets size={20} />
              <span>Soil & Water</span>
            </Link>
            <Link to="/weather" className="action-btn weather">
              <CloudSun size={20} />
              <span>Weather Forecast</span>
            </Link>
          </div>
        </div> */}
      </div>
    </div>
  );
};

export default Home;
