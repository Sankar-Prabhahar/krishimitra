/**
 * Mock Soil & Water IoT Service
 * Simulates sensor data for soil health and irrigation monitoring
 */

// Soil sensor data simulation
let soilData = {
  moisture: 45,
  temperature: 28,
  ph: 6.5,
  conductivity: 1.2,
  npk: {
    nitrogen: 45, // ppm
    phosphorus: 35, // ppm
    potassium: 60, // ppm
  },
  micronutrients: {
    zinc: 2.5,
    iron: 8.5,
    boron: 0.8,
    manganese: 15,
  },
  lastUpdated: new Date(),
};

// Water/Irrigation data
let irrigationData = {
  todayUsage: 450, // liters
  weeklyUsage: 2800,
  monthlyUsage: 12500,
  waterLevel: 65, // tank percentage
  pumpStatus: "off",
  lastIrrigated: new Date(Date.now() - 24 * 60 * 60 * 1000),
  scheduledNext: new Date(Date.now() + 8 * 60 * 60 * 1000),
};

// Historical data for trends
let historicalData = [];

/**
 * Get current soil sensor readings
 */
export const getSoilData = () => {
  // Simulate slight variations
  soilData = {
    ...soilData,
    moisture: Math.max(
      10,
      Math.min(80, soilData.moisture + (Math.random() - 0.5) * 5)
    ),
    temperature:
      Math.round((soilData.temperature + (Math.random() - 0.5) * 2) * 10) / 10,
    ph: Math.round((soilData.ph + (Math.random() - 0.5) * 0.2) * 10) / 10,
    lastUpdated: new Date(),
  };
  return { ...soilData };
};

/**
 * Get irrigation/water data
 */
export const getIrrigationData = () => {
  return { ...irrigationData };
};

/**
 * Analyze soil health and provide recommendations
 */
export const analyzeSoilHealth = (soil) => {
  const issues = [];
  const recommendations = [];
  let healthScore = 100;

  // Check moisture
  if (soil.moisture < 30) {
    issues.push({ type: "critical", message: "Soil moisture critically low" });
    recommendations.push("Irrigate immediately - soil is too dry");
    healthScore -= 25;
  } else if (soil.moisture < 40) {
    issues.push({ type: "warning", message: "Soil moisture below optimal" });
    recommendations.push("Schedule irrigation within 24-48 hours");
    healthScore -= 10;
  } else if (soil.moisture > 70) {
    issues.push({ type: "warning", message: "Soil moisture too high" });
    recommendations.push("Reduce irrigation frequency - risk of waterlogging");
    healthScore -= 10;
  }

  // Check pH
  if (soil.ph < 5.5) {
    issues.push({ type: "warning", message: "Soil is too acidic (pH < 5.5)" });
    recommendations.push("Apply agricultural lime (2-3 kg per hectare)");
    healthScore -= 15;
  } else if (soil.ph > 7.5) {
    issues.push({
      type: "warning",
      message: "Soil is too alkaline (pH > 7.5)",
    });
    recommendations.push("Apply gypsum or sulfur to lower pH");
    healthScore -= 15;
  }

  // Check NPK levels
  if (soil.npk.nitrogen < 30) {
    issues.push({ type: "warning", message: "Low Nitrogen levels" });
    recommendations.push("Apply Urea (40-50 kg/hectare) or organic compost");
    healthScore -= 10;
  }

  if (soil.npk.phosphorus < 25) {
    issues.push({ type: "warning", message: "Low Phosphorus levels" });
    recommendations.push(
      "Apply DAP or Single Super Phosphate (25-30 kg/hectare)"
    );
    healthScore -= 10;
  }

  if (soil.npk.potassium < 40) {
    issues.push({ type: "warning", message: "Low Potassium levels" });
    recommendations.push("Apply Muriate of Potash (20-25 kg/hectare)");
    healthScore -= 10;
  }

  // Check micronutrients
  if (soil.micronutrients.zinc < 1.5) {
    issues.push({ type: "info", message: "Zinc deficiency detected" });
    recommendations.push("Apply Zinc Sulphate spray (0.5% solution)");
    healthScore -= 5;
  }

  if (soil.micronutrients.iron < 5) {
    issues.push({ type: "info", message: "Iron deficiency detected" });
    recommendations.push("Apply ferrous sulphate (10 kg/hectare)");
    healthScore -= 5;
  }

  if (soil.micronutrients.boron < 0.5) {
    issues.push({ type: "info", message: "Boron deficiency detected" });
    recommendations.push("Apply Borax (5-10 kg/hectare)");
    healthScore -= 5;
  }

  // Add generic good practices if no major issues
  if (issues.length === 0) {
    recommendations.push("Soil health is optimal - maintain current practices");
    recommendations.push(
      "Consider periodic organic matter addition for long-term health"
    );
  }

  return {
    healthScore: Math.max(0, healthScore),
    status: healthScore > 80 ? "Good" : healthScore > 50 ? "Fair" : "Poor",
    issues,
    recommendations,
  };
};

