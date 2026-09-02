const ruleGroupMessages = {
  'authentication_success': { msg: 'Uspešna prijava na sistem', severity: 'info' },
  'authentication_failed': { msg: 'Neuspešna prijava na sistem', severity: 'critical' },
  'windows': { msg: 'Windows sistemski event', severity: 'info' },
  'windows_security': { msg: 'Windows bezbednosni event', severity: 'warning' },
  'rootcheck': { msg: 'Rootcheck upozorenje (Linux)', severity: 'warning' },
  'usb': { msg: 'USB uređaj priključen', severity: 'critical' },
};

const linuxPlatforms = ['ubuntu', 'debian', 'linux'];

const ruleIdMessages = {
  60106: { msg: 'Prijava na sistem', severity: 'info' },
  60107: { msg: 'Neuspešna prijava — pogrešna lozinka', severity: 'critical' },
  18101: { msg: 'USB uređaj ubačen', severity: 'critical' },
  18102: { msg: 'USB uređaj uklonjen', severity: 'info' },
  657: { msg: 'Promena u Windows registru', severity: 'warning' },
};

const systemUsers = ['SYSTEM', 'LOCAL SERVICE', 'NETWORK SERVICE', 'NT AUTHORITY', 'ANONYMOUS LOGON', ''];
const systemRuleGroups = ['sca', 'ossec'];

export const severityConfig = {
  critical: { color: 'error', label: 'Kritično', priority: 3, bg: '#fff5f5' },
  warning: { color: 'warning', label: 'Upozorenje', priority: 2, bg: '#fffde7' },
  info: { color: 'info', label: 'Info', priority: 1, bg: '#f5f9ff' },
  ignore: { color: 'default', label: 'Ignorisano', priority: 0, bg: '#f5f5f5' },
};

export function isSystemEvent(alert) {
  if (alert.syscheck) return false;
  const user = alert.data?.win?.eventdata?.subjectUserName || '';
  const targetUser = alert.data?.win?.eventdata?.targetUserName || '';

  if (user.endsWith('$')) return true;

  if (systemUsers.some(u =>
    user.toUpperCase() === u ||
    targetUser.toUpperCase() === u
  )) {
    return true;
  }

  const groups = alert.rule?.groups || [];
  if (groups.some(g => systemRuleGroups.includes(g))) return true;

  if (groups.includes('syscheck_file') || groups.includes('syscheck_entry_modified')) return true;

  const logonType = alert.data?.win?.eventdata?.logonType;
  if (logonType === '5') return true;

  const srcUser = alert.data?.srcuser || '';
  const ruleLevel = alert.rule?.level;
  if (srcUser === 'root' && ruleLevel < 5) return true;

  return false;
}

const copilotPatterns = ['copilot', 'github copilot', 'microsoft copilot'];

function isCopilotRelated(path, processName) {
  const lPath = path.toLowerCase();
  const lProc = processName.toLowerCase();
  return (
    copilotPatterns.some(p => lPath.includes(p)) ||
    copilotPatterns.some(p => lProc.includes(p)) ||
    lProc === 'copilot.exe'
  );
}

function isExternalIp(ip) {
  if (!ip) return false;
  return !(
    ip.startsWith('192.168.') ||
    ip.startsWith('10.') ||
    ip.startsWith('172.') ||
    ip.startsWith('169.254.') ||
    ip === '0.0.0.0' ||
    ip === '::' ||
    ip === '127.0.0.1'
  );
}

function loadWatchRules() {
  try {
    return JSON.parse(localStorage.getItem('watchRules') || '[]');
  } catch {
    return [];
  }
}

