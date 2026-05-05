import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Alert,
  Button, Paper, Chip, Divider, List, ListItem,
  ListItemIcon, ListItemText, FormControlLabel, Switch, TablePagination,
  ToggleButton, ToggleButtonGroup
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorIcon from '@mui/icons-material/Error';
import InfoIcon from '@mui/icons-material/Info';
import PersonIcon from '@mui/icons-material/Person';
import { getAgentAlerts } from '../services/api';
import { translateAlert, severityConfig, isSystemEvent } from '../utils/eventTranslator';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import NetworkCheckIcon from '@mui/icons-material/NetworkCheck';
import axios from 'axios'
import ScreenshotDialog from '../components/ScreenshotDialog';
import NetworkDialog from '../components/NetworkDialog';
import { API_URL } from '../config';

const severityIcon = {
  critical: <ErrorIcon color="error" />,
  warning: <WarningAmberIcon color="warning" />,
  info: <InfoIcon color="info" />,
};

export default function AgentDetails() {
  const { agentId } = useParams()
  const [agentName, setAgentName] = useState(agentId);;
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hideSystem, setHideSystem] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [screenshots, setScreenshots] = useState([]);
  const [screenshotDialog, setScreenshotDialog] = useState(false);
  const [triggeringScreenshot, setTriggeringScreenshot] = useState(false);
  const [ports, setPorts] = useState([]);
  const [showNetwork, setShowNetwork] = useState(false);
  const [networkPage, setNetworkPage] = useState(0);
  const [networkRowsPerPage, setNetworkRowsPerPage] = useState(3);
  const [timeRange, setTimeRange] = useState('24h');

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const data = await getAgentAlerts(agentId, 200, timeRange);
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
  }, [agentId, timeRange]);


  useEffect(() => {
    const fetchAgentName = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/agents`);
        const agents = res.data.data.affected_items;
        const agent = agents.find(a => a.id === agentId);
        if (agent) setAgentName(agent.name);
      } catch {}
    };
    fetchAgentName();
  }, [agentId]);

  const filtered = hideSystem ? alerts.filter(a => !a.isSystem) : alerts;
  const criticalCount = filtered.filter(e => e.translated.severity === 'critical').length;
  const warningCount = filtered.filter(e => e.translated.severity === 'warning').length;

  const fetchScreenshots = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/screenshots/list/${agentId}`);
      setScreenshots(res.data.data);
    } catch (err) {
      console.error('Greška pri dohvatanju screenshotova');
    }
  };
  
  const triggerScreenshot = async () => {
    setTriggeringScreenshot(true);
    try {
      await axios.post(`${API_URL}/api/screenshots/trigger/${agentId}`);
      setTimeout(async () => {
        await fetchScreenshots();
        setTriggeringScreenshot(false);
      }, 8000);
    } catch (err) {
      console.error('Greška');
      setTriggeringScreenshot(false);
    }
  };

  const fetchPorts = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/network/${agentId}/ports`);
      const items = res.data.data.affected_items || [];
      
      const isLocalIP = (ip) => {
        if (!ip) return true;
        return ip.startsWith('192.168.') || 
               ip.startsWith('10.') || 
               ip.startsWith('172.') ||
               ip === '0.0.0.0' ||
               ip === '::' ||
               ip === '127.0.0.1';
      };
  
      // Samo established konekcije ka spoljnim IP-ovima
      const suspicious = items.filter(p => 
        p.remote?.ip && 
        p.state === 'established' &&
        !isLocalIP(p.remote.ip)
      );
      
      setPorts(suspicious);
    } catch (err) {
      console.error('Greška');
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" gap={2} alignItems="center">
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/')}>
          Nazad na pregled
        </Button>
        <Button
          variant="contained"
          startIcon={<CameraAltIcon />}
          onClick={() => { fetchScreenshots(); setScreenshotDialog(true); }}
          color="primary"
        >
          Screenshots
        </Button>

        <Button
          variant="outlined"
          startIcon={<NetworkCheckIcon />}
          onClick={() => { fetchPorts(); setShowNetwork(true); }}
          color="info"
        >
          Mreža
        </Button>
      </Box>

      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <Typography variant="body2">Prikaži:</Typography>
        <ToggleButtonGroup
          value={timeRange}
          exclusive
          onChange={(e, val) => { if (val) { setTimeRange(val); } }}
          size="small"
        >
          <ToggleButton value="1h">Poslednjih sat</ToggleButton>
          <ToggleButton value="24h">Poslednjih 24h</ToggleButton>
          <ToggleButton value="7d">Poslednjih 7 dana</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Računar: {agentName}
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
        onChange={e => { setHideSystem(e.target.checked); setPage(0); }}
        sx={{ mb: 2 }}
      />

      {!loading && filtered.length > 0 && (
        <Paper>
          <List disablePadding>
            {filtered
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((alert, i) => {
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
                              <Chip icon={<PersonIcon />} label={user} size="small" variant="outlined" color="default" />
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
                    {i < rowsPerPage - 1 && <Divider />}
                  </Box>
                );
              })}
          </List>
          <TablePagination
            component="div"
            count={filtered.length}
            page={page}
            onPageChange={(e, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={e => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[5, 10, 25, 50, 100]}
            labelRowsPerPage="Redova po stranici:"
            labelDisplayedRows={({ from, to, count }) => `${from}–${to} od ${count}`}
          />
        </Paper>
      )}

      {!loading && filtered.length === 0 && !error && (
        <Alert severity="success">
          Nisu detektovane nikakve nepravilnosti na ovom računaru.
        </Alert>
      )}


      <ScreenshotDialog
        open={screenshotDialog}
        onClose={() => setScreenshotDialog(false)}
        agentId={agentId}
      />

      <NetworkDialog
        open={showNetwork}
        onClose={() => setShowNetwork(false)}
        agentId={agentId}
      />
    </Container>
  );
}