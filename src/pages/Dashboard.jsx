import React from 'react';
import { 
  Leaf, 
  Droplets, 
  Thermometer, 
  TrendingUp, 
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  Sun
} from 'lucide-react';

const Dashboard = () => {
  // Mock IoT Data (will be replaced with real service)
  const soilData = {
    moisture: 42,
    temperature: 28,
    ph: 6.5,
    nitrogen: 'Medium',
    phosphorus: 'High',
    potassium: 'Low'
  };

  const farmInfo = {
    name: "My Farm",
    area: 0.8,
    crop: "Tomato",
    plantedDate: "2024-10-15",
    harvestDate: "2024-12-28"
  };

  const alerts = [
    { type: 'warning', message: 'Soil moisture LOW - Irrigate within 2 days', icon: <Droplets size={18} /> },
    { type: 'success', message: 'No disease detected in latest scan', icon: <CheckCircle size={18} /> },
    { type: 'info', message: 'Market price favorable - ₹32/kg today', icon: <TrendingUp size={18} /> }
  ];

  const weeklyTasks = [
    { done: true, task: 'Apply Urea 40kg' },
    { done: false, task: 'Watch for powdery mildew' },
    { done: false, task: 'Schedule irrigation Oct 9-10' },
    { done: false, task: 'Check market price on Oct 6' }
  ];

  const getStatusColor = (value, type) => {
    if (type === 'moisture') {
      if (value < 30) return 'var(--color-error)';
      if (value < 50) return 'var(--color-warning)';
      return 'var(--color-success)';
    }
    return 'var(--color-primary)';
  };

  const daysToHarvest = () => {
    const harvest = new Date(farmInfo.harvestDate);
    const today = new Date();
    const diff = Math.ceil((harvest - today) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1>Farm Dashboard</h1>
          <p className="dashboard-subtitle">{farmInfo.name} • {farmInfo.area} hectares • {farmInfo.crop}</p>
        </div>
        <div className="harvest-countdown">
          <Calendar size={20} />
          <span><strong>{daysToHarvest()}</strong> days to harvest</span>
        </div>
      </div>

      {/* Status Cards */}
      <div className="status-grid">
        <div className="card status-card">
          <div className="status-header">
            <Droplets size={24} color="var(--color-accent)" />
            <span className="status-label">Soil Moisture</span>
          </div>
          <div className="status-value" style={{ color: getStatusColor(soilData.moisture, 'moisture') }}>
            {soilData.moisture}%
          </div>
          <div className="status-bar">
            <div 
              className="status-bar-fill" 
              style={{ 
                width: `${soilData.moisture}%`,
                backgroundColor: getStatusColor(soilData.moisture, 'moisture')
              }}
            ></div>
          </div>
          <p className="status-hint">Need 40%+ for Tomato</p>
        </div>

        <div className="card status-card">
          <div className="status-header">
            <Thermometer size={24} color="var(--color-warning)" />
            <span className="status-label">Temperature</span>
          </div>
          <div className="status-value">{soilData.temperature}°C</div>
          <p className="status-hint">Optimal: 20-30°C</p>
        </div>

        <div className="card status-card">
          <div className="status-header">
            <Leaf size={24} color="var(--color-primary)" />
            <span className="status-label">Soil pH</span>
          </div>
          <div className="status-value">{soilData.ph}</div>
          <p className="status-hint">Ideal for Tomato (6.0-7.0)</p>
        </div>

        <div className="card status-card">
          <div className="status-header">
            <TrendingUp size={24} color="var(--color-success)" />
            <span className="status-label">Market Price</span>
          </div>
          <div className="status-value" style={{ color: 'var(--color-success)' }}>₹32/kg</div>
          <p className="status-hint">↑ 5% from yesterday</p>
        </div>
      </div>

      {/* Alerts Section */}
      <div className="alerts-section">
        <h2 className="section-title">Active Alerts</h2>
        <div className="alerts-list">
          {alerts.map((alert, index) => (
            <div key={index} className={`alert-item alert-${alert.type}`}>
              {alert.icon}
              <span>{alert.message}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="dashboard-columns">
        {/* NPK Status */}
        <div className="card">
          <h3 className="card-title">Soil Nutrients (NPK)</h3>
          <div className="npk-grid">
            <div className="npk-item">
              <span className="npk-label">Nitrogen (N)</span>
              <span className="npk-value npk-medium">{soilData.nitrogen}</span>
            </div>
            <div className="npk-item">
              <span className="npk-label">Phosphorus (P)</span>
              <span className="npk-value npk-high">{soilData.phosphorus}</span>
            </div>
            <div className="npk-item">
              <span className="npk-label">Potassium (K)</span>
              <span className="npk-value npk-low">{soilData.potassium}</span>
            </div>
          </div>
        </div>

        {/* Weekly Tasks */}
        <div className="card">
          <h3 className="card-title">Weekly Action Items</h3>
          <ul className="task-list">
            {weeklyTasks.map((item, index) => (
              <li key={index} className={`task-item ${item.done ? 'task-done' : ''}`}>
                <input type="checkbox" checked={item.done} readOnly />
                <span>{item.task}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
