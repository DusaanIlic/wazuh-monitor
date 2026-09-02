import { Box, Typography, Tooltip, Paper } from '@mui/material';
import ComputerIcon from '@mui/icons-material/Computer';
import ErrorIcon from '@mui/icons-material/Error';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { getOsPlatform } from '../utils/os';

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
            width: 24, height: 24, borderRadius: '50%',
            bgcolor: 'warning.main', color: '#fff',
            border: '2px solid white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: 2,
          }}>
            <WarningAmberIcon sx={{ fontSize: 15 }} />
          </Box>
        </Tooltip>
      )}
      {critical > 0 && (
        <Tooltip title={`${critical} kritičnih alerta`} arrow>
          <Box sx={{
            width: 24, height: 24, borderRadius: '50%',
            bgcolor: 'error.main', color: '#fff',
            border: '2px solid white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: 3,
          }}>
            <ErrorIcon sx={{ fontSize: 15 }} />
          </Box>
        </Tooltip>
      )}
    </Box>
  );
}

function AgentSlot({ agent, onAgentClick, isTeacher }) {
  if (!agent) {
    return (
      <Paper
        variant="outlined"
        sx={{
          aspectRatio: '1',
          minWidth: 150,
          minHeight: 150,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0.5,
          opacity: isTeacher ? 1 : 0.25,
          borderStyle: isTeacher ? 'solid' : 'dashed',
          backgroundColor: isTeacher ? '#E3F2FD' : undefined,
        }}
      >
        <ComputerIcon sx={{ fontSize: 40, color: 'text.disabled' }} />
        {isTeacher && (
          <Typography variant="caption" fontWeight="bold" color="text.secondary">
            Nastavnik
          </Typography>
        )}
      </Paper>
    );
  }

  const isActive = agent.isActive ?? (agent.status === 'active');
  const criticalAlerts = agent.criticalAlerts ?? 0;
  const warningAlerts = agent.warningAlerts ?? 0;
  const hasCritical = criticalAlerts > 0;
  const hasWarning = warningAlerts > 0;

  const borderColor = hasCritical ? 'error.main' : hasWarning ? 'warning.main' : isActive ? 'success.main' : 'divider';
  const backgroundColor = hasCritical ? '#fff5f5' : hasWarning ? '#fffbf0' : isTeacher ? '#E3F2FD' : isActive ? 'background.paper' : 'action.disabledBackground';

  const osPlatform = getOsPlatform(agent);
  const osLabel = osPlatform === 'windows' ? 'WIN' : osPlatform === 'linux' ? 'LNX' : null;
  const iconColor = !isActive ? 'text.disabled' : hasCritical ? 'error.main' : hasWarning ? 'warning.main' : 'success.main';

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
          minWidth: 150,
          minHeight: 150,
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
        <ComputerIcon sx={{ fontSize: 44, color: iconColor }} />
        {osLabel && (
          <Typography
            variant="caption"
            sx={{
              fontSize: 10,
              fontWeight: 'bold',
              color: 'text.secondary',
              lineHeight: 1,
            }}
          >
            {osLabel}
          </Typography>
        )}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, maxWidth: '90%' }}>
          <Typography
            variant="caption"
            fontWeight="bold"
            noWrap
            sx={{
              color: isActive ? 'text.primary' : 'text.disabled',
            }}
          >
            {agent.name}
          </Typography>
          {isTeacher && (
            <Typography
              variant="caption"
              fontWeight="bold"
              sx={{ color: 'primary.main', flexShrink: 0 }}
            >
              (Nastavnik)
            </Typography>
          )}
        </Box>
      </Paper>
    </Tooltip>
  );
}

export default function ClassroomView({ agents = [], onAgentClick }) {
  // Prvi red: pozicija 0 = nastavnički računar, pozicije 1-4 su rezervisane i uvek prazne.
  // Agenti (osim nastavničkog) se raspoređuju od pozicije 5 nadalje.
  const slots = Array.from({ length: 25 }, (_, i) => {
    if (i === 0) return agents[0] ?? null;
    if (i >= 1 && i <= 4) return null;
    return agents[i - 4] ?? null;
  });

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: 2,
        p: 2,
        maxWidth: 900,
      }}
    >
      {slots.map((agent, i) => (
        <AgentSlot key={agent?.id ?? `empty-${i}`} agent={agent} onAgentClick={onAgentClick} isTeacher={i === 0} />
      ))}
    </Box>
  );
}
