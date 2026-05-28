const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, '../../kolokvijum-state.json');

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
  } catch {}
  return { isActive: false, startTime: null, endTime: null };
}

function saveState(s) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2), 'utf8');
  } catch (err) {
    console.error('[kolokvijum] greška pri čuvanju stanja:', err.message);
  }
}

let state = loadState();

router.post('/start', (req, res) => {
  state = { isActive: true, startTime: new Date().toISOString(), endTime: null };
  saveState(state);
  res.json({ startTime: state.startTime, status: 'aktivan' });
});

router.post('/stop', (req, res) => {
  const endTime = new Date().toISOString();
  const trajanje = state.startTime
    ? Math.round((new Date(endTime) - new Date(state.startTime)) / 60000)
    : 0;
  state = { ...state, isActive: false, endTime };
  saveState(state);
  res.json({ startTime: state.startTime, endTime, trajanje, status: 'zavrsen' });
});

router.get('/status', (req, res) => {
  res.json({ data: state });
});

module.exports = router;
