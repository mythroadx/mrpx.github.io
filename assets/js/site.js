(() => {
  'use strict';

  const captions = [
    '格斗之王拳皇 · 302008',
    '雷电1944 · 1000',
    '欢乐斗地主 · 1023',
    '功夫之斧头帮 · 302013',
    '火焰之纹章 · 306002',
  ];

  const screen = document.getElementById('heroScreen');
  if (screen) {
    const frames = Array.from(screen.querySelectorAll('img'));
    const caption = document.getElementById('heroCaption');
    let index = 0;
    setInterval(() => {
      frames[index].classList.remove('is-on');
      index = (index + 1) % frames.length;
      frames[index].classList.add('is-on');
      const shown = index;
      setTimeout(() => {
        if (caption && index === shown) caption.textContent = captions[shown] || '';
      }, 420);
    }, 4200);
  }

  const strip = document.getElementById('strip');
  if (strip) {
    fetch('assets/data/catalog.json')
      .then(response => {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.json();
      })
      .then(catalog => {
        const blocked = ['美女', '艳', '裸', '色情', '情色', '成人', '诱惑', '三级', '性感', '妻', '后宫', '女优'];
        const previews = (catalog.packages || []).filter(item =>
          item.preview && !blocked.some(word => String(item.name || '').includes(word)));
        const picked = previews.slice(0, 46);
        const markup = picked.map(item => {
          const file = item.preview.split('/').pop();
          return '<img src="assets/img/games/' + file + '" alt="' + item.name.replace(/"/g, '') +
            '" width="84" height="112" loading="lazy">';
        }).join('');
        strip.innerHTML = markup + markup;
      })
      .catch(() => {
        strip.innerHTML = '';
      });
  }

  document.querySelectorAll('[data-copy]').forEach(button => {
    button.addEventListener('click', async () => {
      const value = button.dataset.copy || '';
      try {
        await navigator.clipboard.writeText(value);
        button.textContent = '已复制';
      } catch (error) {
        button.textContent = '复制失败';
      }
      setTimeout(() => { button.textContent = '复制'; }, 1600);
    });
  });
})();
