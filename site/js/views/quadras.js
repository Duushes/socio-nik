/* Socio-Nik · квадры (#/quadras, якорь #/quadras#alpha) */
(function (root) {
  const S = root.Socio;
  const V = S.views = S.views || {};
  const ui = S.ui;
  const { esc } = S.dom;

  V.quadras = {
    needs: ['types'],
    title: () => 'Квадры',
    render: () => `
      <section class="sec page-head">
        <div class="wrap">
          <h1 class="title">Четыре компании с общими ценностями.</h1>
          <p class="lead">Квадра — четыре типа, которые ценят одни и те же аспекты информации. В своей квадре человеку проще всего расслабиться: здесь понятны шутки, темы и темп.</p>
          <nav class="qnav" aria-label="Квадры">${S.data.quadras.map(q => `<a href="#/quadras#${q.id}" style="${ui.qStyle(q.id)}"><i class="qdot" aria-hidden="true"></i>${q.name}</a>`).join('')}</nav>
        </div>
      </section>
      ${S.data.quadras.map((q, i) => {
        const c = (S.content.quadras || {})[q.id] || {};
        const rejected = Object.keys(S.data.aspects).filter(a => !q.values.includes(a));
        return `
        <section class="sec quadra${i % 2 ? ' quadra-flip' : ' sec-alt'}" id="${q.id}" style="${ui.qStyle(q.id)}">
          <div class="wrap">
            <div class="quadra-top">
              <div class="quadra-art reveal" data-anim>${S.art.quadraEmblem(q, { cls: 'qe-big' })}</div>
              <div class="quadra-copy">
                <h2 class="title">${q.name}</h2>
                <p class="lead-sm">${esc(c.motto || '')}</p>
                <p class="body">${esc(c.about || '')}</p>
                <div class="tags reveal">${(c.atmosphere || []).map(a => `<span class="chip">${esc(a)}</span>`).join('')}</div>
              </div>
            </div>
            <div class="grid2 gap-top">
              <div class="card reveal"><h3 class="card-title">Ценят</h3>
                <ul class="aspects">${q.values.map(a => `<li>${S.art.symbol(a)}<b>${S.data.aspects[a].short}</b> ${esc(S.data.aspects[a].name)}</li>`).join('')}</ul>
                <p>${esc(c.values || '')}</p></div>
              <div class="card reveal" style="--i:1"><h3 class="card-title">Чуждо</h3>
                <ul class="aspects muted">${rejected.map(a => `<li>${S.art.symbol(a)}<b>${S.data.aspects[a].short}</b> ${esc(S.data.aspects[a].name)}</li>`).join('')}</ul>
                <p>${esc(c.rejects || '')}</p></div>
            </div>
            <div class="trow gap-top">${ui.typesOf(q.id).map(ui.tile).join('')}</div>
          </div>
        </section>`;
      }).join('')}`
  };
})(window);
