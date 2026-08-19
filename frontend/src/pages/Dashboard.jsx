import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, CircularProgress, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Chip, IconButton, Tooltip, TextField,
  InputAdornment, ToggleButton, ToggleButtonGroup, Divider, Button,
  FormControlLabel, Switch
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import TableRowsIcon from '@mui/icons-material/TableRows';
import SchoolIcon from '@mui/icons-material/School';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ComputerIcon from '@mui/icons-material/Computer';
import StorageIcon from '@mui/icons-material/Storage';
import { getAgents, getAgentRisk } from '../services/api';
import { timeAgo } from '../utils/eventTranslator';
import { getOsPlatform } from '../utils/os';
import ClassroomView from '../components/ClassroomView';

function OsIcon({ agent }) {
  const os = getOsPlatform(agent);
  if (os === 'windows') {
    return (
      <Tooltip title={agent.os?.name || 'Windows'}>
        <ComputerIcon sx={{ fontSize: 18, color: '#0078D4' }} />
      </Tooltip>
    );
  }
  if (os === 'linux') {
    return (
      <Tooltip title={agent.os?.name || 'Linux'}>
        <StorageIcon sx={{ fontSize: 18, color: 'success.main' }} />
      </Tooltip>
    );
  }
  return null;
}

function OsBadge({ agent }) {
  const os = getOsPlatform(agent);
  if (os === 'windows') {
    return (
      <Typography variant="caption" sx={{ color: '#0078D4', fontWeight: 'bold' }}>Win</Typography>
    );
  }
  if (os === 'linux') {
    return (
      <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 'bold' }}>Linux</Typography>
    );
  }
  return null;
}

