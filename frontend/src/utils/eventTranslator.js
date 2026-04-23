// Mapiranje rule ID-jeva na ljudski jezik
const ruleMessages = {
    550: { msg: 'Integritet fajla narušen', severity: 'critical' },
    553: { msg: 'Fajl obrisan', severity: 'warning' },
    554: { msg: 'Novi fajl dodat u sistem', severity: 'info' },
    555: { msg: 'Fajl izmenjen', severity: 'warning' },
    556: { msg: 'Dozvole fajla promenjene', severity: 'warning' },
    557: { msg: 'Vlasnik fajla promenjen', severity: 'warning' },
    558: { msg: 'Fajl dodat u pradeni direktorijum', severity: 'warning' },
    750: { msg: 'Rootkit detektovan', severity: 'critical' },
    751: { msg: 'Sumnjiv proces detektovan', severity: 'critical' },
    752: { msg: 'Skriveni fajl detektovan', severity: 'critical' },
    2502: { msg: 'Antivirusni program onemogućen', severity: 'critical' },
    5710: { msg: 'Pokušaj neovlašćenog pristupa', severity: 'critical' },
    18101: { msg: 'USB uređaj ubačen', severity: 'critical' },
    18102: { msg: 'USB uređaj uklonjen', severity: 'info' },
    18103: { msg: 'Novi USB uređaj detektovan', severity: 'critical' },
    60010: { msg: 'USB uređaj konektovan', severity: 'critical' },
    60011: { msg: 'USB uređaj diskonektovan', severity: 'info' },
    657: { msg: 'Promena u Windows registru', severity: 'warning' },
    658: { msg: 'Unos dodat u Windows registar', severity: 'warning' },
    659: { msg: 'Unos obrisan iz Windows registra', severity: 'warning' },
  };
  
  const pathMessages = [
    { pattern: /\\temp\\/i, msg: 'Aktivnost u privremenom folderu (Temp)', severity: 'warning' },
    { pattern: /\\windows\\temp\\/i, msg: 'Aktivnost u Windows Temp folderu', severity: 'critical' },
    { pattern: /appdata\\local\\temp/i, msg: 'Aktivnost u korisničkom Temp folderu', severity: 'warning' },
    { pattern: /startup/i, msg: 'Promena u Startup folderu', severity: 'critical' },
    { pattern: /system32/i, msg: 'Promena u System32 folderu', severity: 'critical' },
    { pattern: /registry/i, msg: 'Promena u sistemskom registru', severity: 'warning' },
    { pattern: /HKEY_LOCAL_MACHINE\\Software/i, msg: 'Promena softverskih podešavanja', severity: 'info' },
    { pattern: /HKEY_LOCAL_MACHINE\\System/i, msg: 'Promena sistemskih podešavanja', severity: 'warning' },
    { pattern: /firewall/i, msg: 'Promena firewall podešavanja', severity: 'critical' },
    { pattern: /run$/i, msg: 'Promena programa koji se pokreću pri startu', severity: 'critical' },
  ];
  
  export const severityConfig = {
    critical: { color: 'error', label: 'Kritično', priority: 3 },
    warning: { color: 'warning', label: 'Upozorenje', priority: 2 },
    info: { color: 'info', label: 'Info', priority: 1 },
  };
  
  export function translateEvent(event) {
    // Pokušaj po rule ID
    if (event.rule?.id && ruleMessages[event.rule.id]) {
      return ruleMessages[event.rule.id];
    }
  
    // Pokušaj po putanji fajla
    const path = event.file || event.syscheck?.path || '';
    for (const { pattern, msg, severity } of pathMessages) {
      if (pattern.test(path)) {
        return { msg, severity };
      }
    }
  
    // Pokušaj po tipu eventa
    if (event.type === 'registry_value') {
      return { msg: 'Promena u Windows registru', severity: 'warning' };
    }
  
    // Default
    return { msg: 'Sistemska promena detektovana', severity: 'info' };
  }
  
  export function getAgentRiskLevel(alertCount) {
    if (alertCount === 0) return { label: 'Uredu', color: 'success' };
    if (alertCount <= 3) return { label: 'Pažnja', color: 'warning' };
    return { label: 'Rizik', color: 'error' };
  }