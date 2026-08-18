import { Box, Typography, Tooltip, Paper } from '@mui/material';
import ComputerIcon from '@mui/icons-material/Computer';

function AlertIndicators({ critical, warning }) {
  if (critical <= 0 && warning <= 0) return null;
  return (
    <Box sx={{
      position: 'absolute', top: -10, right: -10,
      display: 'flex', gap: 0.5,
      zIndex: 2,
    }}>
      {warning > 0 && (
        <Tooltip title={`${warning} upozorenja`} arrow>
          <Box sx={{
            width: 26, height: 26, borderRadius: '50%',
            bgcolor: 'warning.main', color: '#fff',
            border: '2px solid white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 'bold', lineHeight: 1,
            boxShadow: 2,
          }}>
            {warning}
          </Box>
        </Tooltip>
      )}
      {critical > 0 && (
        <Tooltip title={`${critical} kritičnih alerta`} arrow>
          <Box sx={{
            width: 30, height: 30, borderRadius: '50%',
            bgcolor: 'error.main', color: '#fff',
            border: '2px solid white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 'bold', lineHeight: 1,
            boxShadow: 3,
          }}>
            {critical}
          </Box>
        </Tooltip>
      )}
    </Box>
  );
}

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
  const criticalAlerts = agent.criticalAlerts ?? 0;
  const warningAlerts = agent.warningAlerts ?? 0;
  const hasCritical = criticalAlerts > 0;
  const hasWarning = warningAlerts > 0;

  const borderColor = hasCritical ? 'error.main' : hasWarning ? 'warning.main' : isActive ? 'success.main' : 'divider';
  const backgroundColor = hasCritical ? '#fff5f5' : hasWarning ? '#fffbf0' : isActive ? 'background.paper' : 'action.disabledBackground';

  return (
    <Tooltip
      title={
        <Box>
          <Typography variant="body2" fontWeight="bold">{agent.name}</Typography>
          <Typography variant="caption" display="block">{isActive ? 'Aktivan' : 'Neaktivan'}</Typography>
          {(criticalAlerts > 0 || warningAlerts > 0) && (
            <Box sx={{ mt: 0.5 }}>
              {criticalAlerts > 0 && (
                <Typography variant="caption" display="block" color="error.light">
                  {criticalAlerts} kritičnih alerta
                </Typography>
              )}
              {warningAlerts > 0 && (
                <Typography variant="caption" display="block" color="warning.light">
                  {warningAlerts} upozorenja
                </Typography>
              )}
            </Box>
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
          border: (hasCritical || hasWarning) ? '2px solid' : '1px solid',
          borderColor,
          backgroundColor,
          transition: 'box-shadow 0.15s, transform 0.15s, background-color 0.15s',
          '&:hover': {
            boxShadow: 4,
            transform: 'scale(1.04)',
          },
        }}
      >
        <AlertIndicators critical={criticalAlerts} warning={warningAlerts} />
        <ComputerIcon
          sx={{
            fontSize: 44,
            color: isActive ? (hasCritical ? 'error.main' : hasWarning ? 'warning.main' : 'primary.main') : 'text.disabled',
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
