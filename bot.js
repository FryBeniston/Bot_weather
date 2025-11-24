// bot.js — тестовая версия
require('dotenv').config();
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.json({ ok: true }));
app.get('/webhook', (req, res) => res.status(400).send('OK'));

app.listen(PORT, () => {
  console.log('✅ Тестовый сервер запущен');
});