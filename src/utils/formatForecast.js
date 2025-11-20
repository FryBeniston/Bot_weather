// src/utils/formatForecast.js

const { getWeatherEmoji } = require('./formatWeather');

function formatForecastResponse({ cityName, forecast }) {
  let text = `📅 Прогноз на 5 дней для ${cityName}:\n\n`;
  for (const day of forecast) {
    const emoji = getWeatherEmoji(day.main);
    const desc = day.desc.charAt(0).toUpperCase() + day.desc.slice(1);
    text += `${day.date} ${emoji} ${Math.round(day.temp)}°C — ${desc}\n`;
  }
  return text.trim();
}

module.exports = { formatForecastResponse };