// bot.js
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

bot.launch();
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));