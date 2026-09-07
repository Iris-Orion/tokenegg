// Daily sync: re-fetch the Zhihu answer, detect changes, refresh quota numbers.
// Runs in GitHub Actions (Node 22, built-in fetch). Never throws: on failure it
// records the error in data/meta.json and keeps the previous data intact.

import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PLATFORMS_FILE = path.join(ROOT, 'data', 'platforms.json');
const META_FILE = path.join(ROOT, 'data', 'meta.json');
const SNAPSHOT_FILE = path.join(ROOT, 'data', 'source-snapshot.md');
const HISTORY_LIMIT = 60;

const nowIso = () => new Date().toISOString();
const beijing = (d = new Date()) =>
  new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).format(d).replace(/\//g, '-');

async function readJson(file, fallback) {
  try { return JSON.parse(await readFile(file, 'utf8')); } catch { return fallback; }
}

async function fetchSource(url) {
  const readers = [
    { url: `https://r.jina.ai/${url}`, headers: { 'X-Return-Format': 'markdown', 'User-Agent': 'tokenegg-sync/1.0' } },
    { url: `https://r.jina.ai/${url}`, headers: { 'User-Agent': 'Mozilla/5.0 tokenegg-sync/1.0' } },
  ];
  let lastErr;
  for (const r of readers) {
    try {
      const res = await fetch(r.url, { headers: r.headers, signal: AbortSignal.timeout(60_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      if (text.length < 500) throw new Error('response too short');
      return text;
    } catch (e) { lastErr = e; }
  }
  throw lastErr ?? new Error('fetch failed');
}

// Pull only the target answer's body out of the reader markdown.
function extractAnswer(markdown, source) {
  const authorUrl = source.authorUrl;
  let start = markdown.indexOf(authorUrl);
  if (start === -1) start = markdown.indexOf(source.author);
  if (start === -1) return null;
  const follow = markdown.indexOf('关注', start);
  start = follow === -1 ? start : follow + 2;
  let end = markdown.indexOf('阅读全文', start);
  if (end === -1) end = Math.min(markdown.length, start + 6000);
  const body = markdown.slice(start, end);
  const lines = body
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !/^!\[/.test(l) && !/^\[!\[/.test(l) && l !== '​');
  if (lines.length < 3) return null;
  return lines.join('\n');
}

function parseQuota(line) {
  const norm = line.replace(/\s+/g, '').replace(/[～~至]/g, '-');
  let m = norm.match(/每天(?:签到)?送?(\d+)(?:-(\d+))?积分/);
  if (m) {
    const amount = Number(m[1]);
    const amountMax = m[2] ? Number(m[2]) : null;
    return {
      amount, amountMax, unit: '积分', period: '每天',
      display: amountMax ? `${amount} ~ ${amountMax} 积分 / 天` : `${amount} 积分 / 天`,
    };
  }
  m = norm.match(/每天送?(\d+)(万|亿)?token/i);
  if (m) {
    const mult = m[2] === '万' ? 1e4 : m[2] === '亿' ? 1e8 : 1;
    const amount = Number(m[1]) * mult;
    const shown = m[2] ? `${m[1]} ${m[2]}` : m[1];
    return { amount, amountMax: null, unit: 'token', period: '每天', display: `${shown} token / 天` };
  }
  return null;
}

function applySnapshot(data, snapshot) {
  const changes = [];
  const lines = snapshot.split('\n');
  for (const p of data.platforms) {
    const kws = (p.match?.keywords ?? []).map((k) => k.toLowerCase());
    const line = lines.find((l) => {
      const low = l.toLowerCase();
      return kws.some((k) => low.includes(k));
    });
    if (!line) {
      changes.push({ id: p.id, kind: 'missing', message: `${p.name}：在最新回答中未找到对应条目` });
      p.lastSeenInSource = p.lastSeenInSource ?? null;
      continue;
    }
    p.lastSeenInSource = nowIso();
    if (line !== p.sourceQuote) {
      changes.push({ id: p.id, kind: 'quote', message: `${p.name}：原文条目有更新`, before: p.sourceQuote, after: line });
      p.sourceQuote = line;
    }
    const q = parseQuota(line);
    if (q) {
      const before = p.quota?.display;
      if (before !== q.display) {
        changes.push({ id: p.id, kind: 'quota', message: `${p.name}：额度 ${before ?? '—'} → ${q.display}`, before, after: q.display });
      }
      p.quota = { ...p.quota, ...q };
      p.quotaVerifiedAt = nowIso();
    }
  }
  return changes;
}

async function main() {
  const data = await readJson(PLATFORMS_FILE, null);
  if (!data) { console.error('data/platforms.json missing'); process.exit(1); }
  const meta = await readJson(META_FILE, { history: [] });
  const startedAt = nowIso();
  const entry = { at: startedAt, atBeijing: beijing(), status: 'ok', changes: [] };

  try {
    const markdown = await fetchSource(data.source.url);
    const answer = extractAnswer(markdown, data.source);
    if (!answer) throw new Error('could not locate the answer body in fetched page');
    const hash = createHash('sha256').update(answer).digest('hex').slice(0, 16);
    const changed = meta.sourceHash ? meta.sourceHash !== hash : false;

    entry.changes = applySnapshot(data, answer);
    entry.hash = hash;
    entry.sourceChanged = changed;

    await writeFile(SNAPSHOT_FILE, `<!-- fetched ${startedAt} from ${data.source.url} -->\n${answer}\n`, 'utf8');
    Object.assign(meta, {
      lastSyncAt: startedAt,
      lastSyncAtBeijing: beijing(),
      lastSuccessAt: startedAt,
      lastSuccessAtBeijing: beijing(),
      status: 'ok',
      error: null,
      sourceHash: hash,
      sourceChanged: changed,
      sourceChangedAt: changed ? startedAt : (meta.sourceChangedAt ?? null),
      platformCount: data.platforms.length,
    });
    data.lastUpdated = startedAt;
    await writeFile(PLATFORMS_FILE, JSON.stringify(data, null, 2) + '\n', 'utf8');
    console.log(`sync ok: hash=${hash} changed=${changed} changes=${entry.changes.length}`);
    for (const c of entry.changes) console.log(' -', c.message);
  } catch (err) {
    entry.status = 'failed';
    entry.error = String(err?.message ?? err);
    Object.assign(meta, {
      lastSyncAt: startedAt,
      lastSyncAtBeijing: beijing(),
      status: 'failed',
      error: entry.error,
    });
    console.error('sync failed (keeping previous data):', entry.error);
  }

  meta.history = [entry, ...(meta.history ?? [])].slice(0, HISTORY_LIMIT);
  await writeFile(META_FILE, JSON.stringify(meta, null, 2) + '\n', 'utf8');
}

main();
