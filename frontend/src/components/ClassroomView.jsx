import { Box, Typography, Tooltip, Paper } from '@mui/material';
import ComputerIcon from '@mui/icons-material/Computer';
import ErrorIcon from '@mui/icons-material/Error';

function AgentSlot({ agent, onAgentClick }) {
  if (!agent) {
    return (
      <Paper
        variant="outlined"
        sx={{
          aspectRatio: '1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0.25,
          borderStyle: 'dashed',
        }}
      >
        <ComputerIcon sx={{ fontSize: 40, color: 'text.disabled' }} />
      </Paper>
    );
  }

  const isActive = agent.status === 'active';
  const hasCritical = agent.criticalAlerts > 0;

  return (
    <Tooltip
      title={
        <Box>
          <Typography variant="body2" fontWeight="bold">{agent.name}</Typography>
          <Typography variant="caption">{isActive ? 'Aktivan' : 'Neaktivan'}</Typography>
          {hasCritical && (
            <Typography variant="caption" display="block" color="error.light">
              {agent.criticalAlerts} kritičnih alerta
            </Typography>
          )}
        </Box>
      }
      arrow
    >
      <Paper
        onClick={() => onAgentClick?.(agent)}
        sx={{
          aspectRatio: '1',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0.5,
          cursor: 'pointer',
          position: 'relative',
          border: hasCritical ? '2px solid' : '1px solid',
          borderColor: hasCritical ? 'error.main' : isActive ? 'success.light' : 'divider',
          backgroundColor: isActive ? 'background.paper' : 'action.disabledBackground',
          transition: 'box-shadow 0.15s, transform 0.15s',
          '&:hover': {
            boxShadow: 4,
            transform: 'scale(1.04)',
          },
        }}
      >
        {hasCritical && (
          <ErrorIcon
            color="error"
            sx={{ position: 'absolute', top: 6, right: 6, fontSize: 18 }}
          />
        )}
        <ComputerIcon
          sx={{
            fontSize: 44,
            color: isActive ? (hasCritical ? 'error.main' : 'primary.main') : 'text.disabled',
          }}
        />
        <Typography
          variant="caption"
          fontWeight="bold"
          noWrap
          sx={{
            maxWidth: '90%',
            color: isActive ? 'text.primary' : 'text.disabled',
          }}
        >
          {agent.name}
        </Typography>
      </Paper>
    </Tooltip>
  );
}

export default function ClassroomView({ agents = [], onAgentClick }) {
  const slots = Array.from({ length: 9 }, (_, i) => agents[i] ?? null);

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 2,
        p: 2,
        maxWidth: 520,
      }}
    >
      {slots.map((agent, i) => (
        <AgentSlot key={agent?.id ?? `empty-${i}`} agent={agent} onAgentClick={onAgentClick} />
      ))}
    </Box>
  );
}
