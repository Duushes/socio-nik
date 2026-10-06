/* Socio-Nik · блок «Поделиться» — один на результат, главную и mystery box.
   По лучшим практикам шера: картинка — главное, её видно до отправки; одна главная кнопка (на телефоне —
   системное меню сразу с картинкой, на компьютере — скачать); короткий ряд мессенджеров, которыми пользуются
   в России, с подписями; ссылка с «Копировать» и подтверждением прямо на кнопке, без всплывашек. */
(function (root) {
  const S = root.Socio;
  const ui = S.ui = S.ui || {};
  const { esc } = S.dom;
  const M = () => S.core.modelA;
  const NB = '\u00A0';
  const NETS = [['telegram', 'Telegram'], ['whatsapp', 'WhatsApp'], ['vk', 'ВКонтакте']];
  const I = {
    share: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5v11M8 7.3l4-3.8 4 3.8" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/><path d="M7.5 10.5H6.8a1.8 1.8 0 0 0-1.8 1.8v6.4c0 1 .8 1.8 1.8 1.8h10.4c1 0 1.8-.8 1.8-1.8v-6.4c0-1-.8-1.8-1.8-1.8h-.7" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>',
    save: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7.5 10.8 12 15.3l4.5-4.5M5 19.5h14" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    check: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };

  // Кнопки: главная, мессенджеры, ссылка. text — подпись к шеру, url — ссылка (может быть пустой).
  // link — главная кнопка отправляет ссылку (системное меню на телефоне, на компьютере — копирует), а не картинку
  ui.shareActions = ({ text, url = '', primary = 'Поделиться', compact = false, extra = '', link = false }) => {
    const files = S.share.canShareFiles();
    const nets = NETS.map(([net, name]) => {
      const h = S.social.href(net, text, url);
      return h ? `<a class="sk-net sk-${net}" href="${esc(h)}" target="_blank" rel="noopener" data-net="${net}"><span class="sk-ico">${S.social.icon(net)}</span><span>${name}</span></a>` : '';
    }).join('');
    const more = typeof navigator !== 'undefined' && navigator.share
      ? `<button class="sk-net sk-more" type="button" data-sk="more"><span class="sk-ico">${S.social.icon('more')}</span><span>Ещё</span></button>` : '';
    // в компактном виде ссылка — четвёртая плитка рядом с мессенджерами: блок ниже и не раздувает карточку
    const linkTile = url ? `<button class="sk-net sk-tile-link" type="button" data-sk="copy" aria-label="Скопировать ссылку"><span class="sk-ico">${S.social.icon('copy')}</span><span class="sk-copy"><span class="sk-c1">Ссылка</span><span class="sk-c2">${I.check}Готово</span></span></button>` : '';
    const shown = url ? url.replace(/^https?:\/\//, '') : '';
    return `
      <div class="sk${compact ? ' sk-compact' : ''}">
        ${extra ? '<div class="sk-row">' : ''}${link
          ? `<button class="btn sk-go" type="button" data-sk="send"><span class="sk-flip"><span>${I.share}${esc(primary)}</span><span>${I.check}Ссылка скопирована</span></span></button>`
          : `<button class="btn sk-go" type="button" data-sk="go">${files ? I.share + esc(primary) : I.save + 'Скачать картинку'}</button>`}${extra ? extra + '</div>' : ''}
        <div class="sk-nets" role="group" aria-label="Отправить в мессенджер">${nets}${compact ? linkTile : more}</div>
        ${compact ? '' : url ? `<button class="sk-link" type="button" data-sk="copy" aria-label="Скопировать ссылку ${esc(shown)}">
          <span class="sk-url">${esc(shown)}</span><span class="sk-copy"><span class="sk-c1">Копировать</span><span class="sk-c2">${I.check}Скопировано</span></span>
        </button>` : `<button class="sk-link" type="button" data-sk="copy-text"><span class="sk-url">${esc(text)}</span><span class="sk-copy"><span class="sk-c1">Копировать</span><span class="sk-c2">${I.check}Скопировано</span></span></button>`}
        <p class="sk-status" aria-live="polite"></p>
      </div>`;
  };

  // get: { text(), url(), image() → Promise<Blob>, name() }
  ui.mountShareActions = (scope, get) => {
    let flashT = 0;
    const onClick = async e => {
      const b = e.target.closest && e.target.closest('[data-sk]');
      if (!b || !scope.contains(b)) return;
      const box = b.closest('.sk'), status = box && box.querySelector('.sk-status');
      const say = m => { if (status) status.textContent = m; };
      const act = b.dataset.sk;
      try {
        if (act === 'copy' || act === 'copy-text') {
          const ok = await S.share.copy(act === 'copy' ? get.url() : get.text());
          if (ok) {
            b.classList.add('done');
            clearTimeout(flashT);
            flashT = setTimeout(() => b.classList.remove('done'), 2400);
            say('Ссылка скопирована');
          } else say('Не удалось скопировать — выдели ссылку вручную');
        }
        if (act === 'more') await navigator.share({ text: get.text(), url: get.url() || undefined });
        if (act === 'send') {
          // ссылка: на телефоне — системное меню, иначе — в буфер с подтверждением на самой кнопке
          if (navigator.share && matchMedia('(pointer: coarse)').matches) await navigator.share({ text: get.text(), url: get.url() || undefined });
          else if (await S.share.copy(get.text() + (get.url() ? ' ' + get.url() : ''))) {
            b.classList.add('done');
            clearTimeout(flashT);
            flashT = setTimeout(() => b.classList.remove('done'), 2400);
            say('Ссылка скопирована — вставь её в чат');
          } else say('Не удалось скопировать — выдели ссылку вручную');
        }
        if (act === 'go') {
          b.classList.add('busy');
          say('Готовим картинку…');
          const blob = await get.image();
          const file = new File([blob], get.name(), { type: 'image/png' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], text: get.text() + (get.url() ? ' ' + get.url() : '') });
            say('');
          } else {
            S.share.download(blob, file.name);
            say('Картинка сохранена — добавь её в сторис или пост');
          }
        }
      } catch (err) {
        say(err && err.name === 'AbortError' ? '' : 'Не получилось — попробуй ещё раз');
      } finally {
        b.classList.remove('busy');
      }
    };
    scope.addEventListener('click', onClick);
    return () => { scope.removeEventListener('click', onClick); clearTimeout(flashT); };
  };

  // ---------- результат: превью в «телефоне» + кнопки ----------
  ui.resultShare = (axes, { id = 'share', title = 'Покажи друзьям, кто ты' } = {}) => {
    const res = S.core.scoring.result(axes), t = M().type(res.top.id);
    const fx = ['sparkles', 'heart', 'puzzle'];
    return `
      <section class="sec share-sec" id="${id}" style="${ui.qStyle(t.quadra)}">
        <div class="wrap">
          <div class="share" data-share>
            <div class="share-stage reveal" data-anim>
              <span class="share-glow" aria-hidden="true"></span>
              <div class="share-phone"><canvas class="share-canvas" width="1080" height="1920" role="img" aria-label="Картинка для сторис: ${esc(`${t.code} «${t.alias}», ${t.role.toLowerCase()}, совпадение ${res.top.pct} %`)}"></canvas></div>
              ${fx.map((k, i) => `<img class="share-fx share-fx-${i + 1}" src="${ui.emoteSrc(k)}" alt="" aria-hidden="true" width="100" height="100">`).join('')}
            </div>
            <div class="share-side reveal" style="--i:1">
              <p class="eyebrow">Поделиться результатом</p>
              <h2 class="h2 h2-sm"><span class="sv">${esc(title)}</span></h2>
              <p class="lead share-lead">Картинка с${NB}твоим типом готова. Отправь её${NB}— пусть друзья узнают свой тип, а${NB}вы посмотрите, как ладите.</p>
              <div class="seg share-fmt" role="group" aria-label="Формат картинки">
                <button type="button" data-fmt="story" aria-pressed="true">Сторис</button>
                <button type="button" data-fmt="post" aria-pressed="false">Пост</button>
              </div>
              ${ui.shareActions({ text: S.share.text(axes, { withUrl: false }), url: S.share.url(axes), primary: 'Поделиться картинкой' })}
            </div>
          </div>
        </div>
      </section>`;
  };

  ui.mountResultShare = (root, axes) => {
    const box = root.querySelector('[data-share]');
    if (!box) return () => {};
    const canvas = box.querySelector('canvas'), status = box.querySelector('.sk-status');
    const id = S.core.scoring.result(axes).top.id;
    let fmt = 'story';
    const draw = () => {
      try { S.share.render(canvas, axes, fmt); } catch (e) { if (status) status.textContent = 'Не получилось нарисовать картинку'; }
    };
    draw();
    // шрифт сайта, портрет и 3D-символы догружаются — перерисовываем
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
    Promise.all([S.share.portrait(id), S.share.art()]).then(draw);
    const onFmt = e => {
      const f = e.target.closest('[data-fmt]');
      if (!f) return;
      fmt = f.dataset.fmt;
      box.querySelectorAll('[data-fmt]').forEach(b => b.setAttribute('aria-pressed', String(b === f)));
      box.classList.toggle('is-post', fmt === 'post');
      draw();
    };
    box.addEventListener('click', onFmt);
    const off = ui.mountShareActions(box, {
      text: () => S.share.text(axes, { withUrl: false }),
      url: () => S.share.url(axes),
      image: () => S.share.toBlob(canvas),
      name: () => `socio-nik-${id}-${fmt}.png`
    });
    return () => { box.removeEventListener('click', onFmt); off(); };
  };
})(window);
