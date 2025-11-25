// src/bot/commands.js
const { getHomeCity, setHomeCity, setDailyTimeWithTZ } = require('../utils/userStorage');
const { getWeatherByCity } = require('../services/weatherService');
const { formatWeatherResponse } = require('../utils/formatWeather');
const { logEvent } = require('../utils/logger');

function setupCommands(bot) {
  bot.start((ctx) => {
    ctx.reply('🌤 Привет! Выбери город, отправь геопозицию или используй команды:\n\n'
      + '• /sethome — сохранить домашний город\n'
      + '• /home — погода в домашнем городе\n'
      + '• /daily HH:mm — рассылка в местном времени', {
      reply_markup: {
        keyboard: [
          [{ text: '📍 Отправить геопозицию', request_location: true }],
          ['Москва', 'Санкт-Петербург'],
          ['Новосибирск', 'Екатеринбург'],
          ['Казань', 'Нижний Новгород'],
          ['Челябинск', 'Самара'],
          ['Омск', 'Ростов-на-Дону'],
          ['Уфа', 'Красноярск'],
          ['Воронеж', 'Пермь'],
          ['Волгоград', 'Димитровград']
        ],
        resize_keyboard: true,
        one_time_keyboard: false,
      },
    });
  });

  bot.command('sethome', (ctx) => {
    ctx.session.awaitingHomeCity = true;
    return ctx.reply('🏙 Введите название города (например, Москва):');
  });

  bot.command('home', async (ctx) => {
    const city = getHomeCity(ctx.from.id);
    if (!city) {
      return ctx.reply('❌ У вас нет сохранённого города. Используйте /sethome');
    }
    try {
      const data = await getWeatherByCity(city, process.env.OPENWEATHER_API_KEY);
      const text = formatWeatherResponse(data);
      await ctx.reply(text);
    } catch (err) {
      logEvent(`❌ Ошибка /home для ${ctx.from.id}: ${err.message}`);
      await ctx.reply('❌ Не удалось загрузить погоду.');
    }
  });

  bot.command('daily', async (ctx) => {
    const args = ctx.message.text.split(' ').slice(1).join(' ').trim();
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

    if (!args || !timeRegex.test(args)) {
      return ctx.reply('UsageId: /daily 8:00\n(укажите местное время)');
    }

    const city = getHomeCity(ctx.from.id);
    if (!city) {
      return ctx.reply('❌ Сначала установите город: /sethome');
    }

    try {
      const data = await getWeatherByCity(city, process.env.OPENWEATHER_API_KEY);
      if (!data.timezone) throw new Error('Часовой пояс не доступен');

      const [h, m] = args.split(':').map(Number);
      const localDate = new Date();
      localDate.setHours(h, m, 0, 0);
      const utcDate = new Date(localDate.getTime() - data.timezone * 1000);
      const utcTime = `${String(utcDate.getUTCHours()).padStart(2, '0')}:${String(utcDate.getUTCMinutes()).padStart(2, '0')}`;

      setDailyTimeWithTZ(ctx.from.id, args, utcTime);
      await ctx.reply(`✅ Рассылка в ${args} (местное время) включена!\n🕒 Это ${utcTime} UTC.`);
    } catch (err) {
      console.error('Ошибка /daily:', err.message);
      await ctx.reply('❌ Не удалось определить часовой пояс.');
    }
  });
}

module.exports = { setupCommands };