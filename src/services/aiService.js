import { findNearestMandis, getCurrentLocation } from "./marketService";

// ---------------------------------------------------------------------------
// Groq config
// Add to .env:  VITE_GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx
// ---------------------------------------------------------------------------
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

// Primary: Llama 4 Scout — best intelligence + multilingual, 460+ t/s on Groq
// Fallback: Llama 3.1 8B Instant — 710 t/s, great for simple structured JSON
const MODEL_PRIMARY = "meta-llama/llama-4-scout-17b-16e-instruct";
const MODEL_FALLBACK = "llama-3.1-8b-instant";

if (!GROQ_API_KEY) {
  console.warn("⚠️  VITE_GROQ_API_KEY is missing from .env!");
}

// ---------------------------------------------------------------------------
// Global serial queue — Groq free tier allows 30 req/min.
// 2s gap = max 30 req/min — perfectly safe, no waiting in practice.
// ---------------------------------------------------------------------------
let _queuePromise = Promise.resolve();
const MIN_GAP_MS = 2000;

const enqueue = (fn) => {
  _queuePromise = _queuePromise
    .then(() => new Promise((r) => setTimeout(r, MIN_GAP_MS)))
    .then(fn)
    .catch((err) => {
      console.error("AI queue error:", err);
      _queuePromise = Promise.resolve(); // reset on error
      return null;
    });
  return _queuePromise;
};

// ---------------------------------------------------------------------------
const LANGUAGE_NAMES = {
  "en-IN": "English",
  "hi-IN": "Hindi",
  "gu-IN": "Gujarati",
  "ta-IN": "Tamil",
  "te-IN": "Telugu",
  "kn-IN": "Kannada",
  "mr-IN": "Marathi",
  "bn-IN": "Bengali",
  "pa-IN": "Punjabi",
};

// ---------------------------------------------------------------------------
// Core fetch — supports automatic model fallback
// ---------------------------------------------------------------------------
const _doRequest = async (
  prompt,
  language,
  model = MODEL_PRIMARY,
  retries = 0,
  customSystemPrompt = null,
) => {
  const targetLang = LANGUAGE_NAMES[language] || "English";
  const langSuffix = `\nIMPORTANT: Reply in ${targetLang}.`;
  const jsonInstruction = model !== "plain-text" ? " Keep JSON keys in English; translate all values to " + targetLang + ". Always reply with valid JSON only — no markdown fences, no preamble, no extra text." : "";

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model === "plain-text" ? MODEL_PRIMARY : model,
      messages: [
        {
          role: "system",
          content: customSystemPrompt || "You are Krishi Mitra, an expert agricultural AI assistant for Indian farmers. Always reply with valid JSON only — no markdown fences, no preamble, no extra text.",
        },
        { role: "user", content: prompt + langSuffix + (customSystemPrompt ? "" : jsonInstruction) },
      ],
      temperature: 0.4,
      max_tokens: 2048,
      response_format: model === "plain-text" ? undefined : { type: "json_object" },
    }),
  });

  // Rate limited — back off and retry
  if (response.status === 429) {
    if (retries >= 3) {
      // If primary model keeps failing, switch to faster 8B
      if (model === MODEL_PRIMARY) {
        console.warn("Switching to fallback model:", MODEL_FALLBACK);
        return _doRequest(prompt, language, MODEL_FALLBACK, 0);
      }
      console.error("Max retries exceeded.");
      return null;
    }
    const wait = Math.pow(2, retries) * 2000; // 2s, 4s, 8s
    console.warn(
      `[Groq] Rate limited. Retrying in ${wait / 1000}s… (${retries + 1}/3)`,
    );
    await new Promise((r) => setTimeout(r, wait));
    return _doRequest(prompt, language, model, retries + 1);
  }

  // Model not available — fall back instantly
  if (response.status === 404 || response.status === 400) {
    if (model === MODEL_PRIMARY) {
      console.warn(
        `[Groq] ${model} unavailable, switching to ${MODEL_FALLBACK}`,
      );
      return _doRequest(prompt, language, MODEL_FALLBACK, 0);
    }
    throw new Error(`Groq API error: ${response.status}`);
  }

  if (!response.ok) throw new Error(`Groq API error: ${response.status}`);

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("Empty model response");
  return text;
};

// Public wrapper — always serialised through the queue
const generateAIResponse = (prompt, language = "en-IN", customSystemPrompt = null) =>
  enqueue(() => _doRequest(prompt, language, customSystemPrompt ? "plain-text" : MODEL_PRIMARY, 0, customSystemPrompt));

export { generateAIResponse };

