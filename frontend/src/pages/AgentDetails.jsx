import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, CircularProgress,
  Alert, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Chip
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { getEvents } from '../services/api';

export default function AgentDetails() {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const data = await getEvents(agentId, 100);
        setEvents(data);
      } catch (err) {
        setError('Greška pri dohvatanju evenata');
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, [agentId]);

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/')}
        sx={{ mb: 2 }}
      >
        Nazad
      </Button>

      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Agent: {agentId}
      </Typography>

      {loading && <CircularProgress />}
      {error && <Alert severity="error">{error}</Alert>}

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#1a237e' }}>
              <TableCell sx={{ color: 'white' }}>Datum</TableCell>
              <TableCell sx={{ color: 'white' }}>Fajl/Registry</TableCell>
              <TableCell sx={{ color: 'white' }}>Tip</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {events.map((event, i) => (
              <TableRow key={i} hover>
                <TableCell>
                  {new Date(event.date).toLocaleString('sr-RS')}
                </TableCell>
                <TableCell sx={{ maxWidth: 400, wordBreak: 'break-all' }}>
                  {event.file}
                </TableCell>
                <TableCell>
                  <Chip
                    label={event.type}
                    size="small"
                    color={event.type === 'registry_value' ? 'warning' : 'info'}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
}