const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const https = require('https');
const { apiRequest } = require('../services/wazuhApi');

const STATE_FILE = path.join(__dirname, '../../kolokvijum-state.json');
const osAgent = new https.Agent({ rejectUnauthorized: false });
const OS_URL = process.env.OPENSEARCH_URL || 'https://147.91.204.137:9200';
const OS_AUTH = {
  username: process.env.OPENSEARCH_USER || 'admin',
  password: process.env.OPENSEARCH_PASSWORD || 'NovaLozinka123?',
};

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

async function getActiveAgentIds() {
  try {
    const data = await apiRequest('get', '/agents?status=active&limit=500');
    const agents = data?.data?.affected_items || [];
    return agents.map(a => a.id);
  } catch (err) {
    console.error('[kolokvijum] greška pri dohvatanju agenata:', err.message);
    return [];
  }
}

async function saveToOpenSearch(doc) {
  await axios.post(
    `${OS_URL}/wazuh-kolokvijumi/_doc`,
    doc,
    { auth: OS_AUTH, httpsAgent: osAgent }
  );
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
  state = { ...state, isActive: false, endTime };
  saveState(state);

  const agents = await getActiveAgentIds();
  const doc = {
    startTime: state.startTime,
    endTime,
    trajanje,
    agents,
  };

  try {
    console.log('[kolokvijum] pokušavam da sačuvam doc:', JSON.stringify(doc));
    await saveToOpenSearch(doc);
    console.log('[kolokvijum] zapis sačuvan u OpenSearch, trajanje:', trajanje, 'min, agenata:', agents.length);
  } catch (err) {
    console.error('[kolokvijum] greška pri čuvanju u OpenSearch:', err.message);
    console.error('[kolokvijum] detalji greške:', err.response?.data || err.message);
  }

  res.json({ startTime: state.startTime, endTime, trajanje, agents, status: 'zavrsen' });
});

router.get('/status', (req, res) => {
  res.json({ data: state });
});

router.get('/istorija', async (req, res) => {
  try {
    const query = {
      size: 100,
      sort: [{ startTime: { order: 'desc' } }],
      query: { match_all: {} },
    };
    const response = await axios.post(
      `${OS_URL}/wazuh-kolokvijumi/_search`,
      query,
      { auth: OS_AUTH, httpsAgent: osAgent }
    );
    const kolokvijumi = response.data.hits.hits.map(h => ({ id: h._id, ...h._source }));
    res.json({ data: kolokvijumi });
  } catch (err) {
    console.error('[kolokvijum] greška pri dohvatanju istorije:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
