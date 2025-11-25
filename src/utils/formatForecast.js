function formatForecastResponse(data) {
  let text = `📆 Прогноз на 7 дней для ${data.city.name}:\n\n`;

  data.list.slice(0, 7).forEach(day => {
    const date = new Date(day.dt * 1000);
    const dayStr = date.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric' });
    const min = Math.round(day.temp.min);
    const max = Math.round(day.temp.max);
    const desc = day.weather[0].description;
    text += `• ${dayStr}: ${min}…${max}°C (${desc})\n`;
  });

  return text;
}

module.exports = { formatForecastResponse };