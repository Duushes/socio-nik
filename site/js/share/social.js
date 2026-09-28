/* Socio-Nik · кнопки соцсетей: Telegram, Instagram, WhatsApp, X, ВКонтакте + «Скопировать ссылку» и системное «Ещё…».
   Ссылочные сети открываются в новой вкладке по своим share-адресам. Instagram ссылки не принимает —
   ему отдаём картинку: на телефоне через системное меню, на компьютере — скачиванием. */
(function (root) {
  const S = root.Socio = root.Socio || {};
  const { esc } = S.dom;
  const enc = encodeURIComponent;
  const clip = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);

  // Значки нарисованы с нуля, упрощённо; узнаваемость держат форма и фирменный цвет
  const ICONS = {
    telegram: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.4 4.3 2.9 11.5c-.9.3-.8 1.5.1 1.7l4.5 1.3 1.7 5.4c.2.8 1.2 1 1.7.4l2.5-2.6 4.6 3.4c.6.5 1.5.1 1.7-.6l2.9-13.9c.2-.9-.7-1.6-1.6-1.3z" fill="currentColor"/><path d="m8.1 14.3 9.3-6.9-6.5 8" fill="none" stroke="var(--soc-cut)" stroke-width="1.4" stroke-linejoin="round"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.4" y="3.4" width="17.2" height="17.2" rx="5.2" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.3" cy="6.7" r="1.3" fill="currentColor"/></svg>',
    whatsapp: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.1a8.9 8.9 0 0 0-7.7 13.3L3.1 20.9l4.6-1.2A8.9 8.9 0 1 0 12 3.1z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/><path d="M9.1 7.9c.3-.5.9-.5 1.1.1l.6 1.5c.1.3 0 .6-.2.8l-.5.6c.5 1.1 1.4 2 2.5 2.5l.6-.5c.2-.2.5-.3.8-.2l1.5.6c.6.2.6.8.1 1.1-.9.6-2.1.8-3.2.3a8.3 8.3 0 0 1-3.6-3.6c-.5-1.1-.4-2.3.3-3.2z" fill="currentColor"/></svg>',
    x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.2 4h4.5l11.1 16h-4.5z" fill="currentColor"/><path d="M19.4 4 13 11.3M4.6 20l6.4-7.3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    vk: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="5.5" fill="currentColor"/><path d="M6.6 9.1h1.7c.6 2.2 1.6 3.4 2.2 3.6V9.1h1.6v2.1c.9-.1 1.8-1.1 2.1-2.1h1.6c-.3 1.4-1.3 2.5-2 2.9.7.3 1.9 1.3 2.3 2.9h-1.7c-.4-1.1-1.3-1.9-2.3-2v2H12c-3.2 0-5-2.2-5.4-5.8z" fill="var(--soc-cut)"/></svg>',
    copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.2 13.8a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1.1 1.1M13.8 10.2a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.1-1.1" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>',
    more: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5v11M8 7.3l4-3.8 4 3.8" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/><path d="M7.5 10.5H6.8a1.8 1.8 0 0 0-1.8 1.8v6.4c0 1 .8 1.8 1.8 1.8h10.4c1 0 1.8-.8 1.8-1.8v-6.4c0-1-.8-1.8-1.8-1.8h-.7" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>'
  };
  const NAMES = { telegram: 'Telegram', instagram: 'Instagram', whatsapp: 'WhatsApp', x: 'X (Twitter)', vk: 'ВКонтакте', copy: 'Скопировать ссылку', more: 'Ещё…' };

  function href(net, text, url) {
    switch (net) {
      case 'telegram': return url ? `https://t.me/share/url?url=${enc(url)}&text=${enc(text)}` : `https://t.me/share/url?url=${enc(text)}`;
      case 'whatsapp': return `https://wa.me/?text=${enc(url ? text + ' ' + url : text)}`;
      case 'x': return `https://x.com/intent/tweet?text=${enc(clip(text, 200))}${url ? `&url=${enc(url)}` : ''}`;
      case 'vk': return url ? `https://vk.com/share.php?url=${enc(url)}&title=${enc(clip(text, 300))}` : '';
      default: return '';
    }
  }

  // compact — только значки (карточка факта); без url ВКонтакте и «Скопировать ссылку» не показываем
  function bar({ text, url = '', compact = false, label = 'Поделиться' }) {
    const tip = name => (compact ? ` aria-label="${esc(label)}: ${name}" title="${name}"` : '');
    const inner = net => ICONS[net] + (compact ? '' : `<span>${NAMES[net]}</span>`);
    const cls = net => `soc soc-${net}${compact ? ' soc-icon' : ''}`;
    const items = ['telegram', 'instagram', 'whatsapp', 'x', 'vk'].map(net => {
      if (net === 'instagram') return `<button type="button" class="${cls(net)}" data-social="instagram"${tip(NAMES[net])}>${inner(net)}</button>`;
      const h = href(net, text, url);
      return h ? `<a class="${cls(net)}" data-social="${net}" href="${esc(h)}" target="_blank" rel="noopener"${tip(NAMES[net])}>${inner(net)}</a>` : '';
    });
    if (url) items.push(`<button type="button" class="${cls('copy')}" data-social="copy"${tip(NAMES.copy)}>${inner('copy')}</button>`);
    if (typeof navigator !== 'undefined' && navigator.share) items.push(`<button type="button" class="${cls('more')}" data-social="more"${tip('Другие приложения')}>${inner('more')}</button>`);
    return `<div class="socials${compact ? ' socials-compact' : ''}" role="group" aria-label="${esc(label)}">${items.join('')}</div>`;
  }

  // get: { text(), url(), image() → Promise<Blob>, status() → элемент для сообщений }
  function mount(scope, get) {
    const onClick = async e => {
      const b = e.target.closest && e.target.closest('[data-social]');
      if (!b || !scope.contains(b)) return;
      const say = msg => { const el = get.status && get.status(); if (el) el.textContent = msg; };
      const net = b.dataset.social;
      try {
        if (net === 'copy') say((await S.share.copy(get.url())) ? 'Ссылка скопирована' : 'Не удалось скопировать ссылку');
        if (net === 'more') await navigator.share({ text: get.text(), url: get.url() || undefined });
        if (net === 'instagram') {
          say('Готовим картинку…');
          const blob = await get.image();
          const file = new File([blob], 'socio-nik-story.png', { type: 'image/png' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file] });
            say('');
          } else {
            S.share.download(blob, file.name);
            say('Картинка для сторис сохранена — добавь её в Instagram');
          }
        }
      } catch (err) {
        if (err && err.name === 'AbortError') say('');
        else say('Не получилось — попробуй ещё раз');
      }
    };
    scope.addEventListener('click', onClick);
    return () => scope.removeEventListener('click', onClick);
  }

  S.social = { bar, mount, href };
})(window);