// ---------------------------------------------------------------------------
// JSON extractor — handles both native JSON mode and wrapped responses
// ---------------------------------------------------------------------------
const parseJSON = (raw) => {
  if (!raw) return null;
  try {
    // Try direct parse first (Groq json_object mode returns clean JSON)
    return JSON.parse(raw);
  } catch (_) {
    // Fall back to regex extraction
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      return match ? JSON.parse(match[0]) : null;
    } catch (e) {
      console.error("JSON parse failed:", e);
      return null;
    }
  }
};

// Safe weather helper — handles {temp} and {temperature} shapes
const safeWeather = (w) => ({
  temp: w?.temperature ?? w?.temp ?? 28,
  humidity: w?.humidity ?? 60,
  rain: w?.rainForecast ? "Yes" : "No",
});

// ---------------------------------------------------------------------------
// Disease analysis
// ---------------------------------------------------------------------------
// export const getAIDiseaseAnalysis = async (
//   disease,
//   cropType = "Tomato",
//   farmArea = 0.8,
//   language = "en-IN"
// ) => {
//   const prompt = `You are an agricultural disease expert for Indian farms.
// Analyze the following and return a JSON treatment plan.

// Disease: ${disease.name}
// Scientific Name: ${disease.scientificName || "Unknown"}
// Crop: ${cropType} | Farm Area: ${farmArea} hectares
// Severity: ${disease.severity || "Medium"} | Symptoms: ${disease.symptoms || "Not specified"}

// Return this exact JSON:
// {
//   "diagnosis": {
//     "confirmed": true,
//     "confidence": 85,
//     "stage": "Early",
//     "spreadRisk": "Medium"
//   },
//   "immediateActions": ["Action 1", "Action 2", "Action 3"],
//   "treatmentPlan": {
//     "organic": [
//       { "name": "Neem Oil Spray", "dosage": "5ml/L", "frequency": "Every 5 days", "cost": 150 }
//     ],
//     "chemical": [
//       { "name": "Mancozeb 75% WP", "dosage": "2.5g/L", "frequency": "Every 10 days", "cost": 300 }
//     ]
//   },
//   "prevention": ["Tip 1", "Tip 2", "Tip 3"],
//   "monitoring": {
//     "schedule": "Check every 2 days",
//     "signsToWatch": ["Sign 1", "Sign 2"]
//   },
//   "recoveryTimeline": "10-14 days",
//   "totalEstimatedCost": 500,
//   "successRate": "85% with early intervention"
// }`;

//   return parseJSON(await generateAIResponse(prompt, language)) ?? getDefaultDiseaseAnalysis(disease, farmArea);
// };

// ---------------------------------------------------------------------------
// Irrigation recommendation
// ---------------------------------------------------------------------------
export const getAIIrrigationRecommendation = async (
  soilData,
  weatherData,
  cropType = "Tomato",
  language = "en-IN",
) => {
  const prompt = `You are a senior agricultural advisor in India specializing in Gujarat farms.
Recommend exactly 5 best crops for these conditions and return as JSON.

FARM CONDITIONS:
- Location: ${location || "Gujarat, India"}
- Season: ${season}
- Soil Type: ${soilType}
- Water Availability: ${waterAvailability}
- Farm Area: ${farmArea} hectares
- Temperature: ${w.temp}°C | Humidity: ${w.humidity}%

${marketContext}

STRICT RULES:
1. Only recommend crops that grow well in ${soilType} soil
2. If water is "Low" — exclude Rice, Sugarcane, Banana
3. Only recommend crops suitable for ${season} season
4. Use live prices above for revenue calculations
5. netProfit = expectedRevenue - cultivationCost - transportCost

REALISTIC INDIAN BENCHMARKS — YOU MUST STAY WITHIN THESE RANGES:
- Tomato:      yield 8–14 tons/ha, farm-gate ₹8–18/kg,  cultivation cost ₹1,20,000–1,80,000/ha
- Onion:       yield 10–15 tons/ha, farm-gate ₹10–20/kg, cultivation cost ₹80,000–1,20,000/ha
- Wheat:       yield 3.5–5 tons/ha, MSP ₹22–24/kg,      cultivation cost ₹35,000–50,000/ha
- Cotton:      yield 1.5–2.5 tons/ha, MSP ₹60–65/kg,    cultivation cost ₹60,000–90,000/ha
- Potato:      yield 15–25 tons/ha, farm-gate ₹8–14/kg, cultivation cost ₹80,000–1,20,000/ha
- Cauliflower: yield 15–20 tons/ha, farm-gate ₹8–15/kg, cultivation cost ₹60,000–90,000/ha
- Chilli:      yield 1.5–3 tons/ha (dry), farm-gate ₹80–120/kg, cost ₹80,000–1,20,000/ha
- Net profit on most crops: ₹20,000–₹1,50,000/ha. ROI above 120% is exceptional.
- Scale all revenue and cost figures by farm area: ${farmArea} hectares.

Return this exact JSON with exactly 5 recommendations:
{
  "recommendations": [
    {
      "crop": "Wheat",
      "score": 88,
      "verdict": "HIGHLY RECOMMENDED",
      "seasonMatch": true,
      "soilMatch": true,
      "waterMatch": true,
      "reasons": ["Grows well in Loamy soil due to good water retention", "Rabi season is ideal for wheat in Gujarat"],
      "duration": 130,
      "yieldPerHectare": "4 tons",
      "currentMarketPrice": 23,
      "expectedRevenue": 92000,
      "cultivationCost": 42000,
      "transportCost": 5000,
      "netProfit": 45000,
      "roi": 97,
      "risks": ["Unseasonal rain near harvest can damage grain"],
      "tips": ["Use HD-2967 or GW-496 varieties for Gujarat climate"]
    }
  ],
  "seasonalAdvice": "...",
  "marketTrend": "...",
  "bestTime": "..."
}`;

  return (
    console.log("=== MARKET CONTEXT SENT TO AI ==="),
    console.log(marketContext),
    console.log("================================="),
    parseJSON(await generateAIResponse(prompt, language)) ??
    getDefaultIrrigationRecommendation(soilData)
  );

};

