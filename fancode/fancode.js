

(function bootFancode() {
  'use strict';

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      bootFancode,
      { once: true }
    );
    return;
  }

  // ---------- CONFIG ----------

  const API_URL =
    'https://sportlink-fancode10.pages.dev/fan.json';

  const SKELETON_COUNT = 6;
  const REFRESH_INTERVAL = 60000;

  // ---------- ELEMENTS ----------

  const track = document.getElementById(
    'fancodeTrack'
  );

  if (
    !track ||
    track.dataset.initialized === 'true'
  ) {
    return;
  }

  track.dataset.initialized = 'true';

  const section = document.getElementById(
    'fancodeSection'
  );

  const rail = track.closest('.live-rail');

  const prevBtn = document.getElementById(
    'fancodeArrowLeft'
  );

  const nextBtn = document.getElementById(
    'fancodeArrowRight'
  );

  const reduced = matchMedia(
    '(prefers-reduced-motion: reduce)'
  );

  // ---------- STATE ----------

  let loaded = false;
  let loading = false;
  let visible = false;
  let refreshTimer = null;
  let renderedCards = null;
  let arrowFrame = 0;
  let opening = false;

  // ---------- HELPERS ----------

  function esc(value) {
    return String(value ?? '').replace(
      /[&<>"']/g,
      character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      })[character]
    );
  }

  function safeUrl(value) {
    try {
      const url = new URL(value);

      return ['http:', 'https:'].includes(
        url.protocol
      ) ? url.href : '';

    } catch {
      return '';
    }
  }

  function getBaseMatchId(value) {
    if (value == null) return '';

    return String(value)
      .split('_')[0]
      .trim();
  }

  function extractMatches(data) {
    if (Array.isArray(data)) {
      return data;
    }

    if (Array.isArray(data?.matches)) {
      return data.matches;
    }

    return [];
  }

  // ---------- STATUS ----------

  function getStatus(match) {
    return String(
      match.status || 'UPCOMING'
    ).toUpperCase();
  }

  function getStatusPriority(status) {
    if (status === 'LIVE') return 0;
    if (status === 'UPCOMING') return 1;

    return 2;
  }

  // ---------- TEAM CAPTION ----------

  function getTeamCaption(match) {
    const teamA =
      match.team_1 ||
      match.team1 ||
      match.teamA;

    const teamB =
      match.team_2 ||
      match.team2 ||
      match.teamB;

    if (teamA && teamB) {
      return `${teamA} VS ${teamB}`;
    }

    const title = String(
      match.title || 'Live Match'
    ).trim();

    const segments = title.split(
      /\s+[-–—|]\s+/
    );

    const matchup = segments.find(
      part => /\s+(?:vs?\.?|versus)\s+/i.test(part)
    );

    const cleaned = matchup || title;

    return cleaned.replace(
      /\s+(?:vs?\.?|versus)\s+/i,
      ' VS '
    );
  }

  // ---------- SECOND CAPTION ----------

  function getSeriesCaption(match) {
    const candidates = [
      match.series,
      match.tournament,
      match.category,
      match.league,
      match.sport
    ];

    for (const value of candidates) {
      if (
        typeof value === 'string' &&
        value.trim()
      ) {
        return value.trim();
      }
    }

    const title = String(
      match.title || ''
    );

    const parts = title.split(
      /\s+[-–—|]\s+/
    );

    if (parts.length > 1) {
      const prefix = parts.find(
        part =>
          !/\s+(?:vs?\.?|versus)\s+/i.test(part)
      );

      if (prefix) {
        return prefix.trim();
      }
    }

    return 'Live Sports';
  }

  // ---------- STREAM RESOLUTION (NEW SCHEMA) ----------
  // New JSON: match.streams = { primary, fancode_cdn,
  // fancode_bd_cdn, ... , backup: {} }
  // Falls back to legacy auto_streams shape if present.

  function getStreamUrl(match) {
    const streams = match.streams;

    if (streams && typeof streams === 'object') {
      // Prefer primary, then any populated CDN field.
      const orderedKeys = [
        'primary',
        'fancode_cdn',
        'fancode_bd_cdn',
        'fancode_np_cdn',
        'fancode_lk_cdn'
      ];

      for (const key of orderedKeys) {
        const value = streams[key];

        if (
          typeof value === 'string' &&
          value
        ) {
          const valid = safeUrl(value);

          if (valid) return valid;
        }
      }

      // Any other string value in streams (except backup)
      for (const [key, value] of Object.entries(streams)) {
        if (
          key === 'backup' ||
          typeof value !== 'string' ||
          !value
        ) continue;

        const valid = safeUrl(value);

        if (valid) return valid;
      }
    }

    // Legacy fallback: auto_streams[LANG].streams["1080p"]
    const legacy = getLegacyStream(match);

    if (legacy) return legacy;

    return '';
  }

  function getLegacyStream(match) {
    const autoStreams = match.auto_streams;

    if (
      !autoStreams ||
      typeof autoStreams !== 'object'
    ) {
      return '';
    }

    const languages = Object.keys(autoStreams);

    if (!languages.length) return '';

    const preferred = String(
      match.language || 'ENGLISH'
    ).toUpperCase();

    let selected = languages.find(
      lang => lang.toUpperCase() === preferred
    );

    if (!selected) {
      selected = languages.find(
        lang => lang.toUpperCase() === 'ENGLISH'
      );
    }

    if (!selected) selected = languages[0];

    const bucket = autoStreams[selected];

    if (!bucket?.streams) return '';

    const url = bucket.streams['1080p'];

    return typeof url === 'string' && safeUrl(url)
      ? safeUrl(url)
      : '';
  }

  // ---------- EXPIRY CHECK (NEW SCHEMA) ----------

  function isExpired(match) {
    // Legacy expiry
    const autoStreams = match.auto_streams;

    if (autoStreams && typeof autoStreams === 'object') {
      const languages = Object.keys(autoStreams);

      for (const lang of languages) {
        const value = autoStreams[lang]?.expires;

        if (!value) continue;

        const expiry = Number(value);

        if (
          !Number.isFinite(expiry) ||
          expiry <= 0
        ) continue;

        const expiryMs = expiry > 1e12
          ? expiry
          : expiry * 1000;

        if (Date.now() >= expiryMs) return true;
      }
    }

    // New schema (if an `expires` field is ever added)
    const direct = match.expires;

    if (direct) {
      const expiry = Number(direct);

      if (Number.isFinite(expiry) && expiry > 0) {
        const expiryMs = expiry > 1e12
          ? expiry
          : expiry * 1000;

        if (Date.now() >= expiryMs) return true;
      }
    }

    return false;
  }

  // ---------- IMAGE ----------

  function getPosters(match) {
    return [...new Set(
      [
        match.image,
        match.src,
        match.poster,
        match.cover_image,
        match.thumbnail
      ]
        .map(safeUrl)
        .filter(Boolean)
    )];
  }

  // ---------- STATUS BADGE ----------

  function renderBadge(status) {
    if (status === 'LIVE') {
      return '<span class="badge">LIVE</span>';
    }

    if (status === 'UPCOMING') {
      return `
        <span
          class="fc-upcoming-icon"
          role="img"
          aria-label="Upcoming match"
          title="Upcoming match"
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M12 22a2.5 2.5 0 0 0 2.5-2.5h-5A2.5 2.5 0 0 0 12 22zm7-6V11a7 7 0 0 0-5-6.7V3a2 2 0 0 0-4 0v1.3A7 7 0 0 0 5 11v5l-2 2v1h18v-1z"/>
          </svg>
        </span>
      `;
    }

    return '';
  }

  // ---------- RENDER CARD ----------

  function renderCard(match) {
    const matchId = getBaseMatchId(
      match.match_id
    );

    const title = String(
      match.title || 'Live Match'
    );

    const teams = getTeamCaption(match);
    const series = getSeriesCaption(match);
    const status = getStatus(match);

    const posters = getPosters(match);

    const posterHTML = posters.length
      ? `
        <img
          src="${esc(posters[0])}"
          alt="${esc(title)}"
          loading="lazy"
          decoding="async"
          data-posters="${esc(JSON.stringify(posters))}"
          data-index="0"
        >
      `
      : `
        <span class="fc-no-poster">
          Poster unavailable
        </span>
      `;

    return `
      <button
        type="button"
        class="card fancode-live-card"
        data-match-id="${esc(matchId)}"
        data-title="${esc(title)}"
        aria-label="${esc(teams + ' — ' + series)}"
      >
        <div class="thumb fancode-thumb">
          ${posterHTML}
          ${renderBadge(status)}
        </div>

        <div class="caption">

          <span
            class="fc-match-title"
            title="${esc(teams)}"
          >
            ${esc(teams)}
          </span>

          <span
            class="fc-series"
            title="${esc(series)}"
          >
            ${esc(series)}
          </span>

        </div>
      </button>
    `;
  }

  // ---------- SKELETON ----------

  function showSkeleton() {
    track.innerHTML = Array.from(
      { length: SKELETON_COUNT },
      () => `
        <div
          class="card fc-skeleton-card"
          aria-hidden="true"
        >
          <div class="thumb fc-skeleton-thumb"></div>

          <div class="caption">
            <div class="fc-skeleton-line"></div>
            <div class="fc-skeleton-line"></div>
          </div>
        </div>
      `
    ).join('');

    scheduleArrows();
  }

  // ---------- SORT MATCHES ----------

  function sortMatches(data) {
    return data
      .filter(match =>
        match &&
        match.match_id != null &&
        (match.title || match.team_1)
      )
      .sort((a, b) => {
        const priority =
          getStatusPriority(getStatus(a)) -
          getStatusPriority(getStatus(b));

        if (priority) return priority;

        const aTime = Date.parse(
          a.startTime
        );

        const bTime = Date.parse(
          b.startTime
        );

        if (
          Number.isFinite(aTime) &&
          Number.isFinite(bTime)
        ) {
          return aTime - bTime;
        }

        return 0;
      });
  }

  // ---------- ARROW POSITION ----------

  function updateArrows() {
    const thumb = track.querySelector(
      '.thumb'
    );

    if (
      !thumb ||
      !prevBtn ||
      !rail
    ) {
      return;
    }

    const top =
      thumb.getBoundingClientRect().height / 2 -
      prevBtn.getBoundingClientRect().height / 2;

    rail.style.setProperty(
      '--fc-arrow-top',
      Math.max(0, top) + 'px'
    );
  }

  function scheduleArrows() {
    if (arrowFrame) return;

    arrowFrame = requestAnimationFrame(
      () => {
        arrowFrame = 0;
        updateArrows();
      }
    );
  }

  // ---------- FETCH ----------

  async function fetchFancodeData() {
    if (loading) return;

    loading = true;
    track.setAttribute('aria-busy', 'true');

    if (!loaded) {
      showSkeleton();
    }

    const controller = new AbortController();

    const timeout = setTimeout(
      () => controller.abort(),
      15000
    );

    try {
      const response = await fetch(
        API_URL,
        {
          cache: 'no-store',
          signal: controller.signal,
          headers: {
            Accept: 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(
          'HTTP ' + response.status
        );
      }

      const data = await response.json();

      const matches = sortMatches(
        extractMatches(data)
      );

      const nextCards = matches.length
        ? matches.map(renderCard).join('')
        : `
          <div class="fc-empty">
            No FanCode matches available.
          </div>
        `;

      if (nextCards !== renderedCards) {
        const oldScroll = track.scrollLeft;

        track.innerHTML = nextCards;
        track.scrollLeft = oldScroll;

        renderedCards = nextCards;
        scheduleArrows();
      }

      loaded = true;

    } catch (error) {
      console.error(
        '[FanCodeLive]',
        error
      );

      if (!loaded) {
        track.innerHTML = `
          <div class="fc-empty">
            Unable to load FanCode matches.

            <button
              type="button"
              class="fc-retry"
            >
              Retry
            </button>
          </div>
        `;
      }

    } finally {
      clearTimeout(timeout);

      loading = false;
      track.setAttribute('aria-busy', 'false');
    }
  }

  // ---------- PLAY ----------

  async function playMatch(matchId, title) {
    if (opening) return;

    if (!matchId) {
      alert('Invalid match ID');
      return;
    }

    opening = true;

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      15000
    );

    try {
      // Fetch a fresh URL on every click.

      const response = await fetch(
        API_URL,
        {
          cache: 'no-store',
          signal: controller.signal
        }
      );

      if (!response.ok) {
        throw new Error(
          'HTTP ' + response.status
        );
      }

      const data = await response.json();
      const allMatches = extractMatches(data);

      const match = allMatches.find(item =>
        getBaseMatchId(item?.match_id) === matchId
      );

      if (!match) {
        alert('Match not found. Please try again.');
        return;
      }

      const streamUrl = getStreamUrl(match);

      if (!streamUrl) {
        alert(
          'Stream is not available for this match.'
        );
        return;
      }

      if (isExpired(match)) {
        alert(
          'Stream link expired. Please try again later.'
        );
        return;
      }

      // Only pass 1080p through if URL actually is m3u8
      // (new schema doesn't expose quality — use primary).

      const params = new URLSearchParams({
        url: streamUrl,
        title: title || match.title || 'Live Match',
        match_id: matchId
      });

      window.location.href =
        'fc-play?' + params.toString();

    } catch (error) {
      console.error(
        '[FanCodePlayback]',
        error
      );

      alert(
        'Failed to load stream. Please try again.'
      );

    } finally {
      clearTimeout(timeout);
      opening = false;
    }
  }

  // ---------- ARROW SCROLL ----------

  function scrollByCard(direction) {
    const card = track.querySelector(
      '.card'
    );

    if (!card) return;

    const gap =
      parseFloat(
        getComputedStyle(track).columnGap
      ) || 0;

    track.scrollBy({
      left: direction * (
        card.offsetWidth + gap
      ),
      behavior: reduced.matches
        ? 'auto'
        : 'smooth'
    });
  }

  prevBtn?.addEventListener(
    'click',
    () => scrollByCard(-1)
  );

  nextBtn?.addEventListener(
    'click',
    () => scrollByCard(1)
  );

  // ---------- CLICK ----------

  track.addEventListener(
    'click',
    event => {
      if (
        event.target.closest('.fc-retry')
      ) {
        fetchFancodeData();
        return;
      }

      const card = event.target.closest(
        '.fancode-live-card'
      );

      if (!card) return;

      playMatch(
        card.dataset.matchId,
        card.dataset.title
      );
    }
  );

  // ---------- IMAGE FALLBACK ----------

  track.addEventListener(
    'error',
    event => {
      const img = event.target;

      if (
        !(img instanceof HTMLImageElement) ||
        !img.matches('.fancode-thumb img')
      ) {
        return;
      }

      let posters = [];

      try {
        posters = JSON.parse(
          img.dataset.posters || '[]'
        );
      } catch (_) {}

      const next =
        Number(img.dataset.index || 0) + 1;

      if (next < posters.length) {
        img.dataset.index = String(next);
        img.src = posters[next];
      } else {
        const fallback = document.createElement(
          'span'
        );

        fallback.className = 'fc-no-poster';
        fallback.textContent = 'Poster unavailable';

        img.replaceWith(fallback);
      }
    },
    true
  );

  // ---------- VISIBLE-ONLY REFRESH ----------

  function stopRefresh() {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }

  function startRefresh() {
    if (
      refreshTimer ||
      !visible ||
      document.hidden
    ) {
      return;
    }

    refreshTimer = setInterval(() => {
      if (
        visible &&
        !document.hidden
      ) {
        fetchFancodeData();
      }
    }, REFRESH_INTERVAL);
  }

  function handleVisibility(isVisible) {
    visible = isVisible;

    if (
      visible &&
      !document.hidden
    ) {
      if (!loaded) {
        fetchFancodeData();
      }

      startRefresh();
      scheduleArrows();

    } else {
      stopRefresh();
    }
  }

  // ---------- RESIZE ----------

  if ('ResizeObserver' in window) {
    new ResizeObserver(
      scheduleArrows
    ).observe(track);
  }

  window.addEventListener(
    'resize',
    scheduleArrows,
    { passive: true }
  );

  // ---------- LAZY LOADING ----------

  if (
    'IntersectionObserver' in window &&
    section
  ) {
    const observer = new IntersectionObserver(
      entries => {
        handleVisibility(
          entries[0].isIntersecting
        );
      },
      {
        rootMargin: '300px 0px',
        threshold: 0
      }
    );

    observer.observe(section);

  } else {
    handleVisibility(true);
  }

  // ---------- VISIBILITY ----------

  document.addEventListener(
    'visibilitychange',
    () => {
      if (document.hidden) {
        stopRefresh();
      } else if (visible) {
        fetchFancodeData();
        startRefresh();
      }
    }
  );

  // ---------- PUBLIC HELPER ----------

  window.FanCodeLive = {
    reload: fetchFancodeData
  };

})();