export default function Dashboard({ kolokvijumAktivan, onStartKolokvijum, onStopKolokvijum }) {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState('all');
  const [agentRisks, setAgentRisks] = useState({});
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('dashboardViewMode') ?? 'lista');
  const [showDetails, setShowDetails] = useState(false);
  const navigate = useNavigate();

  const riskIcon = (risk) => {
    if (!risk) {
      return (
        <Tooltip title="Učitavanje...">
          <CircularProgress size={18} thickness={5} />
        </Tooltip>
      );
    }
    if (risk.risk === 'critical') {
      return (
        <Tooltip title={`Potrebna pažnja — ${risk.critical} kritičnih upozorenja`}>
          <ErrorIcon color="error" />
        </Tooltip>
      );
    }
    if (risk.risk === 'warning') {
      return (
        <Tooltip title={`Blago upozorenje — ${risk.warning} upozorenja`}>
          <WarningAmberIcon color="warning" />
        </Tooltip>
      );
    }
    return (
      <Tooltip title="Računar je uredan">
        <CheckCircleIcon color="success" />
      </Tooltip>
    );
  };

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const data = await getAgents();
      setAgents(data.filter(a => a.id !== '000'));
      setLastRefresh(new Date());
      setError(null);
    } catch (err) {
      setError('Greška pri dohvatanju agenata. Proverite konekciju sa serverom.');
    } finally {
      setLoading(false);
    }
  };

  const isAgentReallyActive = (agent) => {
    if (agent.id === '000') return true;
    if (agent.status !== 'active') return false;
    if (!agent.lastKeepAlive) return false;
  
    const lastKeepAlive = new Date(agent.lastKeepAlive);
  
    if (lastKeepAlive.getFullYear() === 9999) return true;
  
    const diffMs = Date.now() - lastKeepAlive.getTime();
    const diffMinutes = diffMs / 1000 / 60;
  
    return diffMinutes <= 5;
  };

  useEffect(() => {
    fetchAgents();
    const interval = setInterval(fetchAgents, 30000);
    return () => clearInterval(interval);
  }, []);

  const filtered = agents
  .filter(a => a.name.toLowerCase().includes(search.toLowerCase()))
  .filter(a => {
    if (statusFilter === 'active') return isAgentReallyActive(a);
    if (statusFilter === 'inactive') return !isAgentReallyActive(a);
    return true;
  });

  
  useEffect(() => {
    const fetchRisks = async () => {
      const risks = {};
      for (const agent of agents) {
        try {
          const risk = await getAgentRisk(agent.id);
          risks[agent.id] = risk;
        } catch {
          risks[agent.id] = { risk: 'low', critical: 0, warning: 0 };
        }
      }
      setAgentRisks(risks);
    };
    
    if (agents.length > 0) fetchRisks();
  }, [agents]);

  useEffect(() => {
    localStorage.setItem('dashboardViewMode', viewMode);
  }, [viewMode]);

  const activeCount = agents.filter(isAgentReallyActive).length;

  return (
    <Container maxWidth="xl" sx={{ mt: 3, mb: 4 }}>
      <Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', mb: 2, width: '100%' }}>
  
      {/* Leva strana */}
      <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 1 }}>
        <Typography variant="h5" fontWeight="bold">Pregled računara</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
          — osveženo: {lastRefresh.toLocaleTimeString('sr-RS')}
        </Typography>
        <Tooltip title="Osveži">
          <IconButton onClick={fetchAgents} size="small" color="primary">
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Sredina — kolokvijum dugme */}
      <Box>
        {kolokvijumAktivan ? (
          <Button
            variant="contained"
            color="error"
            size="large"
            startIcon={<StopIcon />}
            onClick={onStopKolokvijum}
            sx={{ fontWeight: 'bold', px: 3, py: 1.2, fontSize: '1rem', boxShadow: 3 }}
          >
            Zaustavi kolokvijum
          </Button>
        ) : (
          <Button
            variant="contained"
            color="success"
            size="large"
            startIcon={<PlayArrowIcon />}
            onClick={onStartKolokvijum}
            sx={{ fontWeight: 'bold', px: 3, py: 1.2, fontSize: '1rem', boxShadow: 3 }}
          >
            Pokreni kolokvijum
          </Button>
        )}
      </Box>

      {/* Desna strana — statistike */}
      <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 3 }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h6" fontWeight="bold" color="primary" sx={{ lineHeight: 1 }}>{agents.length}</Typography>
          <Typography variant="caption" color="text.secondary">Ukupno</Typography>
        </Box>
        <Divider orientation="vertical" flexItem sx={{ height: 32, alignSelf: 'center' }} />
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h6" fontWeight="bold" color="success.main" sx={{ lineHeight: 1 }}>{activeCount}</Typography>
          <Typography variant="caption" color="text.secondary">Aktivnih</Typography>
        </Box>
        <Divider orientation="vertical" flexItem sx={{ height: 32, alignSelf: 'center' }} />
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h6" fontWeight="bold" color="error.main" sx={{ lineHeight: 1 }}>{agents.length - activeCount}</Typography>
          <Typography variant="caption" color="text.secondary">Neaktivnih</Typography>
        </Box>
      </Box>