// ---------------------------------------------------------------------------
// Weekly action plan
// ---------------------------------------------------------------------------
export const getAIWeeklyActionPlan = async (farmData, language = "en-IN") => {
  const { crop, area, soilMoisture, weather, growthStage } = farmData;
  const w = safeWeather(weather);

  const prompt = `You are a farm management advisor for Indian farmers.
Create a 7-day action plan and return as JSON.

Farm: Crop ${crop || "Tomato"}, Area ${area || 0.8} ha, Stage ${growthStage || "Vegetative"}
Conditions: Moisture ${soilMoisture || 45}%, Temp ${w.temp}°C, Humidity ${w.humidity}%, Rain: ${w.rain === "Yes" ? "Expected" : "None"}

Return this exact JSON (include all 7 days):
{
  "weekOf": "Current week",
  "actions": [
    {
      "day": "Monday",
      "date": "Today",
      "tasks": [
        { "time": "6 AM", "task": "Morning irrigation", "priority": "high", "completed": false },
        { "time": "9 AM", "task": "Pest inspection", "priority": "medium", "completed": false }
      ]
    }
  ],
  "keyAlerts": ["Alert 1"],
  "weatherAdvisory": "Weather advice here",
  "expectedOutcomes": "Expected results this week"
}`;

  return (
    parseJSON(await generateAIResponse(prompt, language)) ??
    getDefaultWeeklyPlan()
  );
};

// ---------------------------------------------------------------------------
// Crop tracking
// ---------------------------------------------------------------------------
export const getAICropTracking = async (
  cropType,
  currentStage,
  daysSinceSowing,
  language = "en-IN",
) => {
  const prompt = `You are a crop growth expert for Indian agriculture.
Provide a complete crop tracking report as JSON.

Crop: ${cropType} | Current Stage: ${currentStage} | Days Since Sowing: ${daysSinceSowing}

Return this exact JSON:
{
  "currentStage": {
    "name": "${currentStage}",
    "progress": 45,
    "daysRemaining": 20,
    "description": "Stage description"
  },
  "nextMilestone": {
    "stage": "Next stage name",
    "expectedIn": "15 days",
    "preparation": ["Prep task 1", "Prep task 2"]
  },
  "todaysTasks": [
    { "task": "Task description", "priority": "high", "reason": "Why important" }
  ],
  "irrigationSchedule": {
    "frequency": "Every 2-3 days",
    "amount": "15-20 liters per plant",
    "nextIrrigation": "Tomorrow 6 AM"
  },
  "fertilizerSchedule": {
    "currentWeek": "NPK 19:19:19 application",
    "dosage": "5g per plant",
    "method": "Drip fertigation",
    "nextApplication": "In 5 days"
  },
  "pestWatch": ["Pest 1", "Pest 2"],
  "harvestForecast": {
    "expectedDate": "In 60 days",
    "daysRemaining": 60,
    "expectedYield": "25-30 tons per hectare"
  }
}`;

  return (
    parseJSON(await generateAIResponse(prompt, language)) ??
    getDefaultCropTracking(cropType, daysSinceSowing)
  );
};

