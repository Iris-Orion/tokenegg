// Daily sync: visit every platform's public quota page (no login), pull the
// lines that talk about free credits, parse the number when the page states one,
// and record what changed. Runs on GitHub Actions with Node 22 (built-in fetch).
// Never throws: per-platform failures are recorded and previous data is kept.

import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PLATFORMS_FILE = path.join(ROOT, 'data', 'platforms.json');
const META_FILE = path.join(ROOT, 'data', 'meta.json');
const SNAPSHOT_DIR = path.join(ROOT, 'data', 'snapshots');
const HISTORY_LIMIT = 60;
const ONLY = process.argv.slice(2); // optional platform ids for local debugging

const nowIso = () => new Date().toISOString();
const beijing = (d = new Date()) =>
  new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).format(d).replace(/\//g, '-');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const hash = (s) => createHash('sha256').update(s).digest('hex').slice(0, 16);

async function readJson(file, fallback) {
  try { return JSON.parse(await readFile(file, 'utf8')); } catch { return fallback; }
}

// ---------- fetching ----------
const UA = 'Mozilla/5.0 (compatible; tokenegg-sync/2.0; +https://github.com)';

async function fetchText(url, headers = {}) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, ...headers }, signal: AbortSignal.timeout(75_000), redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<br\s*\/?>|<\/(p|div|li|h[1-6]|tr|section|article|summary|details)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n');
}

async function fetchViaJina(url) {
  const text = await fetchText(`https://r.jina.ai/${url}`, { 'X-Return-Format': 'markdown', 'X-Timeout': '40' });
  if (/^\{"data":null/.test(text)) throw new Error(`reader error: ${text.slice(0, 120)}`);
  if (/^Title: (404|Page Not Found)/im.test(text) || text.length < 400) throw new Error('reader returned an empty or 404 page');
  return text;
}

async function fetchPage(source) {
  const attempts = source.via === 'direct'
    ? [() => fetchText(source.url).then(htmlToText), () => fetchViaJina(source.url)]
    : [() => fetchViaJina(source.url), () => fetchText(source.url).then(htmlToText)];
  let lastErr;
  for (const run of attempts) {
    try {
      const text = await run();
      if (text && text.length > 200) return text;
      lastErr = new Error('page too short');
    } catch (e) { lastErr = e; }
  }
  throw lastErr ?? new Error('fetch failed');
}

// ---------- extraction ----------
const cleanLine = (l) => l
  .replace(/!\[[^\]]*\]\([^)]*\)/g, '')       // images
  .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')    // links -> text
  .replace(/\*\*/g, '')
  .replace(/\s+/g, ' ')
  .trim();

