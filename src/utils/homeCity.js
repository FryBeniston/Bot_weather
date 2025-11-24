// src/utils/homeCity.js
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/userHomes.json');

function readDB() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      fs.writeFileSync(DB_PATH, '{}');
    }
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data || '{}');
  } catch (err) {
    console.error('❌ Ошибка чтения userHomes.json:', err.message);
    return {};
  }
}

function writeDB(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('❌ Ошибка записи userHomes.json:', err.message);
  }
}

function setHomeCity(userId, city) {
  const db = readDB();
  db[userId] = city.trim();
  writeDB(db);
}

function getHomeCity(userId) {
  const db = readDB();
  return db[userId] || null;
}

module.exports = { setHomeCity, getHomeCity };