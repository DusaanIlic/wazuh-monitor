const axios = require('axios');
const https = require('https');
require('dotenv').config();

const agent = new https.Agent({ rejectUnauthorized: false });

async function searchAlerts(agentId, filters = {}) {
  const { limit = 100, username, timeRange = '24h' } = filters;

  const must = [
    { term: { 'agent.id': agentId } },
    {
      range: {
        timestamp: {
          gte: `now-${timeRange}`,
          lte: 'now'
        }
      }
    }
  ];

  if (username) {
    must.push({ term: { 'data.win.eventdata.subjectUserName': username } });
  }

  const query = {
    size: limit,
    sort: [{ timestamp: { order: 'desc' } }],
    query: {
      bool: {
        must,
        must_not: [
          { term: { 'data.win.eventdata.subjectUserName': 'SYSTEM' } },
          { term: { 'data.win.eventdata.subjectUserName': 'LOCAL SERVICE' } },
          { term: { 'data.win.eventdata.subjectUserName': 'NETWORK SERVICE' } },
          { wildcard: { 'syscheck.path': '*wazuh-screenshot.trigger*' } },
        ]
      }
    }
  };

  const response = await axios.post(
    `${process.env.OPENSEARCH_URL}/wazuh-alerts-4.x-*/_search`,
    query,
    {
      auth: {
        username: process.env.OPENSEARCH_USER,
        password: process.env.OPENSEARCH_PASSWORD,
      },
      httpsAgent: agent,
    }
  );

  return response.data.hits.hits.map(h => h._source);
}

async function searchTempActivity(agentId, filters = {}) {
  const { limit = 100, username } = filters;

  const must = [
    { term: { 'agent.id': agentId } },
    {
      bool: {
        should: [
          { wildcard: { 'syscheck.path': '*\\temp\\*' } },
          { wildcard: { 'syscheck.path': '*\\Temp\\*' } },
          { wildcard: { 'syscheck.path': '*/tmp/*' } },
          { wildcard: { 'syscheck.path': '*\\windows\\temp\\*\\cleaner\\*' } },
          { wildcard: { 'syscheck.path': '*\\windows\\temp\\{*}*' } },
        ]
      }
    }
  ];

  if (username) {
    must.push({ term: { 'data.win.eventdata.subjectUserName': username } });
  }

  const query = {
    size: limit,
    sort: [{ timestamp: { order: 'desc' } }],
    query: {
      bool: {
        must,
        must_not: [
          { term: { 'data.win.eventdata.subjectUserName': 'SYSTEM' } },
          { term: { 'data.win.eventdata.subjectUserName': 'LOCAL SERVICE' } },
          { term: { 'data.win.eventdata.subjectUserName': 'NETWORK SERVICE' } },
        ]
      }
    }
  };

  const response = await axios.post(
    `${process.env.OPENSEARCH_URL}/wazuh-alerts-4.x-*/_search`,
    query,
    {
      auth: {
        username: process.env.OPENSEARCH_USER,
        password: process.env.OPENSEARCH_PASSWORD,
      },
      httpsAgent: agent,
    }
  );

  return response.data.hits.hits.map(h => h._source);
}

module.exports = { searchAlerts, searchTempActivity };