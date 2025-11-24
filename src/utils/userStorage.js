//userStorage.js

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../userData.json');

function readDB() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      fs.writeFileSync(DB_PATH, '{}');
    }
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data || '{}');
  } catch (err) {
    console.error('❌ Ошибка чтения userData.json:', err.message);
    return {};
  }
}

function writeDB(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('❌ Ошибка записи userData.json:', err.message);
  }
}

function setHomeCity(userId, city) {
  const db = readDB();
  if (!db[userId]) db[userId] = {};
  db[userId].homeCity = city.trim();
  writeDB(db);
}

function getHomeCity(userId) {
  const db = readDB();
  return db[userId]?.homeCity || null;
}

function setDailyTime(userId, time) {
  const db = readDB();
  if (!db[userId]) db[userId] = {};
  db[userId].dailyTime = time;
  writeDB(db);
}

function getAllSubscribers() {
  const db = readDB();
  const now = new Date();
  const currentHour = String(now.getUTCHours()).padStart(2, '0');
  const currentMinute = String(now.getUTCMinutes()).padStart(2, '0');
  const currentTime = `${currentHour}:${currentMinute}`;

  return Object.entries(db)
    .filter(([id, user]) => user.dailyTime && user.homeCity)
    .map(([id, user]) => ({
      id,
      city: user.homeCity,
      time: user.dailyTime
    }))
    .filter(user => user.time === currentTime);
}

module.exports = {
  setHomeCity,
  getHomeCity,
  setDailyTime,
  getAllSubscribers
};