export function translateAlert(alert) {
  const ruleId = parseInt(alert.rule?.id);
  const groups = alert.rule?.groups || [];
  const path = alert.syscheck?.path || '';
  const image = alert.data?.win?.eventdata?.image || '';
  const parentImage = alert.data?.win?.eventdata?.parentImage || '';
  const commandLine = alert.data?.win?.eventdata?.commandLine || '';
  const processName = alert.data?.win?.eventdata?.processName || image || '';
  const parentProcessName = alert.data?.win?.eventdata?.parentProcessName || '';
  const description = alert.rule?.description || '';
  const platform = (alert.agent?.os?.platform || '').toLowerCase();
  const isLinux = linuxPlatforms.includes(platform);
  const srcUser = alert.data?.srcuser || '';
  const srcIp = alert.data?.srcip || '';
  const dstIp = alert.data?.dstip || '';
  const user = alert.data?.win?.eventdata?.subjectUserName ||
               alert.data?.win?.eventdata?.targetUserName ||
               srcUser || '';

  const watchRules = loadWatchRules();
  console.log('[translateAlert] path:', path, '| processName:', processName, '| image:', image, '| parentImage:', parentImage, '| cmdLine:', commandLine);
  for (const rule of watchRules) {
    if (!rule.pattern) continue;
    const lPat = rule.pattern.toLowerCase();
    const pathMatch = path.toLowerCase().includes(lPat);
    const procMatch = processName.toLowerCase().includes(lPat);
    const parentProcMatch = parentProcessName.toLowerCase().includes(lPat);
    const imageMatch = image.toLowerCase().includes(lPat);
    const parentMatch = parentImage.toLowerCase().includes(lPat);
    const cmdMatch = commandLine.toLowerCase().includes(lPat);
    const descMatch = description.toLowerCase().includes(lPat);
    console.log(`[translateAlert] rule "${rule.naziv}" pattern="${lPat}" | pathMatch=${pathMatch} procMatch=${procMatch} parentProcMatch=${parentProcMatch} imageMatch=${imageMatch} parentMatch=${parentMatch} cmdMatch=${cmdMatch} descMatch=${descMatch}`);
    if (pathMatch || procMatch || parentProcMatch || imageMatch || parentMatch || cmdMatch || descMatch) {
      return { msg: rule.naziv, severity: rule.akcija, user, customRule: true };
    }
  }

  // 4) Pokušaj gašenja Wazuh agenta
  if (ruleId === 100012) {
    return { msg: 'Pokušaj zaustavljanja Wazuh agenta!', severity: 'critical', user };
  }

  // 2) Copilot / AI asistent
  if (isCopilotRelated(path, processName) ||
      isCopilotRelated(image, parentImage) ||
      copilotPatterns.some(p => commandLine.toLowerCase().includes(p))) {
    return { msg: 'Pokrenut AI asistent (Copilot)', severity: 'critical', user };
  }

  if (ruleIdMessages[ruleId]) {
    return { ...ruleIdMessages[ruleId], user };
  }

  // 1) USB — putanja ili grupa pravila sadrži 'usb'
  if (path.toLowerCase().includes('usb') || groups.includes('usb')) {
    return { msg: 'USB uređaj priključen', severity: 'critical', user };
  }

  if (path.toLowerCase().includes('startup')) {
    return { msg: 'Promena u Startup folderu', severity: 'warning', user };
  }

  if (path.toLowerCase().includes('system32')) {
    return { msg: 'Promena u System32 folderu', severity: 'warning', user };
  }

  // 3) Mrežna grupa pravila + eksterna IP adresa
  if (groups.includes('network') && (isExternalIp(srcIp) || isExternalIp(dstIp))) {
    return { msg: 'Sumnjiva mrežna aktivnost (eksterna IP adresa)', severity: 'critical', user, srcIp, dstIp };
  }

  for (const group of groups) {
    if (ruleGroupMessages[group]) {
      return { ...ruleGroupMessages[group], user };
    }
  }

  // Sve ostale syscheck izmene — samo info, ne critical/warning
  if (groups.some(g => g.includes('syscheck'))) {
    return {
      msg: alert.rule?.description || 'Promena na sistemu (syscheck)',
      severity: 'info',
      user,
    };
  }

  return {
    msg: alert.rule?.description || (isLinux ? 'Sistemski event (Linux)' : 'Sistemski event'),
    severity: alert.rule?.level >= 5 ? 'warning' : 'info',
    user,
    ...(isLinux && (srcIp || dstIp) ? { srcIp, dstIp } : {}),
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