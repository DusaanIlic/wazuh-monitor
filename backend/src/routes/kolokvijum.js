const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { apiRequest } = require('../services/wazuhApi');
const { searchAlertsForPeriod } = require('../services/opensearch');

const STATE_FILE = path.join(__dirname, '../../kolokvijum-state.json');
const HISTORY_FILE = path.join(__dirname, '../../kolokvijumi.json');

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

function loadHistory() {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    }
  } catch (err) {
    console.error('[kolokvijum] greška pri čitanju istorije:', err.message);
  }
  return [];
}

function saveHistory(list) {
  try {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(list, null, 2), 'utf8');
  } catch (err) {
    console.error('[kolokvijum] greška pri čuvanju istorije:', err.message);
  }
}

async function getActiveAgents() {
  try {
    const data = await apiRequest('get', '/agents?status=active&limit=500');
    const agents = data?.data?.affected_items || [];
    return agents.filter(a => a.id !== '000').map(a => ({ id: a.id, name: a.name }));
  } catch (err) {
    console.error('[kolokvijum] greška pri dohvatanju agenata:', err.message);
    return [];
  }
}

function csvEscape(value) {
  const str = String(value ?? '');
  if (/[",\n;]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatCsvDate(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function severityFromLevel(level) {
  if (level >= 10) return 'Kritično';
  if (level >= 5) return 'Upozorenje';
  return 'Info';
}

let state = loadState();

router.post('/start', (req, res) => {
  state = { isActive: true, startTime: new Date().toISOString(), endTime: null };
  saveState(state);
  res.json({ startTime: state.startTime, status: 'aktivan' });
});

router.post('/stop', async (req, res) => {
  const endTime = new Date().toISOString();
  const trajanje = state.startTime
    ? Math.round((new Date(endTime) - new Date(state.startTime)) / 60000)
    : 0;
  const startTime = state.startTime;
  state = { ...state, isActive: false, endTime };
  saveState(state);

  const agents = await getActiveAgents();
  const record = {
    id: crypto.randomUUID(),
    startTime,
    endTime,
    trajanje,
    agents,
  };

  try {
    const history = loadHistory();
    history.unshift(record);
    saveHistory(history);
    console.log('[kolokvijum] zapis sačuvan u kolokvijumi.json, trajanje:', trajanje, 'min, agenata:', agents.length);
  } catch (err) {
    console.error('[kolokvijum] greška pri čuvanju istorije:', err.message);
  }

  res.json({ startTime, endTime, trajanje, agents, status: 'zavrsen' });
});

router.get('/status', (req, res) => {
  res.json({ data: state });
});

router.get('/historija', (req, res) => {
  const history = loadHistory();
  const sorted = [...history].sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
  res.json({ data: sorted });
});

router.get('/historija/:id/logovi', async (req, res) => {
  try {
    const { id } = req.params;
    const { agentId } = req.query;

    const history = loadHistory();
    const record = history.find(k => k.id === id);
    if (!record) {
      return res.status(404).json({ error: 'Kolokvijum nije pronađen' });
    }

    const alerts = await searchAlertsForPeriod(record.startTime, record.endTime, agentId);

    const header = ['Vreme', 'Racunar', 'Tip', 'Opis', 'Korisnik'];
    const rows = alerts.map(a => [
      formatCsvDate(a.timestamp),
      a.agent?.name || '',
      severityFromLevel(a.rule?.level ?? 0),
      a.rule?.description || '',
      a.data?.win?.eventdata?.subjectUserName || a.data?.win?.eventdata?.targetUserName || a.data?.srcuser || '',
    ]);
    const csv = [header, ...rows].map(row => row.map(csvEscape).join(',')).join('\r\n');

    const datumPart = record.startTime ? record.startTime.slice(0, 10) : 'nepoznato';
    const agentSuffix = agentId ? `_${agentId}` : '';
    const filename = `logovi_kolokvijum_${datumPart}${agentSuffix}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('﻿' + csv);
  } catch (err) {
    console.error('[kolokvijum] greška pri generisanju CSV logova:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
