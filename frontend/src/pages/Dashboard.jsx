import { useEffect, useState } from 'react';
import { Container, Grid, Typography, Box, CircularProgress, Alert } from '@mui/material';
import AgentCard from '../components/AgentCard';
import { getAgents } from '../services/api';

export default function Dashboard() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const data = await getAgents();
        // Filtriraj server sam (id 000)
        setAgents(data.filter(a => a.id !== '000'));
      } catch (err) {
        setError('Greška pri dohvatanju agenata');
      } finally {
        setLoading(false);
      }
    };

    fetchAgents();
    // Refresh svakih 30 sekundi
    const interval = setInterval(fetchAgents, 30000);
    return () => clearInterval(interval);
  }, []);

  const activeCount = agents.filter(a => a.status === 'active').length;

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box mb={4}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Dashboard
        </Typography>
        <Box display="flex" gap={4}>
          <Typography variant="body1">
            Ukupno agenata: <strong>{agents.length}</strong>
          </Typography>
          <Typography variant="body1" color="success.main">
            Aktivnih: <strong>{activeCount}</strong>
          </Typography>
          <Typography variant="body1" color="error.main">
            Neaktivnih: <strong>{agents.length - activeCount}</strong>
          </Typography>
        </Box>
      </Box>

      {loading && <CircularProgress />}
      {error && <Alert severity="error">{error}</Alert>}

      <Grid container spacing={3}>
        {agents.map(agent => (
          <Grid item xs={12} sm={6} md={4} key={agent.id}>
            <AgentCard agent={agent} />
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}