// ============================================================
// prime.js  –  Prime Sport Section Carousel
// Pattern: same as fancode.js / willow-live.js
//   • IIFE + strict mode
//   • Skeleton loader on start
//   • Fetches from primevideoindia.json API
//   • IntersectionObserver lazy-load
//   • Card click  →  /prime.html?id=<titleId>
//   • 5-minute auto-refresh
// ============================================================

(function () {
  'use strict';

  var API = 'https://raw.githubusercontent.com/doctor-8trange/tekzya9/refs/heads/main/data/primevideoindia.json';
  var SKELETON_COUNT = 5;

  // ── DOM refs ──────────────────────────────────────────────
  var track      = document.getElementById('primeTrack');
  var arrowLeft  = document.getElementById('primeArrowLeft');
  var arrowRight = document.getElementById('primeArrowRight');

  if (!track) return; // section not on this page

  // ── Helpers identical to prime.html ──────────────────────
  function getId(m)    { return m.titleId || ''; }
  function getTitle(m) {
    return m.title || m.eventTitle ||
      (m.catalogMetadata && m.catalogMetadata.catalog && m.catalogMetadata.catalog.title) ||
      'Untitled';
  }
  function getThumb(m) {
    if (m.images && m.images.boxArtImageFragments && m.images.boxArtImageFragments.mediaCentralUrl)
      return m.images.boxArtImageFragments.mediaCentralUrl;
    if (m.images && m.images.coverImageFragments && m.images.coverImageFragments.mediaCentralUrl)
      return m.images.coverImageFragments.mediaCentralUrl;
    if (m.catalogMetadata && m.catalogMetadata.images && m.catalogMetadata.images.coverImage)
      return m.catalogMetadata.images.coverImage;
    return '';
  }
  function getTime(m) { return (m.liveSchedule && m.liveSchedule.timeBadge) || ''; }

  // ── Skeleton loader ───────────────────────────────────────
  function renderSkeleton() {
    var html = '';
    for (var i = 0; i < SKELETON_COUNT; i++) {
      html +=
        '<div class="prime-skeleton-card">' +
          '<div class="prime-sk-thumb"></div>' +
          '<div class="prime-sk-body">' +
            '<div class="prime-sk-line short"></div>' +
            '<div class="prime-sk-line long"></div>' +
            '<div class="prime-sk-line medium"></div>' +
          '</div>' +
        '</div>';
    }
    track.innerHTML = html;
  }

  // ── Render cards from fetched data ────────────────────────
  function renderCards(channels) {
    if (!channels || !channels.length) {
      track.innerHTML = '<div class="prime-error">No streams available</div>';
      return;
    }

    var html = '';
    channels.forEach(function (m) {
      var id      = getId(m);
      var title   = getTitle(m);
      var thumb   = getThumb(m);
      var time    = getTime(m);
      var isLive  = m._live;

      if (!id) return; // skip entries without id

      var thumbHtml = thumb
        ? '<img src="' + thumb + '" alt="' + title +
          '" loading="lazy" referrerpolicy="no-referrer"' +
          ' onerror="this.style.display=\'none\'">'
        : '<div class="prime-thumb-placeholder">⚡</div>';

      var liveBadge = isLive
        ? '<span class="prime-live-badge">LIVE</span>'
        : '<span class="prime-upcoming-badge">Upcoming</span>';

      var timeLine = (!isLive && time)
        ? '<div class="prime-time-line">' + time + '</div>'
        : '';

      html +=
        '<a class="prime-card' + (isLive ? '' : ' prime-card-upcoming') + '"' +
        ' href="/prime.html?id=' + encodeURIComponent(id) + '"' +
        ' aria-label="' + title + '">' +
          '<div class="prime-thumb">' +
            liveBadge +
            thumbHtml +
            '<div class="prime-thumb-overlay"></div>' +
            '<span class="prime-channel-tag">Prime</span>' +
            '<div class="prime-play-overlay">' +
              '<div class="prime-play-icon">' +
                '<svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="prime-info">' +
            '<h3 class="prime-card-title">' + title + '</h3>' +
            timeLine +
            '<div class="prime-meta">' +
              '<span class="prime-quality">Prime Video</span>' +
              '<span class="prime-watch-label">' + (isLive ? '▶ Watch Live' : '⏰ Upcoming') + '</span>' +
            '</div>' +
          '</div>' +
        '</a>';
    });

    track.innerHTML = html || '<div class="prime-error">No streams available</div>';
    setupArrows();
  }

  // ── Fetch from API ────────────────────────────────────────
  function loadPrimeData() {
    renderSkeleton();

    fetch(API, { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (d) {
        var all = [];
        if (Array.isArray(d.live))     d.live.forEach(function (m)     { m._live = true;  all.push(m); });
        if (Array.isArray(d.upcoming)) d.upcoming.forEach(function (m) { m._live = false; all.push(m); });
        // Live first
        all.sort(function (a, b) { return a._live === b._live ? 0 : a._live ? -1 : 1; });
        renderCards(all);
      })
      .catch(function (err) {
        console.error('[Prime] Fetch error:', err);
        track.innerHTML =
          '<div class="prime-error">⚠️ Failed to load streams<br>' +
          '<small>' + err.message + '</small><br>' +
          '<button onclick="location.reload()">Retry</button></div>';
      });
  }

  // ── Arrow scroll ──────────────────────────────────────────
  function scrollAmount() {
    var card = track.querySelector('.prime-card, .prime-skeleton-card');
    if (!card) return 300;
    var style = getComputedStyle(track);
    var gap   = parseFloat(style.columnGap || style.gap || '20');
    return (card.getBoundingClientRect().width + gap) * 2;
  }

  function setupArrows() {
    if (arrowLeft) {
      arrowLeft.onclick = function (e) {
        e.stopPropagation();
        track.scrollBy({ left: -scrollAmount(), behavior: 'smooth' });
      };
    }
    if (arrowRight) {
      arrowRight.onclick = function (e) {
        e.stopPropagation();
        track.scrollBy({ left: scrollAmount(), behavior: 'smooth' });
      };
    }
    track.onkeydown = function (e) {
      if (e.key === 'ArrowRight') track.scrollBy({ left:  240, behavior: 'smooth' });
      if (e.key === 'ArrowLeft')  track.scrollBy({ left: -240, behavior: 'smooth' });
    };
  }

  // ── IntersectionObserver lazy-load ────────────────────────
  function initLazyLoad() {
    var section = document.getElementById('primeSection');
    if (!section) { loadPrimeData(); return; }

    if (section.getBoundingClientRect().top < window.innerHeight) {
      loadPrimeData();
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          loadPrimeData();
          observer.disconnect();
        }
      });
    }, { rootMargin: '200px' });

    observer.observe(section);
  }

  // ── Auto-refresh every 5 minutes ─────────────────────────
  setInterval(loadPrimeData, 300000);

  // ── Init ──────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLazyLoad);
  } else {
    initLazyLoad();
  }

  console.info('[Sportlink] Prime section initialized — API: ' + API);
})();