// ---------------------------------------------------------------------------
// Market analysis
// ---------------------------------------------------------------------------
export const getMarketAnalysis = async (
  crop = "Tomato",
  location = "Gujarat",
  language = "en-IN",
) => {
  // Replace the marketContext block and prompt in getAICropRecommendation:

  let marketContext = "";
  const liveprices = {}; // track which crops have live data

  try {
    const userLocation = await getCurrentLocation();
    const commodities = [
      "Tomato",
      "Potato",
      "Onion",
      "Wheat",
      "Cotton",
      "Chilli Red",
      "Cauliflower",
      "Cabbage",
    ];

    const results = await Promise.allSettled(
      commodities.map((c) =>
        findNearestMandis(c, 1000, "Gujarat", userLocation),
      ),
    );

    const lines = [];
    commodities.forEach((c, i) => {
      if (results[i].status === "fulfilled" && results[i].value?.length) {
        const best = results[i].value[0];
        liveprices[c] = best.pricePerKg;
        lines.push(
          `• ${c}: ₹${best.pricePerKg}/kg modal price at ${best.market} mandi (arrived ${best.arrivalDate})`,
        );
      }
    });

    marketContext = lines.length
      ? `LIVE GOVERNMENT MANDI PRICES (data.gov.in — use EXACTLY these prices):\n${lines.join("\n")}`
      : "Live mandi data unavailable — use conservative estimates from AGMARKNET averages.";
  } catch (_) {
    marketContext = "Live mandi data unavailable — use conservative estimates.";
  }

  const prompt = `You are a senior agricultural advisor for Gujarat farmers.
Recommend exactly 5 crops and return as JSON.

FARM CONDITIONS:
- Location: ${location || "Gujarat, India"}
- Season: ${season}
- Soil: ${soilType} | Water: ${waterAvailability}
- Area: ${farmArea} hectares
- Temp: ${w.temp}°C | Humidity: ${w.humidity}%

${marketContext}

YIELD BENCHMARKS (ICAR averages — do not exceed these):
- Tomato: 8–14 tons/ha | Onion: 10–15 tons/ha | Wheat: 3.5–5 tons/ha
- Cotton: 1.5–2.5 tons/ha | Potato: 15–25 tons/ha | Cauliflower: 15–20 tons/ha
- Chilli Red: 1.5–3 tons/ha (dry) | Cabbage: 20–30 tons/ha

CULTIVATION COST BENCHMARKS (include seeds, fertilizer, labor, irrigation, pesticide):
- Tomato: ₹1,20,000–1,80,000/ha | Onion: ₹80,000–1,20,000/ha
- Wheat: ₹35,000–50,000/ha | Cotton: ₹60,000–90,000/ha
- Potato: ₹80,000–1,20,000/ha | Cauliflower: ₹60,000–90,000/ha
- Scale all costs by farm area: ${farmArea} ha

CALCULATION RULES:
- Use ONLY the live mandi prices above for currentMarketPrice — do not invent prices
- expectedRevenue = yieldTons × 1000 × currentMarketPrice × ${farmArea}
- transportCost = ~5% of expectedRevenue

- netProfit = expectedRevenue − cultivationCost − transportCost
- roi = (netProfit / (cultivationCost + transportCost)) × 100
- Typical net profit range: ₹20,000–₹1,50,000/ha. Flag anything above ₹2,00,000/ha as high-risk.



RULES:
1. Only crops suitable for ${soilType} soil and ${season} season
2. Water "Low" → exclude Rice, Sugarcane, Banana
3. If no live price available for a crop, use conservative AGMARKNET estimate
4. RECHECK IF U GET ROI AS MORE THAN 150% THEN SOMETHING IS WRONG. DO THE THING FOR THE CROP AGAIN AND THEN GIVE REALISTIC PRICES.

Return exactly this JSON (5 items):
{
  // "recommendations": [
  //   {
  //     "crop": "Wheat",
  //     "score": 88,
  //     "verdict": "HIGHLY RECOMMENDED",
  //     "seasonMatch": true,
  //     "soilMatch": true,
  //     "waterMatch": true,
  //     "reasons": ["Suits ${soilType} soil well", "Ideal for ${season} in Gujarat"],
  //     "duration": 130,
  //     "yieldPerHectare": "4 tons",
  //     "currentMarketPrice": 23,
  //     "priceFarmerSellsToMandi": 13,
  //     "expectedRevenue": 52000,
  //     "cultivationCost": 20000,
  //     "transportCost": 5600,
  //     "netProfit": 26400,
  //     "roi": 113.08,
  //     "risks": ["Unseasonal rain near harvest"],
  //     "tips": ["Use GW-496 variety for Gujarat climate"]
  //   }
  // ],
  "seasonalAdvice": "...",
  "marketTrend": "...",
  "bestTime": "..."
}`;

  return parseJSON(await generateAIResponse(prompt, language));
};

