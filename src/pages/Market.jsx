import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown,
  MapPin,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Truck,
  IndianRupee,
  Clock,
  Target,
  AlertCircle
} from 'lucide-react';
import { 
  findNearestMandis,
  getSmartSellingRecommendation,
  getCommoditiesList
} from '../services/marketService';
import { useLanguage } from '../context/LanguageContext';
import { useFarm } from '../context/FarmContext';

const Market = () => {
  const { farmSize, currentCrop } = useFarm();
  
  // Estimate default quantity based on farm size (average 25 tons/hectare)
  const estimatedQuantity = Math.round((farmSize || 1) * 25 * 10); // in kg
  
  const [mandis, setMandis] = useState([]);
  const [recommendation, setRecommendation] = useState(null);
  // Initialize with profile crop if available
  const [selectedCommodity, setSelectedCommodity] = useState(
    currentCrop && getCommoditiesList().includes(currentCrop) ? currentCrop : 'Tomato'
  );
  const [quantity, setQuantity] = useState(estimatedQuantity || 200);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const commodities = getCommoditiesList();

  const { t } = useLanguage();

  // Update when farm profile changes
  useEffect(() => {
    if (currentCrop && commodities.includes(currentCrop)) {
      setSelectedCommodity(currentCrop);
    }
    if (farmSize) {
      setQuantity(Math.round(farmSize * 25 * 10));
    }
  }, [currentCrop, farmSize]);

  useEffect(() => {
    fetchMarketData();
  }, [selectedCommodity, quantity]);

  const fetchMarketData = async () => {
    setLoading(true);
    setError(null);
    try {
      const rec = await getSmartSellingRecommendation(selectedCommodity, quantity);
      setRecommendation(rec);
      setMandis(rec.allMandis);
    } catch (err) {
      setError(err.message || 'Failed to fetch market data. Please try again.');
      setRecommendation(null);
      setMandis([]);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getRecommendationColor = (action) => {
    if (action.includes('HOLD') || action.includes('INCREASE')) return 'var(--color-warning)';
    if (action.includes('NOW')) return 'var(--color-success)';
    return 'var(--color-primary)';
  };

  if (loading) {
    return (
      <div className="market-page">
        <div className="loading-state">
          <RefreshCw className="spin" size={32} />
          <p>{t('loading')}...</p>
        </div>
      </div>
    );
  }

  const allLoss = recommendation?.summary?.allLoss;

  return (
    <div className="market-page">
      {/* Header */}
      <div className="market-header">
        <div>
          <h1>{t('market_title')}</h1>
          <p className="market-subtitle">{t('market_subtitle')}</p>
        </div>
        <button className="btn btn-outline refresh-btn" onClick={fetchMarketData}>
          <RefreshCw size={18} />
          {t('refresh')}
        </button>
      </div>

      {/* Input Section */}
      <div className="market-inputs card">
        <div className="input-row">
          <div className="input-group">
            <label>{t('select_crop')}</label>
            <select 
              value={selectedCommodity}
              onChange={(e) => setSelectedCommodity(e.target.value)}
              className="market-select"
            >
              {commodities.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="input-group">
            <label>{t('quantity')}</label>
            <input 
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="market-input"
              min="1"
            />
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-card card" style={{ borderColor: 'var(--color-warning)', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-warning)' }}>
          <AlertTriangle size={24} style={{ marginBottom: '8px' }} />
          <h4>Data Not Available</h4>
          <p>{error}</p>
        </div>
      )}

      {/* Warning for Loss */}
      {allLoss && recommendation?.summary?.minQuantityForProfit && (
        <div className="loss-warning card">
          <AlertCircle size={24} />
          <div>
            <h4>{t('transport_cost_warning')}</h4>
            <p>At {quantity}kg, transport costs are higher than your earnings. 
               Increase quantity to at least <strong>{recommendation.summary.minQuantityForProfit}kg</strong> to flip the loss.</p>
          </div>
        </div>
      )}

      {/* AI Recommendation Banner */}
      {recommendation && (
        <div 
          className={`recommendation-banner card ${allLoss ? 'loss-mode' : ''}`}
          style={{ borderLeftColor: getRecommendationColor(recommendation.recommendation.action) }}
        >
          <div className="rec-header">
            <div className="rec-action" style={{ color: getRecommendationColor(recommendation.recommendation.action) }}>
              {allLoss ? (
                <AlertTriangle size={32} />
              ) : recommendation.recommendation.action.includes('NOW') ? (
                <TrendingUp size={32} />
              ) : (
                <Clock size={32} />
              )}
              <div>
                <h2>{recommendation.recommendation.action}</h2>
                <span className="urgency-badge">{recommendation.recommendation.urgency} priority</span>
              </div>
            </div>
            <div className="rec-profit">
              <span className="profit-label">{allLoss ? 'Current Loss' : t('profit')}</span>
              <span className={`profit-value ${allLoss ? 'loss' : ''}`}>
                {allLoss ? '-' : ''}₹{Math.abs(recommendation.summary.bestPossibleProfit)}
              </span>
            </div>
          </div>
          <p className="rec-reason">{recommendation.recommendation.reason}</p>
        </div>
      )}

      {/* Best Option Card */}
      {recommendation?.bestOption && !allLoss && (
        <div className="best-option-card card">
          <div className="best-badge"><Target size={16} /> {t('best_option')}</div>
          <h3>{recommendation.bestOption.mandi}</h3>
          
          <div className="option-stats">
            <div className="option-stat">
              <MapPin size={18} />
              <div>
                <span className="stat-value">{recommendation.bestOption.distance} km</span>
                <span className="stat-label">{t('distance')}</span>
              </div>
            </div>
            <div className="option-stat">
              <IndianRupee size={18} />
              <div>
                <span className="stat-value">₹{recommendation.bestOption.pricePerKg}/kg</span>
                <span className="stat-label">{t('price')}</span>
              </div>
            </div>
            <div className="option-stat">
              <Truck size={18} />
              <div>
                <span className="stat-value">₹{recommendation.bestOption.transportFare}</span>
                <span className="stat-label">{t('transport')} ({recommendation.bestOption.vehicle})</span>
              </div>
            </div>
            <div className="option-stat profit">
              <TrendingUp size={18} />
              <div>
                <span className="stat-value">₹{recommendation.bestOption.profitPerKg}/kg</span>
                <span className="stat-label">{t('net_profit')}</span>
              </div>
            </div>
          </div>
          
          <div className="best-tip">
            <Clock size={14} /> {recommendation.bestOption.bestTime}
          </div>
        </div>
      )}

      {/* Comparison: Best vs Nearest */}
      {recommendation?.nearestOption && !allLoss && recommendation.bestOption?.mandi !== recommendation.nearestOption.mandi && (
        <div className="comparison-section">
          <h3 className="section-title">{t('smart_comparison')}</h3>
          <div className="comparison-cards">
            <div className="comp-card best">
              <span className="comp-label">{t('profit')}</span>
              <h4>{recommendation.bestOption.mandi}</h4>
              <p>{recommendation.bestOption.distance} km</p>
              <div className="comp-value">
                <span>Net: ₹{recommendation.bestOption.netProfit}</span>
              </div>
            </div>
            <div className="comp-vs">VS</div>
            <div className="comp-card nearest">
              <span className="comp-label">Nearest</span>
              <h4>{recommendation.nearestOption.mandi}</h4>
              <p>{recommendation.nearestOption.distance} km</p>
              <div className={`comp-value ${recommendation.nearestOption.netProfit < 0 ? 'loss' : ''}`}>
                <span>Net: {recommendation.nearestOption.netProfit < 0 ? '-' : ''}₹{Math.abs(recommendation.nearestOption.netProfit)}</span>
              </div>
            </div>
          </div>
          {recommendation.bestOption.netProfit > recommendation.nearestOption.netProfit && (
            <p className="savings-note">
              💡 <strong>{t('savings_note')}:</strong> Going to {recommendation.bestOption.mandi} earns you ₹{recommendation.bestOption.netProfit - recommendation.nearestOption.netProfit} more!
            </p>
          )}
        </div>
      )}

      {/* All Mandis */}
      <div className="mandis-section">
        <h2 className="section-title">{t('all_nearby_mandis')}</h2>
        <p className="section-subtitle">{recommendation?.summary?.profitableMandisCount || 0} profitable mandis found</p>
        <div className="mandi-list">
          {mandis.map((mandi, index) => (
            <div key={mandi.mandiId} className={`mandi-card card ${mandi.isProfitable ? 'profitable' : 'loss'} ${index === 0 && mandi.isProfitable ? 'top-pick' : ''}`}>
              <div className="mandi-header">
                <div>
                  <h4>{mandi.market}</h4>
                  <p className="mandi-location">{mandi.district}, {mandi.state}</p>
                </div>
                {index === 0 && mandi.isProfitable && <span className="top-badge">🏆 Top Pick</span>}
                {!mandi.isProfitable && <span className="loss-badge">⚠️ Loss</span>}
              </div>
              
              <div className="mandi-details">
                <div className="mandi-detail">
                  <span className="detail-label">{t('distance')}</span>
                  <span className="detail-value">{mandi.distance} km</span>
                </div>
                <div className="mandi-detail">
                  <span className="detail-label">{t('price')}</span>
                  <span className="detail-value price">₹{mandi.pricePerKg}/kg</span>
                </div>
                <div className="mandi-detail">
                  <span className="detail-label">{t('transport')}</span>
                  <span className="detail-value">₹{mandi.transportCost}</span>
                </div>
                <div className="mandi-detail">
                  <span className="detail-label">Vehicle</span>
                  <span className="detail-value">{mandi.transport.vehicle}</span>
                </div>
                <div className="mandi-detail">
                  <span className="detail-label">{t('revenue')}</span>
                  <span className="detail-value">₹{mandi.grossRevenue}</span>
                </div>
                <div className={`mandi-detail highlight ${mandi.isProfitable ? '' : 'loss-highlight'}`}>
                  <span className="detail-label">{t('net_profit')}</span>
                  <span className={`detail-value ${mandi.isProfitable ? 'profit-green' : 'loss-red'}`}>
                    {mandi.isProfitable ? '' : '-'}₹{Math.abs(mandi.netProfit)}
                  </span>
                </div>
              </div>
              
              <div className="mandi-footer">
                <span className={`demand-badge demand-${mandi.demandLevel.toLowerCase()}`}>
                  {mandi.demandLevel} Demand
                </span>
                <span className="trading-hours">{mandi.tradingHours}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tips */}
      <div className="selling-tips card">
        <h3 className="card-title">{t('smart_selling_tips')}</h3>
        <ul className="tips-list">
          <li>🕐 Reach mandi before 8 AM for best prices</li>
          <li>📦 Grade your produce - A-grade fetches 15-20% more</li>
          <li>🚛 Sell in larger quantities (200+ kg) for better transport efficiency</li>
          <li>📱 Check prices on Agmarknet before traveling</li>
          <li>🤝 Consider pooling transport with neighboring farmers</li>
        </ul>
      </div>
    </div>
  );
};

export default Market;
