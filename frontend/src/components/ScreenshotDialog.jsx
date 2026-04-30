import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, Box, Typography,
  Button, CircularProgress, Alert
} from '@mui/material';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import axios from 'axios';
import { API_URL } from '../config';

export default function ScreenshotDialog({ open, onClose, agentId }) {
  const [screenshots, setScreenshots] = useState([]);
  const [triggering, setTriggering] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchScreenshots = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/screenshots/list/${agentId}`);
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
      await axios.post(`${API_URL}/api/screenshots/trigger/${agentId}`);
      setTimeout(async () => {
        await fetchScreenshots();
        setTriggering(false);
      }, 8000);
    } catch {
      setTriggering(false);
    }
  };


  useEffect(() => {
    if (open) {
      fetchScreenshots();
    }
  }, [open]);

  const handleOpen = () => {
    fetchScreenshots();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
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
              src={`${API_URL}${s.url}`}
              alt="screenshot"
              style={{ width: '100%', borderRadius: 4, border: '1px solid #ddd' }}
            />
          </Box>
        ))}
      </DialogContent>
    </Dialog>
  );
}