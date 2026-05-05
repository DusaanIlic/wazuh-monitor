import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, Box, Typography,
  Button, CircularProgress, Alert, IconButton
} from '@mui/material';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import axios from 'axios';
import { API_URL } from '../config';

export default function ScreenshotDialog({ open, onClose, agentId }) {
  const [screenshots, setScreenshots] = useState([]);
  const [triggering, setTriggering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (open) fetchScreenshots();
  }, [open]);

  const fetchScreenshots = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/screenshots/list/${agentId}`);
      setScreenshots(res.data.data);
      setCurrentIndex(0);
    } catch {
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

  const current = screenshots[currentIndex];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth sx={{ '& .MuiDialog-paper': { overflow: 'hidden' } }}>
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
      <DialogContent sx={{ overflow: 'hidden', p: 2 }}>
        {loading && <CircularProgress />}
        {!loading && screenshots.length === 0 && (
          <Alert severity="info">Nema screenshotova za ovaj računar.</Alert>
        )}
        {!loading && screenshots.length > 0 && (
          <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="caption" color="text.secondary">
                🕐 {new Date(current.timestamp).toLocaleString('sr-RS')}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {currentIndex + 1} / {screenshots.length}
              </Typography>
            </Box>

            <Box position="relative" sx={{ overflow: 'hidden' }}>
              <img
                src={`${API_URL}${current.url}`}
                alt="screenshot"
                style={{ width: '100%', maxWidth: '100%', borderRadius: 4, border: '1px solid #ddd', display: 'block',  maxHeight: '70vh', objectFit: 'contain', }}
              />
              <IconButton
                onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
                disabled={currentIndex === 0}
                sx={{
                  position: 'absolute',
                  left: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  backgroundColor: 'rgba(255,255,255,0.8)',
                  boxShadow: 2,
                  '&:hover': { backgroundColor: '#f5f5f5' }
                }}
              >
                <ArrowBackIosIcon />
              </IconButton>

              <IconButton
                onClick={() => setCurrentIndex(i => Math.min(screenshots.length - 1, i + 1))}
                disabled={currentIndex === screenshots.length - 1}
                sx={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  backgroundColor: 'rgba(255,255,255,0.8)',
                  boxShadow: 2,
                  '&:hover': { backgroundColor: '#f5f5f5' }
                }}
              >
                <ArrowForwardIosIcon />
              </IconButton>
            </Box>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}