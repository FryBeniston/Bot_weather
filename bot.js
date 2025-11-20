require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const fetch = require('node-fetch');

const token = process.env.TELEGRAM_TOKEN;
const weatherKey = process.env.OPENWEATHER_API_KEY;

if (!token || !weatherKey) {
  console.error('❌ Ошибка: не заданы TELEGRAM_TOKEN или OPENWEATHER_API_KEY в .env');
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

// Транслитерация кириллицы → латиница
function transliterate(str) {
  const map = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'zh',
    'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
    'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts',
    'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
    'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'Yo', 'Ж': 'Zh',
    'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M', 'Н': 'N', 'О': 'O',
    'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U', 'Ф': 'F', 'Х': 'Kh', 'Ц': 'Ts',
    'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Shch', 'Ъ': '', 'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya'
  };
  return str.split('').map(c => map[c] || c).join('');
}

// Отправка сообщения с клавиатурой
bot.onText(/\/start/, (msg) => {
  const opts = {
    reply_markup: {
      keyboard: [
        [{ text: "📍 Отправить геопозицию", request_location: true }]
      ],
      resize_keyboard: true,
      one_time_keyboard: true
    }
  };
  bot.sendMessage(
    msg.chat.id,
    '🌤 Привет! Напиши название города или нажми кнопку, чтобы отправить геопозицию.',
    opts
  );
});

// Обработка текстовых сообщений
bot.on('message', async (msg) => {
  if (!msg.text || msg.text.startsWith('/')) return;
  if (msg.location) return; // на случай, если location пришёл как часть сообщения

  const chatId = msg.chat.id;
  const cityInput = msg.text.trim();
  console.log(`📥 Город: "${cityInput}" от ${msg.from?.id || 'unknown'}`);

  let url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(cityInput)}&appid=${weatherKey}&units=metric&lang=ru`;

  try {
    let response = await fetch(url);
    let data = await response.json();

    // Если город не найден — пробуем транслитерировать
    if (data.cod === '404') {
      const latinCity = transliterate(cityInput);
      console.log(`🔁 Транслитерация: "${cityInput}" → "${latinCity}"`);
      url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(latinCity)}&appid=${weatherKey}&units=metric&lang=ru`;
      response = await fetch(url);
      data = await response.json();
    }

    if (data.cod !== 200) {
      throw new Error(data.message || 'Город не найден');
    }

    sendWeatherResponse(chatId, data);
  } catch (err) {
    console.error('❌ Ошибка при обработке текста:', err.message);
    bot.sendMessage(chatId, '❌ Не удалось найти погоду. Попробуй уточнить название города.');
  }
});

// Обработка геопозиции
bot.on('location', async (msg) => {
  const { latitude: lat, longitude: lon } = msg.location;
  const chatId = msg.chat.id;
  console.log(`📍 Координаты: ${lat}, ${lon} от ${msg.from?.id || 'unknown'}`);

  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${weatherKey}&units=metric&lang=ru`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.cod !== 200) {
      throw new Error('Не удалось получить погоду по координатам');
    }

    sendWeatherResponse(chatId, data);
  } catch (err) {
    console.error('❌ Ошибка при обработке геопозиции:', err.message);
    bot.sendMessage(chatId, '❌ Не удалось определить погоду по вашему местоположению.');
  }
});

// Формирование и отправка ответа с эмодзи и "человечным" стилем
function sendWeatherResponse(chatId, data) {
  const { name, main, weather } = data;
  const { temp, feels_like, humidity, pressure } = main;
  const weatherMain = weather[0].main.toLowerCase();

  const emojiMap = {
    'clear': '☀️',
    'clouds': '☁️',
    'rain': '🌧️',
    'drizzle': '🌦️',
    'thunderstorm': '⛈️',
    'snow': '❄️',
    'mist': '🌫️',
    'smoke': '🌫️',
    'haze': '🌫️',
    'fog': '🌫️',
    'dust': '🌫️',
    'sand': '🌫️',
    'ash': '🌫️',
    'squall': '💨',
    'tornado': '🌪️'
  };

  const emoji = emojiMap[weatherMain] || '🌤';
  const pressureMmHg = Math.round(pressure * 0.75);
  const desc = weather[0].description.charAt(0).toUpperCase() + weather[0].description.slice(1);

  const reply = `
${emoji} Сейчас в ${name}:
🌡 Температура: ${Math.round(temp)}°C (ощущается как ${Math.round(feels_like)}°C)
💬 ${desc}
💧 Влажность: ${humidity}%
🔽 Давление: ${pressureMmHg} мм рт.ст.
  `.trim();

  bot.sendMessage(chatId, reply);
}

// Обработка ошибок polling
bot.on('polling_error', (err) => {
  console.error('📡 Polling error:', err.code, err.message);
});