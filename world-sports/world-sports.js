/* world-sports/world-sports.js
   - Renders cards into #worldSportsTrack
   - Fetches /world-sports/world-sports.json, falls back to inline data on error
   - Builds absolute /world-sports/player.html URLs from match data
   - Wires arrows + keyboard + touch
*/
(function () {
  'use strict';

  var API_URL        = '/world-sports/world-sports.json';
  var PLAYER_PATH    = '/world-sports/player.html';

  var track          = document.getElementById('worldSportsTrack');
  var arrowLeft      = document.getElementById('worldSportsArrowLeft');
  var arrowRight     = document.getElementById('worldSportsArrowRight');
  var section        = document.getElementById('worldSportsSection');

  if (!track) {
    console.warn('[World Sports] #worldSportsTrack not found — aborting.');
    return;
  }

  console.log('[World Sports] init');

  /* ---------------------------------------------------------
     Fallback data (used if JSON fetch fails)
  --------------------------------------------------------- */
  var FALLBACK = [
    {
      match_id: 'epl-mun-che',
      title: 'Premier League · Matchday 10',
      league: 'Premier League',
      team1: 'Man United', team2: 'Chelsea',
      team1_logo: 'https://flagpedia.net/data/flags/w1160/gb-eng.webp',
      team2_logo: 'https://flagpedia.net/data/flags/w1160/gb-eng.webp',
      thumbnail: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=800&q=80',
      date: 'Oct 27, 2026', time: '8:00 PM IST', venue: 'Old Trafford',
      status: 'live', status_display: 'Live', viewers: '12.4K',
      stream: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      is_iframe: false
    },
    {
      match_id: 'laliga-rma-bar',
      title: 'La Liga · El Clásico',
      league: 'La Liga',
      team1: 'Real Madrid', team2: 'Barcelona',
      team1_logo: 'https://flagpedia.net/data/flags/w1160/es.webp',
      team2_logo: 'https://flagpedia.net/data/flags/w1160/es.webp',
      thumbnail: 'https://images.unsplash.com/photo-1517927033932-b3d18e61fb3a?w=800&q=80',
      date: 'Oct 27, 2026', time: '10:30 PM IST', venue: 'Santiago Bernabéu',
      status: 'live', status_display: 'Live', viewers: '9.1K',
      stream: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      is_iframe: false
    },
    {
      match_id: 'ucl-bay-psg',
      title: 'UEFA Champions League · Group Stage',
      league: 'UCL',
      team1: 'Bayern Munich', team2: 'Paris SG',
      team1_logo: 'https://flagpedia.net/data/flags/w1160/de.webp',
      team2_logo: 'https://flagpedia.net/data/flags/w1160/fr.webp',
      thumbnail: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&q=80',
      date: 'Oct 28, 2026', time: '1:00 AM IST', venue: 'Allianz Arena',
      status: 'upcoming', status_display: 'Upcoming', viewers: '',
      stream: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      is_iframe: false
    },
    {
      match_id: 'nba-lal-bos',
      title: 'NBA · Regular Season',
      league: 'NBA',
      team1: 'LA Lakers', team2: 'Boston Celtics',
      team1_logo: 'https://flagpedia.net/data/flags/w1160/us.webp',
      team2_logo: 'https://flagpedia.net/data/flags/w1160/us.webp',
      thumbnail: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&q=80',
      date: 'Oct 27, 2026', time: '7:30 PM IST', venue: 'Crypto.com Arena',
      status: 'live', status_display: 'Live', viewers: '6.8K',
      stream: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      is_iframe: false
    },
    {
      match_id: 'f1-monaco',
      title: 'Formula 1 · Monaco GP',
      league: 'F1',
      team1: 'Verstappen', team2: 'Hamilton',
      team1_logo: 'https://flagpedia.net/data/flags/w1160/nl.webp',
      team2_logo: 'https://flagpedia.net/data/flags/w1160/gb-eng.webp',
      thumbnail: 'https://images.unsplash.com/photo-1504707748692-419802cf939d?w=800&q=80',
      date: 'Oct 29, 2026', time: '6:30 PM IST', venue: 'Circuit de Monaco',
      status: 'upcoming', status_display: 'Upcoming', viewers: '',
      stream: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      is_iframe: false
    },
    {
      match_id: 'boxing-fury-josh',
      title: 'Heavyweight Championship',
      league: 'Boxing',
      team1: 'Tyson Fury', team2: 'Anthony Joshua',
      team1_logo: 'https://flagpedia.net/data/flags/w1160/gb-eng.webp',
      team2_logo: 'https://flagpedia.net/data/flags/w1160/gb-eng.webp',
      thumbnail: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=800&q=80',
      date: 'Oct 30, 2026', time: '11:00 PM IST', venue: 'Wembley Stadium',
      status: 'upcoming', status_display: 'Upcoming', viewers: '',
      stream: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      is_iframe: false
    }
  ];

  /* ---------------------------------------------------------
     Helpers
  --------------------------------------------------------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c];
    });
  }

  var FALLBACK_IMG =
    'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 ' +
    'width=%22480%22 height=%22270%22%3E%3Crect fill=%22%231a1c1e%22 ' +
    'width=%22480%22 height=%22270%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 ' +
    'font-family=%22Inter,sans-serif%22 font-size=%2220%22 fill=%22%23333%22 ' +
    'text-anchor=%22middle%22 dy=%22.3em%22%3ENo Image%3C/text%3E%3C/svg%3E';

  function buildPlayerUrl(m) {
    if (m.page_url) return m.page_url; // explicit override wins

    var p = new URLSearchParams();
    p.set('stream', m.stream   || '');
    p.set('iframe', m.is_iframe ? '1' : '0');
    p.set('title',  m.title    || 'Live Match');
    p.set('league', m.league   || 'World Sports');
    p.set('team1',  m.team1    || 'Team A');
    p.set('team2',  m.team2    || 'Team B');
    p.set('logo1',  m.team1_logo || '');
    p.set('logo2',  m.team2_logo || '');
    p.set('date',   m.date     || '');
    p.set('time',   m.time     || '');
    p.set('venue',  m.venue    || '');
    return PLAYER_PATH + '?' + p.toString();
  }

  /* ---------------------------------------------------------
     Render
  --------------------------------------------------------- */
  function renderSkeletons(n) {
    var out = '';
    for (var i = 0; i < (n || 6); i++) {
      out +=
        '<div class="ws-skeleton-card">' +
          '<div class="ws-skeleton-thumb"></div>' +
          '<div class="ws-skeleton-info">' +
            '<div class="ws-skeleton-line short"></div>' +
            '<div class="ws-skeleton-line long"></div>' +
            '<div class="ws-skeleton-meta">' +
              '<div class="ws-skeleton-badge"></div>' +
              '<div class="ws-skeleton-time"></div>' +
            '</div>' +
          '</div>' +
        '</div>';
    }
    track.innerHTML = out;
  }

  function renderMatches(matches) {
    if (!matches || !matches.length) {
      track.innerHTML =
        '<div style="color:rgba(255,255,255,.3);padding:2rem;text-align:center;width:100%">' +
          'No matches available' +
        '</div>';
      return;
    }

    var out = '';
    matches.forEach(function (m) {
      var status  = (m.status || 'upcoming').toLowerCase();
      var label   = m.status_display || m.status || 'Upcoming';
      var title   = m.title || m.teams || 'Match';
      var league  = m.league || 'World Sports';
      var date    = [m.date, m.time].filter(Boolean).join(' · ');
      var viewers = m.viewers ? m.viewers + ' watching' : '';

      out +=
        '<a class="world-sports-card" href="' + esc(buildPlayerUrl(m)) + '" data-id="' + esc(m.match_id || '') + '">' +
          '<div class="world-sports-thumb">' +
            '<img src="' + esc(m.thumbnail || '') + '" alt="' + esc(title) + '" loading="lazy" ' +
                 'onerror="this.onerror=null;this.src=\'' + FALLBACK_IMG + '\'" />' +
            '<span class="world-sports-status ' + esc(status) + '">' + esc(label) + '</span>' +
          '</div>' +
          '<div class="world-sports-info">' +
            '<div class="world-sports-league">' + esc(league) + '</div>' +
            '<div class="world-sports-title-text">' + esc(title) + '</div>' +
            '<div class="world-sports-meta"><span class="world-sports-time">' + esc(date) + '</span></div>' +
            (viewers ? '<div class="world-sports-viewers">' + esc(viewers) + '</div>' : '') +
          '</div>' +
        '</a>';
    });
    track.innerHTML = out;
  }

  /* ---------------------------------------------------------
     Fetch
  --------------------------------------------------------- */
  function load() {
    renderSkeletons(6);

    fetch(API_URL, { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (data) {
        var list = (data && data.matches) || [];
        console.log('[World Sports] loaded ' + list.length + ' matches from JSON');
        renderMatches(list.length ? list.slice(0, 20) : FALLBACK);
      })
      .catch(function (err) {
        console.warn('[World Sports] JSON fetch failed (' + err.message + ') — using fallback data');
        renderMatches(FALLBACK);
      })
      .then(function () {
        // Recompute arrow state after render
        requestAnimationFrame(function () { updateArrows(); });
      });
  }

  /* ---------------------------------------------------------
     Carousel
  --------------------------------------------------------- */
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

  /* ---------------------------------------------------------
     Init (lazy — only when section scrolls into view)
  --------------------------------------------------------- */
  if (!section) {
    console.warn('[World Sports] #worldSportsSection not found — loading immediately');
    load();
  } else if ('IntersectionObserver' in window) {
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          obs.disconnect();
          load();
        }
      });
    }, { rootMargin: '300px' });
    obs.observe(section);
  } else {
    load();
  }
})();
