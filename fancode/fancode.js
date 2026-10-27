
// fancode.js - FanCode Section (1080p ONLY)

(function () {
  'use strict';

  // CONFIGURATION
  const API_URL = 'https://sportlink-fancode10.pages.dev/fan.json';
  const SKELETON_COUNT = 6;

  // DOM ELEMENTS
  const track = document.getElementById('fancodeTrack');
  const arrowLeft = document.getElementById('fancodeArrowLeft');
  const arrowRight = document.getElementById('fancodeArrowRight');

  // STATE
  let isLoading = false;
  let matches = [];

  // SECURITY: ESCAPE HTML
  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));
  }

  // VALIDATE URL
  function safeUrl(value) {
    try {
      const url = new URL(value);
      return ['https:', 'http:'].includes(url.protocol)
        ? url.href
        : '';
    } catch {
      return '';
    }
  }

  // SKELETON CARDS
  function createSkeletonCards(count) {
    let html = '';

    for (let i = 0; i < count; i++) {
      html += `
        <div class="fancode-card fc-skeleton-card">
          <div class="fc-skeleton-thumb"></div>
          <div class="fc-skeleton-info">
            <div class="fc-skeleton-line short"></div>
            <div class="fc-skeleton-line medium"></div>
            <div class="fc-skeleton-teams">
              <div class="fc-skeleton-team-block">
                <div class="fc-skeleton-flag"></div>
                <div class="fc-skeleton-name"></div>
              </div>
              <span class="fc-skeleton-vs">VS</span>
              <div class="fc-skeleton-team-block">
                <div class="fc-skeleton-flag"></div>
                <div class="fc-skeleton-name"></div>
              </div>
            </div>
            <div class="fc-skeleton-meta">
              <div class="fc-skeleton-badge"></div>
              <div class="fc-skeleton-time"></div>
            </div>
          </div>
        </div>
      `;
    }

    return html;
  }

  // MATCH ID
  function getBaseMatchId(matchId) {
    if (!matchId) return '';
    return String(matchId).split('_')[0];
  }

  // GET MATCHES FROM NEW JSON
  function extractMatches(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.matches)) return data.matches;
    return [];
  }

  // GET LANGUAGE STREAM OBJECT
  function getLanguageStreams(match) {
    const autoStreams = match?.auto_streams;

    if (!autoStreams || typeof autoStreams !== 'object') {
      return null;
    }

    const languages = Object.keys(autoStreams);

    if (!languages.length) return null;

    // Prioritize match language
    const preferredLanguage = String(
      match.language || 'ENGLISH'
    ).toUpperCase();

    let selectedLanguage = languages.find(
      lang => lang.toUpperCase() === preferredLanguage
    );

    // Otherwise prefer English
    if (!selectedLanguage) {
      selectedLanguage = languages.find(
        lang => lang.toUpperCase() === 'ENGLISH'
      );
    }

    // Otherwise use first available language
    if (!selectedLanguage) {
      selectedLanguage = languages[0];
    }

    return autoStreams[selectedLanguage]?.streams || null;
  }

  // ONLY 1080P STREAM
  function get1080pStream(match) {
    const streams = getLanguageStreams(match);

    if (!streams) return '';

    // STRICT 1080P ONLY
    const streamUrl = streams['1080p'];

    if (!streamUrl) return '';

    const validUrl = safeUrl(streamUrl);

    if (!validUrl) return '';

    try {
      const url = new URL(validUrl);

      if (!url.pathname.toLowerCase().endsWith('.m3u8')) {
        return '';
      }

      return validUrl;
    } catch {
      return '';
    }
  }

  // TEAM NAMES FROM TITLE
  function getTeamNames(match) {
    if (match.team_1 && match.team_2) {
      return [
        String(match.team_1),
        String(match.team_2)
      ];
    }

    const title = String(match.title || 'Live Match');

    // Example:
    // United Arab Emirates Vs Namibia
    const parts = title.split(/\s+vs\.?\s+/i);

    if (parts.length === 2) {
      return [parts[0].trim(), parts[1].trim()];
    }

    // Supports badminton and single-title events
    return [title, ''];
  }

  // FORMAT TIME
  function formatStartTime(startTime) {
    if (!startTime) return '';

    const date = new Date(startTime);

    if (isNaN(date.getTime())) {
      return String(startTime);
    }

    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // MATCH STATUS PRIORITY
  function getStatusPriority(status) {
    const value = String(status || '').toUpperCase();

    if (value === 'LIVE') return 0;
    if (value === 'UPCOMING') return 1;

    return 2;
  }

  // FETCH DATA
  async function fetchFancodeData() {
    if (isLoading || !track) return;

    isLoading = true;

    try {
      track.innerHTML = createSkeletonCards(SKELETON_COUNT);

      const response = await fetch(API_URL, {
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const allMatches = extractMatches(data);

      console.log('FanCode total matches:', allMatches.length);

      // New JSON does not have team_1/team_2.
      // Accept all valid match entries.
      matches = allMatches.filter(match => {
        return match &&
          match.match_id != null &&
          (match.title || match.team_1);
      });

      // LIVE FIRST, THEN UPCOMING
      matches.sort((a, b) => {
        const aPriority = getStatusPriority(a.status);
        const bPriority = getStatusPriority(b.status);

        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }

        const aTime = Date.parse(a.startTime);
        const bTime = Date.parse(b.startTime);

        if (Number.isFinite(aTime) && Number.isFinite(bTime)) {
          return aTime - bTime;
        }

        return 0;
      });

      console.log('FanCode filtered matches:', matches.length);

      renderMatches(matches);

    } catch (error) {
      console.error('FanCode fetch error:', error);

      track.innerHTML = `
        <div style="
          color:rgba(255,255,255,0.5);
          padding:2rem;
          text-align:center;
          width:100%;
        ">
          ⚠️ Failed to load matches
        </div>
      `;

    } finally {
      isLoading = false;
    }
  }

  // RENDER MATCH CARDS
  function renderMatches(matchData) {
    if (!track) return;

    if (!matchData || matchData.length === 0) {
      track.innerHTML = `
        <div style="
          color:rgba(255,255,255,0.4);
          padding:2rem;
          text-align:center;
          width:100%;
        ">
          No matches available
        </div>
      `;
      return;
    }

    let html = '';

    matchData.forEach(match => {
      const matchId = getBaseMatchId(match.match_id);
      const title = match.title || 'Live Match';

      // NEW JSON IMAGE FIELD
      const imageUrl = safeUrl(match.image || match.src || '');

      // NEW JSON TOURNAMENT / CATEGORY
      const tournament =
        match.tournament ||
        match.category ||
        'Live Sports';

      // GET TEAM NAMES
      const [team1Name, team2Name] = getTeamNames(match);

      // STATUS
      const rawStatus = String(
        match.status || 'UPCOMING'
      ).toUpperCase();

      const isLive = rawStatus === 'LIVE';

      const isEnded = [
        'ENDED',
        'FINISHED',
        'COMPLETED'
      ].includes(rawStatus);

      const statusText = rawStatus
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, c => c.toUpperCase());

      let statusClass = 'upcoming';

      if (isLive) statusClass = 'live';
      if (isEnded) statusClass = 'ended';

      // ONLY CHECK 1080P AVAILABILITY
      const streamUrl = get1080pStream(match);
      const hasStream = !!streamUrl;

      const formattedTime = formatStartTime(match.startTime);

      // SUPPORT MATCHES WITHOUT VS
      const teamsHtml = team2Name
        ? `
          <div class="fancode-team">
            <span>${escapeHtml(team1Name)}</span>
          </div>

          <span class="fancode-vs">VS</span>

          <div class="fancode-team">
            <span>${escapeHtml(team2Name)}</span>
          </div>
        `
        : `
          <div class="fancode-team">
            <span>${escapeHtml(team1Name)}</span>
          </div>
        `;

      html += `
        <div
          class="fancode-card"
          data-match-id="${escapeHtml(matchId)}"
          data-title="${escapeHtml(title)}"
        >
          <div class="fancode-thumb">
            <img
              src="${escapeHtml(imageUrl)}"
              alt="${escapeHtml(title)}"
              loading="lazy"
            />

            ${isLive
              ? '<span class="live-badge">● LIVE</span>'
              : ''}
          </div>

          <div class="fancode-info">

            <div class="fancode-tournament">
              ${escapeHtml(tournament)}
            </div>

            <div class="fancode-teams">
              ${teamsHtml}
            </div>

            <div class="fancode-meta">
              <div class="fancode-meta-left">
                <span class="fancode-status ${statusClass}">
                  ${escapeHtml(statusText)}
                </span>
              </div>

              <span class="fancode-time">
                ${escapeHtml(formattedTime)}
              </span>
            </div>

            ${hasStream
              ? `
                <div class="stream-indicator available">
                  ▶ CLICK TO PLAY
                </div>
              `
              : `
                <div class="stream-indicator unavailable">
                  NO 1080P STREAM
                </div>
              `
            }

          </div>
        </div>
      `;
    });

    track.innerHTML = html;
  }

  // PLAY ONLY 1080P STREAM
  async function playM3U8Stream(matchId, matchTitle) {
    if (!matchId) {
      alert('Invalid match ID');
      return;
    }

    console.log('Loading 1080p FanCode stream:', matchId);

    try {
      // Fresh fetch on click so signed stream
      // URL is not taken from old card data.
      const response = await fetch(API_URL, {
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const allMatches = extractMatches(data);

      const baseMatchId = getBaseMatchId(matchId);

      // FIND EXACT MATCH
      const match = allMatches.find(item => {
        return getBaseMatchId(item?.match_id) === baseMatchId;
      });

      if (!match) {
        alert('Match not found. Please try again.');
        return;
      }

      // ONLY 1080P
      const streamUrl = get1080pStream(match);

      if (!streamUrl) {
        alert('1080p stream is not available for this match.');
        return;
      }

      // Check token expiry if provided
      const language = String(
        match.language || 'ENGLISH'
      ).toUpperCase();

      const languageKey = Object.keys(
        match.auto_streams || {}
      ).find(key => key.toUpperCase() === language);

      const expiryValue = languageKey
        ? match.auto_streams[languageKey]?.expires
        : null;

      if (expiryValue) {
        const expiry = Number(expiryValue);

        if (Number.isFinite(expiry) && Date.now() >= expiry * 1000) {
          alert('Stream link expired. Please try again later.');
          return;
        }
      }

      console.log('1080p stream selected:', match.match_id);

      const params = new URLSearchParams({
        url: streamUrl,
        title: matchTitle || match.title || 'Live Match',
        match_id: baseMatchId
      });

      // KEEP EXISTING PLAYER PAGE
      window.location.href = `/fc-play?${params.toString()}`;

    } catch (error) {
      console.error('1080p playback error:', error);

      alert('Failed to load 1080p stream. Please try again.');
    }
  }

  // SCROLL AMOUNT
  function scrollAmount() {
    if (!track) return 280;

    const card = track.querySelector(
      '.fancode-card, .fc-skeleton-card'
    );

    if (!card) return 280;

    const cardWidth = card.getBoundingClientRect().width;
    const gap = 20;

    return (cardWidth + gap) * 2;
  }

  // SCROLL LEFT
  function scrollLeft() {
    if (!track) return;

    track.scrollBy({
      left: -scrollAmount(),
      behavior: 'smooth'
    });
  }

  // SCROLL RIGHT
  function scrollRight() {
    if (!track) return;

    track.scrollBy({
      left: scrollAmount(),
      behavior: 'smooth'
    });
  }

  // CARD CLICK HANDLER
  function handleCardClick(event) {
    const card = event.target.closest('.fancode-card');

    if (!card || card.classList.contains('fc-skeleton-card')) {
      return;
    }

    const matchId = card.dataset.matchId;
    const title = card.dataset.title || 'Live Match';

    event.preventDefault();
    event.stopPropagation();

    if (!matchId) {
      alert('Invalid match');
      return;
    }

    playM3U8Stream(matchId, title);
  }

  // LAZY LOAD
  function initLazyLoad() {
    const section = document.getElementById('fancodeSection');

    if (!section || !track) return;

    const rect = section.getBoundingClientRect();

    if (rect.top < window.innerHeight + 200) {
      fetchFancodeData();
      return;
    }

    if (!('IntersectionObserver' in window)) {
      fetchFancodeData();
      return;
    }

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            observer.disconnect();
            fetchFancodeData();
          }
        });
      },
      {
        rootMargin: '200px'
      }
    );

    observer.observe(section);
  }

  // KEYBOARD NAVIGATION
  function handleKeydown(event) {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      scrollLeft();
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      scrollRight();
    }
  }

  // INITIALIZE
  function init() {
    if (arrowLeft) {
      arrowLeft.addEventListener('click', scrollLeft);
    }

    if (arrowRight) {
      arrowRight.addEventListener('click', scrollRight);
    }

    if (track) {
      track.addEventListener('click', handleCardClick);
      track.addEventListener('keydown', handleKeydown);
      track.setAttribute('tabindex', '0');
    }

    initLazyLoad();
  }

  // RUN ON DOM READY
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