// ---------------------------------------------------------------------------
// Crop recommendation (grounds AI with live mandi data)
// ---------------------------------------------------------------------------
export const getAICropRecommendation = async (farmData, language = "en-IN") => {
  const { soilType, farmArea, waterAvailability, weather, season, location } = farmData;
  const w = safeWeather(weather);

  // Fetch live market prices to ground the AI's profit estimates
  const commodities = [
    "Tomato",
    "Potato",
    "Onion",
    "Wheat",
    "Cotton",
    "Chilli Red",
    "Cauliflower",
    "Cabbage",
  ];

  let marketContext = "";
  let results = [];

  try {
    const userLocation = await getCurrentLocation();
    results = await Promise.allSettled(
      commodities.map((c) => findNearestMandis(c, 1000, "Gujarat", userLocation)),
    );

    const lines = [];
    commodities.forEach((c, i) => {
      if (results[i].status === "fulfilled" && results[i].value?.length) {
        const best = results[i].value[0];
        lines.push(
          `• ${c}: ₹${best.pricePerKg}/kg at ${best.market} (${best.distance ?? "?"}km).`,
        );
      }
    });

    marketContext = lines.length
      ? `LIVE MARKET PRICES (Gujarat):\n${lines.join("\n")}`
      : "Live mandi data unavailable — use general market estimates.";
  } catch (_) {
    marketContext = "Live mandi data unavailable — use general market estimates.";
  }

  const prompt = `You are a senior agricultural advisor for Gujarat farmers.
Recommend exactly 5 crops and return as JSON.

FARM CONDITIONS:
- Location: ${location || "Gujarat, India"}
- Season: ${season}
- Soil: ${soilType} | Water: ${waterAvailability}
- Area: ${farmArea} hectares
- Temp: ${w.temp}°C | Humidity: ${w.humidity}%

LIVE GOVERNMENT MANDI PRICES (data.gov.in) — YOU MUST USE EXACTLY THESE PRICES:
${marketContext.replace("LIVE MARKET PRICES (Gujarat):", "").trim()}

YIELD BENCHMARKS — DO NOT EXCEED THESE (ICAR national averages):
- Tomato: 8–14 tons/ha | Onion: 10–15 tons/ha | Wheat: 3.5–5 tons/ha
- Cotton: 1.5–2.5 tons/ha | Potato: 15–25 tons/ha | Cauliflower: 15–20 tons/ha
- Chilli Red: 1.5–3 tons/ha (dry weight) | Cabbage: 20–30 tons/ha

CULTIVATION COSTS (full input cost including seeds, fertilizer, labor, irrigation, pesticide):
- Tomato: ₹1,20,000–1,80,000/ha | Onion: ₹80,000–1,20,000/ha
- Wheat: ₹35,000–50,000/ha | Cotton: ₹60,000–90,000/ha
- Potato: ₹80,000–1,20,000/ha | Cauliflower: ₹60,000–90,000/ha
- Chilli Red: ₹80,000–1,20,000/ha | Cabbage: ₹50,000–80,000/ha
- All costs must be multiplied by farm area: ${farmArea} ha

MANDATORY CALCULATION RULES:
- currentMarketPrice = use the live mandi price above (₹/kg)
- priceFarmerSellsToMandi = 50% of currentMarketPrice
- expectedRevenue = yieldTons × 1000 × priceFarmerSellsToMandi × ${farmArea}
- transportCost = 5% of expectedRevenue
- netProfit = priceFarmerSellsToMandi × 1000 × ${farmArea} − cultivationCost − transportCost
- roi = round((netProfit / (cultivationCost + transportCost)) × 100)
- Realistic net profit: ₹20,000–₹1,50,000/ha for most crops
- ROI above 150% means your costs are wrong — recheck
-the market price is for the customer who is buying from the mandi. so 50% of the mandi price is for the farmer. so give th net profit accordingly.
- so take 50% of the expectedRevenue as the farmer's revenue.

RULES:
1. Only crops suitable for ${soilType} soil
2. Only crops suitable for ${season} season
3. Water "Low" → exclude Rice, Sugarcane, Banana
4. Use ONLY the live mandi prices — never invent a price

Return exactly this JSON structure with 5 items:
{
  "recommendations": [
    {
      "crop": "Wheat",
      "score": 82,
      "verdict": "RECOMMENDED",
      "seasonMatch": true,
      "soilMatch": true,
      "waterMatch": true,
      "reasons": ["Alluvial soil retains moisture well for wheat roots", "Rabi season aligns with wheat growth cycle"],
      "duration": 130,
      "yieldPerHectare": "4 tons",
      "currentMarketPrice": 23,
      "priceFarmerSellsToMandi": 13,
      "expectedRevenue": 52000,
      "cultivationCost": 20000,
      "transportCost": 5600,
      "netProfit": 26400,
      "roi": 113.08,
      "risks": ["Unseasonal rain near harvest can damage grain quality"],
      "tips": ["Use GW-496 variety suited for Gujarat agro-climate"]
    }
  ],
  "seasonalAdvice": "...",
  "marketTrend": "...",
  "bestTime": "..."
}`;
  console.log("=== MARKET CONTEXT ===");
  console.log(marketContext);
  console.log("=== PROMPT ===");
  console.log(prompt); 

  const raw = await generateAIResponse(prompt, language);
  console.log("=== RAW RESPONSE ===");
  console.log(raw);
  const parsed = parseJSON(raw);

  if (parsed?.recommendations) {
  // Build a lookup from live mandi data.
  // Mandi modal price ≠ farmer's take-home price.
  // Deduct ~50% for: arhatiya commission, mandi cess, labour/handling, weighing charges, etc.
  const FARMER_PRICE_FACTOR = 0.50;

  const mandiLookup = {};
  commodities.forEach((c, i) => {
    if (results[i].status === "fulfilled" && results[i].value?.length) {
      const best = results[i].value[0];
      const mandiPrice = best.pricePerKg;
      const farmerPrice = Math.round(mandiPrice * FARMER_PRICE_FACTOR * 100) / 100;
      mandiLookup[c.toLowerCase()] = {
        mandiName: best.market,
        mandiDistrict: best.district,
        distance: best.distance,
        mandiPricePerKg: mandiPrice,       // modal price at mandi (consumer/trader price)
        farmerPricePerKg: farmerPrice,     // actual farmer take-home after all deductions
        arrivalDate: best.arrivalDate,
        transportCost: best.transportCost,
        vehicle: best.transport?.vehicle,
      };
    }
  });

  parsed.recommendations = parsed.recommendations.map((rec, i) => {
    const mandi = mandiLookup[rec.crop.toLowerCase()] || null;

    // Use farmer price (after mandi deductions) for accurate revenue.
    // If no live mandi data, fall back to AI price with 10% deduction applied.
    const farmerPrice = mandi?.farmerPricePerKg ?? Math.round((rec.currentMarketPrice || 0) * FARMER_PRICE_FACTOR);
    const yieldTons   = parseFloat(rec.yieldPerHectare) || 0;
    const revenue     = mandi
      ? Math.round(yieldTons * 1000 * farmerPrice * (farmArea || 1))
      : rec.expectedRevenue || 0;

    const cultCost  = rec.cultivationCost || 0;
    const transCost = mandi?.transportCost ?? rec.transportCost ?? 0;
    const profit    = revenue - cultCost - transCost;
    const totalInv  = cultCost + transCost;

    return {
      ...rec,
      currentMarketPrice: farmerPrice,       // show farmer price, not inflated mandi price
      mandiModalPrice: mandi?.mandiPricePerKg ?? rec.currentMarketPrice, // keep original for reference
      expectedRevenue: revenue,
      rank: i + 1,
      netProfit: profit,
      transportCost: transCost,
      roi: totalInv > 0 ? Math.round((profit / totalInv) * 100) : 0,
      profitPerHectare: Math.round(profit / (farmArea || 1)),
      nearestMandi: mandi,
    };
  });
  return parsed;
}

  return getDefaultCropRecommendation(farmData);
};

