/* Socio-Nik · квадры (#/quadras, якорь #/quadras#alpha): стопка карточек, как на главной,
   и по секции на квадру — белые и тёмные по очереди, с «Ценят / Чуждо» */
(function (root) {
  const S = root.Socio;
  const V = S.views = S.views || {};
  const ui = S.ui;
  const { esc } = S.dom;
  const NB = '\u00A0';

  const aspects = (list, cls = '') => `<ul class="aspects ${cls}">${list.map(a => `<li>${S.art.symbol(a)}<b>${S.data.aspects[a].short}</b><span>${esc(S.data.aspects[a].name)}</span></li>`).join('')}</ul>`;

  V.quadras = {
    title: () => 'Квадры',
    render: () => `
      <section class="page-top page-head">
        <div class="wrap">
          <p class="eyebrow reveal">Квадры</p>
          <h1 class="h2 reveal"><span class="sv">Квадры</span></h1>
          <p class="lead reveal">Квадра — четыре типа, которые ценят одни и${NB}те${NB}же аспекты информации. В${NB}своей квадре человеку проще всего расслабиться: здесь понятны шутки, темы и${NB}темп.</p>
          <nav class="qnav reveal" aria-label="Квадры">${S.data.quadras.map(q => `<a class="chip" href="#/quadras#${q.id}" style="${ui.qStyle(q.id)}"><i class="qdot" aria-hidden="true"></i>${q.name}</a>`).join('')}</nav>
        </div>
      </section>
      <section class="qs-sec qs-page">${ui.quadraStack()}</section>
      ${S.data.quadras.map((q, i) => {
        const c = (S.content.quadras || {})[q.id] || {};
        const white = i % 2 === 0, theme = white ? 'light' : 'dark';
        const rejected = Object.keys(S.data.aspects).filter(a => !q.values.includes(a));
        return `
        <section class="sec quadra${white ? ' sec-white' : ''}" id="${q.id}" style="${ui.qStyle(q.id)}">
          <div class="wrap">
            <div class="quadra-top">
              <div class="quadra-copy">
                <p class="eyebrow reveal"><i class="qdot" aria-hidden="true"></i>Квадра 0${i + 1}</p>
                <h2 class="h2 reveal">${white ? q.name : `<span class="sv">${q.name}</span>`}</h2>
                <p class="quadra-motto reveal">${esc(c.motto || '')}</p>
                <p class="body reveal">${esc(c.about || '')}</p>
                <div class="tags reveal">${(c.atmosphere || []).map(a => `<span class="chip">${esc(a)}</span>`).join('')}</div>
              </div>
              <div class="quadra-art reveal" data-anim>${S.art.quadraEmblem(q, { cls: 'qe-big' })}</div>
            </div>
            <div class="grid2 gap-top">
              <div class="card reveal"><h3 class="card-title">Ценят</h3>${aspects(q.values)}<p>${esc(c.values || '')}</p></div>
              <div class="card reveal" style="--i:1"><h3 class="card-title">Чуждо</h3>${aspects(rejected, 'muted')}<p>${esc(c.rejects || '')}</p></div>
            </div>
            <div class="trow gap-top">${ui.typesOf(q.id).map(ui.tile).join('')}</div>
          </div>
        </section>`;
      }).join('')}`
  };
})(window);
