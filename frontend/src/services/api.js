import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3001/api',
});

export const getAgents = async () => {
  const res = await api.get('/agents');
  return res.data.data.affected_items;
};

export const getEvents = async (agentId, limit = 50) => {
  const res = await api.get(`/events/${agentId}?limit=${limit}`);
  return res.data.data.affected_items;
};