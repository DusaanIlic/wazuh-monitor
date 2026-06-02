import { useEffect, useState } from 'react';
import { AppBar, Toolbar, Typography, Box, Chip, Tooltip, IconButton } from '@mui/material';
import SecurityIcon from '@mui/icons-material/Security';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import SettingsIcon from '@mui/icons-material/Settings';
import HistoryIcon from '@mui/icons-material/History';
import { useNavigate } from 'react-router-dom';

function formatElapsed(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function Navbar({ kolokvijumAktivan, kolokvijumPocetak }) {
  const [elapsed, setElapsed] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (!kolokvijumAktivan || !kolokvijumPocetak) {
      setElapsed(0);
      return;
    }

    const update = () => {
      const diff = Math.floor((Date.now() - new Date(kolokvijumPocetak).getTime()) / 1000);
      setElapsed(diff > 0 ? diff : 0);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [kolokvijumAktivan, kolokvijumPocetak]);

  return (
    <AppBar position="static" sx={{ backgroundColor: '#1565c0' }}>
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <SecurityIcon sx={{ mr: 2 }} />
          <Box>
            <Typography variant="h6" fontWeight="bold" lineHeight={1.2}>
              Wazuh Monitor
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              Nadzor aktivnosti tokom kolokvijuma
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="Istorija kolokvijuma">
            <IconButton color="inherit" onClick={() => navigate('/istorija')}>
              <HistoryIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Pravila praćenja">
            <IconButton color="inherit" onClick={() => navigate('/rules')}>
              <SettingsIcon />
            </IconButton>
          </Tooltip>

          {kolokvijumAktivan && (
          <Chip
            icon={
              <FiberManualRecordIcon
                sx={{ color: '#ff1744 !important', fontSize: 14, animation: 'pulse 1.2s ease-in-out infinite' }}
              />
            }
            label={`Kolokvijum u toku — ${formatElapsed(elapsed)}`}
            sx={{
              backgroundColor: 'rgba(255,23,68,0.15)',
              border: '1px solid #ff1744',
              color: '#fff',
              fontWeight: 'bold',
              fontSize: '0.85rem',
              px: 1,
              '@keyframes pulse': {
                '0%, 100%': { opacity: 1 },
                '50%': { opacity: 0.3 },
              },
            }}
          />
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}
