// bot.js
require('dotenv').config();
const { Telegraf } = require('telegraf');
const express = require('express');
const path = require('path');
const fs = require('fs');

// === Проверка ключей ===
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const RENDER_EXTERNAL_URL = process.env.RENDER_EXTERNAL_URL;

if (!TELEGRAM_TOKEN || !OPENWEATHER_API_KEY) {
  console.error('❌ Отсутствуют TELEGRAM_TOKEN или OPENWEATHER_API_KEY в .env');
  process.exit(1);
}

// === Убедимся, что userData.json существует в корне ===
const DB_PATH = '/tmp/userData.json';
if (!fs.existsSync(DB_PATH)) {
  fs.writeFileSync(DB_PATH, '{}');
  console.log('✅ Создан /tmp/userData.json');
}

// === Инициализация бота ===
const bot = new Telegraf(TELEGRAM_TOKEN);

// === Импорт обработчиков ===
const { setupCommands } = require('./src/bot/commands');
const { handleTextMessage, handleLocation, handleForecastCallback } = require('./src/bot/handlers');

setupCommands(bot);
bot.on('text', handleTextMessage);
bot.on('location', handleLocation);
bot.action(/forecast_(.+?)_(.+)/, handleForecastCallback);

bot.catch((err) => {
  console.error('⚠️ Telegraf error:', err.message);
});

// === Express сервер ===
const PORT = process.env.PORT || 3000;
const app = express();

// Health-check
app.get('/', (req, res) => {
  res.json({ status: 'OK', time: new Date().toISOString() });
});

// Telegram webhook
app.use('/webhook', bot.webhookCallback('/webhook'));

// Эндпоинт для ежедневной рассылки
app.get('/trigger-daily', async (req, res) => {
  console.log('⏰ Запущена ежедневная рассылка...');

  const { getAllSubscribers } = require('./src/utils/userStorage');
  const { getWeatherByCity } = require('./src/services/weatherService');
  const { formatWeatherResponse } = require('./src/utils/formatWeather');

  let sentCount = 0;
  const subscribers = getAllSubscribers();

  for (const { id, city } of subscribers) {
    try {
      const data = await getWeatherByCity(city, OPENWEATHER_API_KEY);
      const text = `📆 Ежедневная погода:\n\n${formatWeatherResponse(data)}`;
      await bot.telegram.sendMessage(id, text);
      sentCount++;
    } catch (err) {
      console.error(`❌ Ошибка отправки пользователю ${id}:`, err.message);
    }
  }

  res.status(200).json({ success: true, sent: sentCount, time: new Date().toISOString() });
});

// === Запуск сервера ===
app.listen(PORT, async () => {
  console.log(`🚀 Express сервер запущен на порту ${PORT}`);

  if (RENDER_EXTERNAL_URL) {
    const webhookUrl = `${RENDER_EXTERNAL_URL}/webhook`;
    try {
      await bot.telegram.setWebhook(webhookUrl);
      console.log(`✅ Вебхук установлен: ${webhookUrl}`);
    } catch (err) {
      console.error('❌ Не удалось установить вебхук:', err.message);
    }
  } else {
    console.warn('⚠️ RENDER_EXTERNAL_URL не задан — вебхук не установлен');
  }
});