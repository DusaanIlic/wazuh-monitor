import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, Box, Typography,
  Alert, Paper, Collapse, Button, Chip, Divider
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import WifiIcon from '@mui/icons-material/Wifi';
import axios from 'axios';
import { API_URL } from '../config';

function ProcessGroup({ processName, connections }) {
  const [expanded, setExpanded] = useState(false);
  const count = connections.length;

  return (
    <Paper sx={{ mb: 1.5, border: '1px solid #ffcdd2', overflow: 'hidden' }}>
      {/* Glavni red — pojednostavljen prikaz */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.5, backgroundColor: '#fff5f5' }}>
        <WifiIcon color="error" fontSize="small" />
        <Box sx={{ flex: 1 }}>
          <Typography fontWeight="bold" variant="body2" color="error.dark">
            {processName || 'Nepoznati program'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            pokušava da pristupi internetu
            {count > 1 && (
              <Chip
                label={`${count} konekcija`}
                size="small"
                color="error"
                variant="outlined"
                sx={{ ml: 1, height: 18, fontSize: '0.7rem' }}
              />
            )}
          </Typography>
        </Box>
        <Button
          size="small"
          onClick={() => setExpanded(v => !v)}
          endIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          sx={{ whiteSpace: 'nowrap', fontSize: '0.75rem', textTransform: 'none' }}
        >
          {expanded ? 'Sakrij detalje' : 'Prikaži detalje'}
        </Button>
      </Box>

      {/* Tehnički detalji — sklopivi */}
      <Collapse in={expanded}>
        <Divider />
        <Box sx={{ px: 2, py: 1.5, backgroundColor: '#fafafa' }}>
          <Typography variant="caption" color="text.secondary" fontWeight="bold" display="block" mb={0.5}>
            Tehničke informacije:
          </Typography>
          {connections.map((c, i) => (
            <Box key={i} sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, py: 0.5, borderTop: i > 0 ? '1px solid #eee' : 'none' }}>
              <Typography variant="caption" color="text.secondary">
                🌐 <strong>Destinacija:</strong> {c.remote?.ip}:{c.remote?.port}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                🔌 <strong>Protokol:</strong> {c.protocol?.toUpperCase()}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                🖥️ <strong>Lokalni port:</strong> {c.local?.port}
              </Typography>
            </Box>
          ))}
        </Box>
      </Collapse>
    </Paper>
  );
}

export default function NetworkDialog({ open, onClose, agentId }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);

  const isLocalIP = (ip) => {
    if (!ip) return true;
    return (
      ip.startsWith('192.168.') ||
      ip.startsWith('10.') ||
      ip.startsWith('172.') ||
      ip === '0.0.0.0' ||
      ip === '::' ||
      ip === '127.0.0.1'
    );
  };

  useEffect(() => {
    if (open) {
      fetchPorts();
    }
  }, [open]);

  const fetchPorts = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/network/${agentId}/ports`);
      const items = res.data.data.affected_items || [];
      const suspicious = items.filter(p =>
        p.remote?.ip && p.state === 'established' && !isLocalIP(p.remote.ip)
      );

      // Grupiši po nazivu procesa
      const map = {};
      for (const conn of suspicious) {
        const key = conn.process || '(nepoznato)';
        if (!map[key]) map[key] = [];
        map[key].push(conn);
      }
      setGroups(Object.entries(map));
    } catch {
      console.error('Greška pri dohvatanju portova');
    } finally {
      setLoading(false);
    }
  };

  const totalConnections = groups.reduce((sum, [, conns]) => sum + conns.length, 0);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Mrežne konekcije — Računar {agentId}</DialogTitle>
      <DialogContent>
        {loading && <Typography sx={{ mt: 1 }}>Učitavanje...</Typography>}

        {!loading && groups.length === 0 && (
          <Alert severity="success" sx={{ mt: 1 }}>
            Nisu detektovane sumnjive mrežne konekcije.
          </Alert>
        )}

        {!loading && groups.length > 0 && (
          <Box sx={{ mt: 1 }}>
            <Alert severity="error" sx={{ mb: 2 }}>
              {groups.length === 1
                ? `1 program pokušava da pristupi internetu (${totalConnections} konekcija).`
                : `${groups.length} programa pokušavaju da pristupe internetu (${totalConnections} konekcija ukupno).`}
            </Alert>
            {groups.map(([processName, connections]) => (
              <ProcessGroup key={processName} processName={processName} connections={connections} />
            ))}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
