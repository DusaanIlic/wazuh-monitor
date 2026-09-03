import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Alert,
  Button, Paper, Chip, Divider, List, ListItem,
  ListItemIcon, ListItemText, TablePagination,
  ToggleButton, ToggleButtonGroup
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorIcon from '@mui/icons-material/Error';
import InfoIcon from '@mui/icons-material/Info';
import PersonIcon from '@mui/icons-material/Person';
import { getAgentAlerts, getKolokvijumStatus, getIstorijaKolokvijuma, getKolokvijumLogoviUrl } from '../services/api';
import { translateAlert, severityConfig, isSystemEvent } from '../utils/eventTranslator';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import NetworkCheckIcon from '@mui/icons-material/NetworkCheck';
import DownloadIcon from '@mui/icons-material/Download';
import HistoryIcon from '@mui/icons-material/History';
import axios from 'axios'
import ScreenshotDialog from '../components/ScreenshotDialog';
import NetworkDialog from '../components/NetworkDialog';
import { API_URL } from '../config';

function formatDatum(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('sr-RS', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).replace(',', '.');
}

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
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [screenshots, setScreenshots] = useState([]);
  const [screenshotDialog, setScreenshotDialog] = useState(false);
  const [ports, setPorts] = useState([]);
  const [showNetwork, setShowNetwork] = useState(false);
  const [networkPage, setNetworkPage] = useState(0);
  const [networkRowsPerPage, setNetworkRowsPerPage] = useState(3);
  const [timeRange, setTimeRange] = useState('24h');
  const [kolokvijum, setKolokvijum] = useState(null);
  const [kolokvijumAktivan, setKolokvijumAktivan] = useState(
    () => localStorage.getItem('kolokvijumAktivan') === 'true'
  );
  const [istorijaKolokvijuma, setIstorijaKolokvijuma] = useState([]);

  useEffect(() => {
    const aktivan = localStorage.getItem('kolokvijumAktivan') === 'true';
    setKolokvijumAktivan(aktivan);

    if (!aktivan) {
      setAlerts([]);
      setKolokvijum(null);
      setLoading(false);
      return;
    }

    const fetchAlerts = async () => {
      console.log('[AgentDetails] fetchAlerts pozvan | agentId:', agentId, '| timeRange:', timeRange);
      setLoading(true);
      try {
        const status = await getKolokvijumStatus();
        setKolokvijum(status);

        const data = await getAgentAlerts(agentId, 200, timeRange);
        console.log('Alerte dobijene:', data);
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

  useEffect(() => {
    const fetchIstorija = async () => {
      try {
        const data = await getIstorijaKolokvijuma();
        setIstorijaKolokvijuma(data.filter(k => k.agents?.some(a => a.id === agentId)));
      } catch (err) {
        console.error('Greška pri dohvatanju istorije kolokvijuma');
      }
    };
    fetchIstorija();
  }, [agentId]);

  const filtered = alerts.filter(a => !a.isSystem);
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

  const formatCsvDate = (dateStr) => {
    const d = new Date(dateStr);
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  const escapeCsvField = (value) => {
    const str = String(value ?? '');
    if (/[",\n;]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const downloadLogs = () => {
    const datum = new Date().toISOString().slice(0, 10);
    const filename = `logovi_${agentName}_${datum}.csv`;
    const header = ['Vreme', 'Racunar', 'Tip', 'Opis', 'Korisnik'];
    const rows = filtered.map(alert => [
      formatCsvDate(alert.timestamp),
      agentName,
      severityConfig[alert.translated.severity]?.label || alert.translated.severity,
      alert.translated.msg,
      alert.translated.user || '',
    ]);
    const csv = [header, ...rows]
      .map(row => row.map(escapeCsvField).join(','))
      .join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const preuzmiLogoveKolokvijuma = (id) => {
    window.open(getKolokvijumLogoviUrl(id, agentId), '_blank');
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

        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={downloadLogs}
          color="success"
          disabled={filtered.length === 0}
        >
          Preuzmi logove
        </Button>
      </Box>

      {istorijaKolokvijuma.length > 0 && (
        <Paper sx={{ mt: 2, p: 2 }}>
          <Box display="flex" alignItems="center" gap={1} mb={1}>
            <HistoryIcon sx={{ color: '#1565c0' }} />
            <Typography variant="h6" fontWeight="bold">
              Istorija kolokvijuma
            </Typography>
          </Box>
          <List disablePadding>
            {istorijaKolokvijuma.map((k, i) => (
              <Box key={k.id}>
                <ListItem
                  sx={{ px: 0 }}
                  secondaryAction={
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<DownloadIcon />}
                      onClick={() => preuzmiLogoveKolokvijuma(k.id)}
                    >
                      Preuzmi logove
                    </Button>
                  }
                >
                  <ListItemText
                    primary={formatDatum(k.startTime)}
                    secondary={`Trajanje: ${k.trajanje ?? 0} min`}
                  />
                </ListItem>
                {i < istorijaKolokvijuma.length - 1 && <Divider />}
              </Box>
            ))}
          </List>
        </Paper>
      )}

      <Box display="flex" flexDirection="row" justifyContent="space-between" alignItems="center" mb={2} mt={2}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Računar: {agentName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Prikaz detektovanih aktivnosti
          </Typography>
          {kolokvijumAktivan && (
            <Box display="flex" flexDirection="row" gap={1} alignItems="center" mt={1}>
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
          )}
        </Box>

        {kolokvijumAktivan && (
          <Box display="flex" flexDirection="row" alignItems="center" gap={1}>
            <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>Prikaži:</Typography>
            <ToggleButtonGroup
              value={timeRange}
              exclusive
              onChange={(e, val) => { if (val) setTimeRange(val); }}
              size="small"
              sx={{
                '& .MuiToggleButton-root': {
                  px: 2.5,
                  py: 1,
                  textTransform: 'none',
                  border: '1px solid',
                  borderColor: 'divider',
                  '&.Mui-selected': {
                    backgroundColor: 'primary.main',
                    color: 'primary.contrastText',
                    '&:hover': {
                      backgroundColor: 'primary.dark',
                    },
                  },
                },
              }}
            >
              <ToggleButton value="1h">Poslednjih sat</ToggleButton>
              <ToggleButton value="24h">Poslednjih 24h</ToggleButton>
              <ToggleButton value="7d">Poslednjih 7 dana</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        )}
      </Box>

      {kolokvijumAktivan && kolokvijum?.startTime && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {`Kolokvijum aktivan (pokrenut ${new Date(kolokvijum.startTime).toLocaleTimeString('sr-RS')}) — prikazuju se alerti za izabrani period.`}
        </Alert>
      )}

      {!kolokvijumAktivan && (
        <Alert severity="info" sx={{ mt: 2 }}>
          Pokrenite kolokvijum da biste videli aktivnosti na ovom računaru.
        </Alert>
      )}

      {kolokvijumAktivan && !loading && filtered.length > 0 && (
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

      {kolokvijumAktivan && !loading && filtered.length === 0 && !error && (
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