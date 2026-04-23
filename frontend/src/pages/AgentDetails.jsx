import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, CircularProgress, Alert,
  Button, Paper, Chip, Divider, List, ListItem,
  ListItemIcon, ListItemText, FormControlLabel, Switch
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorIcon from '@mui/icons-material/Error';
import InfoIcon from '@mui/icons-material/Info';
import PersonIcon from '@mui/icons-material/Person';
import { getAgentAlerts } from '../services/api';
import { translateAlert, severityConfig, isSystemEvent } from '../utils/eventTranslator';

const severityIcon = {
  critical: <ErrorIcon color="error" />,
  warning: <WarningAmberIcon color="warning" />,
  info: <InfoIcon color="info" />,
};

export default function AgentDetails() {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hideSystem, setHideSystem] = useState(true);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const data = await getAgentAlerts(agentId, 200);
        const translated = data.map(a => ({
          ...a,
          translated: translateAlert(a),
          isSystem: isSystemEvent(a),
        })).sort((a, b) =>
          (severityConfig[b.translated.severity]?.priority || 0) -
          (severityConfig[a.translated.severity]?.priority || 0)
        );
        setAlerts(translated);
      } catch (err) {
        setError('Greška pri dohvatanju podataka.');
      } finally {
        setLoading(false);
      }
    };
    fetchAlerts();
  }, [agentId]);

  const filtered = hideSystem ? alerts.filter(a => !a.isSystem) : alerts;
  const criticalCount = filtered.filter(e => e.translated.severity === 'critical').length;
  const warningCount = filtered.filter(e => e.translated.severity === 'warning').length;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/')} sx={{ mb: 2 }}>
        Nazad na pregled
      </Button>

      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Računar: {agentId}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Prikaz detektovanih aktivnosti
          </Typography>
        </Box>
        <Box display="flex" gap={1} flexWrap="wrap" justifyContent="flex-end">
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

      <FormControlLabel
        control={<Switch checked={hideSystem} onChange={e => setHideSystem(e.target.checked)} />}
        label="Sakrij sistemske procese (SYSTEM, NT AUTHORITY...)"
        sx={{ mb: 2 }}
      />

      {loading && <CircularProgress />}
      {error && <Alert severity="error">{error}</Alert>}

      {!loading && filtered.length > 0 && (
        <Paper>
          <List disablePadding>
            {filtered.map((alert, i) => {
              const { msg, severity, user } = alert.translated;
              const cfg = severityConfig[severity];
              return (
                <Box key={i}>
                  <ListItem sx={{ backgroundColor: cfg.bg }}>
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      {severityIcon[severity]}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                          <Typography fontWeight="bold">{msg}</Typography>
                          <Chip label={cfg.label} color={cfg.color} size="small" variant="outlined" />
                          {user && (
                            <Chip
                              icon={<PersonIcon />}
                              label={user}
                              size="small"
                              variant="outlined"
                              color="default"
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
                          {alert.syscheck?.path && (
                            <Typography variant="caption" color="text.secondary" display="block">
                              📁 {alert.syscheck.path}
                            </Typography>
                          )}
                          <Typography variant="caption" color="text.secondary">
                            🕐 {new Date(alert.timestamp).toLocaleString('sr-RS')}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                            Rule: {alert.rule?.id} — {alert.rule?.description}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                  {i < filtered.length - 1 && <Divider />}
                </Box>
              );
            })}
          </List>
        </Paper>
      )}

      {!loading && filtered.length === 0 && !error && (
        <Alert severity="success">
          Nisu detektovane nikakve nepravilnosti na ovom računaru.
        </Alert>
      )}
    </Container>
  );
}