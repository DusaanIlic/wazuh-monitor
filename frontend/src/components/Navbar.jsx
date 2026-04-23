import { AppBar, Toolbar, Typography, Box } from '@mui/material';
import SecurityIcon from '@mui/icons-material/Security';

export default function Navbar() {
  return (
    <AppBar position="static" sx={{ backgroundColor: '#1565c0' }}>
      <Toolbar>
        <SecurityIcon sx={{ mr: 2 }} />
        <Box>
          <Typography variant="h6" fontWeight="bold" lineHeight={1.2}>
            Wazuh Monitor
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.8 }}>
            Nadzor aktivnosti tokom kolokvijuma
          </Typography>
        </Box>
      </Toolbar>
    </AppBar>
  );
}