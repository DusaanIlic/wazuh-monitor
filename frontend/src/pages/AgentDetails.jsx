import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Alert,
  Button, Paper, Chip, Divider, List, ListItem,
  ListItemIcon, ListItemText, TablePagination,
  ToggleButton, ToggleButtonGroup, Tooltip
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorIcon from '@mui/icons-material/Error';
import InfoIcon from '@mui/icons-material/Info';
import PersonIcon from '@mui/icons-material/Person';
import { getAgentAlerts, getKolokvijumStatus } from '../services/api';
import { translateAlert, severityConfig, isSystemEvent } from '../utils/eventTranslator';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import NetworkCheckIcon from '@mui/icons-material/NetworkCheck';
import DownloadIcon from '@mui/icons-material/Download';
import HistoryIcon from '@mui/icons-material/History';
import axios from 'axios'
import ScreenshotDialog from '../components/ScreenshotDialog';
import NetworkDialog from '../components/NetworkDialog';
import AgentKolokvijumIstorijaDialog from '../components/AgentKolokvijumIstorijaDialog';
import { API_URL } from '../config';

const severityIcon = {
  critical: <ErrorIcon color="error" />,
  warning: <WarningAmberIcon color="warning" />,
  info: <InfoIcon color="info" />,
};

const DEDUP_WINDOW_MS = 5000;

function dedupeAlerts(list) {
  const kept = [];
  for (const alert of list) {
    const time = new Date(alert.timestamp).getTime();
    const isDuplicate = kept.some(existing =>
      existing.translated.msg === alert.translated.msg &&
      Math.abs(time - new Date(existing.timestamp).getTime()) < DEDUP_WINDOW_MS
    );
    if (!isDuplicate) kept.push(alert);
  }
  return kept;
}

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
  const [logHistoryDialog, setLogHistoryDialog] = useState(false);

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

        // Kada je kolokvijum aktivan, koristi njegov startTime kao apsolutnu donju granicu ('from')
        const from = status?.isActive && status?.startTime ? status.startTime : null;

        const data = await getAgentAlerts(agentId, 200, timeRange, from);
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

  const filtered = dedupeAlerts(alerts.filter(a => !a.isSystem));

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

  const downloadLogs = async () => {
    if (!kolokvijumAktivan || !kolokvijum?.startTime) return;

    try {
      const data = await getAgentAlerts(agentId, 1000, timeRange, kolokvijum.startTime);
      const isNoiseAlert = (a) => {
        const msg = a.translated?.msg || '';
        return msg.includes('Summary event') || msg.includes('report signatures') || msg.includes('Kaspersky');
      };

      const rowsData = data
        .map(a => ({ ...a, translated: translateAlert(a), isSystem: isSystemEvent(a) }))
        .filter(a => !a.isSystem && !a.rule?.groups?.includes('syscheck') && !isNoiseAlert(a));

      const datum = new Date().toISOString().slice(0, 10);
      const filename = `logovi_${agentName}_${datum}.csv`;
      const header = ['Vreme', 'Racunar', 'Tip', 'Opis', 'Korisnik'];
      const rows = rowsData.map(alert => [
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
    } catch (err) {
      console.error('Greška pri preuzimanju logova kolokvijuma');
    }
  };

  const fetchPorts = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/network/${agentId}/ports`);
      const items = res.data.data.affected_items || [];

      const withProcess = items.filter(p => p.process && p.process.trim() !== '');

      setPorts(withProcess);
    } catch (err) {
      console.error('Greška');
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }} alignItems="center">
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

        <Tooltip title={!kolokvijumAktivan ? 'Pokrenite kolokvijum da biste videli mrežne konekcije' : ''}>
          <span>
            <Button
              variant="outlined"
              startIcon={<NetworkCheckIcon />}
              onClick={() => { fetchPorts(); setShowNetwork(true); }}
              color="info"
              disabled={!kolokvijumAktivan}
            >
              Mreža
            </Button>
          </span>
        </Tooltip>

        <Tooltip title={!kolokvijumAktivan ? 'Pokrenite kolokvijum' : ''}>
          <span>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={downloadLogs}
              color="success"
              disabled={!kolokvijumAktivan || !kolokvijum?.startTime}
            >
              Preuzmi logove
            </Button>
          </span>
        </Tooltip>

        <Button
          variant="outlined"
          startIcon={<HistoryIcon />}
          onClick={() => setLogHistoryDialog(true)}
          color="secondary"
        >
          Istorija logova
        </Button>
      </Box>

      <Box display="flex" flexDirection="row" justifyContent="space-between" alignItems="center" mb={2} mt={2}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Računar: {agentName}
          </Typography>
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
        kolokvijumAktivan={kolokvijumAktivan}
      />

      <NetworkDialog
        open={showNetwork}
        onClose={() => setShowNetwork(false)}
        agentId={agentId}
      />

      <AgentKolokvijumIstorijaDialog
        open={logHistoryDialog}
        onClose={() => setLogHistoryDialog(false)}
        agentId={agentId}
      />
    </Container>
  );
}