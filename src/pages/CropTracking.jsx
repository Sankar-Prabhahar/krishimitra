import React, { useState, useEffect } from 'react';
import {
  Leaf,
  Calendar,
  Droplets,
  Sun,
  Target,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Package,
  Thermometer
} from 'lucide-react';
import { getAICropTracking, getAIWeeklyActionPlan } from '../services/aiService';
import { useLanguage } from '../context/LanguageContext';
import { useFarm } from '../context/FarmContext';

// Crop-specific data database
const CROP_DATABASE = {
  // ... (database content remains same for now, or can be partially translated if keys match)
  Tomato: {
    totalDays: 90,
    stages: [
      { name: "Seedling", startDay: 0, endDay: 20, description: "Seeds germinating and first leaves appearing" },
      { name: "Vegetative", startDay: 21, endDay: 45, description: "Rapid leaf and stem growth" },
      { name: "Flowering", startDay: 46, endDay: 60, description: "Flowers developing, needs pollination" },
      { name: "Fruiting", startDay: 61, endDay: 75, description: "Fruits forming and growing" },
      { name: "Ripening", startDay: 76, endDay: 90, description: "Fruits maturing and ready for harvest" }
    ],
    irrigation: { frequency: "Every 2-3 days", amount: "15-20 L/plant" },
    pests: ["Aphids", "Whiteflies", "Fruit borer", "Leaf miner"],
    yield: "25-35 tons/hectare"
  },
  // ... (keep other crops as is to avoid huge diff, mainly targeting UI labels)
  Potato: {
    totalDays: 100,
    stages: [
      { name: "Sprouting", startDay: 0, endDay: 15, description: "Seed potatoes sprouting" },
      { name: "Vegetative", startDay: 16, endDay: 40, description: "Leaves and stems growing rapidly" },
      { name: "Tuber Init", startDay: 41, endDay: 60, description: "Tubers starting to form underground" },
      { name: "Bulking", startDay: 61, endDay: 85, description: "Tubers expanding and filling" },
      { name: "Maturation", startDay: 86, endDay: 100, description: "Skin setting, ready for harvest" }
    ],
    irrigation: { frequency: "Every 5-7 days", amount: "25-30 mm depth" },
    pests: ["Potato tuber moth", "Aphids", "Colorado beetle", "Late blight"],
    yield: "20-30 tons/hectare"
  },
  Onion: {
    totalDays: 120,
    stages: [
      { name: "Germination", startDay: 0, endDay: 15, description: "Seeds sprouting" },
      { name: "Seedling", startDay: 16, endDay: 30, description: "Young plants establishing" },
      { name: "Vegetative", startDay: 31, endDay: 60, description: "Leaf growth phase" },
      { name: "Bulbing", startDay: 61, endDay: 100, description: "Bulb formation and expansion" },
      { name: "Maturation", startDay: 101, endDay: 120, description: "Necks falling, ready for harvest" }
    ],
    irrigation: { frequency: "Every 7-10 days", amount: "20-25 mm depth" },
    pests: ["Thrips", "Onion fly", "Purple blotch", "Downy mildew"],
    yield: "15-25 tons/hectare"
  },
  Wheat: {
    totalDays: 130,
    stages: [
      { name: "Germination", startDay: 0, endDay: 10, description: "Seeds sprouting" },
      { name: "Tillering", startDay: 11, endDay: 35, description: "Side shoots developing" },
      { name: "Stem Extension", startDay: 36, endDay: 60, description: "Main stem elongating" },
      { name: "Heading", startDay: 61, endDay: 90, description: "Ear emergence and flowering" },
      { name: "Ripening", startDay: 91, endDay: 130, description: "Grain filling and drying" }
    ],
    irrigation: { frequency: "4-5 irrigations total", amount: "50-60 mm per irrigation" },
    pests: ["Aphids", "Stem rust", "Powdery mildew", "Armyworm"],
    yield: "4-6 tons/hectare"
  },
  Rice: {
    totalDays: 120,
    stages: [
      { name: "Nursery", startDay: 0, endDay: 25, description: "Seedlings in nursery bed" },
      { name: "Transplanting", startDay: 26, endDay: 35, description: "Moved to main field" },
      { name: "Tillering", startDay: 36, endDay: 60, description: "Tillers developing" },
      { name: "Panicle Init", startDay: 61, endDay: 80, description: "Panicle forming inside stem" },
      { name: "Heading", startDay: 81, endDay: 100, description: "Panicle emergence and flowering" },
      { name: "Ripening", startDay: 101, endDay: 120, description: "Grain filling and maturing" }
    ],
    irrigation: { frequency: "Standing water 5 cm", amount: "1200-1500 mm total" },
    pests: ["Stem borer", "Brown planthopper", "Blast", "Sheath blight"],
    yield: "5-8 tons/hectare"
  },
  Cotton: {
    totalDays: 160,
    stages: [
      { name: "Germination", startDay: 0, endDay: 12, description: "Seeds sprouting" },
      { name: "Seedling", startDay: 13, endDay: 30, description: "Young plants establishing" },
      { name: "Vegetative", startDay: 31, endDay: 60, description: "Rapid growth phase" },
      { name: "Squaring", startDay: 61, endDay: 80, description: "Flower buds forming" },
      { name: "Flowering", startDay: 81, endDay: 120, description: "Bloom period" },
      { name: "Boll Development", startDay: 121, endDay: 160, description: "Bolls forming and opening" }
    ],
    irrigation: { frequency: "Every 10-15 days", amount: "50-60 mm per irrigation" },
    pests: ["Bollworm", "Whitefly", "Jassids", "Pink bollworm"],
    yield: "2-3 tons/hectare"
  },
  Chilli: {
    totalDays: 150,
    stages: [
      { name: "Nursery", startDay: 0, endDay: 30, description: "Seedlings in nursery" },
      { name: "Transplanting", startDay: 31, endDay: 45, description: "Moved to main field" },
      { name: "Vegetative", startDay: 46, endDay: 70, description: "Plant establishment" },
      { name: "Flowering", startDay: 71, endDay: 100, description: "Flowering and fruit set" },
      { name: "Fruiting", startDay: 101, endDay: 150, description: "Fruit development and harvest" }
    ],
    irrigation: { frequency: "Every 5-6 days", amount: "20-25 mm per irrigation" },
    pests: ["Thrips", "Mites", "Fruit borer", "Anthracnose"],
    yield: "10-15 tons/hectare (green)"
  }
};

