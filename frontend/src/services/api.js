import axios from 'axios';

const api = axios.create({
  baseURL: 'http://147.91.204.137:3001/api',
});

export const getAgents = async () => {
  const res = await api.get('/agents');
  return res.data.data.affected_items;
};

export const getAgentAlerts = async (agentId, limit = 100, timeRange = '24h') => {
  const res = await api.get(`/events/${agentId}/alerts?limit=${limit}&timeRange=${timeRange}`);
  return res.data.data;
};

export const getAgentRisk = async (agentId) => {
  const res = await api.get(`/agents/${agentId}/risk`);
  return res.data.data;
};