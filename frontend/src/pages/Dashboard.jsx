import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, CircularProgress, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Chip, IconButton, Tooltip, TextField,
  InputAdornment
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { getAgents, getAgentRisk } from '../services/api';
import { getAgentRiskLevel, timeAgo } from '../utils/eventTranslator';
import { ToggleButton, ToggleButtonGroup, Divider } from '@mui/material';

export default function Dashboard() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState('all');
  const [agentRisks, setAgentRisks] = useState({});
  const navigate = useNavigate();

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

  useEffect(() => {
    fetchAgents();
    const interval = setInterval(fetchAgents, 30000);
    return () => clearInterval(interval);
  }, []);

  const filtered = agents
  .filter(a => a.name.toLowerCase().includes(search.toLowerCase()))
  .filter(a => {
    if (statusFilter === 'active') return a.status === 'active';
    if (statusFilter === 'inactive') return a.status !== 'active';
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

  const activeCount = agents.filter(a => a.status === 'active').length;

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
  
      {/* Search i Filter u jednom redu */}
      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <TextField
          size="small"
          placeholder="Pretraži po imenu računara..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{ width: 280 }}
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
        >
          <ToggleButton value="all">Svi ({agents.length})</ToggleButton>
          <ToggleButton value="active" color="success">Aktivni ({activeCount})</ToggleButton>
          <ToggleButton value="inactive" color="error">Neaktivni ({agents.length - activeCount})</ToggleButton>
        </ToggleButtonGroup>
      </Box>
  
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
  
      {/* Tabela */}
      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell align="center"><strong>Računar</strong></TableCell>
              <TableCell align="center"><strong>Status</strong></TableCell>
              <TableCell align="center"><strong>OS</strong></TableCell>
              <TableCell align="center"><strong>IP adresa</strong></TableCell>
              <TableCell align="center"><strong>Poslednji kontakt</strong></TableCell>
              <TableCell align="center"><strong>Procena</strong></TableCell>
              <TableCell align="center"><strong>Detalji</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={30} />
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">Nema rezultata</TableCell>
              </TableRow>
            ) : (
              filtered.map(agent => {
                const isActive = agent.status === 'active';
                const risk = agentRisks[agent.id];
                const riskLabel = !risk ? { label: '...', color: 'default' } :
                risk.risk === 'critical' ? { label: `Rizik (${risk.critical} kritičnih)`, color: 'error' } :
                risk.risk === 'warning' ? { label: `Pažnja (${risk.warning} upozorenja)`, color: 'warning' } :
                { label: 'U redu', color: 'success' };
                return (
                  <TableRow key={agent.id} hover>
                    <TableCell align="center">
                      <Typography fontWeight="bold">{agent.name}</Typography>
                      <Typography variant="caption" color="text.secondary">ID: {agent.id}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip label={isActive ? 'Aktivan' : 'Neaktivan'} color={isActive ? 'success' : 'error'} size="small" />
                    </TableCell>
                    <TableCell align="center">{agent.os?.name || 'N/A'}</TableCell>
                    <TableCell align="center">{agent.ip}</TableCell>
                    <TableCell align="center">
                      {new Date(agent.lastKeepAlive).getFullYear() === 9999
                        ? 'Server'
                        : timeAgo(agent.lastKeepAlive)}
                    </TableCell>
                    <TableCell align="center">
                    <Chip label={riskLabel.label} color={riskLabel.color} size="small" variant="outlined" />
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
      </TableContainer>
    </Container>
  );
}