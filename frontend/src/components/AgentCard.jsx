import { Card, CardContent, Typography, Chip, Box } from '@mui/material';
import ComputerIcon from '@mui/icons-material/Computer';
import { useNavigate } from 'react-router-dom';

export default function AgentCard({ agent }) {
  const navigate = useNavigate();
  const isActive = agent.status === 'active';

  return (
    <Card
      onClick={() => navigate(`/agent/${agent.id}`)}
      sx={{
        cursor: 'pointer',
        '&:hover': { boxShadow: 6 },
        transition: '0.2s',
      }}
    >
      <CardContent>
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <ComputerIcon color={isActive ? 'primary' : 'disabled'} />
          <Typography variant="h6">{agent.name}</Typography>
        </Box>
        <Chip
          label={agent.status}
          color={isActive ? 'success' : 'error'}
          size="small"
          sx={{ mb: 1 }}
        />
        <Typography variant="body2" color="text.secondary">
          ID: {agent.id}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          IP: {agent.ip}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          OS: {agent.os?.name || 'N/A'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Poslednji kontakt: {new Date(agent.lastKeepAlive).toLocaleString('sr-RS')}
        </Typography>
      </CardContent>
    </Card>
  );
}