/**
 * Get irrigation recommendations based on soil and weather
 */
export const getIrrigationRecommendation = (soil, weather = null) => {
  const recommendations = [];
  let irrigationNeeded = false;
  let priority = "normal";
  let estimatedWater = 0;

  // Check soil moisture
  if (soil.moisture < 30) {
    irrigationNeeded = true;
    priority = "high";
    estimatedWater = 800; // liters per 0.1 hectare
    recommendations.push({
      type: "critical",
      message: "Immediate irrigation required",
      action: "Irrigate now for 30-45 minutes",
    });
  } else if (soil.moisture < 40) {
    irrigationNeeded = true;
    priority = "medium";
    estimatedWater = 500;
    recommendations.push({
      type: "warning",
      message: "Irrigation recommended within 24 hours",
      action: "Schedule 20-30 minute irrigation session",
    });
  } else if (soil.moisture > 65) {
    recommendations.push({
      type: "info",
      message: "Skip irrigation today",
      action: "Soil has adequate moisture",
    });
  }

  // Weather-based adjustments (if weather data available)
  if (weather) {
    if (weather.humidity > 80) {
      estimatedWater *= 0.7;
      recommendations.push({
        type: "info",
        message: "Reduced water needed due to high humidity",
        action: "Reduce irrigation by 30%",
      });
    }

    if (weather.temperature > 35) {
      recommendations.push({
        type: "warning",
        message: "High temperature - irrigate during cooler hours",
        action: "Best time: 5-7 AM or 5-7 PM",
      });
    }
  }

  // Best irrigation schedule based on crop type (generic)
  const optimalSchedule = {
    drip: "2-3 hours daily in summer, 1-2 hours in winter",
    flood: "Every 5-7 days in summer, 10-12 days in winter",
    sprinkler: "Every 3-4 days for 30-45 minutes",
  };

  return {
    irrigationNeeded,
    priority,
    estimatedWater,
    recommendations,
    optimalSchedule,
    nextSuggested: irrigationNeeded ? "Today" : "In 2-3 days",
  };
};

/**
 * Get fertilizer schedule based on crop and soil
 */
export const getFertilizerSchedule = (crop = "Tomato", soil) => {
  const schedule = [
    {
      stage: "Pre-Sowing",
      timing: "Before planting",
      fertilizer: "Organic Compost + DAP",
      dosage: "2 tons compost + 50kg DAP per hectare",
      status: "completed",
    },
    {
      stage: "Vegetative",
      timing: "15-20 days after planting",
      fertilizer: "Urea",
      dosage: "40-50kg per hectare",
      status: "upcoming",
    },
    {
      stage: "Flowering",
      timing: "35-40 days after planting",
      fertilizer: "NPK 19:19:19",
      dosage: "25kg per hectare via drip",
      status: "pending",
    },
    {
      stage: "Fruiting",
      timing: "50-60 days after planting",
      fertilizer: "Potash + Calcium Nitrate",
      dosage: "20kg potash + 15kg calcium nitrate",
      status: "pending",
    },
  ];

  return schedule;
};

/**
 * Get 30-day moisture trend data
 */
export const getMoistureTrend = () => {
  const data = [];
  const now = Date.now();
  for (let i = 30; i >= 0; i--) {
    const date = new Date(now - i * 24 * 60 * 60 * 1000);
    data.push({
      date: date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      }),
      moisture: Math.round(35 + Math.random() * 30),
      temperature: Math.round(22 + Math.random() * 10),
    });
  }
  return data;
};

/**
 * Update irrigation status
 */
export const triggerIrrigation = (durationMinutes) => {
  irrigationData.pumpStatus = "running";
  irrigationData.lastIrrigated = new Date();

  // Simulate irrigation effect on moisture
  setTimeout(() => {
    soilData.moisture = Math.min(75, soilData.moisture + durationMinutes * 0.5);
    irrigationData.pumpStatus = "off";
    irrigationData.todayUsage += durationMinutes * 15; // ~15 liters per minute
  }, 2000); // Simulate quick update for demo

  return {
    status: "started",
    duration: durationMinutes,
    estimatedWater: durationMinutes * 15,
  };
};

export default {
  getSoilData,
  getIrrigationData,
  analyzeSoilHealth,
  getIrrigationRecommendation,
  getFertilizerSchedule,
  getMoistureTrend,
  triggerIrrigation,
};
