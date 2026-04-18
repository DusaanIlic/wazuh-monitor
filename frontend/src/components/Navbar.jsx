import { AppBar, Toolbar, Typography } from '@mui/material';
import SecurityIcon from '@mui/icons-material/Security';

export default function Navbar() {
  return (
    <AppBar position="static" sx={{ backgroundColor: '#1a237e' }}>
      <Toolbar>
        <SecurityIcon sx={{ mr: 2 }} />
        <Typography variant="h6" fontWeight="bold">
          Wazuh Monitor — Nadzor Kolokvijuma
        </Typography>
      </Toolbar>
    </AppBar>
  );
}