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
import { getAgents } from '../services/api';
import { getAgentRiskLevel } from '../utils/eventTranslator';

export default function Dashboard() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [lastRefresh, setLastRefresh] = useState(new Date());
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

  const filtered = agents.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = agents.filter(a => a.status === 'active').length;

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Pregled računara
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Poslednje osvežavanje: {lastRefresh.toLocaleTimeString('sr-RS')}
          </Typography>
        </Box>
        <Tooltip title="Osveži">
          <IconButton onClick={fetchAgents} color="primary">
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Summary kartice */}
      <Box display="flex" gap={2} mb={3} flexWrap="wrap">
        <Paper sx={{ p: 2, minWidth: 140, textAlign: 'center' }}>
          <Typography variant="h3" fontWeight="bold" color="primary">
            {agents.length}
          </Typography>
          <Typography variant="body2" color="text.secondary">Ukupno računara</Typography>
        </Paper>
        <Paper sx={{ p: 2, minWidth: 140, textAlign: 'center' }}>
          <Typography variant="h3" fontWeight="bold" color="success.main">
            {activeCount}
          </Typography>
          <Typography variant="body2" color="text.secondary">Aktivnih</Typography>
        </Paper>
        <Paper sx={{ p: 2, minWidth: 140, textAlign: 'center' }}>
          <Typography variant="h3" fontWeight="bold" color="error.main">
            {agents.length - activeCount}
          </Typography>
          <Typography variant="body2" color="text.secondary">Neaktivnih</Typography>
        </Paper>
      </Box>

      {/* Search */}
      <TextField
        size="small"
        placeholder="Pretraži po imenu računara..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        sx={{ mb: 2, width: 300 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Tabela */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell><strong>Računar</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell><strong>OS</strong></TableCell>
              <TableCell><strong>IP adresa</strong></TableCell>
              <TableCell><strong>Poslednji kontakt</strong></TableCell>
              <TableCell><strong>Procena</strong></TableCell>
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
                <TableCell colSpan={7} align="center">
                  Nema rezultata
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(agent => {
                const isActive = agent.status === 'active';
                // Za sada dummy risk — kasnije ćemo povezati sa pravim alertima
                const risk = getAgentRiskLevel(0);
                return (
                  <TableRow key={agent.id} hover>
                    <TableCell>
                      <Typography fontWeight="bold">{agent.name}</Typography>
                      <Typography variant="caption" color="text.secondary">ID: {agent.id}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={isActive ? 'Aktivan' : 'Neaktivan'}
                        color={isActive ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{agent.os?.name || 'N/A'}</Typography>
                    </TableCell>
                    <TableCell>{agent.ip}</TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(agent.lastKeepAlive).getFullYear() === 9999
                          ? 'Server'
                          : new Date(agent.lastKeepAlive).toLocaleString('sr-RS')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={risk.label}
                        color={risk.color}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Pogledaj detalje">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => navigate(`/agent/${agent.id}`)}
                        >
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