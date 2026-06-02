import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Button, Modal, Chip, CircularProgress,
} from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import ComputerIcon from '@mui/icons-material/Computer';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { getIstorijaKolokvijuma, getAgents } from '../services/api';

function formatDatum(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('sr-RS', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).replace(',', '.');
}

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 480,
  bgcolor: 'background.paper',
  borderRadius: 2,
  boxShadow: 24,
  p: 4,
};

export default function IstorijaPage() {
  const navigate = useNavigate();
  const [istorija, setIstorija] = useState([]);
  const [agentMap, setAgentMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [greska, setGreska] = useState(null);
  const [modalKolokvijum, setModalKolokvijum] = useState(null);

  useEffect(() => {
    Promise.all([getIstorijaKolokvijuma(), getAgents()])
      .then(([hist, agents]) => {
        setIstorija(hist);
        const map = {};
        (agents ?? []).forEach(a => { map[a.id] = a.name; });
        setAgentMap(map);
      })
      .catch(err => setGreska(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Box sx={{ p: 3, maxWidth: 1100, mx: 'auto' }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/')}
        sx={{ mb: 2 }}
      >
        Početna
      </Button>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <HistoryIcon sx={{ color: '#1565c0', fontSize: 28 }} />
        <Typography variant="h5" fontWeight="bold">
          Istorija kolokvijuma
        </Typography>
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {greska && (
        <Typography color="error" sx={{ mt: 2 }}>
          Greška pri učitavanju: {greska}
        </Typography>
      )}

      {!loading && !greska && istorija.length === 0 && (
        <Typography sx={{ mt: 4, color: 'text.secondary', textAlign: 'center' }}>
          Još uvek nema završenih kolokvijuma.
        </Typography>
      )}

      {!loading && !greska && istorija.length > 0 && (
        <TableContainer component={Paper} elevation={2}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#1565c0' }}>
                {['Početak', 'Završetak', 'Trajanje', 'Broj računara', ''].map(h => (
                  <TableCell key={h} sx={{ color: '#fff', fontWeight: 'bold' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {istorija.map((k, i) => (
                <TableRow key={k.id || i} hover>
                  <TableCell>{formatDatum(k.startTime)}</TableCell>
                  <TableCell>{formatDatum(k.endTime)}</TableCell>
                  <TableCell>
                    <Chip
                      label={`${k.trajanje ?? 0} min`}
                      size="small"
                      sx={{ backgroundColor: '#e3f2fd', color: '#1565c0', fontWeight: 'bold' }}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <ComputerIcon sx={{ fontSize: 16, color: '#555' }} />
                      <Typography variant="body2">
                        {(k.agents?.length ?? 0)} {racunariLabel(k.agents?.length ?? 0)}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => setModalKolokvijum(k)}
                    >
                      Pregledaj
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Modal open={!!modalKolokvijum} onClose={() => setModalKolokvijum(null)}>
        <Box sx={modalStyle}>
          {modalKolokvijum && (
            <>
              <Typography variant="h6" fontWeight="bold" mb={2}>
                Detalji kolokvijuma
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
                <Typography variant="body2">
                  <strong>Početak:</strong> {formatDatum(modalKolokvijum.startTime)}
                </Typography>
                <Typography variant="body2">
                  <strong>Završetak:</strong> {formatDatum(modalKolokvijum.endTime)}
                </Typography>
                <Typography variant="body2">
                  <strong>Trajanje:</strong> {modalKolokvijum.trajanje ?? 0} min
                </Typography>
                <Typography variant="body2">
                  <strong>Vremenski opseg:</strong>{' '}
                  {formatDatum(modalKolokvijum.startTime)} – {formatDatum(modalKolokvijum.endTime)}
                </Typography>
              </Box>

              <Typography variant="subtitle2" fontWeight="bold" mb={1}>
                Aktivni računari ({modalKolokvijum.agents?.length ?? 0}):
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
                {(modalKolokvijum.agents ?? []).length === 0 ? (
                  <Typography variant="body2" color="text.secondary">Nema podataka</Typography>
                ) : (
                  modalKolokvijum.agents.map(id => (
                    <Chip key={id} label={agentMap[id] ?? `Agent ${id}`} icon={<ComputerIcon />} size="small" />
                  ))
                )}
              </Box>

              <Button variant="contained" fullWidth onClick={() => setModalKolokvijum(null)}>
                Zatvori
              </Button>
            </>
          )}
        </Box>
      </Modal>
    </Box>
  );
}

function racunariLabel(n) {
  if (n === 1) return 'računar';
  if (n >= 2 && n <= 4) return 'računara';
  return 'računara';
}
