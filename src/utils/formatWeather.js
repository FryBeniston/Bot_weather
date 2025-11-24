// src/utils/formatWeather.js
function getWeatherWarning(main) {
  const temp = main.temp;
  const feelsLike = main.feels_like;
  let warning = '';

  if (temp <= -20) warning = '❄️ Сильный мороз!';
  else if (temp >= 35) warning = '🔥 Жара!';
  else if (feelsLike <= -25) warning = '🥶 Ощущается как сильный мороз!';
  else if (feelsLike >= 40) warning = '🥵 Ощущается как экстремальная жара!';

  return warning ? `\n⚠️ ${warning}` : '';
}

function formatWeatherResponse(data) {
  const { name, sys, main, weather, dt } = data;
  const country = sys.country === 'RU' ? '🇷🇺' : ` (${sys.country})`;
  
  // Мин/макс — берём из main (для текущего дня это приближённо)
  // Или из daily forecast, но для простоты используем main.temp_min/max
  const min = main.temp_min !== undefined ? Math.round(main.temp_min) : null;
  const max = main.temp_max !== undefined ? Math.round(main.temp_max) : null;
  
  const temp = Math.round(main.temp);
  const feelsLike = Math.round(main.feels_like);
  const desc = weather[0].description.charAt(0).toUpperCase() + weather[0].description.slice(1);
  const humidity = main.humidity;

  let text = `🏙 ${name}${country}\n`;
  text += `🌤 ${desc}\n`;
  text += `🌡 ${temp}°C (ощущается как ${feelsLike}°C)\n`;

  if (min !== null && max !== null && !(isNaN(min) || isNaN(max))) {
    text += `📉 Мин: ${min}°C | 📈 Макс: ${max}°C\n`;
  }

  text += `💧 Влажность: ${humidity}%`;

  // Добавляем предупреждение
  text += getWeatherWarning(main);

  return text;
}

module.exports = { formatWeatherResponse };