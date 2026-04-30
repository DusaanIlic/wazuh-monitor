import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, Box, Typography,
  Alert, Paper, TablePagination
} from '@mui/material';
import axios from 'axios';
import { API_URL } from '../config';

export default function NetworkDialog({ open, onClose, agentId }) {
  const [ports, setPorts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(3);

  const isLocalIP = (ip) => {
    if (!ip) return true;
    return ip.startsWith('192.168.') ||
      ip.startsWith('10.') ||
      ip.startsWith('172.') ||
      ip === '0.0.0.0' ||
      ip === '::' ||
      ip === '127.0.0.1';
  };

  useEffect(() => {
    if (open) {
      fetchPorts();
      setPage(0);
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
      setPorts(suspicious);
    } catch {
      console.error('Greška pri dohvatanju portova');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Mrežne konekcije — Računar {agentId}</DialogTitle>
      <DialogContent>
        {loading && <Typography>Učitavanje...</Typography>}
        {!loading && ports.length === 0 && (
          <Alert severity="success" sx={{ mt: 1 }}>
            Nisu detektovane sumnjive mrežne konekcije.
          </Alert>
        )}
        {!loading && ports.length > 0 && (
          <Box>
            <Alert severity="error" sx={{ mb: 2 }}>
              Detektovano {ports.length} sumnjiva mrežna konekcija ka spoljnim adresama!
            </Alert>
            {ports
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((p, i) => (
                <Paper key={i} sx={{ p: 1.5, mb: 1, backgroundColor: '#fff5f5', border: '1px solid #ffcdd2' }}>
                  <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '4px', mb: 0.5 }}>
                    <Typography color="error" variant="body2">⚠️</Typography>
                    <Typography fontWeight="bold" color="error" variant="body2">
                      Nedozvoljena komunikacija
                    </Typography>
                  </Box>
                  <Typography variant="body2">
                    <strong>{p.process}</strong> pokušava da komunicira sa spoljnom adresom
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    🌐 {p.remote?.ip}:{p.remote?.port} — {p.protocol?.toUpperCase()}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    🖥️ Lokalni port: {p.local?.port}
                  </Typography>
                </Paper>
              ))}
            <TablePagination
              component="div"
              count={ports.length}
              page={page}
              onPageChange={(e, val) => setPage(val)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value)); setPage(0); }}
              rowsPerPageOptions={[3, 5, 10, 20]}
              labelRowsPerPage="Po stranici:"
              labelDisplayedRows={({ from, to, count }) => `${from}–${to} od ${count}`}
            />
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}