const LINUX_PLATFORMS = ['ubuntu', 'debian', 'linux', 'mint', 'linuxmint', 'fedora', 'centos', 'rhel', 'arch', 'manjaro'];

export function getOsPlatform(agent) {
  const platform = agent.os?.platform?.toLowerCase() || '';
  const name = agent.os?.name?.toLowerCase() || '';

  if (platform === 'windows' || name.includes('windows')) return 'windows';
  if (LINUX_PLATFORMS.some(p => platform.includes(p) || name.includes(p))) return 'linux';
  return 'unknown';
}
