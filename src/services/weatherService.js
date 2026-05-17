// Weather Service using OpenWeatherMap API
const API_KEY =
  import.meta.env.VITE_OPENWEATHER_API_KEY ||
  "1c0ff9c24c32fb28e6644ec4110fd944";
const BASE_URL = "https://api.openweathermap.org/data/2.5";

export const getCurrentWeather = async (lat, lon) => {
  try {
    const response = await fetch(
      `${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
    );

    if (!response.ok) {
      throw new Error("Weather data fetch failed");
    }

    const data = await response.json();

    return {
      temperature: Math.round(data.main.temp),
      humidity: data.main.humidity,
      description: data.weather[0].description,
      icon: data.weather[0].icon,
      windSpeed: Math.round(data.wind.speed * 3.6), // Convert m/s to km/h
      pressure: data.main.pressure,
      feelsLike: Math.round(data.main.feels_like),
      visibility: Math.round(data.visibility / 1000), // Convert to km
      location: data.name,
      country: data.sys.country,
    };
  } catch (error) {
    console.error("Error fetching weather:", error);
    // Fallback to mock data
    return {
      temperature: 28,
      humidity: 65,
      description: "Partly Cloudy",
      icon: "02d",
      windSpeed: 12,
      pressure: 1013,
      feelsLike: 30,
      visibility: 10,
      location: "Your Location",
      country: "IN",
    };
  }
};

export const getForecast = async (lat, lon) => {
  try {
    const response = await fetch(
      `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
    );

    if (!response.ok) {
      throw new Error("Forecast data fetch failed");
    }

    const data = await response.json();

    // Process forecast data - get one entry per day
    const dailyForecasts = [];
    const processedDates = new Set();

    data.list.forEach((item) => {
      const date = new Date(item.dt * 1000);
      const dateStr = date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      const dayKey = date.toISOString().split("T")[0];

      if (!processedDates.has(dayKey) && dailyForecasts.length < 7) {
        processedDates.add(dayKey);
        dailyForecasts.push({
          date: dateStr,
          tempMin: Math.round(item.main.temp_min),
          tempMax: Math.round(item.main.temp_max),
          humidity: item.main.humidity,
          description: item.weather[0].description,
          icon: item.weather[0].icon,
          rain: item.rain ? Math.round(item.rain["3h"] || 0) : 0,
        });
      }
    });

    return dailyForecasts;
  } catch (error) {
    console.error("Error fetching forecast:", error);
    // Fallback to mock data
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return Array(7)
      .fill(null)
      .map((_, i) => {
        const date = new Date(Date.now() + i * 86400000);
        return {
          date: `${days[date.getDay()]}, ${date.getDate()}`,
          tempMin: 24 + Math.round(Math.random() * 2),
          tempMax: 30 + Math.round(Math.random() * 3),
          humidity: 60 + Math.round(Math.random() * 10),
          description: "Partly Cloudy",
          icon: "02d",
          rain: Math.random() > 0.7 ? Math.round(Math.random() * 10) : 0,
        };
      });
  }
};

export const getFarmingAlerts = (currentWeather, forecast) => {
  const alerts = [];

  if (!currentWeather) return alerts;

  // High temperature alert
  if (currentWeather.temperature > 35) {
    alerts.push({
      type: "warning",
      title: "Heat Warning",
      message:
        "Temperature is very high. Increase irrigation and avoid field work during peak hours (11 AM - 4 PM).",
    });
  }

  // High humidity alert
  if (currentWeather.humidity > 80) {
    alerts.push({
      type: "warning",
      title: "High Humidity Alert",
      message:
        "High humidity increases risk of fungal diseases. Monitor crops for signs of infection.",
    });
  }

  // Rain forecast alert
  const rainyDays = forecast?.filter((d) => d.rain > 5) || [];
  if (rainyDays.length > 0) {
    alerts.push({
      type: "info",
      title: "Rain Expected",
      message: `Rain expected on ${rainyDays.length} day(s). Plan irrigation and avoid fertilizer application before rain.`,
    });
  }

  // Good spraying conditions
  if (currentWeather.windSpeed < 15 && currentWeather.humidity < 70) {
    alerts.push({
      type: "success",
      title: "Good Spraying Conditions",
      message:
        "Weather is ideal for pesticide/fertilizer application. Low wind and moderate humidity.",
    });
  }

  // Strong wind alert
  if (currentWeather.windSpeed > 25) {
    alerts.push({
      type: "warning",
      title: "High Wind Warning",
      message:
        "Avoid spraying pesticides. Secure tall crops and support structures.",
    });
  }

  return alerts;
};

export const getUserLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
      },
      (error) => {
        console.error("Geolocation error:", error);
        // Default to Ahmedabad coordinates as fallback
        resolve({
          lat: 23.0225,
          lon: 72.5714,
        });
      }
    );
  });
};