// ---------------------------------------------------------------------------
// Fallback defaults (used when AI call fails or times out)
// ---------------------------------------------------------------------------
const getDefaultDiseaseAnalysis = (disease, farmArea) => ({
  diagnosis: {
    confirmed: true,
    confidence: 80,
    stage: "Moderate",
    spreadRisk: "Medium",
  },
  immediateActions: [
    "Remove and destroy severely affected leaves immediately",
    "Increase plant spacing to improve air circulation",
    "Avoid overhead irrigation — switch to drip",
  ],
  treatmentPlan: {
    organic: [
      {
        name: "Neem Oil Spray",
        dosage: "5ml/L water",
        frequency: "Every 5-7 days",
        cost: 150,
      },
      {
        name: "Copper Fungicide",
        dosage: "3g/L water",
        frequency: "Every 7 days",
        cost: 200,
      },
    ],
    chemical: [
      {
        name: "Mancozeb 75% WP",
        dosage: "2.5g/L water",
        frequency: "Every 10 days",
        cost: 300,
      },
      {
        name: "Chlorothalonil",
        dosage: "2g/L water",
        frequency: "Every 7 days",
        cost: 350,
      },
    ],
  },
  prevention: [
    "Use certified disease-free seeds",
    "Practice crop rotation every 3-4 years",
    "Maintain proper plant spacing for airflow",
    "Apply preventive fungicide during humid weather",
  ],
  monitoring: {
    schedule: "Check every 2 days",
    signsToWatch: [
      "New yellow/brown spots",
      "Spreading lesions",
      "Wilting tips",
    ],
  },
  recoveryTimeline: "10-14 days with consistent treatment",
  totalEstimatedCost: Math.round(500 * (farmArea || 1)),
  successRate: "80-85% with proper treatment",
});

