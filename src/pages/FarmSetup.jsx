import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Leaf, MapPin, Droplets, Sprout, Calendar, ChevronRight, 
  ChevronLeft, CheckCircle, Loader2, Home, Sun
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFarm } from '../context/FarmContext';
import { useLanguage } from '../context/LanguageContext';

const SOIL_TYPES = [
  { id: 'black', name: 'Black Soil', hindi: 'काली मिट्टी', icon: '🟤', description: 'Rich in nutrients, ideal for cotton' },
  { id: 'red', name: 'Red Soil', hindi: 'लाल मिट्टी', icon: '🔴', description: 'Good for groundnuts, millets' },
  { id: 'alluvial', name: 'Alluvial Soil', hindi: 'जलोढ़ मिट्टी', icon: '🟡', description: 'Best for rice, wheat, sugarcane' },
  { id: 'sandy', name: 'Sandy Soil', hindi: 'रेतीली मिट्टी', icon: '🏖️', description: 'Suitable for melons, vegetables' },
  { id: 'clayey', name: 'Clayey Soil', hindi: 'चिकनी मिट्टी', icon: '🧱', description: 'Good water retention' },
  { id: 'loamy', name: 'Loamy Soil', hindi: 'दोमट मिट्टी', icon: '🌱', description: 'Ideal for most crops' }
];

const WATER_OPTIONS = [
  { id: 'abundant', name: 'Abundant', hindi: 'प्रचुर', icon: '💧💧💧', description: 'Canal/River irrigation available' },
  { id: 'moderate', name: 'Moderate', hindi: 'मध्यम', icon: '💧💧', description: 'Borewell/Well available' },
  { id: 'limited', name: 'Limited', hindi: 'सीमित', icon: '💧', description: 'Rainfed/Limited water' }
];

const CROPS = [
  'Tomato', 'Potato', 'Onion', 'Wheat', 'Rice', 'Cotton', 
  'Chilli', 'Maize', 'Sugarcane', 'Soybean', 'Groundnut', 'Other'
];

