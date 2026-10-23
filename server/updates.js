export const repository = '02AHvdK/reloom';
export const repositoryUrl = `https://github.com/${repository}`;

function versionParts(value) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)(?:-([\w.-]+))?(?:\+[\w.-]+)?$/.exec(value);
  return match && { numbers: match.slice(1, 4).map(Number), pre: match[4]?.split('.') ?? [] };
}
export function compareVersions(a, b) {
  const left = versionParts(a), right = versionParts(b);
  if (!left || !right) throw new Error('发布版本号格式不正确');
  for (let i = 0; i < 3; i++) if (left.numbers[i] !== right.numbers[i]) return Math.sign(left.numbers[i] - right.numbers[i]);
  if (!left.pre.length || !right.pre.length) return Math.sign(right.pre.length - left.pre.length);
  for (let i = 0; i < Math.max(left.pre.length, right.pre.length); i++) {
    const x = left.pre[i], y = right.pre[i];
    if (x === y) continue;
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    const nx = /^\d+$/.test(x), ny = /^\d+$/.test(y);
    return nx && ny ? Math.sign(Number(x) - Number(y)) : nx !== ny ? (nx ? -1 : 1) : (x < y ? -1 : 1);
  }
  return 0;
}
export async function checkUpdates(currentVersion, request = fetch) {
  let releases;
  try {
  const response = await request(`https://api.github.com/repos/${repository}/releases?per_page=100`, {
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'RELOOM-update-check' },
    signal: AbortSignal.timeout(8000), redirect: 'error',
  });
  if (!response.ok) throw new Error(response.status === 403 || response.status === 429 ? 'GitHub 请求受限，请稍后重试' : '暂时无法连接 GitHub 发布服务');
  releases = await response.json();
  if (!Array.isArray(releases)) throw new Error('发布服务返回了无效数据');
  } catch (originalError) {
    try {
      const fallback = await request(`https://raw.githubusercontent.com/${repository}/main/releases.json`, {signal:AbortSignal.timeout(4000),redirect:'error'});
      if (!fallback.ok) throw originalError;
      const manifest = await fallback.json();
      if (!Array.isArray(manifest.releases) || !manifest.releases.length) throw originalError;
      releases = manifest.releases;
    } catch {throw originalError;}
  }
  const candidates = releases.filter(r => !r.draft && versionParts(r.tag_name) && (currentVersion.includes('-') || !r.prerelease))
    .sort((a, b) => compareVersions(b.tag_name, a.tag_name));
  const latest = candidates[0];
  return {
    currentVersion, latestVersion: latest?.tag_name ?? null,
    status: !latest ? 'unpublished' : compareVersions(latest.tag_name, currentVersion) > 0 ? 'available' : 'current',
    releaseUrl: latest ? `${repositoryUrl}/releases/tag/${encodeURIComponent(latest.tag_name)}` : `${repositoryUrl}/releases`,
    checkedAt: new Date().toISOString(),
  };
}
