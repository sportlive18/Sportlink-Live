/* world-sports/world-sports.js
   - Reads your real JSON shape: title, teams, league, status,
     viewers, thumbnail, server_urls[], match_id
   - Splits "Pakistan vs Sri Lanka" into team1 / team2
   - Passes ALL server URLs + HLS flag to player.html
*/
(function () {
  'use strict';

  var API_URL     = '/world-sports/world-sports.json';
  var PLAYER_PATH = '/world-sports/player.html';

  var track      = document.getElementById('worldSportsTrack');
  var arrowLeft  = document.getElementById('worldSportsArrowLeft');
  var arrowRight = document.getElementById('worldSportsArrowRight');
  var section    = document.getElementById('worldSportsSection');

  if (!track) { console.warn('[WS] #worldSportsTrack missing'); return; }
  console.log('[WS] init');

  /* ---------- tiny helpers ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  /* "Pakistan vs Sri Lanka" → {team1:"Pakistan", team2:"Sri Lanka"}
     "South Africa vs Australia 3rd Test" → {team1:"South Africa", team2:"Australia"} */
  function splitTeams(m) {
    var raw = m.teams || m.title || '';
    var parts = raw.split(/\s+vs\.?\s+/i);
    var a = parts[0] ? parts[0].trim() : '';
    var b = parts[1] ? parts[1].trim() : '';
    b = b.replace(/\s+\d+(?:st|nd|rd|th)\s+(?:unofficial\s+)?(?:test|odi|t20i?|match|fixture|day\s*\d+).*/i, '').trim();
    return { team1: a, team2: b };
  }

  /* Build /world-sports/player.html?servers=[…]&title=… */
  function buildPlayerUrl(m) {
    var teams    = splitTeams(m);
    var servers  = (m.server_urls && m.server_urls.length) ? m.server_urls
                 : (m.stream ? [m.stream] : []);

    var p = new URLSearchParams();
    p.set('servers', JSON.stringify(servers));
    p.set('title',   m.title    || 'Live Match');
    p.set('league',  m.league   || 'World Sports');
    p.set('team1',   teams.team1);
    p.set('team2',   teams.team2);
    p.set('date',    m.date     || '');
    p.set('time',    m.time     || '');
    p.set('venue',   m.venue    || '');
    p.set('viewers', m.viewers  || '');
    return PLAYER_PATH + '?' + p.toString();
  }

  /* ---------- skeleton ---------- */
  function renderSkeletons(n) {
    var out = '';
    for (var i = 0; i < (n || 6); i++) {
      out += '<div class="ws-skeleton-card"><div class="ws-skeleton-thumb"></div><div class="ws-skeleton-info"><div class="ws-skeleton-line short"></div><div class="ws-skeleton-line long"></div></div></div>';
    }
    track.innerHTML = out;
  }

  /* ---------- cards ---------- */
  function renderMatches(matches) {
    if (!matches || !matches.length) {
      track.innerHTML = '<div style="color:rgba(255,255,255,.3);padding:2rem;text-align:center;width:100%">No matches available</div>';
      return;
    }

    // Sort: live → upcoming → completed
    var order = { live: 0, upcoming: 1, completed: 2, finished: 2 };
    matches.sort(function (a, b) {
      return (order[(a.status || '').toLowerCase()] || 9) -
             (order[(b.status || '').toLowerCase()] || 9);
    });

    var out = '';
    matches.forEach(function (m) {
      var status     = (m.status || 'upcoming').toLowerCase();
      var statusText = status.charAt(0).toUpperCase() + status.slice(1);
      var title      = m.title || m.teams || 'Match';
      var league     = m.league || 'World Sports';
      var viewers    = m.viewers ? (m.viewers + ' ' + (m.viewers_type || 'watching')) : '';
      var thumb      = m.thumbnail || '';

      out +=
        '<a class="world-sports-card" href="' + esc(buildPlayerUrl(m)) + '" data-id="' + esc(m.match_id || '') + '">' +
          '<div class="world-sports-thumb">' +
            (thumb
              ? '<img src="' + esc(thumb) + '" alt="' + esc(title) + '" loading="lazy" ' +
                'onerror="this.onerror=null;this.style.display=\'none\'" />'
              : '') +
            '<span class="world-sports-status ' + esc(status) + '">' + esc(statusText) + '</span>' +
            '<span class="ws-card-play">▶</span>' +
          '</div>' +
          '<div class="world-sports-info">' +
            '<div class="world-sports-league">' + esc(league) + '</div>' +
            '<div class="world-sports-title-text">' + esc(title) + '</div>' +
            (viewers
              ? '<div class="world-sports-meta"><span class="world-sports-time">👁 ' + esc(viewers) + '</span></div>'
              : '') +
          '</div>' +
        '</a>';
    });

    track.innerHTML = out;
    requestAnimationFrame(updateArrows);
  }

  /* ---------- fetch ---------- */
  function load() {
    renderSkeletons(6);
    fetch(API_URL, { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (data) {
        var list = (data && data.matches) || [];
        console.log('[WS] loaded', list.length, 'matches');
        renderMatches(list.slice(0, 30));
      })
      .catch(function (err) {
        console.error('[WS] fetch failed:', err);
        track.innerHTML = '<div style="color:rgba(255,255,255,.3);padding:2rem;text-align:center;width:100%">Failed to load matches</div>';
      });
  }

  /* ---------- arrows ---------- */
  function scrollAmount() {
    var card = track.querySelector('.world-sports-card, .ws-skeleton-card');
    if (!card) return 320;
    var gap = parseFloat(getComputedStyle(track).gap || '16') || 16;
    return (card.getBoundingClientRect().width + gap) * 2;
  }
  function updateArrows() {
    if (!arrowLeft || !arrowRight) return;
    var max = track.scrollWidth - track.clientWidth;
    arrowLeft.classList.toggle('is-disabled', track.scrollLeft <= 2);
    arrowRight.classList.toggle('is-disabled', track.scrollLeft >= max - 2);
  }
  if (arrowLeft && !arrowLeft.dataset.bound) {
    arrowLeft.dataset.bound = '1';
    arrowLeft.addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation();
      track.scrollBy({ left: -scrollAmount(), behavior: 'smooth' });
    });
  }
  if (arrowRight && !arrowRight.dataset.bound) {
    arrowRight.dataset.bound = '1';
    arrowRight.addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation();
      track.scrollBy({ left: scrollAmount(), behavior: 'smooth' });
    });
  }
  if (!track.dataset.bound) {
    track.dataset.bound = '1';
    track.addEventListener('scroll', updateArrows, { passive: true });
    window.addEventListener('resize', updateArrows);
  }

  /* ---------- init (lazy) ---------- */
  if (!section) { load(); }
  else if ('IntersectionObserver' in window) {
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { obs.disconnect(); load(); }
      });
    }, { rootMargin: '300px' });
    obs.observe(section);
  } else { load(); }
})();
