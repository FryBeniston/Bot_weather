require('dotenv').config();
const { Telegraf } = require('telegraf');
const { setupCommands } = require('./src/bot/commands');
const { handleTextMessage, handleLocation, handleForecastCallback } = require('./src/bot/handlers');

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

// === Webhook setup для Render ===
const PORT = process.env.PORT || 3000;
const RENDER_EXTERNAL_URL = process.env.RENDER_EXTERNAL_URL; // вида https://your-bot.onrender.com

if (!RENDER_EXTERNAL_URL) {
  console.warn('⚠️ RENDER_EXTERNAL_URL не задан. Убедитесь, что он установлен в Render dashboard.');
}

const webhookDomain = RENDER_EXTERNAL_URL
  ? RENDER_EXTERNAL_URL.replace(/^https?:\/\//, '') // убираем протокол, оставляем только хост
  : undefined;

bot.launch({
  webhook: {
    domain: webhookDomain,
    port: PORT
  }
});

console.log(`🚀 Bot запущен в webhook-режиме на порту ${PORT}`);
console.log(`🌐 Webhook domain: ${webhookDomain}`);

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));