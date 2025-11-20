// src/utils/logger.js

const fs = require('fs');
const path = require('path');

// Счётчик запросов к OpenWeather
let requestCount = 0;
let currentMonth = new Date().getUTCMonth();

function incrementRequest() {
  const now = new Date();
  const month = now.getUTCMonth();
  if (month !== currentMonth) {
    requestCount = 0;
    currentMonth = month;
  }
  requestCount++;
  console.log(`📊 OpenWeather API: ${requestCount} запросов в этом месяце`);
}

// Логгер событий
let errorCount = 0;
let currentDay = new Date().toISOString().split('T')[0];

function resetCounterIfNeeded() {
  const today = new Date().toISOString().split('T')[0];
  if (today !== currentDay) {
    errorCount = 0;
    currentDay = today;
  }
}

function sanitizeLog(message) {
  return message
    .replace(/(appid=|api_key=|token=)[^&\s]*/gi, '$1***REDACTED***')
    .replace(/(TELEGRAM_TOKEN|OPENWEATHER_API_KEY)=['"]?[^'"\s]*/gi, '$1=***REDACTED***');
}

function logEvent(message) {
  const cleanMessage = sanitizeLog(message);
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${cleanMessage}\n`;

  const logPath = path.join(__dirname, '../../bot.log');
  fs.appendFile(logPath, line, (err) => {
    if (err) {
      console.error(`[LOGGER ERROR] Не удалось записать в лог: ${err.message}`);
    }
  });

  const lowerMsg = message.toLowerCase();
  if (
    lowerMsg.includes('error') ||
    message.includes('404') ||
    message.includes('401') ||
    message.includes('400') ||
    message.includes('500')
  ) {
    resetCounterIfNeeded();
    errorCount++;
    console.log(`⚠️ Ошибок сегодня: ${errorCount}`);
  }
}

module.exports = { logEvent, incrementRequest };