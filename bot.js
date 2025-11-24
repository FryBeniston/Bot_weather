// bot.js
require('dotenv').config();
const { Telegraf } = require('telegraf');
const express = require('express');

const { setupCommands } = require('./src/bot/commands');
const { handleTextMessage, handleLocation, handleForecastCallback } = require('./src/bot/handlers');
const { getWeatherByCity } = require('./src/services/weatherService');
const { formatWeatherResponse } = require('./src/utils/formatWeather');
const { getAllSubscribers } = require('./src/utils/userStorage');
const path = require('path');
const fs = require('fs');

const token = process.env.TELEGRAM_TOKEN;
const openWeatherKey = process.env.OPENWEATHER_API_KEY;

if (!token || !openWeatherKey) {
  console.error('❌ Отсутствуют TELEGRAM_TOKEN или OPENWEATHER_API_KEY в .env');
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

// === Убедимся, что userData.json существует ===
const dbPath = path.join(__dirname, 'src/data/userData.json');
if (!fs.existsSync(dbPath)) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  fs.writeFileSync(dbPath, '{}');
  console.log('✅ Создан src/data/userData.json');
}

// === Express сервер ===
const PORT = process.env.PORT || 3000;
const RENDER_EXTERNAL_URL = process.env.RENDER_EXTERNAL_URL;

if (!RENDER_EXTERNAL_URL) {
  console.warn('⚠️ RENDER_EXTERNAL_URL не задан. Вебхук не будет установлен.');
}

const app = express();

// Простой health-check эндпоинт (для диагностики)
app.get('/', (req, res) => {
  res.json({ status: 'OK', time: new Date().toISOString() });
});

// Вебхук Telegram
app.use('/webhook', bot.webhookCallback('/webhook'));

// Эндпоинт для рассылки
app.get('/trigger-daily', async (req, res) => {
  console.log('⏰ Запущена ежедневная рассылка...');
  
  const subscribers = getAllSubscribers();
  let sentCount = 0;

  for (const { id, city } of subscribers) {
    try {
      const data = await getWeatherByCity(city, openWeatherKey);
      const text = `📆 Ежедневная погода:\n\n${formatWeatherResponse(data)}`;
      await bot.telegram.sendMessage(id, text);
      sentCount++;
    } catch (err) {
      console.error(`❌ Ошибка отправки пользователю ${id}:`, err.message);
    }
  }

  res.status(200).json({ success: true, sent: sentCount, time: new Date().toISOString() });
});

// Запуск сервера
app.listen(PORT, async () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  
  if (RENDER_EXTERNAL_URL) {
    const webhookUrl = `${RENDER_EXTERNAL_URL}/webhook`;
    try {
      await bot.telegram.setWebhook(webhookUrl);
      console.log(`✅ Вебхук установлен: ${webhookUrl}`);
    } catch (err) {
      console.error('❌ Не удалось установить вебхук:', err.message);
    }
  }
});