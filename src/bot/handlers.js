// src/bot/handlers.js
const {
  getWeatherByCity,
  getWeatherByCoords,
  getWeatherForecastByCoords
} = require('../services/weatherService');

const { formatWeatherResponse } = require('../utils/formatWeather');
const { formatForecastResponse } = require('../utils/formatForecast');
const { logEvent } = require('../utils/logger');

// Обработка текстового ввода города
async function handleTextMessage(ctx) {
  const msg = ctx.message;
  if (!msg.text || msg.text.startsWith('/')) return;

  const city = msg.text.trim();
  if (!city) return;

  logEvent(`📥 Запрос города: "${city}" от ${msg.from?.id}`);

  try {
    const data = await getWeatherByCity(city, process.env.OPENWEATHER_API_KEY);
    if (!data.coord || typeof data.coord.lat !== 'number' || typeof data.coord.lon !== 'number') {
      throw new Error('Ответ API не содержит координат');
    }
    const text = formatWeatherResponse(data);
    const { lat, lon } = data.coord;

    await ctx.reply(text, {
      reply_markup: {
        inline_keyboard: [[
          { text: '📆 Прогноз на 5 дней', callback_data: `forecast_${lat}_${lon}` }
        ]]
      }
    });
  } catch (err) {
    logEvent(`❌ Ошибка города "${city}": ${err.message}`);
    await ctx.reply('❌ Не удалось найти погоду. Попробуй уточнить название.');
  }
}

// Обработка геопозиции
async function handleLocation(ctx) {
  const msg = ctx.message;
  if (!msg.location) return;

  const { latitude: lat, longitude: lon } = msg.location;
  logEvent(`📍 Координаты: ${lat}, ${lon} от ${msg.from?.id}`);

  try {
    const current = await getWeatherByCoords(lat, lon, process.env.OPENWEATHER_API_KEY);
    const text = formatWeatherResponse(current);

    await ctx.reply(text, {
      reply_markup: {
        inline_keyboard: [[
          { text: '📆 Прогноз на 5 дней', callback_data: `forecast_${lat}_${lon}` }
        ]]
      }
    });
  } catch (err) {
    logEvent(`❌ Ошибка геопозиции: ${err.message}`);
    await ctx.reply('❌ Не удалось определить погоду по вашему местоположению.');
  }
}

// Обработка нажатия на кнопку прогноза
async function handleForecastCallback(ctx) {
  try {
    // Исправляем получение данных из callback_query
    const callbackData = ctx.callbackQuery.data;
    const matches = callbackData.match(/forecast_([-0-9.]+)_([-0-9.]+)/);
    
    if (!matches) {
      throw new Error('Некорректные данные callback');
    }

    const lat = parseFloat(matches[1]);
    const lon = parseFloat(matches[2]);
    
    if (isNaN(lat) || isNaN(lon)) {
      throw new Error('Некорректные координаты');
    }

    // Показываем уведомление о загрузке
    await ctx.answerCbQuery('📥 Загружаем прогноз...');

    const forecast = await getWeatherForecastByCoords(lat, lon, process.env.OPENWEATHER_API_KEY);
    const text = formatForecastResponse(forecast);

    // Редактируем сообщение, убираем кнопку
    await ctx.editMessageText(text, {
      reply_markup: { inline_keyboard: [] }
    });
  } catch (err) {
    logEvent(`❌ Ошибка прогноза: ${err.message}`);
    await ctx.answerCbQuery('❌ Не удалось загрузить прогноз.', true);
  }
}

module.exports = {
  handleTextMessage,
  handleLocation,
  handleForecastCallback
};