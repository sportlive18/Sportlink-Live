// ============================================================
// world-sports.js - Fetch & Render World Sports
// ============================================================

(function() {
  const API_URL = '/world-sports/world-sports.json';
  const track = document.getElementById('worldSportsTrack');
  const arrowLeft = document.getElementById('worldSportsArrowLeft');
  const arrowRight = document.getElementById('worldSportsArrowRight');

  if (!track) return;

  // ----- RENDER SKELETONS -----
  function renderSkeletons(count = 6) {
    let html = '';
    for (let i = 0; i < count; i++) {
      html += `
        <div class="ws-skeleton-card">
          <div class="ws-skeleton-thumb"></div>
          <div class="ws-skeleton-info">
            <div class="ws-skeleton-line short"></div>
            <div class="ws-skeleton-line long"></div>
            <div class="ws-skeleton-meta">
              <div class="ws-skeleton-badge"></div>
              <div class="ws-skeleton-time"></div>
            </div>
          </div>
        </div>
      `;
    }
    track.innerHTML = html;
  }

  // ----- RENDER MATCH CARDS -----
  function renderMatches(matches) {
    if (!matches || matches.length === 0) {
      track.innerHTML = `<div style="color:rgba(255,255,255,0.3);padding:2rem;text-align:center;">No matches available</div>`;
      return;
    }

    let html = '';
    matches.forEach(match => {
      const statusClass = (match.status || '').toLowerCase();
      const statusDisplay = match.status_display || match.status || 'Upcoming';
      const thumbnail = match.thumbnail || '';
      const league = match.league || 'World Sports';
      const title = match.title || match.teams || 'Match';
      const dateTime = match.date || '';
      const viewers = match.viewers ? `${match.viewers} watching` : '';

      html += `
        <a href="${match.page_url || '#'}" class="world-sports-card" data-match-id="${match.match_id || ''}">
          <div class="world-sports-thumb">
            <img src="${thumbnail}" alt="${title}" loading="lazy" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22480%22 height=%22270%22%3E%3Crect fill=%22%231a1c1e%22 width=%22480%22 height=%22270%22/%3E%3Ctext x=%2250%%22 y=%2250%%22 font-family=%22Inter,sans-serif%22 font-size=%2220%22 fill=%22%23333%22 text-anchor=%22middle%22 dy=%22.3em%22%3ENo Image%3C/text%3E%3C/svg%3E'" />
          </div>
          <div class="world-sports-info">
            <div class="world-sports-league">${league}</div>
            <div class="world-sports-title-text">${title}</div>
            <div class="world-sports-meta">
              <span class="world-sports-status ${statusClass}">${statusDisplay}</span>
              <span class="world-sports-time">${dateTime}</span>
            </div>
            ${viewers ? `<div style="font-size:clamp(0.5rem,0.6vw,0.7rem);color:rgba(255,255,255,0.25);margin-top:2px;">${viewers}</div>` : ''}
          </div>
        </a>
      `;
    });

    track.innerHTML = html;
  }

  // ----- FETCH DATA -----
  function fetchWorldSports() {
    renderSkeletons(6);

    fetch(API_URL)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        const matches = data.matches || [];
        // Optional: filter only live + upcoming, or show all
        // For now, show all matches (limit to 20 to keep carousel clean)
        const displayMatches = matches.slice(0, 20);
        renderMatches(displayMatches);
      })
      .catch(err => {
        console.error('World Sports fetch error:', err);
        track.innerHTML = `<div style="color:rgba(255,255,255,0.3);padding:2rem;text-align:center;">Failed to load matches</div>`;
      });
  }

  // ----- CAROUSEL SCROLL -----
  function getScrollAmount() {
    const card = track.querySelector('.world-sports-card, .ws-skeleton-card');
    if (!card) return 320;
    const gap = parseFloat(getComputedStyle(track).gap || '20');
    return (card.getBoundingClientRect().width + gap) * 2;
  }

  if (arrowRight) {
    arrowRight.addEventListener('click', function(e) {
      e.stopPropagation();
      track.scrollBy({ left: getScrollAmount(), behavior: 'smooth' });
    });
  }

  if (arrowLeft) {
    arrowLeft.addEventListener('click', function(e) {
      e.stopPropagation();
      track.scrollBy({ left: -getScrollAmount(), behavior: 'smooth' });
    });
  }

  // ----- INIT -----
  // Use Intersection Observer to load only when visible
  const section = document.getElementById('worldSportsSection');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(function(entries) {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          fetchWorldSports();
          observer.disconnect();
        }
      });
    }, { rootMargin: '200px' });
    observer.observe(section);
  } else {
    // Fallback: load immediately
    fetchWorldSports();
  }
})();
