// src/bot/handlers.js

const { getWeatherByCity, getWeatherByCoords } = require('../services/weatherService');
const { formatWeatherResponse } = require('../utils/formatWeather');
const { logEvent } = require('../utils/logger');

async function handleTextMessage(ctx) {
  const msg = ctx.message;
  if (!msg.text || msg.text.startsWith('/') || msg.location) return;

  const chatId = msg.chat.id;
  const city = msg.text.trim();
  logEvent(`📥 Запрос города: "${city}" от ${msg.from?.id}`);

  try {
    const data = await getWeatherByCity(city, process.env.OPENWEATHER_API_KEY);
    const reply = formatWeatherResponse(data);
    await ctx.reply(reply);
  } catch (err) {
    logEvent(`❌ Ошибка города "${city}": ${err.message}`);
    await ctx.reply('❌ Не удалось найти погоду. Попробуй уточнить название.');
  }
}

async function handleLocation(ctx) {
  const msg = ctx.message;
  if (!msg.location) return;

  const { latitude: lat, longitude: lon } = msg.location;
  const chatId = msg.chat.id;
  logEvent(`📍 Координаты: ${lat}, ${lon} от ${msg.from?.id}`);

  try {
    const data = await getWeatherByCoords(lat, lon, process.env.OPENWEATHER_API_KEY);
    const reply = formatWeatherResponse(data);
    await ctx.reply(reply);
  } catch (err) {
    logEvent(`❌ Ошибка геопозиции: ${err.message}`);
    await ctx.reply('❌ Не удалось определить погоду по вашему местоположению.');
  }
}

module.exports = { handleTextMessage, handleLocation };