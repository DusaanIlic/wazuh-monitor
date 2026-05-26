import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Paper, TextField, Select, MenuItem,
  FormControl, InputLabel, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, IconButton, Divider, Alert
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const TIP_OPTIONS = [
  { value: 'usb', label: 'USB' },
  { value: 'network', label: 'Mreža' },
  { value: 'process', label: 'Proces' },
  { value: 'file', label: 'Fajl' },
];

const AKCIJA_OPTIONS = [
  { value: 'critical', label: 'Kritično' },
  { value: 'warning', label: 'Upozorenje' },
  { value: 'ignore', label: 'Ignoriši' },
];

const tipColor = { usb: 'error', network: 'primary', process: 'warning', file: 'default' };
const akcijaColor = { critical: 'error', warning: 'warning', ignore: 'default' };

function loadRules() {
  try {
    return JSON.parse(localStorage.getItem('watchRules') || '[]');
  } catch {
    return [];
  }
}

function saveRules(rules) {
  localStorage.setItem('watchRules', JSON.stringify(rules));
}

const EMPTY_FORM = { naziv: '', tip: 'process', akcija: 'warning', pattern: '' };

export default function RulesPage() {
  const navigate = useNavigate();
  const [rules, setRules] = useState(loadRules);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');

  const handleAdd = () => {
    if (!form.naziv.trim()) { setError('Naziv je obavezan.'); return; }
    if (!form.pattern.trim()) { setError('Pattern je obavezan.'); return; }
    setError('');
    const updated = [...rules, { ...form, naziv: form.naziv.trim(), pattern: form.pattern.trim(), id: Date.now() }];
    setRules(updated);
    saveRules(updated);
    setForm(EMPTY_FORM);
  };

  const handleDelete = (id) => {
    const updated = rules.filter(r => r.id !== id);
    setRules(updated);
    saveRules(updated);
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/')} sx={{ mb: 2 }}>
        Nazad
      </Button>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        Pravila praćenja
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Pravila se primenjuju pre svih ostalih provjera pri prevođenju alertova. Podudaranje se vrši po <em>pattern</em>-u u putanji fajla ili nazivu procesa.
      </Typography>

      <Paper variant="outlined" sx={{ p: 3, mb: 4 }}>
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          Dodaj novo pravilo
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <TextField
            label="Naziv"
            size="small"
            value={form.naziv}
            onChange={e => setForm(f => ({ ...f, naziv: e.target.value }))}
            sx={{ flex: '1 1 160px' }}
          />
          <TextField
            label="Pattern"
            size="small"
            placeholder="npr. copilot, chrome.exe, C:\\Users"
            value={form.pattern}
            onChange={e => setForm(f => ({ ...f, pattern: e.target.value }))}
            sx={{ flex: '2 1 200px' }}
          />
          <FormControl size="small" sx={{ flex: '1 1 120px' }}>
            <InputLabel>Tip</InputLabel>
            <Select label="Tip" value={form.tip} onChange={e => setForm(f => ({ ...f, tip: e.target.value }))}>
              {TIP_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ flex: '1 1 130px' }}>
            <InputLabel>Akcija</InputLabel>
            <Select label="Akcija" value={form.akcija} onChange={e => setForm(f => ({ ...f, akcija: e.target.value }))}>
              {AKCIJA_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
            </Select>
          </FormControl>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAdd}
            sx={{ height: 40, alignSelf: 'flex-start' }}
          >
            Dodaj
          </Button>
        </Box>
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </Paper>

      {rules.length === 0 ? (
        <Typography color="text.secondary" align="center" sx={{ mt: 4 }}>
          Nema definisanih pravila.
        </Typography>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell><strong>Naziv</strong></TableCell>
                <TableCell><strong>Pattern</strong></TableCell>
                <TableCell><strong>Tip</strong></TableCell>
                <TableCell><strong>Akcija</strong></TableCell>
                <TableCell align="right"></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rules.map(rule => (
                <TableRow key={rule.id} hover>
                  <TableCell>{rule.naziv}</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace" fontSize="0.8rem">
                      {rule.pattern}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={TIP_OPTIONS.find(t => t.value === rule.tip)?.label ?? rule.tip}
                      color={tipColor[rule.tip] ?? 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={AKCIJA_OPTIONS.find(a => a.value === rule.akcija)?.label ?? rule.akcija}
                      color={akcijaColor[rule.akcija] ?? 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" color="error" onClick={() => handleDelete(rule.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Container>
  );
}
