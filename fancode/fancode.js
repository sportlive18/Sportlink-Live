// fancode.js - FanCode Section

(function() {
  'use strict';

  // Configuration
  const API_URL = 'https://sportlink-fancode10.pages.dev/fan.json';
  const SKELETON_COUNT = 6;

  // DOM elements
  const track = document.getElementById('fancodeTrack');
  const arrowLeft = document.getElementById('fancodeArrowLeft');
  const arrowRight = document.getElementById('fancodeArrowRight');

  // State
  let isLoading = false;
  let matches = [];

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

  // Helper function to extract base match ID (remove language suffix)
  function getBaseMatchId(matchId) {
    if (!matchId) return '';
    let baseId = String(matchId);
    if (baseId.includes('_')) {
      baseId = baseId.split('_')[0];
    }
    return baseId;
  }

  // Helper to extract array from various JSON structures
  function extractMatchesArray(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.matches)) return data.matches;
    if (Array.isArray(data.data)) return data.data;
    if (Array.isArray(data.events)) return data.events;
    if (Array.isArray(data.results)) return data.results;
    if (Array.isArray(data.fixtures)) return data.fixtures;
    // Last resort: find any array key
    const arrayKey = Object.keys(data).find(k => Array.isArray(data[k]));
    if (arrayKey) {
      console.log(`FanCode: found matches under key "${arrayKey}"`);
      return data[arrayKey];
    }
    return [];
  }

  // Normalize a raw match object to consistent field names
  function normalizeMatch(m) {
    return {
      ...m,
      team_1:     m.team_1     || m.teamA      || m.home_team  || m.team1      || '',
      team_2:     m.team_2     || m.teamB      || m.away_team  || m.team2      || '',
      status:     m.status     || m.match_status || 'UPCOMING',
      startTime:  m.startTime  || m.start_time || m.date       || '',
      src:        m.src        || m.thumbnail  || m.image      || m.banner     || '',
      event_name: m.event_name || m.tournament || m.league     || m.title      || m.match_name || '',
      dai_url:    m.dai_url    || m.adfree_url || m.stream_url || m.hls_url    || m.url        || '',
      match_id:   m.match_id   || m.id         || m.match_code || '',
      title:      m.title      || m.match_name || m.name       || '',
    };
  }

  // ---- FETCH DATA ----
  async function fetchFancodeData() {
    if (isLoading) return;
    isLoading = true;

    try {
      track.innerHTML = createSkeletonCards(SKELETON_COUNT);

      const response = await fetch(API_URL);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();

      // Debug logging — check browser console if no matches show
      console.log('FanCode API keys:', Object.keys(data));
      const raw = extractMatchesArray(data);
      console.log(`FanCode: ${raw.length} total items`);
      if (raw.length > 0) {
        console.log('FanCode first item keys:', Object.keys(raw[0]));
        console.log('FanCode first item:', JSON.stringify(raw[0]).slice(0, 400));
      }

      const allMatches = raw.map(normalizeMatch);

      // Filter: must have both teams
      matches = allMatches.filter(m => m.team_1 && m.team_2);

      console.log(`FanCode: ${matches.length} matches with teams`);

      // Sort: LIVE first, then UPCOMING, then by start time
      matches.sort((a, b) => {
        const getPriority = (status) => {
          if (status === 'LIVE') return 0;
          if (status === 'UPCOMING') return 1;
          return 2;
        };
        const aPriority = getPriority(a.status);
        const bPriority = getPriority(b.status);
        if (aPriority !== bPriority) return aPriority - bPriority;
        if (a.startTime && b.startTime) {
          return new Date(a.startTime) - new Date(b.startTime);
        }
        return 0;
      });

      renderMatches(matches);

    } catch (error) {
      console.error('FanCode fetch error:', error);
      track.innerHTML = `
        <div style="color: rgba(255,255,255,0.4); padding: 2rem; text-align: center; width: 100%;">
          ⚠️ Failed to load matches: ${error.message}
        </div>
      `;
    } finally {
      isLoading = false;
    }
  }

  // ---- RENDER MATCH CARDS ----
  function renderMatches(matchData) {
    if (!matchData || matchData.length === 0) {
      track.innerHTML = `
        <div style="color: rgba(255,255,255,0.3); padding: 2rem; text-align: center; width: 100%;">
          No matches available
        </div>
      `;
      return;
    }

    let html = '';
    matchData.forEach(match => {
      const team1Name = match.team_1 || 'Team 1';
      const team2Name = match.team_2 || 'Team 2';
      const imageUrl  = match.src || '';

      let statusText = match.status || 'UPCOMING';
      const isLive  = statusText === 'LIVE';
      const isEnded = ['ENDED','FINISHED','COMPLETED'].includes(statusText);

      statusText = statusText.replace(/_/g, ' ').toLowerCase()
        .split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

      let statusClass = 'upcoming';
      if (isLive)  statusClass = 'live';
      if (isEnded) statusClass = 'ended';

      const streamUrl  = match.dai_url || '';
      const hasStream  = !!streamUrl;
      const baseMatchId = getBaseMatchId(match.match_id);

      let formattedTime = match.startTime || '';
      if (formattedTime) {
        try {
          const date = new Date(formattedTime);
          if (!isNaN(date)) {
            formattedTime = date.toLocaleString('en-US', {
              month: 'short', day: 'numeric',
              hour: '2-digit', minute: '2-digit'
            });
          }
        } catch (e) { /* keep original */ }
      }

      html += `
        <div class="fancode-card"
          data-match-id="${baseMatchId}"
          data-full-match-id="${match.match_id || ''}"
          data-stream-url="${streamUrl}"
          data-title="${match.title || match.event_name || 'Live Match'}">
          <div class="fancode-thumb">
            <img
              src="${imageUrl}"
              alt="${team1Name} vs ${team2Name}"
              loading="lazy"
              onerror="this.src='https://via.placeholder.com/400x225/1a1c1e/555?text=No+Image'"
            />
            ${isLive ? '<span class="live-badge">● LIVE</span>' : ''}
          </div>
          <div class="fancode-info">
            <div class="fancode-tournament">${match.event_name || 'Match'}</div>
            <div class="fancode-teams">
              <div class="fancode-team"><span>${team1Name}</span></div>
              <span class="fancode-vs">VS</span>
              <div class="fancode-team"><span>${team2Name}</span></div>
            </div>
            <div class="fancode-meta">
              <div class="fancode-meta-left">
                <span class="fancode-status ${statusClass}">${statusText}</span>
              </div>
              <span class="fancode-time">${formattedTime}</span>
            </div>
            ${hasStream
              ? '<div class="stream-indicator available">▶ CLICK TO PLAY</div>'
              : '<div class="stream-indicator unavailable">NO STREAM</div>'}
          </div>
        </div>
      `;
    });

    track.innerHTML = html;
  }

  // ---- PLAY M3U8 STREAM ----
  async function playM3U8Stream(matchId, matchTitle, streamUrl) {
    console.log('🔍 Playing stream:', { matchId, matchTitle, streamUrl });

    if (!matchId) {
      alert('No match ID available');
      return;
    }

    if (streamUrl && streamUrl.includes('m3u8')) {
      const encodedUrl  = encodeURIComponent(streamUrl);
      const matchName   = encodeURIComponent(matchTitle || 'Live Match');
      window.location.href = `/fc-play?url=${encodedUrl}&title=${matchName}&match_id=${matchId}`;
      return;
    }

    try {
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      const raw  = extractMatchesArray(data).map(normalizeMatch);
      const baseMatchId = getBaseMatchId(matchId);

      let match = raw.find(m => getBaseMatchId(m.match_id) === baseMatchId);

      if (!match) {
        match = raw.find(m => {
          const mTitle     = (m.title || m.event_name || '').toLowerCase();
          const searchTitle = (matchTitle || '').toLowerCase();
          return mTitle.includes(searchTitle) || searchTitle.includes(mTitle);
        });
      }

      if (!match) {
        alert('Match data not found. Please try again.');
        return;
      }

      const m3u8Url = match.dai_url || '';
      if (!m3u8Url) {
        alert('No stream available for this match');
        return;
      }

      const encodedUrl = encodeURIComponent(m3u8Url);
      const matchName  = encodeURIComponent(matchTitle || match.title || 'Live Match');
      window.location.href = `/fc-play?url=${encodedUrl}&title=${matchName}&match_id=${matchId}`;

    } catch (error) {
      console.error('❌ Error playing stream:', error);
      alert('Failed to load stream. Please try again.');
    }
  }

  // ---- SCROLL FUNCTIONS ----
  function scrollAmount() {
    const card = track.querySelector('.fancode-card, .fc-skeleton-card');
    if (!card) return 280;
    return (card.getBoundingClientRect().width + 20) * 2;
  }

  function scrollLeft()  { track.scrollBy({ left: -scrollAmount(), behavior: 'smooth' }); }
  function scrollRight() { track.scrollBy({ left:  scrollAmount(), behavior: 'smooth' }); }

  // ---- CARD CLICK HANDLER ----
  function handleCardClick(e) {
    const card = e.target.closest('.fancode-card');
    if (!card) return;

    const matchId   = card.dataset.matchId || card.dataset.fullMatchId;
    const title     = card.dataset.title || 'Live Match';
    const streamUrl = card.dataset.streamUrl || '';

    if (matchId) {
      e.preventDefault();
      e.stopPropagation();
      playM3U8Stream(matchId, title, streamUrl);
    } else {
      e.preventDefault();
      alert('Invalid match');
    }
  }

  // ---- INTERSECTION OBSERVER ----
  function initLazyLoad() {
    const section = document.getElementById('fancodeSection');
    if (!section) return;

    if (section.getBoundingClientRect().top < window.innerHeight) {
      fetchFancodeData();
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          fetchFancodeData();
          observer.disconnect();
        }
      });
    }, { rootMargin: '200px' });

    observer.observe(section);
  }

  // ---- KEYBOARD NAVIGATION ----
  function handleKeydown(e) {
    if (e.key === 'ArrowLeft')  scrollLeft();
    if (e.key === 'ArrowRight') scrollRight();
  }

  // ---- INIT ----
  function init() {
    if (arrowLeft)  arrowLeft.addEventListener('click', scrollLeft);
    if (arrowRight) arrowRight.addEventListener('click', scrollRight);
    if (track) {
      track.addEventListener('click', handleCardClick);
      track.addEventListener('keydown', handleKeydown);
      track.setAttribute('tabindex', '0');
    }
    initLazyLoad();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
