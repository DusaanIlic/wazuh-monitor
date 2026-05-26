import axios from 'axios';
import { API_URL } from '../config';

const api = axios.create({
  baseURL: `${API_URL}/api`,
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

export const startKolokvijum = async () => {
  const res = await api.post('/kolokvijum/start');
  return res.data;
};

export const stopKolokvijum = async () => {
  const res = await api.post('/kolokvijum/stop');
  return res.data;
};