// bot.js
require('dotenv').config();
const { Telegraf } = require('telegraf');
const LocalSession = require('telegraf-session-local'); 
const express = require('express');
const fs = require('fs');
const os = require('os');
const path = require('path');

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const RENDER_EXTERNAL_URL = process.env.RENDER_EXTERNAL_URL;

if (!TELEGRAM_TOKEN || !OPENWEATHER_API_KEY) {
  console.error('❌ Отсутствуют TELEGRAM_TOKEN или OPENWEATHER_API_KEY');
  process.exit(1);
}

// Кроссплатформенный путь к файлам
const DB_PATH = path.join(os.tmpdir(), 'userData.json');
const SESSION_PATH = path.join(os.tmpdir(), 'sessions.json');

if (!fs.existsSync(DB_PATH)) {
  fs.writeFileSync(DB_PATH, '{}');
  console.log(`✅ Создан ${DB_PATH}`);
}

const bot = new Telegraf(TELEGRAM_TOKEN);

// Подключаем сессии
bot.use(new LocalSession({ database: SESSION_PATH }).middleware());

// Подключаем команды
const { setupCommands } = require('./src/bot/commands');
setupCommands(bot);

// Обработчики
const { handleLocation, handleForecastCallback } = require('./src/bot/handlers');
bot.on('location', handleLocation);
bot.action(/forecast_(.+?)_(.+)/, handleForecastCallback);

bot.catch((err) => {
  console.error('⚠️ Telegraf error:', err.message);
});

// Express сервер
const PORT = process.env.PORT || 3000;
const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'OK', time: new Date().toISOString() });
});

app.post('/webhook', (req, res) => {
  bot.handleUpdate(req.body, res);
});

app.get('/trigger-daily', async (req, res) => {
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
      console.error(`❌ Ошибка отправки ${id}:`, err.message);
    }
  }

  res.json({ success: true, sent: sentCount });
});

app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  if (RENDER_EXTERNAL_URL) {
    bot.telegram.setWebhook(`${RENDER_EXTERNAL_URL}/webhook`)
      .then(() => console.log('✅ Вебхук установлен'))
      .catch(err => console.error('❌ Ошибка вебхука:', err.message));
  }
});