function extractSnippet(text, keywords, max = 4) {
  const kws = keywords.map((k) => k.toLowerCase());
  const out = [];
  for (const raw of text.split('\n')) {
    const line = cleanLine(raw);
    if (!line || line.length > 400 || /^https?:\/\//.test(line)) continue;
    const low = line.toLowerCase();
    if (kws.some((k) => low.includes(k)) && !out.includes(line)) out.push(line);
    if (out.length >= max) break;
  }
  return out;
}

const toNumber = (s) => Number(String(s).replace(/,/g, ''));
const fmtAmount = (n, unit) => {
  if (unit === 'token' && n >= 1e4) return n % 1e8 === 0 ? `${n / 1e8} 亿` : `${n / 1e4} 万`;
  return String(n);
};

function applyRules(text, rules) {
  for (const rule of rules ?? []) {
    let re;
    try { re = new RegExp(rule.pattern, rule.flags ?? ''); } catch { continue; }
    const m = text.match(re);
    if (!m) continue;
    let amount = toNumber(m[1]);
    if (rule.unit === 'token' && m[2]) amount *= m[2] === '亿' ? 1e8 : 1e4;
    const per = rule.period === '每月' ? '月' : '天';
    return {
      amount, amountMax: null, unit: rule.unit, period: rule.period, scope: rule.scope ?? null,
      display: `${fmtAmount(amount, rule.unit)} ${rule.unit} / ${per}`,
      matchedText: cleanLine(m[0]).slice(0, 200),
    };
  }
  return null;
}

// Community-reported quota (from the Zhihu answer) used only when the official page states no number.
function communityQuota(p) {
  const display = p.community?.display ?? '免费';
  const m = display.replace(/,/g, '').match(/(\d+)(?:\s*~\s*(\d+))?\s*(万|亿)?\s*(积分|token|credits)\s*\/\s*(天|月)/i);
  if (!m) return { amount: null, amountMax: null, unit: '', period: '', display };
  const mult = m[3] === '亿' ? 1e8 : m[3] === '万' ? 1e4 : 1;
  return {
    amount: Number(m[1]) * mult, amountMax: m[2] ? Number(m[2]) * mult : null,
    unit: m[4].toLowerCase() === 'token' ? 'token' : m[4], period: m[5] === '月' ? '每月' : '每天', display,
  };
}

// ---------- per platform ----------
async function syncPlatform(p) {
  const src = p.official;
  const result = { id: p.id, name: p.name, status: 'failed', changes: [] };
  const prev = p.officialResult ?? {};
  if (!src?.url) { result.status = 'skipped'; return result; }
  try {
    const text = await fetchPage(src);
    const snippet = extractSnippet(text, src.keywords ?? []);
    const parsed = applyRules(text, src.rules);
    const snapHash = hash(snippet.join('\n'));
    const status = parsed ? 'ok' : 'no-number';

    const officialResult = {
      url: src.url, label: src.label, status, checkedAt: nowIso(), snippet, snippetHash: snapHash,
      matched: parsed?.matchedText ?? null,
      lastOkAt: parsed ? nowIso() : (prev.lastOkAt ?? null),
      error: null,
    };
    if (prev.snippetHash && prev.snippetHash !== snapHash) {
      result.changes.push({ kind: 'snippet', message: `${p.name}：官方页面额度说明有变化` });
      officialResult.snippetChangedAt = nowIso();
    } else officialResult.snippetChangedAt = prev.snippetChangedAt ?? null;

    if (parsed) {
      const before = p.quota?.display;
      if (p.quotaSource !== 'official' || before !== parsed.display) {
        result.changes.push({ kind: 'quota', message: `${p.name}：额度 ${before ?? '—'} → ${parsed.display}（官方）` });
      }
      const { matchedText, ...quota } = parsed;
      p.quota = quota;
      p.quotaSource = 'official';
    } else if (p.quotaSource !== 'official') {
      p.quotaSource = 'community';
      p.quota = communityQuota(p);
    }
    if (prev.status === 'failed' && status !== 'failed') result.changes.push({ kind: 'recovered', message: `${p.name}：官方页面恢复可访问` });
    p.officialResult = officialResult;
    result.status = status;
    await writeFile(path.join(SNAPSHOT_DIR, `${p.id}.md`), `<!-- ${src.url} fetched ${officialResult.checkedAt} -->\n${text.slice(0, 20000)}\n`, 'utf8').catch(() => {});
  } catch (err) {
    const message = String(err?.message ?? err).slice(0, 200);
    p.officialResult = { ...prev, url: src.url, label: src.label, status: 'failed', checkedAt: nowIso(), error: message };
    if (prev.status && prev.status !== 'failed') result.changes.push({ kind: 'failed', message: `${p.name}：官方页面抓取失败（${message}）` });
    result.error = message;
    if (!p.quotaSource) { p.quotaSource = 'community'; p.quota = communityQuota(p); }
  }
  return result;
}

// ---------- main ----------
async function main() {
  const data = await readJson(PLATFORMS_FILE, null);
  if (!data) { console.error('data/platforms.json missing'); process.exit(1); }
  const meta = await readJson(META_FILE, { history: [] });
  await import('node:fs/promises').then((fs) => fs.mkdir(SNAPSHOT_DIR, { recursive: true }));

  const startedAt = nowIso();
  const entry = { at: startedAt, atBeijing: beijing(), status: 'ok', ok: 0, noNumber: 0, failed: 0, changes: [] };

  const targets = ONLY.length ? data.platforms.filter((p) => ONLY.includes(p.id)) : data.platforms;
  for (const p of targets) {
    const r = await syncPlatform(p);
    if (r.status === 'ok') entry.ok++; else if (r.status === 'no-number') entry.noNumber++; else if (r.status === 'failed') entry.failed++;
    entry.changes.push(...r.changes);
    console.log(`[${r.status.padEnd(9)}] ${p.name}${r.error ? ' — ' + r.error : ''}${p.quota?.display ? ' — ' + p.quota.display : ''}`);
    await sleep(1500); // stay polite with the reader service
  }
  entry.status = entry.failed === targets.length ? 'failed' : 'ok';
  const counts = { ok: 0, noNumber: 0, failed: 0 };
  for (const p of data.platforms) {
    const s = p.officialResult?.status;
    if (s === 'ok') counts.ok++; else if (s === 'no-number') counts.noNumber++; else if (s === 'failed') counts.failed++;
  }

  Object.assign(meta, {
    lastSyncAt: startedAt,
    lastSyncAtBeijing: beijing(),
    lastSuccessAt: entry.status === 'ok' ? startedAt : (meta.lastSuccessAt ?? null),
    status: entry.status,
    counts,
    platformCount: data.platforms.length,
    error: entry.status === 'failed' ? '所有官方页面均抓取失败' : null,
  });
  meta.history = [entry, ...(meta.history ?? [])].slice(0, HISTORY_LIMIT);
  data.lastUpdated = startedAt;

  await writeFile(PLATFORMS_FILE, JSON.stringify(data, null, 2) + '\n', 'utf8');
  await writeFile(META_FILE, JSON.stringify(meta, null, 2) + '\n', 'utf8');
  console.log(`\ndone: ok=${counts.ok} no-number=${counts.noNumber} failed=${counts.failed}, ${entry.changes.length} change(s)`);
  for (const c of entry.changes) console.log(' -', c.message);
}

main();
