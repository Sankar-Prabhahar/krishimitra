// Configuration for API URL
// Uses environment variable if available, otherwise defaults to production URL
export const API_URL =
  import.meta.env.VITE_API_URL || "https://krishi-final.onrender.com/api";
