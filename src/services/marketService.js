import { generateAIResponse } from "./aiService";

const MANDI_API_KEY = "579b464db66ec23bdd000001083299c6529d42f64f91e61a5f6bf991";
const MANDI_RESOURCE_ID = "9ef84268-d588-465a-a308-a864a43d0070";
const MANDI_BASE_URL = "https://api.data.gov.in/resource";

// ---------------------------------------------------------------------------
// Mandi coordinates lookup (for distance & map display)
// The API returns market names as strings; we enrich them with coordinates.
// ---------------------------------------------------------------------------
const KNOWN_MANDI_COORDS = {
  // Gujarat
  "Ahmedabad":       { lat: 23.0258, lng: 72.5873 },
  "Gandhinagar":     { lat: 23.2156, lng: 72.6369 },
  "Mehsana":         { lat: 23.5880, lng: 72.3693 },
  "Rajkot":          { lat: 22.3039, lng: 70.8022 },
  "Surat":           { lat: 21.1702, lng: 72.8311 },
  "Vadodara":        { lat: 22.3072, lng: 73.1812 },
  "Anand":           { lat: 22.5645, lng: 72.9289 },
  "Bharuch":         { lat: 21.7051, lng: 72.9959 },
  "Junagadh":        { lat: 21.5222, lng: 70.4579 },
  "Bhavnagar":       { lat: 21.7645, lng: 72.1519 },
  "Amreli":          { lat: 21.6033, lng: 71.2215 },
  "Botad":           { lat: 22.1691, lng: 71.6688 },
  "Kheda":           { lat: 22.7500, lng: 72.6833 },
  "Patan":           { lat: 23.8500, lng: 72.1167 },
  "Banaskantha":     { lat: 24.1833, lng: 72.4333 },
  "Navsari":         { lat: 20.9467, lng: 72.9520 },
  "Valsad":          { lat: 20.5992, lng: 72.9342 },
  "Surendranagar":   { lat: 22.7272, lng: 71.6372 },
  "Morbi":           { lat: 22.8173, lng: 70.8376 },
  "Jamnagar":        { lat: 22.4707, lng: 70.0577 },
};

/**
 * Fuzzy-match a market/district string to our known coords table.
 * Returns { lat, lng } or null.
 */
const resolveCoords = (market = "", district = "") => {
  const targets = [market, district];
  for (const text of targets) {
    for (const [key, coords] of Object.entries(KNOWN_MANDI_COORDS)) {
      if (text.toLowerCase().includes(key.toLowerCase())) return coords;
    }
  }
  return null;
};

// ---------------------------------------------------------------------------
// Geolocation with caching
// ---------------------------------------------------------------------------
let _cachedLocation = null;

export const getCurrentLocation = (forceRefresh = false) =>
  new Promise((resolve) => {
    if (_cachedLocation && !forceRefresh) return resolve(_cachedLocation);

    if (!navigator.geolocation) {
      _cachedLocation = { lat: 23.0225, lng: 72.5714 };
      return resolve(_cachedLocation);
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        _cachedLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        resolve(_cachedLocation);
      },
      () => {
        // Fallback to Ahmedabad if denied or error
        _cachedLocation = { lat: 23.0225, lng: 72.5714 };
        resolve(_cachedLocation);
      },
      { enableHighAccuracy: false, timeout: 5000 } // reduced timeout and accuracy for faster fallback
    );
  });

// ---------------------------------------------------------------------------
// Haversine distance
// ---------------------------------------------------------------------------
const calcDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
};

// ---------------------------------------------------------------------------
// Transport fare (Gujarat rates)
// ---------------------------------------------------------------------------
const calcTransportFare = (distanceKm, quantityKg) => {
  if (quantityKg < 50) {
    const fare = Math.max(20, distanceKm * 2);
    return { vehicle: "bike", distanceKm, trips: 1, farePerTrip: fare,
             totalFare: Math.round(fare), farePerKg: Math.round((fare / quantityKg) * 100) / 100 };
  }
  const rates = {
    auto:  { baseRate: 20,  perKm: 8,  maxLoad: 150  },
    tempo: { baseRate: 80,  perKm: 12, maxLoad: 800  },
    truck: { baseRate: 300, perKm: 18, maxLoad: 5000 },
  };
  const vehicle = quantityKg > 800 ? "truck" : quantityKg > 150 ? "tempo" : "auto";
  const rate    = rates[vehicle];
  const trips   = Math.ceil(quantityKg / rate.maxLoad);
  const farePerTrip = rate.baseRate + distanceKm * rate.perKm;
  const totalFare   = Math.round(farePerTrip * trips * 1.5);
  return { vehicle, distanceKm, trips,
    farePerTrip: Math.round(farePerTrip), totalFare,
    farePerKg: Math.round((totalFare / quantityKg) * 100) / 100 };
};