</Box>

      {/* Search, Filter, View toggle i Legenda u jednom redu */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'nowrap', mb: 2 }}>
        <TextField
          size="small"
          placeholder="Pretraži po imenu računara..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{ width: 240, flexShrink: 0 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
        <ToggleButtonGroup
          value={statusFilter}
          exclusive
          onChange={(e, val) => { if (val !== null) setStatusFilter(val); }}
          size="small"
          sx={{ flexShrink: 0 }}
        >
          <ToggleButton value="all">Svi ({agents.length})</ToggleButton>
          <ToggleButton value="active" color="success">Aktivni ({activeCount})</ToggleButton>
          <ToggleButton value="inactive" color="error">Neaktivni ({agents.length - activeCount})</ToggleButton>
        </ToggleButtonGroup>
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(e, val) => { if (val !== null) setViewMode(val); }}
          size="small"
          sx={{ flexShrink: 0 }}
        >
          <ToggleButton value="lista">
            <Tooltip title="Prikaz liste">
              <TableRowsIcon fontSize="small" />
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="ucionica">
            <Tooltip title="Prikaz učionice">
              <SchoolIcon fontSize="small" />
            </Tooltip>
          </ToggleButton>
        </ToggleButtonGroup>
        {viewMode === 'lista' && (
          <FormControlLabel
            sx={{ flexShrink: 0, ml: 0 }}
            control={
              <Switch
                size="small"
                checked={showDetails}
                onChange={e => setShowDetails(e.target.checked)}
              />
            }
            label={<Typography variant="caption" noWrap>Prikaži detalje (OS, IP)</Typography>}
          />
        )}
        {(viewMode === 'ucionica' || viewMode === 'lista') && (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 14, height: 14, bgcolor: 'error.main', borderRadius: '7px', flexShrink: 0 }} />
              <Typography variant="caption" color="text.secondary" noWrap>Kritični alertovi (neovlašćen pristup, sumnjiv proces, USB uređaj...)</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 14, height: 14, bgcolor: 'warning.main', borderRadius: '7px', flexShrink: 0 }} />
              <Typography variant="caption" color="text.secondary" noWrap>Upozorenja (promena fajla, mrežna aktivnost...)</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 14, height: 14, bgcolor: 'success.main', borderRadius: 0.5, flexShrink: 0 }} />
              <Typography variant="caption" color="text.secondary" noWrap>Aktivan</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 14, height: 14, bgcolor: 'action.disabledBackground', border: '1px solid', borderColor: 'divider', borderRadius: 0.5, flexShrink: 0 }} />
              <Typography variant="caption" color="text.secondary" noWrap>Nije povezan</Typography>
            </Box>
          </>
        )}
      </Box>
  
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Prikaz učionice */}
      {viewMode === 'ucionica' && (
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
          {loading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress size={30} />
            </Box>
          ) : (
            <ClassroomView
              agents={filtered.map(agent => ({
                ...agent,
                isActive: isAgentReallyActive(agent),
                criticalAlerts: agentRisks[agent.id]?.critical ?? 0,
                warningAlerts: agentRisks[agent.id]?.warning ?? 0,
              }))}
              onAgentClick={agent => navigate(`/agent/${agent.id}`)}
            />
          )}
        </Box>
      )}

      {/* Tabela */}
      {viewMode === 'lista' && <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell align="center"><strong>Računar</strong></TableCell>
              <TableCell align="center"><strong>Status</strong></TableCell>
              {showDetails && <TableCell align="center"><strong>OS</strong></TableCell>}
              {showDetails && <TableCell align="center"><strong>IP adresa</strong></TableCell>}
              <TableCell align="center"><strong>Poslednji kontakt</strong></TableCell>
              <TableCell align="center"><strong>Procena</strong></TableCell>
              <TableCell align="center"><strong>Detalji</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={showDetails ? 7 : 5} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={30} />
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showDetails ? 7 : 5} align="center">Nema rezultata</TableCell>
              </TableRow>
            ) : (
              filtered.map(agent => {
                const isActive = isAgentReallyActive(agent);
                const risk = agentRisks[agent.id];
                return (
                  <TableRow key={agent.id} hover>
                    <TableCell align="center">
                      <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
                        <OsIcon agent={agent} />
                        <Typography fontWeight="bold">{agent.name}</Typography>
                        <OsBadge agent={agent} />
                      </Box>
                      <Typography variant="caption" color="text.secondary">ID: {agent.id}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip label={isActive ? 'Aktivan' : 'Neaktivan'} color={isActive ? 'success' : 'error'} size="small" />
                    </TableCell>
                    {showDetails && <TableCell align="center">{agent.os?.name || 'N/A'}</TableCell>}
                    {showDetails && <TableCell align="center">{agent.ip}</TableCell>}
                    <TableCell align="center">
                      {new Date(agent.lastKeepAlive).getFullYear() === 9999
                        ? 'Server'
                        : timeAgo(agent.lastKeepAlive)}
                    </TableCell>
                    <TableCell align="center">
                      {riskIcon(risk)}
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Pogledaj detalje">
                        <IconButton size="small" color="primary" onClick={() => navigate(`/agent/${agent.id}`)}>
                          <VisibilityIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>}
    </Container>
  );
}