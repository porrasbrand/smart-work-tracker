export function safeJsonParse(jsonString, fallback = null) {
  if (!jsonString) return fallback;

  try {
    return JSON.parse(jsonString);
  } catch (err) {
    console.warn('Failed to parse JSON:', err.message);
    return fallback;
  }
}