// ---------------------------------------------------------------------------
// Core API call — fetches LIVE prices from data.gov.in
// ---------------------------------------------------------------------------
/**
 * Fetch mandi prices for a commodity, optionally filtered by state.
 *
 * API filters reference:
 *   filters[state]     = "Gujarat"
 *   filters[commodity] = "Tomato"
 *   filters[district]  = "Ahmedabad"
 *   limit              = max records (100 recommended for broader coverage)
 *
 * Returns array of raw API records:
 *   { state, district, market, commodity, variety, grade,
 *     arrival_date, min_price, max_price, modal_price }
 */
export const fetchLivePrices = async (commodity, state = "Gujarat", limit = 100) => {
  const params = new URLSearchParams({
    "api-key": MANDI_API_KEY,
    format: "json",
    limit: String(limit),
    "filters[commodity]": commodity,
    "filters[state]": state,
  });

  const url = `${MANDI_BASE_URL}/${MANDI_RESOURCE_ID}?${params}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Mandi API error: ${res.status} ${res.statusText}`);

  const json = await res.json();

  if (!json.records || json.records.length === 0) {
    throw new Error(`No live data found for "${commodity}" in ${state}. Try a different commodity name or state.`);
  }

  return json.records; // raw records from API
};

// ---------------------------------------------------------------------------
// findNearestMandis — the main function consumed by the app
// ---------------------------------------------------------------------------
export const findNearestMandis = async (commodity, quantityKg = 100, state = "Gujarat", userLocation = null) => {
  const [resolvedLocation, rawRecords] = await Promise.all([
    userLocation ? Promise.resolve(userLocation) : getCurrentLocation(),
    fetchLivePrices(commodity, state),
  ]);
  
  // const userLocation = resolvedLocation;

  // Group by market name, keep the record with the latest arrival_date
  const byMarket = {};
  for (const rec of rawRecords) {
    const key = `${rec.market}__${rec.district}`;
    if (!byMarket[key]) {
      byMarket[key] = rec;
    } else {
      // keep more recent record
      if (rec.arrival_date > byMarket[key].arrival_date) byMarket[key] = rec;
    }
  }

  const results = Object.values(byMarket).map((rec) => {
    // modal_price from API is ₹/quintal (100 kg) — convert to ₹/kg
    const modalPricePerQtl = parseFloat(rec.modal_price) || 0;
    const minPricePerQtl   = parseFloat(rec.min_price)   || 0;
    const maxPricePerQtl   = parseFloat(rec.max_price)   || 0;

    const pricePerKg = Math.round((modalPricePerQtl / 100) * 100) / 100;
    const minPerKg   = Math.round((minPricePerQtl   / 100) * 100) / 100;
    const maxPerKg   = Math.round((maxPricePerQtl   / 100) * 100) / 100;

    // Resolve coordinates
    const coords = resolveCoords(rec.market, rec.district);
    const lat    = coords?.lat ?? null;
    const lng    = coords?.lng ?? null;

    const distance   = lat != null && resolvedLocation
      ? calcDistance(resolvedLocation.lat, resolvedLocation.lng, lat, lng)
      : null;

    const transport    = distance != null ? calcTransportFare(distance, quantityKg) : null;
    const grossRevenue = pricePerKg * quantityKg;
    const transportCost = transport?.totalFare ?? 0;
    const netProfit    = Math.round(grossRevenue - transportCost);
    const profitPerKg  = Math.round((netProfit / quantityKg) * 100) / 100;

    return {
      // Identity
      market:      rec.market,
      district:    rec.district,
      state:       rec.state,
      commodity:   rec.commodity,
      variety:     rec.variety,
      grade:       rec.grade,
      arrivalDate: rec.arrival_date,

      // Prices (all ₹/kg)
      pricePerKg,
      minPerKg,
      maxPerKg,

      // Location
      lat,
      lng,
      distance, // km, null if coords unknown

      // Transport
      transport,
      transportCost,

      // Financials
      grossRevenue: Math.round(grossRevenue),
      netProfit,
      profitPerKg,
      profitMargin: grossRevenue > 0 ? Math.round((netProfit / grossRevenue) * 100) : 0,
      isProfitable: netProfit > 0,

      // Metadata
      tradingHours: "6 AM – 2 PM",
      demandLevel: maxPerKg - minPerKg < pricePerKg * 0.1 ? "Stable" : "Variable",
    };
  });

  // Sort: profitable first (by netProfit desc), then rest by pricePerKg desc
  return results.sort((a, b) => {
    if (a.isProfitable !== b.isProfitable) return a.isProfitable ? -1 : 1;
    return b.netProfit - a.netProfit;
  });
};

