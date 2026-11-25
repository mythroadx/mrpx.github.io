(() => {
  'use strict';

  const PAGE_SIZE = 24;
  const RAW_BASE = 'https://raw.githubusercontent.com/vmrp/vmrp.github.io/master/public/mrps/';

  const grid = document.getElementById('grid');
  const status = document.getElementById('status');
  const search = document.getElementById('q');
  const chips = document.getElementById('vendorChips');
  const previewOnly = document.getElementById('previewOnly');
  const prev = document.getElementById('prev');
  const next = document.getElementById('next');
  const pageInfo = document.getElementById('pageInfo');

  let packages = [];
  const state = { q: '', vendor: '', preview: false, page: 1 };
  let filtered = [];

  const esc = value => String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const sizeText = bytes => {
    if (!bytes) return '—';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const launchUrl = item => {
    const raw = RAW_BASE + encodeURIComponent(item.filename);
    return '../play/?name=' + encodeURIComponent(item.filename) +
      '&f=' + encodeURIComponent(raw) +
      '&title=' + encodeURIComponent(item.name || item.filename);
  };

  function apply() {
    const q = state.q.trim().toLowerCase();
    filtered = packages.filter(item => {
      if (state.preview && !item.preview) return false;
      if (state.vendor && item.vendor !== state.vendor) return false;
      if (!q) return true;
      return [item.name, item.vendor, item.filename, String(item.appid || '')]
        .some(value => String(value || '').toLowerCase().includes(q));
    });
    state.page = 1;
    render();
  }

  function render() {
    const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    if (state.page > pages) state.page = pages;
    const start = (state.page - 1) * PAGE_SIZE;
    const slice = filtered.slice(start, start + PAGE_SIZE);

    grid.innerHTML = slice.map(item => {
      const shot = item.preview
        ? '<div class="lib-shot"><img src="../assets/img/games/' + esc(item.preview.split('/').pop()) +
          '" alt="' + esc(item.name) + ' 截图" loading="lazy"></div>'
        : '<div class="lib-shot noimg"><span class="ph">' + esc(String(item.name || '?').slice(0, 1)) +
          '</span><span class="ph-cap">NO SCREENSHOT</span></div>';
      return '<article class="lib-card">' + shot +
        '<div class="lib-body"><h3 title="' + esc(item.name) + '">' + esc(item.name || item.filename) + '</h3>' +
        '<span class="vendor">' + esc(item.vendor || '未知厂商') + ' · ' + esc(item.appid || '—') + '</span>' +
        '<p class="desc">' + esc(item.description || '该包未提供描述信息。') + '</p>' +
        '<div class="lib-foot"><span class="size">' + sizeText(item.size_bytes) + '</span>' +
        '<div class="lib-actions">' +
        '<a class="tiny-btn is-primary" href="' + esc(launchUrl(item)) + '" title="在线试玩">启动</a>' +
        '<a class="tiny-btn" href="' + esc(item.download_url) + '" target="_blank" rel="noopener" title="在原仓库下载">下载</a>' +
        '</div></div></div></article>';
    }).join('');

    status.textContent = filtered.length
      ? '共 ' + filtered.length + ' 个应用 · 第 ' + state.page + ' / ' + pages + ' 页'
      : '没有匹配的应用，请调整搜索条件。';

    pageInfo.textContent = state.page + ' / ' + pages;
    prev.disabled = state.page <= 1;
    next.disabled = state.page >= pages;
  }

  function buildChips() {
    const counts = new Map();
    packages.forEach(item => {
      const vendor = item.vendor || '未知厂商';
      counts.set(vendor, (counts.get(vendor) || 0) + 1);
    });
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
    const all = '<button class="chip is-on" type="button" data-vendor="">全部</button>';
    chips.innerHTML = all + top.map(([vendor, count]) =>
      '<button class="chip" type="button" data-vendor="' + esc(vendor) + '">' + esc(vendor) +
      ' <span style="opacity:.5">' + count + '</span></button>').join('');
    chips.addEventListener('click', event => {
      const button = event.target.closest('.chip');
      if (!button) return;
      chips.querySelectorAll('.chip').forEach(chip => chip.classList.remove('is-on'));
      button.classList.add('is-on');
      state.vendor = button.dataset.vendor || '';
      apply();
    });
  }

  let timer = 0;
  search.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      state.q = search.value;
      apply();
    }, 140);
  });

  previewOnly.addEventListener('click', () => {
    state.preview = !state.preview;
    previewOnly.classList.toggle('is-on', state.preview);
    apply();
  });

  prev.addEventListener('click', () => {
    if (state.page > 1) { state.page--; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  });

  next.addEventListener('click', () => {
    const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    if (state.page < pages) { state.page++; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  });

  fetch('../assets/data/catalog.json')
    .then(response => {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.json();
    })
    .then(catalog => {
      packages = (catalog.packages || []).slice();
      packages.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'zh-Hans-CN'));
      buildChips();
      apply();
    })
    .catch(error => {
      status.textContent = '目录加载失败：' + error.message + '（请通过 HTTP(S) 访问本站）';
    });
})();