const getDefaultIrrigationRecommendation = (soilData) => {
  const m = soilData?.moisture ?? 45;
  return {
    recommendation:
      m < 35 ? "Irrigate Now" : m < 50 ? "Schedule Tomorrow" : "Skip Today",
    reason:
      m < 35 ? "Soil moisture critically low" : "Moisture levels adequate",
    waterAmount: "500-600 liters per hectare",
    bestTime: "5:30 - 7:00 AM",
    duration: "25-30 minutes",
    method: "Drip Irrigation",
    weeklySchedule: [
      { day: "Monday", irrigate: true, time: "6 AM", duration: "25 min" },
      { day: "Tuesday", irrigate: false, reason: "Recovery day" },
      { day: "Wednesday", irrigate: true, time: "6 AM", duration: "25 min" },
      { day: "Thursday", irrigate: false, reason: "Recovery day" },
      { day: "Friday", irrigate: true, time: "6 AM", duration: "25 min" },
      { day: "Saturday", irrigate: false, reason: "Weekend rest" },
      { day: "Sunday", irrigate: true, time: "7 AM", duration: "20 min" },
    ],
    waterSavingTips: [
      "Use mulching to reduce soil evaporation by 30%",
      "Irrigate during early morning to minimize evaporation losses",
      "Inspect pipes weekly for leaks",
    ],
    alerts:
      m < 30
        ? ["⚠️ Critical: Immediate irrigation required — plants at stress risk"]
        : [],
  };
};

const getDefaultWeeklyPlan = () => {
  const d = (n) =>
    new Date(Date.now() + n * 86400000).toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
    });
  return {
    weekOf: `${d(0)} week`,
    actions: [
      {
        day: "Monday",
        date: d(0),
        tasks: [
          {
            time: "6 AM",
            task: "Morning irrigation - 25 minutes",
            priority: "high",
            completed: false,
          },
          {
            time: "9 AM",
            task: "Inspect plants for pests/diseases",
            priority: "medium",
            completed: false,
          },
        ],
      },
      {
        day: "Tuesday",
        date: d(1),
        tasks: [
          {
            time: "7 AM",
            task: "Weed removal around plant base",
            priority: "medium",
            completed: false,
          },
          {
            time: "5 PM",
            task: "Apply organic fertilizer",
            priority: "high",
            completed: false,
          },
        ],
      },
      {
        day: "Wednesday",
        date: d(2),
        tasks: [
          {
            time: "6 AM",
            task: "Morning irrigation - 25 minutes",
            priority: "high",
            completed: false,
          },
          {
            time: "10 AM",
            task: "Check and record soil moisture",
            priority: "low",
            completed: false,
          },
        ],
      },
      {
        day: "Thursday",
        date: d(3),
        tasks: [
          {
            time: "8 AM",
            task: "Fungicide/pesticide application",
            priority: "high",
            completed: false,
          },
          {
            time: "4 PM",
            task: "Check irrigation drip lines",
            priority: "medium",
            completed: false,
          },
        ],
      },
      {
        day: "Friday",
        date: d(4),
        tasks: [
          {
            time: "6 AM",
            task: "Morning irrigation - 25 minutes",
            priority: "high",
            completed: false,
          },
          {
            time: "9 AM",
            task: "Growth stage assessment",
            priority: "medium",
            completed: false,
          },
        ],
      },
      {
        day: "Saturday",
        date: d(5),
        tasks: [
          {
            time: "7 AM",
            task: "Field scouting for new infections",
            priority: "high",
            completed: false,
          },
          {
            time: "5 PM",
            task: "Record farm observations in app",
            priority: "low",
            completed: false,
          },
        ],
      },
      {
        day: "Sunday",
        date: d(6),
        tasks: [
          {
            time: "7 AM",
            task: "Light irrigation if needed",
            priority: "medium",
            completed: false,
          },
          {
            time: "10 AM",
            task: "Weekly farm maintenance check",
            priority: "low",
            completed: false,
          },
        ],
      },
    ],
    keyAlerts: [
      "Monitor humidity levels — high risk of fungal spread this week",
    ],
    weatherAdvisory:
      "Warm weather expected — increase irrigation frequency if temp exceeds 35°C",
    expectedOutcomes:
      "Healthy vegetative growth; prepare support structures for flowering stage",
  };
};

