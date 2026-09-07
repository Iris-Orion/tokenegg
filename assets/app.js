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
  const beijingDate = (d = new Date()) => {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(d);
    return parts; // YYYY-MM-DD
  };
  const claimKey = () => `tokenegg:claimed:${beijingDate()}`;

  const fmtBeijing = (iso) => {
    if (!iso) return '—';
    try {
      return new Intl.DateTimeFormat('zh-CN', {
        timeZone: 'Asia/Shanghai', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: false,
      }).format(new Date(iso));
    } catch { return iso; }
  };

  const msUntilBeijingMidnight = () => {
    const now = new Date();
    // Beijing is fixed UTC+8, no DST.
    const bj = new Date(now.getTime() + 8 * 3600e3);
    const next = Date.UTC(bj.getUTCFullYear(), bj.getUTCMonth(), bj.getUTCDate() + 1);
    return next - bj.getTime();
  };

  // ---------- storage ----------
  const loadClaims = () => {
    state.claimed = new Set();
    try {
      const raw = localStorage.getItem(claimKey());
      if (raw) JSON.parse(raw).forEach((id) => state.claimed.add(id));
      // Drop stale days.
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

  // ---------- number formatting ----------
  const fmtCN = (n) => {
    if (n == null) return '—';
    if (n >= 1e8) return `${+(n / 1e8).toFixed(2)} 亿`;
    if (n >= 1e4) return `${+(n / 1e4).toFixed(n % 1e4 ? 1 : 0)} 万`;
    return String(n);
  };

  // ---------- rendering ----------
  const typeLabel = { daily: '每日领取', limited: '限时免费', free: '长期免费' };

  const render = () => {
    const grid = $('#grid');
    const tpl = $('#cardTpl');
    grid.innerHTML = '';
    const q = state.query.trim().toLowerCase();

    let list = state.data.platforms.map((p, i) => ({ ...p, _i: i }));
    if (state.type !== 'all') list = list.filter((p) => p.type === state.type);
    if (state.company) list = list.filter((p) => p.company === state.company);
    if (q) {
      list = list.filter((p) =>
        [p.name, p.company, p.notes, p.claim, ...(p.models || [])].join(' ').toLowerCase().includes(q));
    }
    const scoreAmount = (p) => {
      if (p.quota?.amount == null) return -1;
      // Compare tokens and points on a rough common scale so tokens don't swamp everything.
      return p.quota.unit === 'token' ? p.quota.amount / 1e4 : p.quota.amount;
    };
    if (state.sort === 'amount') list.sort((a, b) => scoreAmount(b) - scoreAmount(a));
    if (state.sort === 'unclaimed') {
      list.sort((a, b) => Number(state.claimed.has(a.id)) - Number(state.claimed.has(b.id)) || a._i - b._i);
    }

    for (const p of list) {
      const node = tpl.content.firstElementChild.cloneNode(true);
      node.dataset.id = p.id;
      $('.name', node).textContent = p.name;
      $('.company', node).textContent = p.company;
      $('.quota-main', node).textContent = p.quota?.display || '免费';
      $('.quota-sub', node).textContent = p.claim || '';

      const badges = $('.badges', node);
      const b = document.createElement('span');
      b.className = `badge ${p.type}`;
      b.textContent = typeLabel[p.type] || p.type;
      badges.appendChild(b);
      const missing = state.meta?.status === 'ok' && p.lastSeenInSource && state.meta.lastSuccessAt
        && p.lastSeenInSource.slice(0, 10) < state.meta.lastSuccessAt.slice(0, 10);
      if (missing) {
        const m = document.createElement('span');
        m.className = 'badge missing';
        m.textContent = '原文已移除？';
        badges.appendChild(m);
        node.classList.add('missing');
      }

      const models = $('.models', node);
      (p.models || []).forEach((name) => {
        const li = document.createElement('li');
        li.textContent = name;
        models.appendChild(li);
      });
      $('.notes', node).textContent = p.notes || '';
      $('.quote', node).textContent = p.sourceQuote || '';
      $('.extra', node).textContent = p.extra ? `补充：${p.extra}` : '';
      $('.verified', node).textContent = p.quotaVerifiedAt
        ? `额度最近一次与原文核对：${fmtBeijing(p.quotaVerifiedAt)}（北京时间）`
        : '额度尚未自动核对';

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
    const pts = ps.filter((p) => p.quota?.unit === '积分' && p.quota.amount != null)
      .reduce((s, p) => s + p.quota.amount, 0);
    const tokens = ps.filter((p) => p.quota?.unit === 'token' && p.quota.amount != null)
      .reduce((s, p) => s + p.quota.amount, 0);
    $('#statDaily').textContent = pts.toLocaleString('zh-CN');
    $('#statTokens').textContent = tokens ? `${fmtCN(tokens)}+` : '—';
    $('#statClaimed').textContent = `${[...state.claimed].filter((id) => ps.some((p) => p.id === id)).length} / ${ps.length}`;
  };

  const renderSync = () => {
    const bar = $('#syncBar');
    const m = state.meta;
    bar.classList.remove('ok', 'failed', 'changed');
    if (!m) { $('#syncText').textContent = '尚无同步记录。'; return; }
    let text;
    if (m.status === 'ok') {
      text = `最近同步 ${fmtBeijing(m.lastSyncAt)}（北京时间）· 原文${m.sourceChanged ? '有更新，已自动比对' : '无变化'}`;
      bar.classList.add(m.sourceChanged ? 'changed' : 'ok');
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
      const st = document.createElement('span'); st.className = `st ${h.status}`; st.textContent = h.status === 'ok' ? '成功' : '失败';
      const ch = document.createElement('span'); ch.className = 'ch';
      if (h.status === 'ok') {
        const n = (h.changes || []).length;
        ch.textContent = n ? (h.changes.map((c) => c.message).join('；')) : (h.sourceChanged ? '原文有改动，但额度未变' : '无变化');
      } else {
        ch.textContent = h.error || '';
      }
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
  $('#resetClaims').addEventListener('click', () => {
    state.claimed.clear(); saveClaims(); render();
  });

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

    $('#sourceLink').href = data.source.url;
    $('#authorLink').href = data.source.authorUrl;
    $('#authorLink').textContent = data.source.author;
    const repo = document.documentElement.dataset.repo || '';
    if (location.hostname.endsWith('github.io')) {
      const owner = location.hostname.split('.')[0];
      const name = location.pathname.split('/').filter(Boolean)[0];
      if (name) { const a = $('#repoLink'); a.href = `https://github.com/${owner}/${name}`; a.hidden = false; }
    } else if (repo) { const a = $('#repoLink'); a.href = repo; a.hidden = false; }

    const companies = [...new Set(data.platforms.map((p) => p.company))];
    const sel = $('#companyFilter');
    companies.forEach((c) => { const o = document.createElement('option'); o.value = c; o.textContent = c; sel.appendChild(o); });

    renderSync();
    render();
    tickCountdown();
    setInterval(tickCountdown, 30e3);
    // If the Beijing date rolls over while the page is open, reset claims.
    let day = beijingDate();
    setInterval(() => { const d = beijingDate(); if (d !== day) { day = d; loadClaims(); render(); } }, 60e3);
  };

  boot().catch((err) => {
    $('#syncText').textContent = `数据加载失败：${err.message}`;
    $('#syncBar').classList.add('failed');
  });
})();
