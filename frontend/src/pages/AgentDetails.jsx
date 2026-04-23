import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, CircularProgress, Alert,
  Button, Paper, Chip, Divider, List, ListItem,
  ListItemIcon, ListItemText
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorIcon from '@mui/icons-material/Error';
import InfoIcon from '@mui/icons-material/Info';
import { getEvents } from '../services/api';
import { translateEvent, severityConfig } from '../utils/eventTranslator';

const severityIcon = {
  critical: <ErrorIcon color="error" />,
  warning: <WarningAmberIcon color="warning" />,
  info: <InfoIcon color="info" />,
};

export default function AgentDetails() {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const data = await getEvents(agentId, 200);
        // Prevedemo i sortiramo po severity
        const translated = data.map(e => ({
          ...e,
          translated: translateEvent(e),
        })).sort((a, b) =>
          (severityConfig[b.translated.severity]?.priority || 0) -
          (severityConfig[a.translated.severity]?.priority || 0)
        );
        setEvents(translated);
      } catch (err) {
        setError('Greška pri dohvatanju podataka za ovaj računar.');
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, [agentId]);

  const criticalCount = events.filter(e => e.translated.severity === 'critical').length;
  const warningCount = events.filter(e => e.translated.severity === 'warning').length;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/')}
        sx={{ mb: 2 }}
      >
        Nazad na pregled
      </Button>

      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Računar: {agentId}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Prikaz detektovanih aktivnosti
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          {criticalCount > 0 && (
            <Chip icon={<ErrorIcon />} label={`${criticalCount} kritičnih`} color="error" />
          )}
          {warningCount > 0 && (
            <Chip icon={<WarningAmberIcon />} label={`${warningCount} upozorenja`} color="warning" />
          )}
          {criticalCount === 0 && warningCount === 0 && !loading && (
            <Chip label="Bez nepravilnosti" color="success" />
          )}
        </Box>
      </Box>

      {loading && <CircularProgress />}
      {error && <Alert severity="error">{error}</Alert>}

      {!loading && events.length > 0 && (
        <Paper>
          <List disablePadding>
            {events.map((event, i) => {
              const { msg, severity } = event.translated;
              const cfg = severityConfig[severity];
              return (
                <Box key={i}>
                  <ListItem sx={{
                    backgroundColor:
                      severity === 'critical' ? '#fff5f5' :
                      severity === 'warning' ? '#fffde7' : 'white'
                  }}>
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      {severityIcon[severity]}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography fontWeight="bold">{msg}</Typography>
                          <Chip
                            label={cfg.label}
                            color={cfg.color}
                            size="small"
                            variant="outlined"
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            📁 {event.file || 'N/A'}
                          </Typography>
                          <br />
                          <Typography variant="caption" color="text.secondary">
                            🕐 {new Date(event.date).toLocaleString('sr-RS')}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                  {i < events.length - 1 && <Divider />}
                </Box>
              );
            })}
          </List>
        </Paper>
      )}

      {!loading && events.length === 0 && !error && (
        <Alert severity="success">
          Nisu detektovane nikakve nepravilnosti na ovom računaru.
        </Alert>
      )}
    </Container>
  );
}