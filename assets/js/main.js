/* =========================================================
   O.C.K — header / main visual / reveals / counters / carousels
   ========================================================= */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------------------------------------------------------
     Header
     --------------------------------------------------------- */
  var menubtn = $('.Menubtn');
  var panel   = $('.Header__main');
  var pagetop = $('.pagetop');

  if (menubtn && panel) {
    menubtn.addEventListener('click', function () {
      var open = panel.classList.toggle('is-open');
      menubtn.classList.toggle('is-open', open);
      menubtn.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
    });
    panel.addEventListener('click', function (e) {
      if (e.target.closest('a') && panel.classList.contains('is-open')) menubtn.click();
    });
  }

  if (pagetop) {
    pagetop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    });
  }

  var progress = $('.Progress');
  function onScroll() {
    var y = window.pageYOffset;
    if (pagetop) pagetop.classList.toggle('is-show', y > 600);
    if (progress) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, y / max) : 0) + ')';
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  onScroll();

  /* ---------------------------------------------------------
     Section titles — wrap the Japanese line in a mask so it
     rises from below when the red rule finishes drawing.
     --------------------------------------------------------- */
  $$('.common_title').forEach(function (t) {
    if ($('.ttl-in', t)) return;
    var label = $('span', t);
    var frag = document.createDocumentFragment();
    Array.prototype.slice.call(t.childNodes).forEach(function (n) {
      if (n === label) return;
      frag.appendChild(n);
    });
    if (!frag.childNodes.length) return;
    var outer = document.createElement('span');
    outer.className = 'ttl-in';
    var inner = document.createElement('span');
    inner.appendChild(frag);
    outer.appendChild(inner);
    t.appendChild(outer);
  });

  /* ---------------------------------------------------------
     Reveal — .rv / .rv-up / .rv-img / .cover
     data-delay adds a stagger in ms; children of [data-stagger]
     are delayed automatically.
     --------------------------------------------------------- */
  $$('[data-stagger]').forEach(function (group) {
    var step = parseInt(group.getAttribute('data-stagger'), 10) || 110;
    $$('.rv, .rv-up, .rv-img, .cover', group).forEach(function (el, i) {
      if (!el.getAttribute('data-delay')) el.setAttribute('data-delay', String(i * step));
    });
  });

  var revealables = $$('.rv, .rv-up, .rv-img, .cover, .wave, .common_title, .ba, .cut');

  function show(el) {
    if (el.classList.contains('is-in')) return;
    var d = parseInt(el.getAttribute('data-delay'), 10) || 0;
    if (d) {
      window.setTimeout(function () { el.classList.add('is-in'); }, d);
    } else {
      el.classList.add('is-in');
    }
    if (el.hasAttribute('data-count')) countUp(el);
    $$('[data-count]', el).forEach(countUp);
  }

  if (reduce) {
    revealables.forEach(function (el) { el.classList.add('is-in'); });
    $$('[data-count]').forEach(function (el) { el.textContent = el.getAttribute('data-count'); });
  } else {
    // Scroll-driven rather than IntersectionObserver: an observer silently
    // failed to fire for the gallery tiles, leaving them clipped to zero width
    // forever. A geometry check on scroll can't get stuck in that state.
    var pending = revealables.slice();
    var rTicking = false;

    function sweep() {
      rTicking = false;
      if (!pending.length) return;
      var vh = window.innerHeight;
      var line = vh * 0.88;              // reveal once the top edge crosses 88% of the viewport
      var still = [];
      for (var i = 0; i < pending.length; i++) {
        var el = pending[i];
        var r = el.getBoundingClientRect();
        // r.top < line covers elements entering from below;
        // r.bottom > 0 covers anything already scrolled past on load or on a deep link
        if (r.top < line && r.bottom > 0) { show(el); } else if (r.top < 0) { show(el); } else { still.push(el); }
      }
      pending = still;
    }

    function queueSweep() {
      if (rTicking) return;
      rTicking = true;
      requestAnimationFrame(sweep);
    }

    window.addEventListener('scroll', queueSweep, { passive: true });
    window.addEventListener('resize', queueSweep, { passive: true });
    window.addEventListener('load', sweep);
    sweep();

    // images finishing late can change the layout under us
    window.setTimeout(sweep, 600);
    window.setTimeout(sweep, 2000);
  }

  /* ---------------------------------------------------------
     Count-up
     --------------------------------------------------------- */
  function countUp(el) {
    if (el.dataset.counted) return;
    el.dataset.counted = '1';
    var target = parseFloat(el.getAttribute('data-count'));
    if (isNaN(target)) return;
    if (reduce) { el.textContent = String(target); return; }
    var dur = parseInt(el.getAttribute('data-count-dur'), 10) || 1400;
    var dec = (String(target).split('.')[1] || '').length;
    var t0 = null;
    function frame(t) {
      if (t0 === null) t0 = t;
      var p = Math.min(1, (t - t0) / dur);
      var e = 1 - Math.pow(1 - p, 3);
      el.textContent = (target * e).toFixed(dec);
      if (p < 1) requestAnimationFrame(frame);
      else el.textContent = String(target);
    }
    requestAnimationFrame(frame);
  }

  /* ---------------------------------------------------------
     Main visual
     --------------------------------------------------------- */
  var mv = $('#mainv');
  if (mv) {
    var slides  = $$('.slide > li', mv);
    var dotWrap = $('.dots', mv);
    var toggle  = $('.toggle', mv);
    var cur = 0, timer = null, paused = false, DUR = 6800;

    requestAnimationFrame(function () { mv.classList.add('is-ready'); });

    if (slides.length) {
      slides.forEach(function (_, i) {
        var b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('aria-label', (i + 1) + '枚目のスライドを表示');
        b.addEventListener('click', function () { go(i); });
        dotWrap.appendChild(b);
      });
      var dots = $$('button', dotWrap);

      function render() {
        slides.forEach(function (s, i) {
          s.classList.toggle('is-active', i === cur);
          s.setAttribute('aria-hidden', String(i !== cur));
        });
        dots.forEach(function (d, i) { d.classList.toggle('is-active', i === cur); });
      }
      function go(i) { cur = (i + slides.length) % slides.length; render(); restart(); }
      function restart() {
        window.clearInterval(timer);
        if (reduce || paused || slides.length < 2) return;
        timer = window.setInterval(function () { go(cur + 1); }, DUR);
      }

      $('.prev', mv).addEventListener('click', function () { go(cur - 1); });
      $('.next', mv).addEventListener('click', function () { go(cur + 1); });
      if (toggle) {
        toggle.addEventListener('click', function () {
          paused = !paused;
          toggle.classList.toggle('is-paused', paused);
          toggle.setAttribute('aria-label', paused ? 'スライドを再生' : 'スライドを停止');
          restart();
        });
      }
      render();
      restart();
    }
  }

  /* ---------------------------------------------------------
     Carousels
     --------------------------------------------------------- */
  $$('.carousel').forEach(function (root) {
    var viewport = $('.carousel__viewport', root);
    var track    = $('.carousel__track', root);
    var items    = track ? Array.prototype.slice.call(track.children) : [];
    var prev     = $('.carousel__btn--prev', root);
    var next     = $('.carousel__btn--next', root);
    var dotWrap  = $('.carousel__dots', root);
    if (!track || !items.length) return;

    var page = 0;

    function metrics() {
      var w   = items[0].getBoundingClientRect().width;
      var cs  = getComputedStyle(track);
      var gap = parseFloat(cs.columnGap || cs.gap) || 0;
      var pv  = Math.max(1, Math.round((viewport.clientWidth + gap) / (w + gap)));
      return { w: w, gap: gap, pv: pv, pages: Math.max(1, Math.ceil(items.length / pv)) };
    }

    function render() {
      var m = metrics();
      page = Math.min(page, m.pages - 1);
      var max = Math.max(0, track.scrollWidth - viewport.clientWidth);
      track.style.transform = 'translate3d(' + -Math.min(page * m.pv * (m.w + m.gap), max) + 'px,0,0)';
      if (prev) prev.disabled = page === 0;
      if (next) next.disabled = page >= m.pages - 1;
      if (dotWrap) {
        if (dotWrap.children.length !== m.pages) {
          dotWrap.innerHTML = '';
          for (var i = 0; i < m.pages; i++) {
            var b = document.createElement('button');
            b.type = 'button';
            b.setAttribute('aria-label', (i + 1) + 'ページ目を表示');
            (function (n) { b.addEventListener('click', function () { page = n; render(); }); })(i);
            dotWrap.appendChild(b);
          }
        }
        Array.prototype.forEach.call(dotWrap.children, function (d, i) {
          d.classList.toggle('is-active', i === page);
        });
      }
    }

    if (prev) prev.addEventListener('click', function () { page--; render(); });
    if (next) next.addEventListener('click', function () { page++; render(); });

    var rt;
    window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(render, 160); });
    window.addEventListener('load', render);
    render();
  });

  /* ---------------------------------------------------------
     Marquee — duplicate the strip so the loop is seamless
     --------------------------------------------------------- */
  $$('.marquee__track').forEach(function (track) {
    track.innerHTML += track.innerHTML;
  });

  /* ---------------------------------------------------------
     Parallax on the main visual banner
     --------------------------------------------------------- */
  var parallax = $$('[data-parallax]');
  if (parallax.length && !reduce) {
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var y = window.pageYOffset;
        parallax.forEach(function (el) {
          var k = parseFloat(el.getAttribute('data-parallax')) || 0.12;
          el.style.transform = 'translate3d(0,' + (y * k).toFixed(1) + 'px,0)';
        });
        ticking = false;
      });
    }, { passive: true });
  }

  /* ---------------------------------------------------------
     Statement drift — the sentence eases upward as it crosses
     the viewport, so the wipe lands on a moving surface.
     --------------------------------------------------------- */
  var drift = $$('[data-drift]');
  if (drift.length && !reduce) {
    var dTicking = false;
    var runDrift = function () {
      var vh = window.innerHeight;
      drift.forEach(function (el) {
        // getBoundingClientRect() reports the position we already shifted it to,
        // so subtract the last offset to read the element's resting position —
        // otherwise the drift feeds back on itself and settles instead of tracking.
        var applied = parseFloat(el.dataset.driftY || '0');
        var r = el.getBoundingClientRect();
        var top = r.top - applied;

        if (top + r.height < 0 || top > vh) {
          // off screen: drop back to rest so a resize or a jump-scroll can't
          // strand it at whatever offset it held on the way out
          if (applied !== 0) { el.style.transform = ''; el.dataset.driftY = '0'; }
          return;
        }

        var k = parseFloat(el.getAttribute('data-drift')) || 40;
        var p = (top + r.height / 2 - vh / 2) / vh;
        p = Math.max(-0.5, Math.min(0.5, p));
        // store the rounded value, not the raw one — the browser applies the
        // rounded transform, so anything else makes `applied` disagree with it
        var y = (p * k).toFixed(1);
        el.dataset.driftY = y;
        el.style.transform = 'translate3d(0,' + y + 'px,0)';
      });
      dTicking = false;
    };
    window.addEventListener('scroll', function () {
      if (dTicking) return;
      dTicking = true;
      requestAnimationFrame(runDrift);
    }, { passive: true });
    runDrift();
  }

  /* ---------------------------------------------------------
     Opening
     --------------------------------------------------------- */
  var opening = $('.Opening');
  if (opening) {
    if (!document.documentElement.classList.contains('is-opening')) {
      opening.parentNode.removeChild(opening);
    } else {
      var closed = false;
      var closeOpening = function () {
        if (closed) return;
        closed = true;
        opening.classList.add('is-out');
        window.setTimeout(function () {
          document.documentElement.classList.remove('is-opening');
          if (opening.parentNode) opening.parentNode.removeChild(opening);
        }, 1150);
      };
      window.setTimeout(closeOpening, 1950);
      /* クリック / Esc で読み飛ばせるようにする */
      opening.addEventListener('click', closeOpening);
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeOpening();
      });
    }
  }

  /* ---------------------------------------------------------
     お問い合わせフォーム（メールソフトで送信）
     data-mailto に指定した宛先に、入力内容を本文にして送る
     --------------------------------------------------------- */
  var form = $('form[data-mailto]');
  if (form) {
    var LABELS = {
      type:  'お問い合わせ種別',
      org:   '施設名・法人名',
      name:  'ご担当者名',
      tel:   'お電話番号',
      email: 'メールアドレス',
      meals: '1日あたりの食数（目安）',
      body:  'お問い合わせ内容'
    };
    var ORDER = ['type', 'org', 'name', 'tel', 'email', 'meals', 'body'];

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (typeof form.reportValidity === 'function' && !form.reportValidity()) return;

      var to = form.getAttribute('data-mailto');
      var data = new FormData(form);
      var type = (data.get('type') || 'お問い合わせ') + '';
      var org = (data.get('org') || '') + '';
      var subject = '【お問い合わせ】' + type + (org ? '／' + org : '');

      var lines = ['合同会社O.C.K 御中', '', 'ウェブサイトのお問い合わせフォームより送信いたします。', ''];
      ORDER.forEach(function (key) {
        var val = ((data.get(key) || '') + '').trim();
        if (!val) return;
        lines.push('■ ' + LABELS[key]);
        lines.push(val);
        lines.push('');
      });
      lines.push('----------------------------------------');
      lines.push('送信元：' + window.location.href);

      var href = 'mailto:' + to +
        '?subject=' + encodeURIComponent(subject) +
        '&body=' + encodeURIComponent(lines.join('\n'));

      var note = $('#form-sent');
      if (note) note.hidden = false;
      window.location.href = href;
    });
  }
})();
