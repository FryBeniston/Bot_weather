// src/bot/commands.js
const { getHomeCity, setHomeCity, setDailyTimeWithTZ } = require('../utils/userStorage');
const { getWeatherByCity } = require('../services/weatherService');
const { getWeatherByCoords } = require('../services/weatherService');
const { formatWeatherResponse } = require('../utils/formatWeather');
const { logEvent } = require('../utils/logger');

function setupCommands(bot) {
  bot.start((ctx) => {
    ctx.reply('🌤 Привет! Выбери город, отправь геопозицию или используй команды:\n\n'
      + '• /sethome [город] — сохранить город\n'
      + '• /home — погода в сохранённом городе\n'
      + '• /daily HH:mm — ежедневная рассылка в местном времени', {
      reply_markup: {
        keyboard: [
          [{ text: '📍 Отправить геопозицию', request_location: true }],
          ['Димитровград', 'Санкт-Петербург'],
          ['Москва','Новосибирск'],
          ['Казань', 'Нижний Новгород'],
          ['Челябинск', 'Самара'],
          [ 'Ростов-на-Дону', 'Екатеринбург'],
          ['Уфа', 'Красноярск'],
          ['Воронеж', 'Пермь'],
          ['Волгоград','Омск'],
         
        ],
        resize_keyboard: true,
        one_time_keyboard: false,
      },
    });
  });

  bot.command('sethome', async (ctx) => {
    const args = ctx.message.text.split(' ').slice(1).join(' ').trim();
    if (!args) {
      return ctx.reply('UsageId: /sethome Москва');
    }

    try {
      const data = await getWeatherByCity(args, process.env.OPENWEATHER_API_KEY);
      if (!data.name) throw new Error('Город не найден');
      
      setHomeCity(ctx.from.id, data.name);
      await ctx.reply(`✅ Город "${data.name}" сохранён как домашний!`);
    } catch (err) {
      await ctx.reply('❌ Не удалось найти город. Попробуй точное название.');
    }
  });

  bot.command('home', async (ctx) => {
    const city = getHomeCity(ctx.from.id);
    if (!city) {
      return ctx.reply('❌ У вас нет сохранённого города. Используйте /sethome [город]');
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
      return ctx.reply('UsageId: /daily 8:00 или /daily 19:30\n(укажите местное время)');
    }

    const city = getHomeCity(ctx.from.id);
    if (!city) {
      return ctx.reply('❌ Сначала установите город: /sethome [город]');
    }

    try {
      const data = await getWeatherByCity(city, process.env.OPENWEATHER_API_KEY);
      if (!data.timezone) {
        throw new Error('Часовой пояс не доступен');
      }

      const [h, m] = args.split(':').map(Number);
      const localDate = new Date();
      localDate.setHours(h, m, 0, 0);

      // Конвертация в UTC
      const utcDate = new Date(localDate.getTime() - data.timezone * 1000);
      const utcTime = `${String(utcDate.getUTCHours()).padStart(2, '0')}:${String(utcDate.getUTCMinutes()).padStart(2, '0')}`;

      setDailyTimeWithTZ(ctx.from.id, args, utcTime);

      await ctx.reply(
        `✅ Рассылка в ${args} (местное время) включена для "${city}"!\n` +
        `🕒 Это ${utcTime} UTC.`
      );
    } catch (err) {
      console.error('Ошибка /daily:', err.message);
      await ctx.reply('❌ Не удалось определить часовой пояс. Попробуйте другой город.');
    }
  });
}

module.exports = { setupCommands };