const FarmSetup = () => {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    farmName: '',
    farmSize: 1,
    location: { lat: null, lng: null, city: '' },
    soilType: '',
    waterAvailability: '',
    currentCrop: '',
    sowingDate: '',
    isNotDecided: false
  });
  
  const { user } = useAuth();
  const { updateFarmProfile } = useFarm();
  const { t } = useLanguage();
  const navigate = useNavigate();

  // Get user location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          setFormData(prev => ({
            ...prev,
            location: { lat: latitude, lng: longitude, city: 'Detecting...' }
          }));
          // Try to get city name
          try {
            const res = await fetch(
              `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=1c0ff9c24c32fb28e6644ec4110fd944`
            );
            const data = await res.json();
            setFormData(prev => ({
              ...prev,
              location: { lat: latitude, lng: longitude, city: data.name || 'Unknown' }
            }));
          } catch (e) {
            console.error('City detection failed');
          }
        },
        () => {
          // Default to Ahmedabad if location denied
          setFormData(prev => ({
            ...prev,
            location: { lat: 23.0225, lng: 72.5714, city: 'Ahmedabad' }
          }));
        }
      );
    }
  }, []);

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    const result = await updateFarmProfile(formData);
    if (result.success) {
      setStep(5); // Success step
      setTimeout(() => {
        navigate('/');
      }, 2000);
    }
    setIsLoading(false);
  };

  const canProceed = () => {
    switch (step) {
      case 1: return formData.farmName && formData.farmSize > 0;
      case 2: return formData.soilType && formData.waterAvailability;
      case 3: return formData.currentCrop && (formData.isNotDecided || formData.sowingDate);
      default: return true;
    }
  };

  return (
    <div className="farm-setup-page">
      <div className="farm-setup-background">
        <div className="farm-gradient-1"></div>
        <div className="farm-gradient-2"></div>
      </div>

      <div className="farm-setup-container">
        {/* Progress Bar */}
        <div className="farm-progress">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className={`progress-step ${step >= s ? 'active' : ''} ${step === s ? 'current' : ''}`}>
              <div className="step-circle">
                {step > s ? <CheckCircle size={20} /> : s}
              </div>
              <span className="step-label">
                {s === 1 && (t('farm_details') || 'Farm')}
                {s === 2 && (t('soil_water') || 'Soil')}
                {s === 3 && (t('current_crop') || 'Crop')}
                {s === 4 && (t('review') || 'Review')}
              </span>
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="farm-setup-card">
          {/* Step 1: Farm Details */}
          {step === 1 && (
            <div className="setup-step">
              <div className="step-header">
                <Home size={32} className="step-icon" />
                <h2>{t('tell_about_farm') || 'Tell us about your farm'}</h2>
                <p>{t('farm_info_desc') || 'This helps us give personalized recommendations'}</p>
              </div>

              <div className="setup-form">
                <div className="form-group">
                  <label>{t('farm_name') || 'Farm Name'}</label>
                  <input
                    type="text"
                    placeholder={t('farm_name_placeholder') || 'e.g., Green Valley Farm'}
                    value={formData.farmName}
                    onChange={(e) => setFormData({ ...formData, farmName: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>{t('farm_size') || 'Farm Size (Hectares)'}</label>
                  <div className="size-input">
                    <button 
                      type="button"
                      onClick={() => setFormData({ ...formData, farmSize: Math.max(0.5, formData.farmSize - 0.5) })}
                    >-</button>
                    <input
                      type="number"
                      value={formData.farmSize}
                      onChange={(e) => setFormData({ ...formData, farmSize: parseFloat(e.target.value) || 1 })}
                      min="0.5"
                      step="0.5"
                    />
                    <button 
                      type="button"
                      onClick={() => setFormData({ ...formData, farmSize: formData.farmSize + 0.5 })}
                    >+</button>
                  </div>
                  <span className="size-hint">{(formData.farmSize * 2.47).toFixed(1)} acres</span>
                </div>

                <div className="form-group">
                  <label><MapPin size={16} /> {t('location') || 'Location'}</label>
                  <div className="location-display">
                    <span>{formData.location.city || 'Detecting location...'}</span>
                    {formData.location.lat && (
                      <span className="coords">
                        ({formData.location.lat?.toFixed(2)}, {formData.location.lng?.toFixed(2)})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Soil & Water */}
          {step === 2 && (
            <div className="setup-step">
              <div className="step-header">
                <Droplets size={32} className="step-icon" />
                <h2>{t('soil_water_title') || 'Soil & Water Availability'}</h2>
                <p>{t('soil_water_desc') || 'Select your soil type and water source'}</p>
              </div>

              <div className="setup-form">
                <div className="form-group">
                  <label>{t('soil_type') || 'Soil Type'}</label>
                  <div className="option-grid">
                    {SOIL_TYPES.map((soil) => (
                      <div
                        key={soil.id}
                        className={`option-card ${formData.soilType === soil.id ? 'selected' : ''}`}
                        onClick={() => setFormData({ ...formData, soilType: soil.id })}
                      >
                        <span className="option-icon">{soil.icon}</span>
                        <span className="option-name">{soil.name}</span>
                        <span className="option-hindi">{soil.hindi}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label>{t('water_availability') || 'Water Availability'}</label>
                  <div className="water-options">
                    {WATER_OPTIONS.map((water) => (
                      <div
                        key={water.id}
                        className={`water-card ${formData.waterAvailability === water.id ? 'selected' : ''}`}
                        onClick={() => setFormData({ ...formData, waterAvailability: water.id })}
                      >
                        <span className="water-icon">{water.icon}</span>
                        <div className="water-info">
                          <span className="water-name">{water.name}</span>
                          <span className="water-desc">{water.description}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Current Crop */}
          {step === 3 && (
            <div className="setup-step">
              <div className="step-header">
                <Sprout size={32} className="step-icon" />
                <h2>{t('current_crop_title') || 'Current Crop'}</h2>
                <p>{t('current_crop_desc') || 'What are you growing this season?'}</p>
              </div>

              <div className="setup-form">
                <div className="form-group">
                  <label>{t('select_crop') || 'Select Crop'}</label>
                  <div className="crop-grid">
                    {CROPS.map((crop) => (
                      <div
                        key={crop}
                        className={`crop-card ${formData.currentCrop === crop ? 'selected' : ''}`}
                        onClick={() => setFormData({ ...formData, currentCrop: crop })}
                      >
                        {crop}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label><Calendar size={16} /> {t('sowing_date') || 'Sowing Date'}</label>
                  
                  <div className="sowing-options">
                    <label className="checkbox-option">
                      <input
                        type="checkbox"
                        checked={formData.isNotDecided}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          isNotDecided: e.target.checked,
                          sowingDate: e.target.checked ? '' : formData.sowingDate 
                        })}
                      />
                      <span>{t('not_decided_yet') || 'Not decided / Planning stage'}</span>
                    </label>

                    {!formData.isNotDecided && (
                      <input
                        type="date"
                        value={formData.sowingDate}
                        onChange={(e) => setFormData({ ...formData, sowingDate: e.target.value })}
                        max={new Date().toISOString().split('T')[0]}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="setup-step">
              <div className="step-header">
                <CheckCircle size={32} className="step-icon success" />
                <h2>{t('review_title') || 'Review Your Farm Profile'}</h2>
                <p>{t('review_desc') || 'Make sure everything looks correct'}</p>
              </div>

              <div className="review-summary">
                <div className="review-item">
                  <span className="review-label">{t('farm_name') || 'Farm Name'}</span>
                  <span className="review-value">{formData.farmName}</span>
                </div>
                <div className="review-item">
                  <span className="review-label">{t('farm_size') || 'Farm Size'}</span>
                  <span className="review-value">{formData.farmSize} hectares ({(formData.farmSize * 2.47).toFixed(1)} acres)</span>
                </div>
                <div className="review-item">
                  <span className="review-label">{t('location') || 'Location'}</span>
                  <span className="review-value">{formData.location.city}</span>
                </div>
                <div className="review-item">
                  <span className="review-label">{t('soil_type') || 'Soil Type'}</span>
                  <span className="review-value">{SOIL_TYPES.find(s => s.id === formData.soilType)?.name}</span>
                </div>
                <div className="review-item">
                  <span className="review-label">{t('water_availability') || 'Water'}</span>
                  <span className="review-value">{WATER_OPTIONS.find(w => w.id === formData.waterAvailability)?.name}</span>
                </div>
                <div className="review-item">
                  <span className="review-label">{t('current_crop') || 'Current Crop'}</span>
                  <span className="review-value">{formData.currentCrop}</span>
                </div>
                <div className="review-item">
                  <span className="review-label">{t('sowing_date') || 'Sowing Date'}</span>
                  <span className="review-value">
                    {formData.isNotDecided ? (t('not_decided') || 'Not decided yet') : formData.sowingDate}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Success */}
          {step === 5 && (
            <div className="setup-step success-step">
              <div className="success-animation">
                <div className="success-circle">
                  <CheckCircle size={64} />
                </div>
                <h2>{t('profile_complete') || 'Profile Complete!'}</h2>
                <p>{t('redirecting') || 'Redirecting to your dashboard...'}</p>
                <Loader2 size={24} className="spin" />
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          {step < 5 && (
            <div className="setup-navigation">
              {step > 1 && (
                <button type="button" className="back-btn" onClick={handleBack}>
                  <ChevronLeft size={20} />
                  {t('back') || 'Back'}
                </button>
              )}
              
              {step < 4 ? (
                <button 
                  type="button" 
                  className="next-btn" 
                  onClick={handleNext}
                  disabled={!canProceed()}
                >
                  {t('next') || 'Next'}
                  <ChevronRight size={20} />
                </button>
              ) : (
                <button 
                  type="button" 
                  className="submit-btn" 
                  onClick={handleSubmit}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={20} className="spin" />
                      {t('saving') || 'Saving...'}
                    </>
                  ) : (
                    <>
                      <CheckCircle size={20} />
                      {t('complete_setup') || 'Complete Setup'}
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FarmSetup;
