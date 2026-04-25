const ruleGroupMessages = {
  'syscheck': { msg: 'Promena fajla na sistemu', severity: 'warning' },
  'syscheck_entry_added': { msg: 'Novi fajl dodat na sistem', severity: 'warning' },
  'syscheck_entry_deleted': { msg: 'Fajl obrisan sa sistema', severity: 'warning' },
  'syscheck_entry_modified': { msg: 'Fajl izmenjen', severity: 'warning' },
  'authentication_success': { msg: 'Uspešna prijava na sistem', severity: 'info' },
  'authentication_failed': { msg: 'Neuspešna prijava na sistem', severity: 'critical' },
  'windows': { msg: 'Windows sistemski event', severity: 'info' },
  'windows_security': { msg: 'Windows bezbednosni event', severity: 'warning' },
};

const ruleIdMessages = {
  60106: { msg: 'Prijava na sistem', severity: 'info' },
  60107: { msg: 'Neuspešna prijava — pogrešna lozinka', severity: 'critical' },
  554: { msg: 'Novi fajl dodat na sistem', severity: 'warning' },
  553: { msg: 'Fajl obrisan', severity: 'warning' },
  550: { msg: 'Integritet fajla narušen', severity: 'critical' },
  18101: { msg: 'USB uređaj ubačen', severity: 'critical' },
  18102: { msg: 'USB uređaj uklonjen', severity: 'info' },
  657: { msg: 'Promena u Windows registru', severity: 'warning' },
};

const systemUsers = ['SYSTEM', 'LOCAL SERVICE', 'NETWORK SERVICE', 'NT AUTHORITY', ''];

export const severityConfig = {
  critical: { color: 'error', label: 'Kritično', priority: 3, bg: '#fff5f5' },
  warning: { color: 'warning', label: 'Upozorenje', priority: 2, bg: '#fffde7' },
  info: { color: 'info', label: 'Info', priority: 1, bg: '#f5f9ff' },
};

export function isSystemEvent(alert) {
  const user = alert.data?.win?.eventdata?.subjectUserName || '';
  const targetUser = alert.data?.win?.eventdata?.targetUserName || '';
  return systemUsers.some(u => 
    user.toUpperCase() === u || 
    targetUser.toUpperCase() === u ||
    user.endsWith('$')
  );
}

export function translateAlert(alert) {
  const ruleId = parseInt(alert.rule?.id);
  const groups = alert.rule?.groups || [];
  const path = alert.syscheck?.path || '';
  const user = alert.data?.win?.eventdata?.subjectUserName || 
               alert.data?.win?.eventdata?.targetUserName || '';

  if (ruleIdMessages[ruleId]) {
    return { ...ruleIdMessages[ruleId], user };
  }


  if (path.toLowerCase().includes('\\temp\\') || path.toLowerCase().includes('/tmp/')) {
    return { msg: 'Aktivnost u privremenom folderu (Temp)', severity: 'critical', user };
  }

  if (path.toLowerCase().includes('startup')) {
    return { msg: 'Promena u Startup folderu', severity: 'critical', user };
  }

  if (path.toLowerCase().includes('system32')) {
    return { msg: 'Promena u System32 folderu', severity: 'critical', user };
  }

  for (const group of groups) {
    if (ruleGroupMessages[group]) {
      return { ...ruleGroupMessages[group], user };
    }
  }

  return {
    msg: alert.rule?.description || 'Sistemski event',
    severity: alert.rule?.level >= 10 ? 'critical' : alert.rule?.level >= 5 ? 'warning' : 'info',
    user,
  };
}

export function getAgentRiskLevel(alertCount) {
  if (alertCount === 0) return { label: 'U redu', color: 'success' };
  if (alertCount <= 5) return { label: 'Pažnja', color: 'warning' };
  return { label: 'Rizik', color: 'error' };
}

export function timeAgo(dateStr) {
  const diff = Math.floor((new Date() - new Date(dateStr)) / 1000);
  if (diff < 60) return 'pre manje od minuta';
  if (diff < 3600) return `pre ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `pre ${Math.floor(diff / 3600)} h`;
  return `pre ${Math.floor(diff / 86400)} dana`;
}