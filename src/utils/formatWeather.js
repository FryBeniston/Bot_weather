// src/utils/formatWeather.js

function getWeatherEmoji(main) {
  const map = {
    'Clear': '☀️',
    'Clouds': '☁️',
    'Rain': '🌧️',
    'Drizzle': '🌦️',
    'Thunderstorm': '⛈️',
    'Snow': '❄️',
    'Mist': '🌫️',
    'Smoke': '🌫️',
    'Haze': '🌫️',
    'Fog': '🌫️',
    'Dust': '🌫️',
    'Sand': '🌫️',
    'Ash': '🌫️',
    'Squall': '💨',
    'Tornado': '🌪️'
  };
  return map[main] || '🌤';
}

function formatWeatherResponse(data) {
  const { name, main, weather } = data;
  const { temp, feels_like, humidity, pressure } = main;
  const desc = weather[0].description.charAt(0).toUpperCase() + weather[0].description.slice(1);
  const emoji = getWeatherEmoji(weather[0].main);
  const pressureMmHg = pressure ? Math.round(pressure * 0.75) : '—';

  return `
${emoji} Сейчас в ${name}:
🌡 Температура: ${Math.round(temp)}°C (ощущается как ${Math.round(feels_like)}°C)
💬 ${desc}
💧 Влажность: ${humidity}%
🔽 Давление: ${pressureMmHg} мм рт.ст.
  `.trim();
}

module.exports = { formatWeatherResponse, getWeatherEmoji };