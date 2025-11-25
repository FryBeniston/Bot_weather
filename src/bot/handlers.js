// src/bot/handlers.js
const {
  getWeatherByCity,
  getWeatherByCoords,
  getWeatherForecastByCoords
} = require('../services/weatherService');

const { formatWeatherResponse } = require('../utils/formatWeather');
const { formatForecastResponse } = require('../utils/formatForecast');
const { logEvent } = require('../utils/logger');

async function handleTextMessage(ctx) {
  const msg = ctx.message;
  if (!msg || !msg.text || msg.text.startsWith('/')) return; // ← игнорируем команды

  // Обработка ввода города после /sethome
  if (ctx.session?.awaitingHomeCity) {
    const city = msg.text.trim();
    if (!city) return ctx.reply('❌ Название не может быть пустым.');

    try {
      const data = await getWeatherByCity(city, process.env.OPENWEATHER_API_KEY);
      if (!data.name) throw new Error('Город не найден');
      require('../utils/userStorage').setHomeCity(ctx.from.id, data.name);
      delete ctx.session.awaitingHomeCity;
      return ctx.reply(`✅ Город "${data.name}" сохранён как домашний!`);
    } catch (err) {
      return ctx.reply('❌ Не удалось найти город. Попробуйте точное название.');
    }
  }

  // Обычный запрос погоды
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

async function handleForecastCallback(ctx) {
  try {
    const callbackData = ctx.callbackQuery?.data;
    if (!callbackData || !callbackData.startsWith('forecast_')) {
      return ctx.answerCbQuery('❌ Недопустимый запрос', true);
    }

    const [_, latStr, lonStr] = callbackData.split('_');
    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);

    if (isNaN(lat) || isNaN(lon)) {
      throw new Error('Некорректные координаты');
    }

    await ctx.answerCbQuery('📥 Загружаем прогноз...');

    const forecast = await getWeatherForecastByCoords(lat, lon, process.env.OPENWEATHER_API_KEY);
    const text = formatForecastResponse(forecast);

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