import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, CircularProgress, Alert,
  Button, Paper, Chip, Divider, List, ListItem,
  ListItemIcon, ListItemText, FormControlLabel, Switch
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorIcon from '@mui/icons-material/Error';
import InfoIcon from '@mui/icons-material/Info';
import PersonIcon from '@mui/icons-material/Person';
import { getAgentAlerts } from '../services/api';
import { translateAlert, severityConfig, isSystemEvent } from '../utils/eventTranslator';
import { TablePagination } from '@mui/material';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import { Dialog, DialogTitle, DialogContent } from '@mui/material';
import axios from 'axios'


const severityIcon = {
  critical: <ErrorIcon color="error" />,
  warning: <WarningAmberIcon color="warning" />,
  info: <InfoIcon color="info" />,
};

export default function AgentDetails() {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hideSystem, setHideSystem] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [screenshots, setScreenshots] = useState([]);
  const [screenshotDialog, setScreenshotDialog] = useState(false);
  const [triggeringScreenshot, setTriggeringScreenshot] = useState(false);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const data = await getAgentAlerts(agentId, 200);
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
  }, [agentId]);

  const filtered = hideSystem ? alerts.filter(a => !a.isSystem) : alerts;
  const criticalCount = filtered.filter(e => e.translated.severity === 'critical').length;
  const warningCount = filtered.filter(e => e.translated.severity === 'warning').length;

  const fetchScreenshots = async () => {
    try {
      const res = await axios.get(`http://localhost:3001/api/screenshots/list/${agentId}`);
      setScreenshots(res.data.data);
    } catch (err) {
      console.error('Greška pri dohvatanju screenshotova');
    }
  };
  
  const triggerScreenshot = async () => {
    setTriggeringScreenshot(true);
    try {
      await axios.post(`http://localhost:3001/api/screenshots/trigger/${agentId}`);
      // Sačekaj 8 sekundi pa osveži
      setTimeout(async () => {
        await fetchScreenshots();
        setTriggeringScreenshot(false);
      }, 8000);
    } catch (err) {
      console.error('Greška');
      setTriggeringScreenshot(false);
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
      </Box>

      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Računar: {agentId}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Prikaz detektovanih aktivnosti
          </Typography>
        </Box>
        <Box display="flex" gap={1} flexWrap="wrap" justifyContent="flex-end">
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
      </Box>

      <FormControlLabel
        control={<Switch checked={hideSystem} onChange={e => setHideSystem(e.target.checked)} />}
        label="Sakrij sistemske procese (SYSTEM, NT AUTHORITY...)"
        onChange={e => { setHideSystem(e.target.checked); setPage(0); }}
        sx={{ mb: 2 }}
      />

      {!loading && filtered.length > 0 && (
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
                            <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                              Rule: {alert.rule?.id} — {alert.rule?.description}
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

      {!loading && filtered.length === 0 && !error && (
        <Alert severity="success">
          Nisu detektovane nikakve nepravilnosti na ovom računaru.
        </Alert>
      )}




      <Dialog
        open={screenshotDialog}
        onClose={() => setScreenshotDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Screenshots — {agentId}</Typography>
            <Button
              variant="outlined"
              startIcon={triggeringScreenshot ? <CircularProgress size={16} /> : <CameraAltIcon />}
              onClick={triggerScreenshot}
              disabled={triggeringScreenshot}
              size="small"
            >
              {triggeringScreenshot ? 'Čekanje...' : 'Napravi screenshot'}
            </Button>
          </Box>
        </DialogTitle>
        <DialogContent>
          {screenshots.length === 0 ? (
            <Alert severity="info">Nema screenshotova za ovaj računar.</Alert>
          ) : (
            <Box display="flex" flexDirection="column" gap={2}>
              {screenshots.map((s, i) => (
                <Box key={i}>
                  <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                    🕐 {new Date(s.timestamp).toLocaleString('sr-RS')}
                  </Typography>
                  <img
                    src={`http://localhost:3001${s.url}`}
                    alt="screenshot"
                    style={{ width: '100%', borderRadius: 4, border: '1px solid #ddd' }}
                  />
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Container>
  );
}