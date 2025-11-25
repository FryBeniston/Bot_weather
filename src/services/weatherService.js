// src/services/weatherService.js
const fetch = require('node-fetch');

// Geocoding через Open-Meteo не поддерживается → используем Nominatim (бесплатно)
async function geocodeCity(city) {
  const url = `https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(city)}&format=json&limit=1`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Telegram Weather Bot (your@email.com)' }
  });
  const data = await res.json();
  if (!data || data.length === 0) throw new Error('Город не найден');
  return {
    name: data[0].display_name.split(',')[0],
    lat: parseFloat(data[0].lat),
    lon: parseFloat(data[0].lon),
    country: data[0].display_name.includes('Россия') ? 'RU' : 'OTHER'
  };
}

// Текущая погода + прогноз на 1 день (для текущей погоды)
async function getWeatherByCity(city, apiKey = null) {
  const geo = await geocodeCity(city);
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${geo.lat}&longitude=${geo.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature&daily=temperature_2m_max,temperature_2m_min&forecast_days=1&timezone=auto`;
  const res = await fetch(url);
  const data = await res.json();

  return {
    name: geo.name,
    sys: { country: geo.country },
    main: {
      temp: data.current.temperature_2m,
      feels_like: data.current.apparent_temperature,
      humidity: data.current.relative_humidity_2m,
      temp_min: data.daily.temperature_2m_min[0],
      temp_max: data.daily.temperature_2m_max[0]
    },
    weather: [{
      description: data.current.temperature_2m > 0 ? 'Облачно' : 'Ясно' // упрощённо
    }],
    coord: { lat: geo.lat, lon: geo.lon },
    timezone_offset: 0 // не используется в Open-Meteo
  };
}

// По координатам (от Telegram)
async function getWeatherByCoords(lat, lon, apiKey = null) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature&daily=temperature_2m_max,temperature_2m_min&forecast_days=1&timezone=auto`;
  const res = await fetch(url);
  const data = await res.json();

  // Получаем название через обратный геокодинг (опционально)
  const reverseUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
  const revRes = await fetch(reverseUrl, {
    headers: { 'User-Agent': 'Telegram Weather Bot (your@email.com)' }
  });
  const revData = await revRes.json();
  const name = revData.address?.city || revData.address?.town || 'Координаты';

  return {
    name,
    sys: { country: 'RU' },
    main: {
      temp: data.current.temperature_2m,
      feels_like: data.current.apparent_temperature,
      humidity: data.current.relative_humidity_2m,
      temp_min: data.daily.temperature_2m_min[0],
      temp_max: data.daily.temperature_2m_max[0]
    },
    weather: [{
      description: data.current.temperature_2m > 0 ? 'Облачно' : 'Ясно'
    }],
    coord: { lat, lon },
    timezone_offset: 0
  };
}

// Прогноз на 7 дней
async function getWeatherForecastByCoords(lat, lon, apiKey = null) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min&forecast_days=7&timezone=auto`;
  const res = await fetch(url);
  const data = await res.json();

  return {
    city: { name: 'Прогноз' },
    list: data.daily.time.map((date, i) => ({
      dt: new Date(date).getTime() / 1000,
      temp: {
        day: (data.daily.temperature_2m_max[i] + data.daily.temperature_2m_min[i]) / 2,
        min: data.daily.temperature_2m_min[i],
        max: data.daily.temperature_2m_max[i]
      },
      weather: [{
        description: data.daily.temperature_2m_max[i] > 0 ? 'Облачно' : 'Ясно'
      }]
    }))
  };
}

module.exports = {
  getWeatherByCity,
  getWeatherByCoords,
  getWeatherForecastByCoords
};