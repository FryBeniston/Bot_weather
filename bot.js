// bot.js
require('dotenv').config();
const { Telegraf } = require('telegraf');
const express = require('express');

const { setupCommands } = require('./src/bot/commands');
const { handleTextMessage, handleLocation, handleForecastCallback } = require('./src/bot/handlers');

const { getWeatherByCity } = require('./src/services/weatherService');
const { formatWeatherResponse } = require('./src/utils/formatWeather');
const { getAllSubscribers } = require('./src/utils/userStorage');

const token = process.env.TELEGRAM_TOKEN;
if (!token) {
  console.error('❌ TELEGRAM_TOKEN не задан в .env');
  process.exit(1);
}

const bot = new Telegraf(token);

setupCommands(bot);
bot.on('text', handleTextMessage);
bot.on('location', handleLocation);
bot.action(/forecast_(.+?)_(.+)/, handleForecastCallback);

bot.catch((err) => {
  console.error('⚠️ Telegraf error:', err);
});

// === Настройка Express для обработки webhook и trigger-daily ===
const PORT = process.env.PORT || 3000;
const RENDER_EXTERNAL_URL = process.env.RENDER_EXTERNAL_URL;

if (!RENDER_EXTERNAL_URL) {
  console.warn('⚠️ RENDER_EXTERNAL_URL не задан.');
}

const webhookDomain = RENDER_EXTERNAL_URL
  ? RENDER_EXTERNAL_URL.replace(/^https?:\/\//, '')
  : undefined;

const app = express();

// Обработка вебхука Telegram
app.use(bot.webhookCallback('/webhook'));

// Эндпоинт для внешнего триггера
app.get('/trigger-daily', async (req, res) => {
  console.log('⏰ Запущена ежедневная рассылка...');

  const subscribers = getAllSubscribers();
  let sentCount = 0;

  for (const { id, city } of subscribers) {
    try {
      const data = await getWeatherByCity(city, process.env.OPENWEATHER_API_KEY);
      const text = `📆 Ежедневная погода:\n\n${formatWeatherResponse(data)}`;
      await bot.telegram.sendMessage(id, text);
      sentCount++;
    } catch (err) {
      console.error(`❌ Ошибка отправки пользователю ${id}:`, err.message);
    }
  }

  res.status(200).json({ success: true, sent: sentCount });
});

// Установка вебхука Telegram
bot.telegram.setWebhook(`${RENDER_EXTERNAL_URL}/webhook`).catch(console.error);

// Запуск Express-сервера
app.listen(PORT, () => {
  console.log(`🚀 Bot запущен на порту ${PORT}`);
  console.log(`🌐 Webhook domain: ${webhookDomain}`);
  console.log(`🔗 Вебхук: ${RENDER_EXTERNAL_URL}/webhook`);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));