// ---------------------------------------------------------------------------
// getSmartSellingRecommendation
// ---------------------------------------------------------------------------
export const getSmartSellingRecommendation = async (
  commodity,
  quantityKg,
  state = "Gujarat",
  weatherData = null,
  userLocation = null
) => {
  const mandis   = await findNearestMandis(commodity, quantityKg, state, userLocation);
  const bestMandi    = mandis[0];
  const nearestMandi = [...mandis]
    .filter((m) => m.distance != null)
    .sort((a, b) => a.distance - b.distance)[0] ?? mandis[0];

  const profitableMandis = mandis.filter((m) => m.isProfitable);
  const allLoss          = profitableMandis.length === 0;
  const avgPrice         = mandis.reduce((s, m) => s + m.pricePerKg, 0) / mandis.length;

  let recommendation = { action: "SELL", urgency: "medium", reason: "", warning: null };

  if (allLoss) {
    recommendation.action  = "HOLD OR INCREASE QUANTITY";
    recommendation.urgency = "low";
    recommendation.reason  = `Transport costs exceed revenue for ${quantityKg} kg. Consider selling a larger batch or waiting for better prices.`;
    recommendation.warning = `At ${quantityKg} kg transport costs are too high. Try 200+ kg for better margins.`;
  } else if (profitableMandis.length === 1) {
    recommendation.action  = "SELL NOW";
    recommendation.urgency = "high";
    recommendation.reason  = `Only ${profitableMandis[0].market} offers profit. Act quickly!`;
  } else if (bestMandi.pricePerKg > avgPrice * 1.1) {
    recommendation.action  = "SELL NOW";
    recommendation.urgency = "high";
    recommendation.reason  = `Prices at ${bestMandi.market} are ${Math.round(((bestMandi.pricePerKg / avgPrice) - 1) * 100)}% above average. Excellent time to sell!`;
  } else {
    recommendation.action  = "SELL";
    recommendation.urgency = "medium";
    recommendation.reason  = "Prices are stable. Recommended to sell this week.";
  }

  if (weatherData?.rainForecast) {
    recommendation.weatherAdvice = "Rain expected — transport early morning to avoid delays.";
  }

  // Minimum quantity estimate when all routes are at a loss
  let minQuantityForProfit = null;
  if (allLoss && nearestMandi?.distance) {
    const d = nearestMandi.distance;
    minQuantityForProfit = Math.ceil((80 + d * 12 * 1.5) / bestMandi.pricePerKg) + 10;
  }

  return {
    recommendation,
    bestOption: {
      mandi:         bestMandi.market,
      district:      bestMandi.district,
      distance:      bestMandi.distance,
      pricePerKg:    bestMandi.pricePerKg,
      minPerKg:      bestMandi.minPerKg,
      maxPerKg:      bestMandi.maxPerKg,
      arrivalDate:   bestMandi.arrivalDate,
      transportFare: bestMandi.transportCost,
      netProfit:     bestMandi.netProfit,
      profitPerKg:   bestMandi.profitPerKg,
      vehicle:       bestMandi.transport?.vehicle,
      bestTime:      bestMandi.isProfitable ? "Arrive before 8 AM for best prices" : "Not recommended — increase quantity",
      isProfitable:  bestMandi.isProfitable,
    },
    nearestOption: nearestMandi
      ? {
          mandi:         nearestMandi.market,
          district:      nearestMandi.district,
          distance:      nearestMandi.distance,
          pricePerKg:    nearestMandi.pricePerKg,
          transportFare: nearestMandi.transportCost,
          netProfit:     nearestMandi.netProfit,
          profitPerKg:   nearestMandi.profitPerKg,
          isProfitable:  nearestMandi.netProfit > 0,
        }
      : null,
    allMandis: mandis.slice(0, 8),
    summary: {
      totalQuantity:          quantityKg,
      commodity,
      state,
      totalMarketsFound:      mandis.length,
      avgMarketPrice:         Math.round(avgPrice * 100) / 100,
      bestPossibleProfit:     bestMandi.netProfit,
      profitableMandisCount:  profitableMandis.length,
      allLoss,
      minQuantityForProfit,
      dataSource:             "data.gov.in — Live Mandi Prices",
      lastUpdated:            bestMandi.arrivalDate,
    },
  };
};

// ---------------------------------------------------------------------------
// Commodities list — names exactly as they appear in the API
// ---------------------------------------------------------------------------
export const getCommoditiesList = () => [
  "Tomato", "Potato", "Onion", "Rice", "Wheat", "Cotton",
  "Chilli Red", "Brinjal", "Cabbage", "Cauliflower", "Carrot",
  "Green Chilli", "Garlic", "Ginger", "Bhindi(Ladies Finger)",
  "Banana", "Mango", "Groundnut", "Soyabean", "Maize",
  "Bajra(Pearl Millet/Cumbu)", "Jowar(Sorghum)", "Arhar (Tur/Pigeon Pea)(Whole)",
];

// ---------------------------------------------------------------------------
// Supported states (pass to findNearestMandis / getSmartSellingRecommendation)
// ---------------------------------------------------------------------------
export const getStatesList = () => [
  "Gujarat", "Maharashtra", "Rajasthan", "Uttar Pradesh", "Madhya Pradesh",
  "Karnataka", "Tamil Nadu", "Andhra Pradesh", "Telangana", "Punjab",
  "Haryana", "West Bengal", "Bihar", "Odisha", "Himachal Pradesh",
];

export default {
  getCurrentLocation,
  fetchLivePrices,
  findNearestMandis,
  getSmartSellingRecommendation,
  getCommoditiesList,
  getStatesList,
};