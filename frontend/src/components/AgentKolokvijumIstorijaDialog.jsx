import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, Box, Typography,
  List, ListItem, ListItemText, Divider, Button, TablePagination
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { getIstorijaKolokvijuma, getKolokvijumLogoviUrl } from '../services/api';

function formatDatum(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('sr-RS', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).replace(',', '.');
}

export default function AgentKolokvijumIstorijaDialog({ open, onClose, agentId }) {
  const [istorija, setIstorija] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const rowsPerPage = 5;

  useEffect(() => {
    if (!open) return;

    const fetchIstorija = async () => {
      setLoading(true);
      try {
        const data = await getIstorijaKolokvijuma();
        const zaAgenta = data
          .filter(k => k.agents?.some(a => a.id === agentId))
          .sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
        setIstorija(zaAgenta);
        setPage(0);
      } catch {
        console.error('Greška pri dohvatanju istorije kolokvijuma');
      } finally {
        setLoading(false);
      }
    };
    fetchIstorija();
  }, [open, agentId]);

  const preuzmiLogove = (id) => {
    window.open(getKolokvijumLogoviUrl(id, agentId), '_blank');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Istorija logova — Računar {agentId}</DialogTitle>
      <DialogContent>
        {loading && <Typography sx={{ mt: 1 }}>Učitavanje...</Typography>}

        {!loading && istorija.length === 0 && (
          <Typography sx={{ mt: 1 }} color="text.secondary">
            Ovaj računar još uvek nije učestvovao ni u jednom kolokvijumu.
          </Typography>
        )}

        {!loading && istorija.length > 0 && (
          <Box sx={{ mt: 1 }}>
            <List disablePadding>
              {istorija
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((k, i, arr) => (
                  <Box key={k.id}>
                    <ListItem
                      sx={{ px: 0 }}
                      secondaryAction={
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<DownloadIcon />}
                          onClick={() => preuzmiLogove(k.id)}
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
                    {i < arr.length - 1 && <Divider />}
                  </Box>
                ))}
            </List>
            <TablePagination
              component="div"
              count={istorija.length}
              page={page}
              onPageChange={(e, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              rowsPerPageOptions={[5]}
              labelRowsPerPage="Redova po stranici:"
              labelDisplayedRows={({ from, to, count }) => `${from}–${to} od ${count}`}
            />
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
