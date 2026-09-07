(() => {
  'use strict';

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));

  const state = {
    data: null,
    meta: null,
    type: 'all',
    company: '',
    sort: 'source',
    query: '',
    claimed: new Set(),
  };

  // ---------- Beijing date helpers ----------
  const beijingDate = (d = new Date()) =>
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  const claimKey = () => `tokenegg:claimed:${beijingDate()}`;

  const fmtBeijing = (iso) => {
    if (!iso) return '—';
    try {
      return new Intl.DateTimeFormat('zh-CN', {
        timeZone: 'Asia/Shanghai', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
      }).format(new Date(iso));
    } catch { return iso; }
  };

  const msUntilBeijingMidnight = () => {
    const now = new Date();
    const bj = new Date(now.getTime() + 8 * 3600e3); // Beijing is fixed UTC+8
    const next = Date.UTC(bj.getUTCFullYear(), bj.getUTCMonth(), bj.getUTCDate() + 1);
    return next - bj.getTime();
  };

  // ---------- storage ----------
  const loadClaims = () => {
    state.claimed = new Set();
    try {
      const raw = localStorage.getItem(claimKey());
      if (raw) JSON.parse(raw).forEach((id) => state.claimed.add(id));
      Object.keys(localStorage)
        .filter((k) => k.startsWith('tokenegg:claimed:') && k !== claimKey())
        .forEach((k) => localStorage.removeItem(k));
    } catch { /* storage unavailable */ }
  };
  const saveClaims = () => {
    try { localStorage.setItem(claimKey(), JSON.stringify([...state.claimed])); } catch { /* ignore */ }
  };

  // ---------- theme ----------
  const applyTheme = (t) => {
    if (t) document.documentElement.dataset.theme = t;
    else delete document.documentElement.dataset.theme;
  };
  try { applyTheme(localStorage.getItem('tokenegg:theme') || ''); } catch { /* ignore */ }
  $('#themeToggle').addEventListener('click', () => {
    const cur = document.documentElement.dataset.theme
      || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const next = cur === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try { localStorage.setItem('tokenegg:theme', next); } catch { /* ignore */ }
  });

  // ---------- formatting ----------
  const typeLabel = { daily: '每日领取', limited: '限时免费', free: '长期免费' };
  const officialLabel = {
    ok: '官方已核对',
    'no-number': '官方未标数量',
    failed: '官方页抓取失败',
  };

  // ---------- rendering ----------
  const render = () => {
    const grid = $('#grid');
    const tpl = $('#cardTpl');
    grid.innerHTML = '';
    const q = state.query.trim().toLowerCase();

    let list = state.data.platforms.map((p, i) => ({ ...p, _i: i }));
    if (state.type === 'official') list = list.filter((p) => p.officialResult?.status === 'ok');
    else if (state.type !== 'all') list = list.filter((p) => p.type === state.type);
    if (state.company) list = list.filter((p) => p.company === state.company);
    if (q) {
      list = list.filter((p) =>
        [p.name, p.company, p.notes, p.claim, ...(p.models || [])].join(' ').toLowerCase().includes(q));
    }
    const scoreAmount = (p) => {
      if (p.quota?.amount == null) return -1;
      const perDay = p.quota.period === '每月' ? p.quota.amount / 30 : p.quota.amount;
      return p.quota.unit === 'token' ? perDay / 1e4 : perDay;
    };
    if (state.sort === 'amount') list.sort((a, b) => scoreAmount(b) - scoreAmount(a));
    if (state.sort === 'unclaimed') {
      list.sort((a, b) => Number(state.claimed.has(a.id)) - Number(state.claimed.has(b.id)) || a._i - b._i);
    }

    for (const p of list) {
      const node = tpl.content.firstElementChild.cloneNode(true);
      const off = p.officialResult || {};
      node.dataset.id = p.id;
      $('.name', node).textContent = p.name;
      $('.company', node).textContent = p.company;
      $('.quota-main', node).textContent = p.quota?.display || p.fallbackDisplay || '官方未标数量';
      const sub = [];
      if (p.quota?.scope) sub.push(p.quota.scope);
      if (p.claim) sub.push(p.claim);
      $('.quota-sub', node).textContent = sub.join(' · ');

      const badges = $('.badges', node);
      const addBadge = (cls, text, title) => {
        const b = document.createElement('span');
        b.className = `badge ${cls}`; b.textContent = text; if (title) b.title = title;
        badges.appendChild(b);
      };
      addBadge(p.type, typeLabel[p.type] || p.type);
      const st = off.status || 'unknown';
      addBadge(`official ${st}`, officialLabel[st] || '未同步', off.checkedAt ? `最近抓取 ${fmtBeijing(off.checkedAt)}（北京时间）` : '');
      if (off.archivedAt) addBadge('archive', `网页存档 ${off.archivedAt}`, off.error || '官方页面无法直接访问，展示的是网页存档');
      if (off.snippetChangedAt && off.checkedAt && off.snippetChangedAt.slice(0, 10) === off.checkedAt.slice(0, 10)) {
        addBadge('changed', '官方页面今日有变化');
      }
      if (st === 'failed') node.classList.add('missing');

      const models = $('.models', node);
      (p.models || []).forEach((name) => {
        const li = document.createElement('li'); li.textContent = name; models.appendChild(li);
      });
      $('.notes', node).textContent = p.notes || '';

      // Official excerpt
      const offBox = $('.official-box', node);
      const offLink = $('.official-link', node);
      offLink.href = off.url || p.official?.url || p.url;
      offLink.textContent = off.label || p.official?.label || '官方页面';
      const offText = $('.official-text', node);
      offText.innerHTML = '';
      if (off.status === 'failed') {
        const li = document.createElement('li'); li.className = 'err';
        li.textContent = `抓取失败：${off.error || '未知错误'}${off.lastOkAt ? `（上次成功 ${fmtBeijing(off.lastOkAt)}）` : ''}`;
        offText.appendChild(li);
      } else if ((off.snippet || []).length) {
        off.snippet.forEach((line) => {
          const li = document.createElement('li');
          li.textContent = line;
          if (off.matched && line.includes(off.matched.split(' | ')[0].slice(0, 12))) li.classList.add('hit');
          offText.appendChild(li);
        });
      } else {
        const li = document.createElement('li'); li.textContent = '页面上没有找到与额度相关的文字。'; offText.appendChild(li);
      }
      $('.official-time', offBox).textContent = off.checkedAt
        ? `抓取于 ${fmtBeijing(off.checkedAt)}（北京时间）${off.archivedAt ? `，内容为 ${off.archivedAt} 的网页存档` : ''}`
        : '尚未抓取';

      const go = $('.go', node);
      go.href = p.url;
      go.textContent = `去 ${p.name.split(/[（(]/)[0]} 领取 ↗`;

      const box = $('.claim-box', node);
      box.checked = state.claimed.has(p.id);
      node.classList.toggle('claimed', box.checked);
      box.addEventListener('change', () => {
        if (box.checked) state.claimed.add(p.id); else state.claimed.delete(p.id);
        saveClaims();
        node.classList.toggle('claimed', box.checked);
        renderStats();
        if (state.sort === 'unclaimed') render();
      });
      grid.appendChild(node);
    }
    $('#empty').hidden = list.length > 0;
    renderStats();
  };

  const renderStats = () => {
    const ps = state.data.platforms;
    $('#statPlatforms').textContent = ps.length;
    const daily = ps.filter((p) => p.quota?.period === '每天' && p.quota.unit === '积分' && p.quota.amount != null);
    const pts = daily.reduce((s, p) => s + p.quota.amount, 0);
    $('#statDaily').textContent = pts.toLocaleString('zh-CN');
    const okCount = ps.filter((p) => p.officialResult?.status === 'ok').length;
    $('#statOfficial').textContent = `${okCount} / ${ps.length}`;
    $('#statClaimed').textContent = `${[...state.claimed].filter((id) => ps.some((p) => p.id === id)).length} / ${ps.length}`;
  };

  const renderSync = () => {
    const bar = $('#syncBar');
    const m = state.meta;
    bar.classList.remove('ok', 'failed', 'changed');
    if (!m) { $('#syncText').textContent = '尚无同步记录。'; return; }
    const c = m.counts || {};
    const latest = (m.history || [])[0];
    const nChanges = latest?.changes?.length || 0;
    let text;
    if (m.status === 'ok') {
      text = `最近同步 ${fmtBeijing(m.lastSyncAt)}（北京时间）· 官方页面：${c.ok ?? 0} 家解析出数字，${c.noNumber ?? 0} 家未标数量，${c.failed ?? 0} 家抓取失败`;
      if (nChanges) text += ` · 本次 ${nChanges} 处变化`;
      bar.classList.add(nChanges ? 'changed' : 'ok');
    } else {
      text = `最近一次同步失败（${fmtBeijing(m.lastSyncAt)}）：${m.error || '未知错误'}。当前展示的是 ${fmtBeijing(m.lastSuccessAt)} 的数据。`;
      bar.classList.add('failed');
    }
    $('#syncText').textContent = text;
    $('#footUpdated').textContent = m.lastSuccessAt ? `数据更新于 ${fmtBeijing(m.lastSuccessAt)}（北京时间）` : '';

    const hist = $('#history');
    hist.innerHTML = '';
    (m.history || []).slice(0, 14).forEach((h) => {
      const li = document.createElement('li');
      const t = document.createElement('span'); t.className = 'time'; t.textContent = h.atBeijing || fmtBeijing(h.at);
      const st = document.createElement('span'); st.className = `st ${h.status}`;
      st.textContent = h.status === 'ok' ? `成功 ${h.ok ?? '?'}/${(h.ok ?? 0) + (h.noNumber ?? 0) + (h.failed ?? 0)}` : '失败';
      const ch = document.createElement('span'); ch.className = 'ch';
      const n = (h.changes || []).length;
      ch.textContent = n ? h.changes.map((x) => x.message).join('；') : (h.status === 'ok' ? '无变化' : (h.error || ''));
      li.append(t, st, ch);
      hist.appendChild(li);
    });
    if (!hist.children.length) {
      const li = document.createElement('li'); li.textContent = '暂无记录'; hist.appendChild(li);
    }
  };

  const tickCountdown = () => {
    const ms = msUntilBeijingMidnight();
    const h = Math.floor(ms / 3600e3);
    const mi = Math.floor((ms % 3600e3) / 60e3);
    $('#statCountdown').textContent = `${h} 小时 ${String(mi).padStart(2, '0')} 分`;
  };

  // ---------- controls ----------
  $$('#typeChips .chip').forEach((c) => c.addEventListener('click', () => {
    $$('#typeChips .chip').forEach((x) => x.classList.toggle('active', x === c));
    state.type = c.dataset.type;
    render();
  }));
  $('#companyFilter').addEventListener('change', (e) => { state.company = e.target.value; render(); });
  $('#sortBy').addEventListener('change', (e) => { state.sort = e.target.value; render(); });
  $('#search').addEventListener('input', (e) => { state.query = e.target.value; render(); });
  $('#resetClaims').addEventListener('click', () => { state.claimed.clear(); saveClaims(); render(); });

  // ---------- boot ----------
  const boot = async () => {
    const bust = `?t=${Date.now()}`;
    const [data, meta] = await Promise.all([
      fetch(`data/platforms.json${bust}`).then((r) => r.json()),
      fetch(`data/meta.json${bust}`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]);
    state.data = data;
    state.meta = meta;
    loadClaims();

    if (location.hostname.endsWith('github.io')) {
      const owner = location.hostname.split('.')[0];
      const name = location.pathname.split('/').filter(Boolean)[0];
      if (name) { const a = $('#repoLink'); a.href = `https://github.com/${owner}/${name}`; a.hidden = false; }
    }

    const companies = [...new Set(data.platforms.map((p) => p.company))];
    const sel = $('#companyFilter');
    companies.forEach((c) => { const o = document.createElement('option'); o.value = c; o.textContent = c; sel.appendChild(o); });

    renderSync();
    render();
    tickCountdown();
    setInterval(tickCountdown, 30e3);
    let day = beijingDate();
    setInterval(() => { const d = beijingDate(); if (d !== day) { day = d; loadClaims(); render(); } }, 60e3);
  };

  boot().catch((err) => {
    $('#syncText').textContent = `数据加载失败：${err.message}`;
    $('#syncBar').classList.add('failed');
  });
})();