const getDefaultCropTracking = (cropType, d) => ({
  currentStage: {
    name:
      d < 20
        ? "Seedling"
        : d < 45
          ? "Vegetative"
          : d < 65
            ? "Flowering"
            : "Fruiting",
    progress: Math.min(100, Math.round((d / 90) * 100)),
    daysRemaining: Math.max(0, 45 - d),
    description: "Plants developing normally — continue standard care routine",
  },
  nextMilestone: {
    stage: d < 45 ? "Flowering" : "Fruiting",
    expectedIn: `${Math.max(5, 45 - d)} days`,
    preparation: [
      "Ensure phosphorus-rich fertilizer for flowering",
      "Set up support stakes before flowering",
    ],
  },
  todaysTasks: [
    {
      task: "Inspect all plants for disease signs",
      priority: "high",
      reason: "Early detection saves the entire crop",
    },
    {
      task: "Check and record soil moisture",
      priority: "medium",
      reason: "Consistent moisture improves yield by 20%",
    },
    {
      task: "Remove any yellowing/dead leaves",
      priority: "medium",
      reason: "Prevents disease spread to healthy tissue",
    },
  ],
  irrigationSchedule: {
    frequency: "Every 2-3 days",
    amount: "15-20 liters per plant",
    nextIrrigation: "Tomorrow 6 AM",
  },
  fertilizerSchedule: {
    currentWeek: "Balanced NPK 19:19:19 application",
    dosage: "5g per plant",
    method: "Drip fertigation",
    nextApplication: new Date(Date.now() + 5 * 86400000).toLocaleDateString(
      "en-IN",
      { month: "short", day: "numeric" },
    ),
  },
  pestWatch: ["Aphids", "Whiteflies", "Leaf miners", "Spider mites"],
  harvestForecast: {
    expectedDate: new Date(
      Date.now() + Math.max(0, 90 - d) * 86400000,
    ).toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    daysRemaining: Math.max(0, 90 - d),
    expectedYield: "25-30 tons per hectare",
  },
});

// In getDefaultCropRecommendation — replace crops array:
// In getDefaultCropRecommendation — replace crops array:
const getDefaultCropRecommendation = (farmData) => {
  const { farmArea = 1, season = "Rabi" } = farmData || {};
  
  const REALISTIC = {
    Tomato:      { yieldTons: 10, pricePerKg: 12, cost: 150000 },
    Wheat:       { yieldTons: 4,  pricePerKg: 23, cost: 42000  },
    Onion:       { yieldTons: 12, pricePerKg: 14, cost: 95000  },
    Potato:      { yieldTons: 20, pricePerKg: 10, cost: 100000 },
    Cauliflower: { yieldTons: 17, pricePerKg: 10, cost: 75000  },
  };

  const recommendations = [
    { crop: "Tomato",      score: 85, duration: 90},
    { crop: "Wheat",       score: 83, duration: 130},
    { crop: "Onion",       score: 80, duration: 120},
    { crop: "Potato",      score: 78, duration: 100},
    { crop: "Cauliflower", score: 75, duration: 90},
  ].map((c, i) => {
    const r     = REALISTIC[c.crop];
    const rev   = r.yieldTons * 1000 * r.pricePerKg * farmArea;
    const cost  = r.cost * farmArea;
    const trans = Math.round(rev * 0.03);
    const prof  = Math.round(rev - cost - trans);
    return {
      ...c,
      rank:             i + 1,
      verdict:          i === 0 ? "HIGHLY RECOMMENDED" : i < 3 ? "RECOMMENDED" : "CONSIDER",
      yieldPerHectare:  `${r.yieldTons} tons`,
      currentMarketPrice: r.pricePerKg,
      expectedRevenue:  Math.round(rev),
      cultivationCost:  Math.round(cost),
      transportCost:    trans,
      netProfit:        prof,
      profitPerHectare: Math.round(prof / farmArea),
      roi:              Math.round((prof / (cost + trans)) * 100),
      reasons:          ["Suitable for current soil and season", "Stable demand in Gujarat mandis"],
      risks:            ["Weather dependency", "Mandi price fluctuation at harvest"],
      tips:             ["Use certified seeds", "Follow recommended plant spacing"],
      seasonMatch:      true,
      soilMatch:        true,
      waterMatch:       true
    };
  });

  return {
    recommendations,
    seasonalAdvice: "Based on historical averages for this region.",
    marketTrend: "Stable prices expected for core commodities.",
    bestTime: "Consult local Agri-department for exact sowing dates."
  };
};

export default {
  generateAIResponse,
  // getAIDiseaseAnalysis,
  getAIIrrigationRecommendation,
  getAIWeeklyActionPlan,
  getAICropTracking,
  getMarketAnalysis,
  getAICropRecommendation,
};
