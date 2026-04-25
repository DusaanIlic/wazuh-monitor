import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, Box, Typography,
  Button, CircularProgress, Alert
} from '@mui/material';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import axios from 'axios';

export default function ScreenshotDialog({ open, onClose, agentId }) {
  const [screenshots, setScreenshots] = useState([]);
  const [triggering, setTriggering] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchScreenshots = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`http://localhost:3001/api/screenshots/list/${agentId}`);
      setScreenshots(res.data.data);
    } catch (err) {
      console.error('Greška pri dohvatanju screenshotova');
    } finally {
      setLoading(false);
    }
  };

  const triggerScreenshot = async () => {
    setTriggering(true);
    try {
      await axios.post(`http://localhost:3001/api/screenshots/trigger/${agentId}`);
      setTimeout(async () => {
        await fetchScreenshots();
        setTriggering(false);
      }, 8000);
    } catch {
      setTriggering(false);
    }
  };

  const handleOpen = () => {
    fetchScreenshots();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth TransitionProps={{ onEntered: handleOpen }}>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Screenshots — {agentId}</Typography>
          <Button
            variant="outlined"
            startIcon={triggering ? <CircularProgress size={16} /> : <CameraAltIcon />}
            onClick={triggerScreenshot}
            disabled={triggering}
            size="small"
          >
            {triggering ? 'Čekanje...' : 'Napravi screenshot'}
          </Button>
        </Box>
      </DialogTitle>
      <DialogContent>
        {loading && <CircularProgress />}
        {!loading && screenshots.length === 0 && (
          <Alert severity="info">Nema screenshotova za ovaj računar.</Alert>
        )}
        {!loading && screenshots.map((s, i) => (
          <Box key={i} mb={2}>
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
      </DialogContent>
    </Dialog>
  );
}