const fetch = require('node-fetch');
const { transliterate } = require('../utils/transliterate');
const { logEvent } = require('../utils/logger');

const MAX_RETRIES = 3;
const TIMEOUT_MS = 10000; // 10 сек

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    return response;
  } catch (err) {
    clearTimeout(timeout);
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
  return data;
}

module.exports = { getWeatherByCity, getWeatherByCoords };