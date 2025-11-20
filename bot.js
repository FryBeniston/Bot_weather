// bot.js — точка входа для Render / локального запуска

require('dotenv').config();
const { Telegraf } = require('telegraf');
const { handleTextMessage, handleLocation } = require('./src/bot/handlers');

const token = process.env.TELEGRAM_TOKEN;
if (!token) {
  console.error('❌ TELEGRAM_TOKEN не задан в .env');
  process.exit(1);
}

const bot = new Telegraf(token);

// Команда /start
bot.start((ctx) => {
  ctx.reply('🌤 Привет! Напиши город или отправь геопозицию.', {
    reply_markup: {
      keyboard: [[{ text: "📍 Отправить геопозицию", request_location: true }]],
      resize_keyboard: true,
      one_time_keyboard: true
    }
  });
});

// Обработка текстовых сообщений
bot.on('text', (ctx) => handleTextMessage(ctx));

// Обработка геопозиции
bot.on('location', (ctx) => handleLocation(ctx));

// Логирование ошибок
bot.catch((err, ctx) => {
  console.error(`⚠️ Ошибка в обработчике Telegram:`, err);
});

// Запуск polling
bot.launch();

// Остановка при завершении процесса
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));