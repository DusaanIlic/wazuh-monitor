import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3001/api',
});

export const getAgents = async () => {
  const res = await api.get('/agents');
  return res.data.data.affected_items;
};

export const getAgentAlerts = async (agentId, limit = 100) => {
  const res = await api.get(`/events/${agentId}/alerts?limit=${limit}`);
  return res.data.data;
};