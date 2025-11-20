// src/bot/commands.js

function setupCommands(bot) {
  bot.start((ctx) => {
    ctx.reply('🌤 Привет! Напиши город или отправь геопозицию.', {
      reply_markup: {
        keyboard: [[{ text: '📍 Отправить геопозицию', request_location: true }]],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    });
  });

  bot.command('forecast', (ctx) => {
    ctx.reply('📆 Чтобы получить прогноз — отправь геопозицию.', {
      reply_markup: {
        keyboard: [[{ text: '📍 Отправить геопозицию', request_location: true }]],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    });
  });
}

module.exports = { setupCommands };