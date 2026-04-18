const axios = require('axios');
require('dotenv').config();
const https = require('https');

const agent = new https.Agent({ rejectUnauthorized: false });

let token = null;

async function getToken() {
  const response = await axios.post(
    `${process.env.WAZUH_API_URL}/security/user/authenticate`,
    {},
    {
      auth: {
        username: process.env.WAZUH_USER,
        password: process.env.WAZUH_PASSWORD,
      },
      httpsAgent: agent,
    }
  );
  token = response.data.data.token;
  return token;
}

async function apiRequest(method, endpoint, params = {}) {
  if (!token) await getToken();
  
  try {
    const response = await axios({
      method,
      url: `${process.env.WAZUH_API_URL}${endpoint}`,
      params,
      headers: { Authorization: `Bearer ${token}` },
      httpsAgent: agent,
    });
    return response.data;
  } catch (err) {
    
    if (err.response?.status === 401) {
      await getToken();
      const response = await axios({
        method,
        url: `${process.env.WAZUH_API_URL}${endpoint}`,
        params,
        headers: { Authorization: `Bearer ${token}` },
        httpsAgent: agent,
      });
      return response.data;
    }
    throw err;
  }
}

module.exports = { apiRequest, getToken };