<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
  <meta name="theme-color" content="#0b0d0f" />
  <meta name="robots" content="noindex, nofollow" />
  <title>Sportlink – Live Match</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <style>
    *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
    :root{--bg:#0b0d0f;--gold:#f5c518;--gold-d:#d4a800;--hdr:60px}
    html{font-size:16px}
    body{background:var(--bg);color:#fff;font-family:'Inter',system-ui,-apple-system,sans-serif;
         min-height:100dvh;display:flex;flex-direction:column;overflow-x:hidden}

    header{position:fixed;top:0;left:0;right:0;height:var(--hdr);padding:0 clamp(.8rem,3vw,2rem);
           display:flex;align-items:center;justify-content:space-between;
           background:rgba(11,13,15,.94);backdrop-filter:blur(12px);
           border-bottom:1px solid rgba(255,255,255,.06);z-index:100}
    .logo{text-decoration:none;font-size:clamp(.9rem,2.4vw,1.2rem);font-weight:800;letter-spacing:-.02em}
    .logo .sport{color:var(--gold)}.logo .link{color:#fff}
    .back-btn{display:inline-flex;align-items:center;gap:.4rem;color:rgba(255,255,255,.75);
              text-decoration:none;font-size:.85rem;font-weight:500;padding:.4rem .8rem;
              border-radius:30px;border:1px solid rgba(255,255,255,.12);transition:all .25s}
    .back-btn:hover{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.3);color:#fff}
    .back-btn .material-icons{font-size:1.1rem}

    .player-page{flex:1;padding-top:var(--hdr);display:flex;flex-direction:column}

    .video-container{position:relative;width:100%;background:#000;aspect-ratio:16/9;max-height:75vh}
    .video-container iframe,.video-container video{position:absolute;inset:0;width:100%;height:100%;
                                                      border:none;background:#000}
    .video-container .placeholder{position:absolute;inset:0;display:flex;align-items:center;
                                    justify-content:center;color:rgba(255,255,255,.35);
                                    font-size:1rem;background:#0f1216;text-align:center;padding:1rem}
    .video-container .placeholder.error{color:#ff7a7a}

    /* server switcher */
    .server-bar{display:none;gap:.5rem;padding:.8rem clamp(1rem,4vw,2rem);
                background:#0f1216;border-bottom:1px solid rgba(255,255,255,.05);
                overflow-x:auto;scrollbar-width:none;flex-wrap:wrap}
    .server-bar::-webkit-scrollbar{display:none}
    .server-bar.show{display:flex}
    .server-btn{padding:.45rem 1rem;font-size:.75rem;font-weight:600;letter-spacing:.03em;
                border-radius:30px;border:1px solid rgba(255,255,255,.12);
                background:transparent;color:rgba(255,255,255,.65);cursor:pointer;
                transition:all .2s;white-space:nowrap;font-family:inherit}
    .server-btn:hover{background:rgba(255,255,255,.05);color:#fff}
    .server-btn.active{background:rgba(245,197,24,.15);border-color:rgba(245,197,24,.4);color:var(--gold)}

    .match-meta{max-width:900px;width:100%;margin:0 auto;
                padding:clamp(1rem,2.5vw,1.8rem) clamp(1rem,4vw,2rem)}
    .league-label{font-size:.72rem;text-transform:uppercase;letter-spacing:.12em;
                  color:rgba(255,255,255,.45);font-weight:600;margin-bottom:.55rem}
    .teams-row{display:flex;align-items:center;gap:clamp(.8rem,2vw,2rem);flex-wrap:wrap;margin-bottom:.8rem}
    .team-block{display:flex;align-items:center;gap:.6rem}
    .team-name{font-size:clamp(1rem,2vw,1.4rem);font-weight:700}
    .vs-badge{font-size:clamp(1rem,2vw,1.4rem);font-weight:800;color:var(--gold);padding:0 .4rem}
    .match-info-row{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem 1.2rem;
                    font-size:.85rem;color:rgba(255,255,255,.6);margin-top:.35rem}
    .match-info-row .sep{color:rgba(255,255,255,.2)}
    .badges{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:.8rem}
    .badge{padding:.3rem .9rem;border-radius:30px;font-size:.65rem;font-weight:700;
           text-transform:uppercase;letter-spacing:.06em;border:1px solid rgba(255,255,255,.08)}
    .badge.live{background:rgba(220,38,38,.15);color:#ff6b6b;border-color:rgba(220,38,38,.3)}
    .badge.live::before{content:'';display:inline-block;width:6px;height:6px;border-radius:50%;
                         background:#ff6b6b;margin-right:5px;vertical-align:middle;
                         animation:pl 1.4s ease-in-out infinite}
    .badge.hd{background:rgba(255,255,255,.04);color:rgba(255,255,255,.5)}
    @keyframes pl{0%,100%{opacity:1}50%{opacity:.35}}

    .tg-cta{max-width:900px;width:100%;margin:0 auto;
            padding:0 clamp(1rem,4vw,2rem) clamp(2rem,4vw,3rem)}
    .tg-btn{display:inline-flex;align-items:center;gap:.6rem;
            padding:.7rem 1.6rem;background:rgba(0,136,204,.12);
            border:1px solid rgba(0,136,204,.35);color:#4fc3f7;border-radius:40px;
            font-size:.9rem;font-weight:600;text-decoration:none;transition:all .3s}
    .tg-btn:hover{background:rgba(0,136,204,.22);border-color:rgba(0,136,204,.6);color:#fff;
                  transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,136,204,.25)}
    .tg-btn .material-icons{font-size:1.2rem}

    footer{background:linear-gradient(180deg,#0b0d0f 0%,#08090b 100%);
           border-top:1px solid rgba(255,255,255,.06);
           padding:1.2rem clamp(1rem,4vw,3rem);text-align:center;
           font-size:.75rem;color:rgba(255,255,255,.3);letter-spacing:.03em}
  </style>
</head>
<body>

<header>
  <a href="/" class="logo"><span class="sport">Sport</span><span class="link">link</span></a>
  <a href="/#worldSportsSection" class="back-btn">
    <span class="material-icons">arrow_back</span><span>Back</span>
  </a>
</header>

<div class="player-page">
  <div class="video-container" id="videoContainer">
    <div class="placeholder">Loading stream…</div>
  </div>

  <div class="server-bar" id="serverBar"></div>

  <div class="match-meta">
    <div class="league-label" id="leagueLabel">World Sports</div>
    <div class="teams-row">
      <div class="team-block"><span class="team-name" id="team1Name">Team A</span></div>
      <span class="vs-badge">VS</span>
      <div class="team-block"><span class="team-name" id="team2Name">Team B</span></div>
    </div>
    <div class="match-info-row">
      <span id="matchDate"></span>
      <span class="sep" id="sep1" style="display:none">•</span>
      <span id="matchTime"></span>
      <span class="sep" id="sep2" style="display:none">•</span>
      <span id="matchVenue"></span>
      <span class="sep" id="sep3" style="display:none">•</span>
      <span id="matchViewers"></span>
    </div>
    <div class="badges">
      <span class="badge live">Live</span>
      <span class="badge hd">HD</span>
    </div>
  </div>

  <div class="tg-cta">
    <a href="https://t.me/sportlink10" class="tg-btn" target="_blank" rel="noopener noreferrer">
      <span class="material-icons">send</span> Join Telegram for updates
    </a>
  </div>
</div>

<footer>
  &copy; <span id="current-year"></span> SPORTLINK · All rights reserved.
</footer>

<script src="https://cdn.jsdelivr.net/npm/hls.js@1.5.17"></script>
<script>
(function () {
  'use strict';

  function qs(name, fallback) {
    var v = new URLSearchParams(window.location.search).get(name);
    return v == null || v === '' ? (fallback || '') : v;
  }

  /* ---- DOM ---- */
  var videoContainer = document.getElementById('videoContainer');
  var serverBar      = document.getElementById('serverBar');
  var leagueLabel    = document.getElementById('leagueLabel');
  var team1Name      = document.getElementById('team1Name');
  var team2Name      = document.getElementById('team2Name');
  var matchDate      = document.getElementById('matchDate');
  var matchTime      = document.getElementById('matchTime');
  var matchVenue     = document.getElementById('matchVenue');
  var matchViewers   = document.getElementById('matchViewers');
  var yearEl         = document.getElementById('current-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---- Read params ---- */
  var servers = [];
  try { servers = JSON.parse(qs('servers', '[]')); } catch (e) { servers = []; }
  if (!servers.length) {
    var single = qs('stream', '');
    if (single) servers = [single];
  }

  var title = qs('title', 'Live Match');
  var league = qs('league', 'World Sports');
  var t1 = qs('team1', '');
  var t2 = qs('team2', '');
  var d  = qs('date', '');
  var tm = qs('time', '');
  var v  = qs('venue', '');
  var vw = qs('viewers', '');

  /* ---- Populate meta ---- */
  leagueLabel.textContent = league;
  team1Name.textContent   = t1 || 'Team A';
  team2Name.textContent   = t2 || 'Team B';
  matchDate.textContent   = d;
  matchTime.textContent   = tm;
  matchVenue.textContent  = v;
  matchViewers.textContent = vw ? (vw + ' watching') : '';
  document.getElementById('sep1').style.display = d  && tm ? '' : 'none';
  document.getElementById('sep2').style.display = tm && v  ? '' : 'none';
  document.getElementById('sep3').style.display = v  && vw ? '' : 'none';
  document.title = title + ' – Sportlink';

  if (!servers.length) {
    videoContainer.innerHTML = '<div class="placeholder error">No stream URL provided.</div>';
    return;
  }

  /* ---- Player ---- */
  var hlsInstance = null;

  function destroyPlayer() {
    if (hlsInstance) { try { hlsInstance.destroy(); } catch (e) {} hlsInstance = null; }
    videoContainer.innerHTML = '';
  }

  function playStream(url) {
    destroyPlayer();

    var placeholder = document.createElement('div');
    placeholder.className = 'placeholder';
    placeholder.textContent = 'Loading stream…';
    videoContainer.appendChild(placeholder);

    // Detect stream type
    var looksLikeMp4 = /\.(mp4|webm|ogg|mov|m4v)(\?|$)/i.test(url);
    var looksLikeHls = /\.m3u8(\?|$)/i.test(url) ||
                       /\/match\/hls\?/i.test(url) ||
                       /\/playlistconfig\//i.test(url) ||
                       /\/index\.m3u8/i.test(url);
    var useHls = Hls.isSupported() && !looksLikeMp4 && (looksLikeHls || !looksLikeMp4);

    if (useHls) {
      var video = document.createElement('video');
      video.controls = true;
      video.autoplay = true;
      video.playsInline = true;
      video.setAttribute('playsinline', '');
      video.style.width = '100%';
      video.style.height = '100%';
      videoContainer.innerHTML = '';
      videoContainer.appendChild(video);

      hlsInstance = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30
      });
      hlsInstance.loadSource(url);
      hlsInstance.attachMedia(video);

      hlsInstance.on(Hls.Events.MANIFEST_PARSED, function () {
        video.play().catch(function () {});
      });

      hlsInstance.on(Hls.Events.ERROR, function (evt, data) {
        if (data.fatal) {
          console.warn('[HLS fatal]', data.type, data.details);
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hlsInstance.startLoad();
          else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hlsInstance.recoverMediaError();
          else {
            videoContainer.innerHTML =
              '<div class="placeholder error">Stream unavailable. Try another server.</div>';
          }
        }
      });
      return;
    }

    // Native video fallback (mp4 / Safari native HLS)
    var nativeVideo = document.createElement('video');
    nativeVideo.controls = true;
    nativeVideo.autoplay = true;
    nativeVideo.playsInline = true;
    nativeVideo.src = url;
    nativeVideo.style.width = '100%';
    nativeVideo.style.height = '100%';
    nativeVideo.onerror = function () {
      videoContainer.innerHTML =
        '<div class="placeholder error">Stream unavailable. Try another server.</div>';
    };
    videoContainer.innerHTML = '';
    videoContainer.appendChild(nativeVideo);
  }

  /* ---- Server selector ---- */
  function renderServerBar() {
    if (servers.length <= 1) { serverBar.classList.remove('show'); return; }
    serverBar.classList.add('show');
    serverBar.innerHTML = '';
    servers.forEach(function (url, i) {
      var btn = document.createElement('button');
      btn.className = 'server-btn' + (i === 0 ? ' active' : '');
      btn.type = 'button';
      btn.textContent = 'Server ' + (i + 1);
      btn.addEventListener('click', function () {
        serverBar.querySelectorAll('.server-btn').forEach(function (b) {
          b.classList.remove('active');
        });
        btn.classList.add('active');
        playStream(url);
      });
      serverBar.appendChild(btn);
    });
  }

  renderServerBar();
  playStream(servers[0]);
})();
</script>
</body>
</html>
