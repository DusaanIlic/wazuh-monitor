import { useState, useEffect } from 'react';
import { Box, Typography, Tooltip, Paper } from '@mui/material';
import ComputerIcon from '@mui/icons-material/Computer';
import { translateAlert, isSystemEvent } from '../utils/eventTranslator';
import { getAgentAlertsBadge, getAgentAlertsFrom, getKolokvijumStatus } from '../services/api';

function AlertBadge({ critical, warning }) {
  if (critical === 0 && warning === 0) return null;
  const isCritical = critical > 0;
  return (
    <Box sx={{
      position: 'absolute', top: 4, right: 4,
      bgcolor: isCritical ? 'error.main' : 'warning.main',
      borderRadius: '10px',
      px: 0.8, py: 0.2,
      display: 'flex', alignItems: 'center',
      zIndex: 1,
    }}>
      <Typography sx={{ color: 'white', fontWeight: 'bold', fontSize: 11, lineHeight: 1.4 }}>
        {isCritical ? `🔴 ${critical}` : `⚠️ ${warning}`}
      </Typography>
    </Box>
  );
}

function AgentSlot({ agent, onAgentClick }) {
  const [alertCounts, setAlertCounts] = useState({ critical: 0, warning: 0 });

  useEffect(() => {
    if (!agent || agent.status !== 'active') return;

    const fetchAlerts = async () => {
      try {
        const kolokvijum = await getKolokvijumStatus();
        if (!kolokvijum?.isActive) {
          setAlertCounts({ critical: 0, warning: 0 });
          return;
        }
        const alerts = await getAgentAlertsFrom(agent.id, kolokvijum.startTime);
        const filtered = alerts.filter(a => !isSystemEvent(a));
        let critical = 0, warning = 0;
        for (const a of filtered) {
          const { severity } = translateAlert(a);
          if (severity === 'critical') critical++;
          else if (severity === 'warning') warning++;
        }
        console.log(`[badge] agent=${agent.id} | ukupno=${alerts.length} | posle system filtera=${filtered.length} | critical=${critical} | warning=${warning}`);
        setAlertCounts({ critical, warning });
      } catch (err) {
        console.error(`[ClassroomView] fetch failed agent=${agent.id}`, err);
      }
    };

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, [agent?.id, agent?.status]);

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
  const hasCritical = alertCounts.critical > 0;

  return (
    <Tooltip
      title={
        <Box>
          <Typography variant="body2" fontWeight="bold">{agent.name}</Typography>
          <Typography variant="caption" display="block">{isActive ? 'Aktivan' : 'Neaktivan'}</Typography>
          {(alertCounts.critical > 0 || alertCounts.warning > 0) && (
            <Box sx={{ mt: 0.5 }}>
              {alertCounts.critical > 0 ? (
                <Typography variant="caption" display="block" color="error.light">
                  {alertCounts.critical} kritičnih alerta (poslednjih 24h)
                </Typography>
              ) : (
                <Typography variant="caption" display="block" color="warning.light">
                  {alertCounts.warning} upozorenja (poslednjih 24h)
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
        <AlertBadge critical={alertCounts.critical} warning={alertCounts.warning} />
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
