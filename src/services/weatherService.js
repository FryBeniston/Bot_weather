// src/services/weatherService.js

const fetch = require('node-fetch');
const { transliterate } = require('../utils/transliterate');
const { logEvent, incrementRequest } = require('../utils/logger');

const MAX_RETRIES = 3;
const TIMEOUT_MS = 15000;

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
    logEvent(`⏰ Таймаут запроса к: ${url.replace(/(appid=)[^&]*/gi, '$1***REDACTED***')}`);
  }, TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

async function fetchWithRetry(url, retries = MAX_RETRIES) {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fetchWithTimeout(url);
    } catch (err) {
      logEvent(`Попытка ${i + 1}/${retries + 1} не удалась — ${err.message}`);
      if (i === retries) throw err;
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
    }
  }
}

async function getWeatherByCity(city, apiKey) {
  let url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric&lang=ru`;
  let response = await fetchWithRetry(url);
  let data = await response.json();

  if (data.cod === '404') {
    const latin = transliterate(city);
    logEvent(`Транслитерация: "${city}" → "${latin}"`);
    url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(latin)}&appid=${apiKey}&units=metric&lang=ru`;
    response = await fetchWithRetry(url);
    data = await response.json();
  }

  if (data.cod !== 200) {
    const err = new Error(data.message || 'Неизвестная ошибка API');
    err.code = data.cod;
    throw err;
  }

  if (!data.coord || typeof data.coord.lat !== 'number' || typeof data.coord.lon !== 'number') {
    throw new Error('Ответ API не содержит координат');
  }

  incrementRequest();
  return data;
}

async function getWeatherByCoords(lat, lon, apiKey) {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=ru`;
  const response = await fetchWithRetry(url);
  const data = await response.json();

  if (data.cod !== 200) {
    const err = new Error('Погода по координатам не найдена');
    err.code = data.cod;
    throw err;
  }

  incrementRequest();
  return data;
}

async function getWeatherForecastByCoords(lat, lon, apiKey) {
  const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=ru`;
  const response = await fetchWithRetry(url);
  const data = await response.json();

  if (data.cod !== '200') {
    throw new Error('Прогноз по координатам не найден');
  }

  const daily = {};
  for (const item of data.list) {
    const dateStr = new Date(item.dt * 1000).toISOString().split('T')[0];
    if (!daily[dateStr]) {
      daily[dateStr] = { temps: [], descriptions: [], icons: [] };
    }
    daily[dateStr].temps.push(item.main.temp);
    daily[dateStr].descriptions.push(item.weather[0].description);
    daily[dateStr].icons.push(item.weather[0].main);
  }

  const forecast = Object.values(daily)
    .slice(0, 5)
    .map((dayObj, i) => {
      const dateStr = Object.keys(daily)[i];
      const avgTemp = dayObj.temps.reduce((a, b) => a + b, 0) / dayObj.temps.length;
      const formattedDate = new Date(dateStr).toLocaleDateString('ru-RU', {
        weekday: 'short',
        day: 'numeric',
        month: 'short'
      });
      return {
        date: formattedDate,
        temp: avgTemp,
        desc: dayObj.descriptions[0],
        main: dayObj.icons[0]
      };
    });

  incrementRequest();
  return { cityName: data.city.name, forecast };
}

module.exports = {
  getWeatherByCity,
  getWeatherByCoords,
  getWeatherForecastByCoords
};