const CropTracking = () => {
  const { currentCrop: profileCrop, getDaysSinceSowing } = useFarm();
  
  // Map profile crop to database crop (capitalize first letter)
  const getInitialCrop = () => {
    if (profileCrop && CROP_DATABASE[profileCrop]) return profileCrop;
    const capitalized = profileCrop ? profileCrop.charAt(0).toUpperCase() + profileCrop.slice(1).toLowerCase() : null;
    if (capitalized && CROP_DATABASE[capitalized]) return capitalized;
    return 'Tomato';
  };
  
  const [crop, setCrop] = useState(getInitialCrop());
  const [daysSinceSowing, setDaysSinceSowing] = useState(getDaysSinceSowing());
  const [trackingData, setTrackingData] = useState(null);
  const [weeklyPlan, setWeeklyPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completedTasks, setCompletedTasks] = useState([]);
  
  const { t, language } = useLanguage();

  const crops = Object.keys(CROP_DATABASE);

  // Update when farm profile changes
  useEffect(() => {
    setCrop(getInitialCrop());
    setDaysSinceSowing(getDaysSinceSowing());
  }, [profileCrop]);

  useEffect(() => {
    loadTrackingData();
  }, [crop, daysSinceSowing]);

  const loadTrackingData = async () => {
    const cropInfo = CROP_DATABASE[crop];
    
    // Determine current stage
    let currentStageInfo = cropInfo.stages[0];
    for (const stage of cropInfo.stages) {
      if (daysSinceSowing >= stage.startDay && daysSinceSowing <= stage.endDay) {
        currentStageInfo = stage;
        break;
      }
    }
    
    // Calculate progress
    const stageProgress = Math.min(100, ((daysSinceSowing - currentStageInfo.startDay) / (currentStageInfo.endDay - currentStageInfo.startDay)) * 100);
    const overallProgress = Math.min(100, (daysSinceSowing / cropInfo.totalDays) * 100);
    
    // Find next stage
    const currentStageIndex = cropInfo.stages.findIndex(s => s.name === currentStageInfo.name);
    const nextStage = cropInfo.stages[currentStageIndex + 1] || cropInfo.stages[cropInfo.stages.length - 1];
    
    // Build tracking data (local calculation - fast)
    const tracking = {
      currentStage: {
        name: currentStageInfo.name,
        progress: overallProgress,
        stageProgress: stageProgress,
        daysRemaining: Math.max(0, currentStageInfo.endDay - daysSinceSowing),
        description: currentStageInfo.description
      },
      nextMilestone: {
        stage: nextStage.name,
        expectedIn: `${Math.max(1, nextStage.startDay - daysSinceSowing)} ${t('days_unit') || 'days'}`,
        preparation: getPreparationTasks(crop, nextStage.name)
      },
      todaysTasks: getTodaysTasks(crop, currentStageInfo.name, daysSinceSowing),
      irrigationSchedule: {
        frequency: cropInfo.irrigation.frequency,
        amount: cropInfo.irrigation.amount,
        nextIrrigation: getNextIrrigationTime(daysSinceSowing)
      },
      fertilizerSchedule: getFertilizerSchedule(crop, currentStageInfo.name),
      pestWatch: cropInfo.pests,
      harvestForecast: {
        expectedDate: new Date(Date.now() + (cropInfo.totalDays - daysSinceSowing) * 86400000).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }),
        daysRemaining: Math.max(0, cropInfo.totalDays - daysSinceSowing),
        expectedYield: cropInfo.yield
      }
    };
    
    setTrackingData(tracking);
    setLoading(false);
  };

  // Debounced AI fetch
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!trackingData?.currentStage) return;
      
      const weekly = await getAIWeeklyActionPlan({ 
        crop, 
        area: 0.8, 
        soilMoisture: 45, 
        growthStage: trackingData.currentStage.name 
      }, language);
      setWeeklyPlan(weekly);
    }, 1500); // Faster debounce for Gemini Flash

    return () => clearTimeout(timer);
  }, [crop, daysSinceSowing, language]);

  const getPreparationTasks = (crop, nextStage) => {
    // ... (logic helper functions remain same)
    const tasks = {
      Vegetative: ["Prepare fertilizer for top dressing", "Check for early pest signs"],
      Flowering: ["Ensure pollination support", "Reduce nitrogen, increase phosphorus"],
      Fruiting: ["Prepare support structures", "Monitor calcium levels"],
      Ripening: ["Prepare harvest containers", "Reduce irrigation frequency"],
      Bulking: ["Hill up soil around plants", "Maintain consistent moisture"],
      Heading: ["Apply final nitrogen dose", "Watch for diseases"],
      Maturation: ["Stop irrigation", "Prepare drying/storage area"]
    };
    return tasks[nextStage] || ["Monitor plant health", "Maintain regular care"];
  };

  const getTodaysTasks = (crop, stage, days) => {
    const baseTasks = [
      { task: "Inspect plants for pests/diseases", priority: "high", reason: "Early detection prevents major losses" },
      { task: "Check soil moisture level", priority: "medium", reason: "Consistent moisture improves yield" }
    ];
    
    // Add stage-specific tasks
    if (stage === "Flowering") {
      baseTasks.push({ task: "Check for successful pollination", priority: "high", reason: "Critical for fruit set" });
    }
    if (stage === "Fruiting" || stage === "Ripening") {
      baseTasks.push({ task: "Check fruit development", priority: "medium", reason: "Ensure proper sizing" });
    }
    if (days % 7 === 0) {
      baseTasks.push({ task: "Apply foliar spray", priority: "medium", reason: "Weekly nutrition boost" });
    }
    
    return baseTasks;
  };

  const getNextIrrigationTime = (days) => {
    const hour = 6 + (days % 2);
    return `Tomorrow ${hour} AM`;
  };

  const getFertilizerSchedule = (crop, stage) => {
    const schedules = {
      Seedling: { currentWeek: "Starter fertilizer (DAP)", dosage: "25 kg/hectare", method: "Band application" },
      Vegetative: { currentWeek: "Urea top dressing", dosage: "50 kg/hectare", method: "Broadcasting or drip" },
      Flowering: { currentWeek: "NPK 12:32:16", dosage: "50 kg/hectare", method: "Fertigation" },
      Fruiting: { currentWeek: "Potash + Calcium", dosage: "30 kg potash/hectare", method: "Foliar spray" },
      Ripening: { currentWeek: "No fertilizer needed", dosage: "-", method: "Focus on harvest prep" }
    };
    
    const schedule = schedules[stage] || schedules.Vegetative;
    return {
      ...schedule,
      nextApplication: new Date(Date.now() + 5 * 86400000).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
    };
  };

  const toggleTaskComplete = (dayIndex, taskIndex) => {
    const taskId = `${dayIndex}-${taskIndex}`;
    setCompletedTasks(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  const isTaskCompleted = (dayIndex, taskIndex) => {
    return completedTasks.includes(`${dayIndex}-${taskIndex}`);
  };

  const getProgressColor = (progress) => {
    if (progress < 30) return 'var(--color-info)';
    if (progress < 70) return 'var(--color-warning)';
    return 'var(--color-success)';
  };

  if (loading) {
    return (
      <div className="crop-tracking-page">
        <div className="loading-state">
          <RefreshCw className="spin" size={32} />
          <p>{t('loading')}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="crop-tracking-page">
      {/* Header */}
      <div className="tracking-header">
        <div>
          <h1>{t('crop_tracking_title')}</h1>
          <p className="tracking-subtitle">{t('crop_tracking_subtitle')}</p>
        </div>
      </div>

      {/* Crop Selection */}
      <div className="crop-selector card">
        <div className="selector-row">
          <div className="selector-group">
            <label>{t('crop_label')}</label>
            <select value={crop} onChange={(e) => setCrop(e.target.value)} className="crop-select">
              {crops.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="selector-group">
            <label>{t('sowing_date_label')}</label>
            <input 
              type="number" 
              value={daysSinceSowing} 
              onChange={(e) => setDaysSinceSowing(Math.max(1, parseInt(e.target.value) || 1))}
              className="days-input"
              min="1"
              max={CROP_DATABASE[crop]?.totalDays || 200}
            />
          </div>
        </div>
        <p className="crop-info-hint">
          {t('total_duration')}: {CROP_DATABASE[crop]?.totalDays} {t('days_unit')} | {t('expected_yield')}: {CROP_DATABASE[crop]?.yield}
        </p>
      </div>

      {/* Growth Progress Card */}
      {trackingData?.currentStage && (
        <div className="growth-progress card">
          <div className="growth-header">
            <div className="stage-info">
              <Leaf size={28} color="var(--color-primary)" />
              <div>
                <h2>{trackingData.currentStage.name} {t('stage_label')}</h2>
                <p>{trackingData.currentStage.description}</p>
              </div>
            </div>
            <div className="progress-circle" style={{
              background: `conic-gradient(${getProgressColor(trackingData.currentStage.progress)} ${trackingData.currentStage.progress * 3.6}deg, var(--color-border) 0deg)`
            }}>
              <div className="progress-inner">
                <span className="progress-value">{Math.round(trackingData.currentStage.progress)}%</span>
              </div>
            </div>
          </div>
          
          <div className="growth-timeline">
            <div className="timeline-bar">
              <div className="timeline-fill" style={{ width: `${trackingData.currentStage.progress}%` }}></div>
              <div className="timeline-marker" style={{ left: `${trackingData.currentStage.progress}%` }}></div>
            </div>
            <div className="timeline-labels">
              {CROP_DATABASE[crop]?.stages.slice(0, 4).map(s => (
                <span key={s.name}>{s.name}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Key Stats */}
      <div className="key-stats-grid">
        <div className="stat-card card">
          <Calendar size={24} color="var(--color-primary)" />
          <div>
            <span className="stat-value">{trackingData?.harvestForecast?.daysRemaining || 0}</span>
            <span className="stat-label">{t('days_to_harvest')}</span>
          </div>
        </div>
        <div className="stat-card card">
          <Target size={24} color="var(--color-success)" />
          <div>
            <span className="stat-value">{trackingData?.harvestForecast?.expectedDate}</span>
            <span className="stat-label">{t('expected_harvest')}</span>
          </div>
        </div>
        <div className="stat-card card">
          <Package size={24} color="var(--color-warning)" />
          <div>
            <span className="stat-value">{trackingData?.harvestForecast?.expectedYield}</span>
            <span className="stat-label">{t('expected_yield')}</span>
          </div>
        </div>
      </div>

      {/* Today's Tasks */}
      {trackingData?.todaysTasks && (
        <div className="todays-tasks card">
          <h3 className="card-title"><Clock size={20} /> {t('todays_tasks')}</h3>
          <div className="tasks-list">
            {trackingData.todaysTasks.map((task, index) => (
              <div key={index} className={`task-item priority-${task.priority}`}>
                <div className="task-priority">{task.priority}</div>
                <div className="task-content">
                  <span className="task-name">{task.task}</span>
                  <span className="task-reason">{task.reason}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next Milestone */}
      {trackingData?.nextMilestone && (
        <div className="milestone-card card">
          <h3 className="card-title"><Target size={20} /> {t('next_milestone')}: {trackingData.nextMilestone.stage}</h3>
          <p className="milestone-time">{t('expected_in')} {trackingData.nextMilestone.expectedIn}</p>
          <h4>{t('prep_steps')}:</h4>
          <ul className="prep-list">
            {trackingData.nextMilestone.preparation.map((prep, index) => (
              <li key={index}>{prep}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Irrigation Schedule */}
      {trackingData?.irrigationSchedule && (
        <div className="irrigation-schedule card">
          <h3 className="card-title"><Droplets size={20} /> {t('irrigation_schedule_title')}</h3>
          <div className="schedule-details">
            <div className="schedule-item">
              <span className="schedule-label">{t('frequency')}</span>
              <span className="schedule-value">{trackingData.irrigationSchedule.frequency}</span>
            </div>
            <div className="schedule-item">
              <span className="schedule-label">{t('water_amount')}</span>
              <span className="schedule-value">{trackingData.irrigationSchedule.amount}</span>
            </div>
            <div className="schedule-item highlight">
              <span className="schedule-label">{t('next_irrigation')}</span>
              <span className="schedule-value">{trackingData.irrigationSchedule.nextIrrigation}</span>
            </div>
          </div>
        </div>
      )}

      {/* Fertilizer Schedule */}
      {trackingData?.fertilizerSchedule && (
        <div className="fertilizer-schedule card">
          <h3 className="card-title"><Sun size={20} /> {t('fertilizer_schedule')}</h3>
          <div className="schedule-details">
            <div className="schedule-item current">
              <span className="schedule-label">{t('this_week')}</span>
              <span className="schedule-value">{trackingData.fertilizerSchedule.currentWeek}</span>
            </div>
            <div className="schedule-item">
              <span className="schedule-label">{t('dosage')}</span>
              <span className="schedule-value">{trackingData.fertilizerSchedule.dosage}</span>
            </div>
            <div className="schedule-item">
              <span className="schedule-label">{t('method')}</span>
              <span className="schedule-value">{trackingData.fertilizerSchedule.method}</span>
            </div>
            <div className="schedule-item highlight">
              <span className="schedule-label">{t('next_application')}</span>
              <span className="schedule-value">{trackingData.fertilizerSchedule.nextApplication}</span>
            </div>
          </div>
        </div>
      )}

      {/* Pest Watch */}
      {trackingData?.pestWatch && (
        <div className="pest-watch card">
          <h3 className="card-title"><AlertTriangle size={20} /> {t('pest_watch')}</h3>
          <div className="pest-list">
            {trackingData.pestWatch.map((pest, index) => (
              <span key={index} className="pest-badge">{pest}</span>
            ))}
          </div>
        </div>
      )}

      {/* Weekly Action Plan */}
      {weeklyPlan?.actions && (
        <div className="weekly-plan-section">
          <h2 className="section-title">📅 {t('weekly_plan')}</h2>
          {weeklyPlan.keyAlerts && (
            <div className="weekly-alerts">
              {weeklyPlan.keyAlerts.map((alert, index) => (
                <div key={index} className="weekly-alert">
                  <AlertTriangle size={16} /> {alert}
                </div>
              ))}
            </div>
          )}
          
          <div className="weekly-days">
            {weeklyPlan.actions.map((day, dayIndex) => (
              <div key={dayIndex} className="day-card card">
                <div className="day-header">
                  <span className="day-name">{day.day}</span>
                  <span className="day-date">{day.date}</span>
                </div>
                <div className="day-tasks">
                  {day.tasks.map((task, taskIndex) => (
                    <div 
                      key={taskIndex} 
                      className={`day-task ${isTaskCompleted(dayIndex, taskIndex) ? 'completed' : ''} priority-${task.priority}`}
                      onClick={() => toggleTaskComplete(dayIndex, taskIndex)}
                    >
                      <span className="task-time">{task.time}</span>
                      <span className="task-text">{task.task}</span>
                      <span className="task-check">
                        {isTaskCompleted(dayIndex, taskIndex) ? <CheckCircle size={16} /> : <Target size={16} />}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          
          {weeklyPlan.expectedOutcomes && (
            <div className="weekly-outcomes card">
              <h4>{t('expected_outcomes')}</h4>
              <p>{weeklyPlan.expectedOutcomes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CropTracking;
