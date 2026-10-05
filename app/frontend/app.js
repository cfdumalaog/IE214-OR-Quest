/**
 * app.js - Master frontend logic for OR-Quest (IE 214 Introductory Operations Research)
 */

let state = {
  modules: [],
  slideDecks: [],
  exercises: [],
  currentModule: null,
  currentSlideDeck: null,
  currentSlidePage: 1,
  totalSlidePages: 1,
  currentStream: null,
  cues: [],
  activeCueId: null,
  autoSyncSlides: true,
  subtitlesEnabled: true,
  playbackSpeed: 1.0,
  userProgress: null,
  soundFxEnabled: true,
  transcribePollingTimer: null,
  activeQuizIndex: 0,
  radarChart: null,
  // Simplex Game state
  simplexStep: 0,
  selectedEnteringVar: null,
  selectedLeavingVar: null,
  minigamesData: null,
  graphicalZ: 10,
  // Subtitle settings
  subtitleSize: localStorage.getItem('or_quest_sub_size') || 'md',
  subtitleContrast: localStorage.getItem('or_quest_sub_contrast') || 'amber',
  // ADHD Focus Sprints
  currentSprintIndex: 0,
  sprintCompletedThisRun: false,
  completedSprints: new Set(JSON.parse(localStorage.getItem('or_quest_completed_sprints') || '[]'))
};

// Web Audio API Sound Synthesizer
let audioCtx = null;
function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playSfx(type) {
  if (!state.soundFxEnabled) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    if (type === 'click') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.05);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
    } else if (type === 'correct') {
      [523.25, 659.25, 783.99].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.12, now + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.001, now + idx * 0.08 + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.25);
      });
    } else if (type === 'wrong') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.linearRampToValueAtTime(110, now + 0.2);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'levelup') {
      [261.63, 329.63, 392.00, 523.25, 659.25, 783.99].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.09);
        gain.gain.setValueAtTime(0.18, now + idx * 0.09);
        gain.gain.linearRampToValueAtTime(0.001, now + idx * 0.09 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.09);
        osc.stop(now + idx * 0.09 + 0.35);
      });
    }
  } catch (e) {
    console.warn("Audio SFX error:", e);
  }
}

function toggleAudioFx() {
  state.soundFxEnabled = !state.soundFxEnabled;
  const icon = document.getElementById("audio-fx-icon");
  if (state.soundFxEnabled) {
    icon.setAttribute("data-lucide", "volume-2");
    playSfx('click');
  } else {
    icon.setAttribute("data-lucide", "volume-x");
  }
  lucide.createIcons();
}

// ----------------- TAB SWITCHING -----------------
function switchTab(tabId) {
  playSfx('click');
  ['theater', 'campaign', 'arcade', 'trophy', 'manager'].forEach(t => {
    const view = document.getElementById(`view-${t}`);
    const btn = document.getElementById(`tab-btn-${t}`);
    if (view) view.classList.toggle('hidden', t !== tabId);
    if (btn) {
      btn.classList.toggle('active', t === tabId);
      if (t === tabId) {
        btn.classList.remove('text-slate-400');
        btn.classList.add('text-white');
      } else {
        btn.classList.remove('text-white');
        btn.classList.add('text-slate-400');
      }
    }
  });

  if (tabId === 'trophy') {
    renderRadarChart();
  } else if (tabId === 'arcade') {
    renderGraphicalCanvas();
  }
}

function switchSideTab(tabId) {
  playSfx('click');
  ['slides', 'transcript'].forEach(t => {
    const content = document.getElementById(`sidecontent-${t}`);
    const btn = document.getElementById(`sidetab-btn-${t}`);
    if (content) content.classList.toggle('hidden', t !== tabId);
    if (btn) {
      btn.classList.toggle('active', t === tabId);
      btn.classList.toggle('text-slate-400', t !== tabId);
    }
  });
}

function switchArcadeGame(gameKey) {
  playSfx('click');
  ['simplex', 'graphical', 'formulation', 'detective'].forEach(g => {
    const el = document.getElementById(`game-${g}`);
    const btn = document.getElementById(`arcade-btn-${g}`);
    if (el) el.classList.toggle('hidden', g !== gameKey);
    if (btn) {
      btn.classList.toggle('active', g !== gameKey);
      btn.classList.toggle('text-slate-400', g !== gameKey);
    }
  });

  if (gameKey === 'graphical') {
    setTimeout(renderGraphicalCanvas, 50);
  }
}

// ----------------- DATA LOADING -----------------
async function initApp() {
  try {
    lucide.createIcons();
    initSubtitlePreferences();
    await loadProgress();
    await loadMinigames();
    await loadWorkspaceLectures();
  } catch (err) {
    console.error("Initialization error:", err);
  }
}

async function loadProgress() {
  try {
    const res = await fetch("/api/progress");
    const data = await res.json();
    state.userProgress = data.progress;
    updateHud(data);
    renderBadges(data.all_badges, data.progress.unlocked_badges);
  } catch (e) {
    console.error("Error loading progress:", e);
  }
}

function updateHud(data) {
  const p = data.progress;
  const rankInfo = data.rank_info;
  const currentRank = rankInfo.current_rank;

  document.getElementById("hud-badge-icon").innerText = currentRank.badge || "🌱";
  document.getElementById("hud-rank-title").innerText = currentRank.title || "OR Novice";
  document.getElementById("hud-streak").innerText = `${p.study_streak_days || 1} Day Streak`;
  
  if (rankInfo.next_rank) {
    document.getElementById("hud-xp-text").innerText = `${p.xp} / ${rankInfo.next_rank.min_xp} XP`;
  } else {
    document.getElementById("hud-xp-text").innerText = `${p.xp} XP (Max)`;
  }
  document.getElementById("hud-xp-bar").style.width = `${rankInfo.progress_pct}%`;

  // Profile view updates
  const profileAvatar = document.getElementById("profile-avatar");
  if (profileAvatar) profileAvatar.innerText = currentRank.badge;
  const profileRankTitle = document.getElementById("profile-rank-title");
  if (profileRankTitle) profileRankTitle.innerText = currentRank.title;
  const profileLvl = document.getElementById("profile-level-badge");
  if (profileLvl) profileLvl.innerText = `Level ${currentRank.rank} Student`;
  const profileXp = document.getElementById("profile-total-xp");
  if (profileXp) profileXp.innerText = p.xp.toLocaleString();
  const profileWatch = document.getElementById("profile-watch-time");
  if (profileWatch) profileWatch.innerText = `${Math.round((p.watch_time_seconds || 0) / 60)}m`;
  const profileStreak = document.getElementById("profile-streak-count");
  if (profileStreak) profileStreak.innerText = p.study_streak_days || 1;
}

async function sendPlayerAction(action, payload = {}) {
  try {
    const res = await fetch("/api/progress/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, payload })
    });
    const data = await res.json();
    state.userProgress = data.progress;
    updateHud(data);

    if (data.newly_unlocked_badges && data.newly_unlocked_badges.length > 0) {
      data.newly_unlocked_badges.forEach(b => {
        triggerCelebration(b.icon || "🏆", `Badge Unlocked: ${b.title}!`, b.description);
        playSfx('levelup');
      });
      renderBadges(data.all_badges, data.progress.unlocked_badges);
    }
  } catch (e) {
    console.error("Action error:", e);
  }
}

async function loadWorkspaceLectures() {
  try {
    const res = await fetch("/api/lectures");
    const data = await res.json();
    state.modules = data.modules;
    state.slideDecks = data.slide_decks;
    state.exercises = data.exercises;

    populateLectureSelector();
    populateSlideDeckSelector();
    renderCampaignMap();
    renderManagerInventory();

    if (state.modules.length > 0) {
      loadModule(state.modules[0].id);
    }
  } catch (e) {
    console.error("Error loading lectures:", e);
  }
}

async function loadMinigames() {
  try {
    const res = await fetch("/api/minigames");
    state.minigamesData = await res.json();
    initSimplexGame();
    initGraphicalGame();
    initFormulationGame();
    initDetectiveGame();
  } catch (e) {
    console.error("Error loading minigames:", e);
  }
}

// ----------------- LECTURE THEATER & VIDEO CONTROLLER -----------------
function populateLectureSelector() {
  const select = document.getElementById("lecture-selector");
  select.innerHTML = "";
  state.modules.forEach(m => {
    const opt = document.createElement("option");
    opt.value = m.id;
    opt.innerText = `${m.date} - ${m.title}`;
    select.appendChild(opt);
  });
}

function populateSlideDeckSelector() {
  const select = document.getElementById("slide-deck-selector");
  select.innerHTML = "";
  state.slideDecks.forEach(sd => {
    const opt = document.createElement("option");
    opt.value = sd.id;
    opt.innerText = sd.title;
    select.appendChild(opt);
  });
}

function onLectureSelect(moduleId) {
  playSfx('click');
  loadModule(moduleId);
}

function navigateLecture(direction) {
  playSfx('click');
  const currentIndex = state.modules.findIndex(m => m.id === state.currentModule.id);
  const nextIndex = currentIndex + direction;
  if (nextIndex >= 0 && nextIndex < state.modules.length) {
    loadModule(state.modules[nextIndex].id);
    document.getElementById("lecture-selector").value = state.modules[nextIndex].id;
  }
}

async function loadModule(moduleId) {
  const mod = state.modules.find(m => m.id === moduleId);
  if (!mod) return;
  state.currentModule = mod;

  // Update Lecture Information Box
  document.getElementById("lec-title").innerText = mod.title;
  document.getElementById("lec-desc").innerText = mod.description || "Lecture session.";
  document.getElementById("lec-week-tag").innerText = mod.syllabus_week || "Week";
  document.getElementById("lec-syllabus-topic").innerText = mod.syllabus_topic || "Operations Research";

  // Key Concepts
  const conceptsContainer = document.getElementById("key-concepts-list");
  conceptsContainer.innerHTML = "";
  if (mod.key_concepts && mod.key_concepts.length > 0) {
    mod.key_concepts.forEach(kc => {
      const card = document.createElement("div");
      card.className = "p-2 rounded-lg bg-dark-950 border border-slate-800";
      card.innerHTML = `<span class="font-bold text-brand-400">${kc.term}:</span> <span class="text-slate-300">${kc.def}</span>`;
      conceptsContainer.appendChild(card);
    });
  }

  // Populate Streams
  const streamSelect = document.getElementById("stream-selector");
  streamSelect.innerHTML = "";
  if (mod.videos && mod.videos.length > 0) {
    mod.videos.forEach(v => {
      const opt = document.createElement("option");
      opt.value = v.filename;
      opt.innerText = `${v.stream_type} (${v.size_mb} MB)`;
      streamSelect.appendChild(opt);
    });
    state.currentStream = mod.default_video || mod.videos[0].filename;
    streamSelect.value = state.currentStream;
  } else {
    const opt = document.createElement("option");
    opt.value = "";
    opt.innerText = "No MP4 files detected";
    streamSelect.appendChild(opt);
    state.currentStream = "";
  }

  // Load video source
  const video = document.getElementById("main-video");
  if (state.currentStream) {
    video.src = `/api/video/${encodeURIComponent(mod.folder)}/${encodeURIComponent(state.currentStream)}`;
  } else {
    video.src = "";
  }

  // Set default slide deck
  const defaultDeck = mod.default_slide_deck || (state.slideDecks.length > 0 ? state.slideDecks[0].id : "");
  if (defaultDeck) {
    document.getElementById("slide-deck-selector").value = defaultDeck;
    await loadSlideDeck(defaultDeck, 1);
  }

  // Load Transcript
  await loadTranscript(mod.folder);

  // Load Quiz
  state.activeQuizIndex = 0;
  renderQuiz(mod);

  // Setup ADHD Focus Sprints
  setupModuleSprints(mod);

  // Update Transcribe Action Banner
  const transcribeBox = document.getElementById("transcribe-action-box");
  if (!mod.has_transcript) {
    transcribeBox.classList.remove("hidden");
    checkTranscribeStatus(mod.folder);
  } else {
    transcribeBox.classList.add("hidden");
  }
}

function onStreamSelect(filename) {
  playSfx('click');
  const video = document.getElementById("main-video");
  const wasPlaying = !video.paused;
  const currentTime = video.currentTime;
  state.currentStream = filename;
  video.src = `/api/video/${encodeURIComponent(state.currentModule.folder)}/${encodeURIComponent(filename)}`;
  video.currentTime = currentTime;
  if (wasPlaying) video.play();
}

// ----------------- VIDEO PLAYER EVENTS & SYNC -----------------
const video = document.getElementById("main-video");
const playBtnIcon = document.getElementById("play-icon");
const progressBar = document.getElementById("video-progress");
const timeDisplay = document.getElementById("time-display");
const subtitleOverlay = document.getElementById("subtitle-overlay");
const subtitleText = document.getElementById("subtitle-text");

function togglePlay() {
  playSfx('click');
  if (video.paused) {
    video.play();
  } else {
    video.pause();
  }
}

video.addEventListener("play", () => {
  playBtnIcon.setAttribute("data-lucide", "pause");
  lucide.createIcons();
});

video.addEventListener("pause", () => {
  playBtnIcon.setAttribute("data-lucide", "play");
  lucide.createIcons();
});

function seekVideo(seconds) {
  playSfx('click');
  video.currentTime = Math.max(0, Math.min(video.duration || 0, video.currentTime + seconds));
}

function formatTime(secs) {
  if (isNaN(secs)) return "00:00";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) {
    return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  }
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

let lastReportedSecond = 0;

video.addEventListener("timeupdate", () => {
  const cur = video.currentTime;
  const dur = video.duration || 1;

  // Update progress bar & time
  progressBar.value = (cur / dur) * 100;
  timeDisplay.innerText = `${formatTime(cur)} / ${formatTime(dur)}`;

  // Passive Watch Time & XP tracking every 20 seconds
  if (Math.abs(cur - lastReportedSecond) >= 20) {
    lastReportedSecond = cur;
    sendPlayerAction("watch_video", { seconds: 20, speed: state.playbackSpeed });
  }

  // 1. SUBTITLE SYNC
  if (state.subtitlesEnabled && state.cues.length > 0) {
    const activeCue = state.cues.find(c => cur >= c.start && cur <= c.end);
    if (activeCue) {
      subtitleOverlay.classList.remove("opacity-0");
      subtitleText.innerText = (activeCue.speaker && activeCue.speaker !== "Speaker") 
        ? `${activeCue.speaker}: ${activeCue.text}` 
        : activeCue.text;
    } else {
      subtitleOverlay.classList.add("opacity-0");
    }
  } else {
    subtitleOverlay.classList.add("opacity-0");
  }

  // 2. INTERACTIVE TRANSCRIPT AUTO-SCROLL & HIGHLIGHT
  if (state.cues.length > 0) {
    const currentCue = state.cues.find(c => cur >= c.start && cur <= c.end);
    if (currentCue && currentCue.id !== state.activeCueId) {
      state.activeCueId = currentCue.id;
      document.querySelectorAll(".transcript-cue").forEach(el => el.classList.remove("active-cue"));
      const activeEl = document.getElementById(`cue-${currentCue.id}`);
      if (activeEl) {
        activeEl.classList.add("active-cue");
        activeEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }

  // 3. AUTO-SYNC SLIDES WITH VIDEO
  if (state.autoSyncSlides && state.currentModule && state.currentModule.slide_markers) {
    const markers = state.currentModule.slide_markers;
    for (let i = markers.length - 1; i >= 0; i--) {
      const sm = markers[i];
      if (cur >= sm.time_sec) {
        if (sm.deck && sm.deck !== state.currentSlideDeck) {
          loadSlideDeck(sm.deck, sm.slide);
        } else if (state.currentSlidePage !== sm.slide) {
          setSlidePage(sm.slide, false);
        }
        const topicEl = document.getElementById("slide-topic-name");
        if (topicEl) topicEl.innerText = `Slide ${sm.slide}: ${sm.title}`;
        const timeBadge = document.getElementById("slide-timestamp-badge");
        if (timeBadge) timeBadge.innerText = formatTime(sm.time_sec);
        break;
      }
    }
  }

  // 4. ADHD FOCUS SPRINT CONTROLLER
  updateSprintUI(cur);
});

progressBar.addEventListener("input", (e) => {
  const dur = video.duration || 1;
  video.currentTime = (e.target.value / 100) * dur;
});

// Speed Modifier
function setSpeed(speed) {
  playSfx('click');
  state.playbackSpeed = speed;
  video.playbackRate = speed;
  document.getElementById("speed-slider").value = speed;
  document.getElementById("speed-value").innerText = `${speed.toFixed(2)}x`;

  document.querySelectorAll(".speed-chip").forEach(chip => {
    chip.classList.toggle("active-speed", parseFloat(chip.innerText) === speed);
  });

  if (speed >= 1.5) {
    sendPlayerAction("watch_video", { seconds: 1, speed: speed });
  }
}

function onSpeedSlider(val) {
  const speed = parseFloat(val);
  state.playbackSpeed = speed;
  video.playbackRate = speed;
  document.getElementById("speed-value").innerText = `${speed.toFixed(2)}x`;
  document.querySelectorAll(".speed-chip").forEach(chip => chip.classList.remove("active-speed"));
}

function toggleSubtitles() {
  playSfx('click');
  state.subtitlesEnabled = !state.subtitlesEnabled;
  const ccBtn = document.getElementById("cc-btn");
  if (state.subtitlesEnabled) {
    ccBtn.innerText = "CC ON";
    ccBtn.classList.replace("border-slate-700", "border-brand-500");
    ccBtn.classList.replace("text-slate-400", "text-brand-300");
  } else {
    ccBtn.innerText = "CC OFF";
    ccBtn.classList.replace("border-brand-500", "border-slate-700");
    ccBtn.classList.replace("text-brand-300", "text-slate-400");
    subtitleOverlay.classList.add("opacity-0");
  }
}

// ----------------- SUBTITLE PREFERENCES & CUSTOMIZATION -----------------
function initSubtitlePreferences() {
  setSubtitleSize(state.subtitleSize);
  setSubtitleContrast(state.subtitleContrast);
}

function setSubtitleSize(size) {
  playSfx('click');
  state.subtitleSize = size;
  localStorage.setItem('or_quest_sub_size', size);

  const subText = document.getElementById("subtitle-text");
  if (subText) {
    subText.classList.remove("sub-size-sm", "sub-size-md", "sub-size-lg", "sub-size-xl");
    subText.classList.add(`sub-size-${size}`);
  }

  ['sm', 'md', 'lg', 'xl'].forEach(s => {
    const btn = document.getElementById(`sub-btn-${s}`);
    if (btn) {
      btn.classList.toggle("bg-white/20", s === size);
      btn.classList.toggle("font-bold", s === size);
    }
  });
}

function setSubtitleContrast(theme) {
  playSfx('click');
  state.subtitleContrast = theme;
  localStorage.setItem('or_quest_sub_contrast', theme);

  const subText = document.getElementById("subtitle-text");
  if (subText) {
    subText.classList.remove("sub-contrast-amber", "sub-contrast-white", "sub-contrast-neon");
    subText.classList.add(`sub-contrast-${theme}`);
  }
}

function toggleFullscreen() {
  playSfx('click');
  if (!document.fullscreenElement) {
    document.getElementById("main-video").requestFullscreen().catch(err => alert(err.message));
  } else {
    document.exitFullscreen();
  }
}

// ----------------- SLIDE DECK & RENDERING -----------------
async function loadSlideDeck(deckName, page = 1) {
  state.currentSlideDeck = deckName;
  try {
    const res = await fetch(`/api/slides/${encodeURIComponent(deckName)}`);
    const info = await res.json();
    state.totalSlidePages = info.total_pages;
    buildSlideThumbnails(deckName, info.total_pages);
    setSlidePage(page, false);
  } catch (e) {
    console.error("Error loading slide deck info:", e);
  }
}

function onSlideDeckChange(deckName) {
  playSfx('click');
  loadSlideDeck(deckName, 1);
}

function setSlidePage(page, userTriggered = true) {
  if (page < 1 || page > state.totalSlidePages) return;
  state.currentSlidePage = page;
  
  const img = document.getElementById("current-slide-img");
  const spinner = document.getElementById("slide-loading-spinner");
  spinner.classList.remove("hidden");

  img.onload = () => spinner.classList.add("hidden");
  img.src = `/api/slides/${encodeURIComponent(state.currentSlideDeck)}/${page}.png`;

  document.getElementById("slide-page-indicator").innerText = `${page} / ${state.totalSlidePages}`;

  // Highlight thumbnail
  document.querySelectorAll(".slide-thumb-card").forEach(el => {
    el.classList.toggle("active-thumb", parseInt(el.dataset.page) === page);
  });

  if (userTriggered) {
    state.autoSyncSlides = false;
    document.getElementById("auto-sync-checkbox").checked = false;
  }
}

function prevSlide() {
  playSfx('click');
  setSlidePage(state.currentSlidePage - 1, true);
}

function nextSlide() {
  playSfx('click');
  setSlidePage(state.currentSlidePage + 1, true);
}

function toggleAutoSync(checked) {
  playSfx('click');
  state.autoSyncSlides = checked;
  if (checked) {
    sendPlayerAction("slide_sync", {});
  }
}

function jumpVideoToCurrentSlide() {
  playSfx('click');
  if (state.currentModule && state.currentModule.slide_markers) {
    const marker = state.currentModule.slide_markers.find(m => 
      m.slide === state.currentSlidePage && (!m.deck || m.deck === state.currentSlideDeck)
    ) || state.currentModule.slide_markers.find(m => m.slide === state.currentSlidePage);
    if (marker) {
      video.currentTime = marker.time_sec;
      video.play();
    }
  }
}

async function pinCurrentSlideToVideo() {
  playSfx('click');
  if (!state.currentModule) return;
  const curTime = Math.floor(video.currentTime);
  const curDeck = state.currentSlideDeck;
  const curPage = state.currentSlidePage;

  try {
    const res = await fetch("/api/slides/pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        module_id: state.currentModule.id,
        slide_deck: curDeck,
        slide_page: curPage,
        time_sec: curTime
      })
    });
    const data = await res.json();
    if (data.success) {
      if (!state.currentModule.slide_markers) state.currentModule.slide_markers = [];
      const markers = state.currentModule.slide_markers;
      const existing = markers.find(m => m.slide === curPage && (m.deck === curDeck || !m.deck));
      if (existing) {
        existing.time_sec = curTime;
        existing.deck = curDeck;
      } else {
        markers.push({
          deck: curDeck,
          slide: curPage,
          time_sec: curTime,
          title: `Slide ${curPage}`
        });
      }
      markers.sort((a, b) => a.time_sec - b.time_sec);

      const timeBadge = document.getElementById("slide-timestamp-badge");
      if (timeBadge) timeBadge.innerText = formatTime(curTime);

      state.autoSyncSlides = true;
      const autoSyncCheck = document.getElementById("auto-sync-checkbox");
      if (autoSyncCheck) autoSyncCheck.checked = true;

      playSfx('correct');
      sendPlayerAction("pin_slide", { module: state.currentModule.id, slide: curPage, time_sec: curTime });
      triggerToast(`📍 Slide ${curPage} pinned to ${formatTime(curTime)}! (+20 XP)`);
    }
  } catch (err) {
    console.error("Pin slide error:", err);
  }
}

// ----------------- ADHD FOCUS SPRINT CONTROLLER -----------------
function setupModuleSprints(mod) {
  const container = document.getElementById("focus-sprint-container");
  if (!container) return;

  state.currentSprintIndex = 0;
  state.sprintCompletedThisRun = false;

  // Fallback if sprints aren't explicitly loaded
  if (!mod.sprints || mod.sprints.length === 0) {
    const totalDuration = (mod.duration_minutes || 60) * 60;
    const sprintLen = 8 * 60; // 8 minutes
    const sprintCount = Math.ceil(totalDuration / sprintLen);
    mod.sprints = [];
    for (let i = 0; i < sprintCount; i++) {
      const start = i * sprintLen;
      const end = Math.min(totalDuration, (i + 1) * sprintLen);
      mod.sprints.push({
        id: `${mod.id}_s${i+1}`,
        number: i + 1,
        title: `Focus Sprint Part ${i + 1}`,
        start_sec: start,
        end_sec: end,
        duration_min: Math.round(((end - start) / 60) * 10) / 10,
        objective: `Focus on mastering the concepts discussed in minutes ${Math.round(start/60)} to ${Math.round(end/60)}.`,
        slide_deck: mod.default_slide_deck,
        slide_page: Math.min(i + 1, 10)
      });
    }
  }

  renderSprintDrawer(mod.sprints);
  renderCurrentSprintCard();
}

function renderSprintDrawer(sprints) {
  const drawer = document.getElementById("sprint-drawer");
  if (!drawer) return;
  drawer.innerHTML = "";
  const toggleText = document.getElementById("sprint-drawer-toggle-text");
  if (toggleText) toggleText.innerText = `All Sprints (${sprints.length})`;

  sprints.forEach((s, idx) => {
    const isCompleted = state.completedSprints.has(s.id);
    const isCurrent = idx === state.currentSprintIndex;
    const item = document.createElement("div");
    item.className = `sprint-item p-2.5 rounded-xl border border-slate-800/80 cursor-pointer flex items-center justify-between text-xs gap-3 ${
      isCurrent ? 'current-sprint' : isCompleted ? 'completed-sprint' : 'bg-dark-950/60'
    }`;
    item.onclick = () => selectSprint(idx);

    item.innerHTML = `
      <div class="flex items-center gap-2.5 truncate">
        <span class="w-5 h-5 rounded-full flex items-center justify-center font-mono font-bold text-[10px] ${
          isCompleted ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30' : 'bg-slate-800 text-slate-400'
        }">${isCompleted ? '✓' : s.number}</span>
        <div class="truncate">
          <div class="font-bold text-slate-200 truncate">${s.title}</div>
          <div class="text-[10px] text-slate-400 truncate">${s.objective}</div>
        </div>
      </div>
      <div class="flex items-center gap-2 flex-shrink-0 text-[10px] font-mono text-slate-400">
        <span>${formatTime(s.start_sec)} - ${formatTime(s.end_sec)}</span>
        <span class="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">${s.duration_min}m</span>
      </div>
    `;
    drawer.appendChild(item);
  });
}

function toggleSprintDrawer() {
  playSfx('click');
  const drawer = document.getElementById("sprint-drawer");
  const chevron = document.getElementById("sprint-drawer-chevron");
  if (!drawer) return;
  const isHidden = drawer.classList.toggle("hidden");
  if (chevron) chevron.style.transform = isHidden ? "rotate(0deg)" : "rotate(180deg)";
}

function renderCurrentSprintCard() {
  if (!state.currentModule || !state.currentModule.sprints) return;
  const sprints = state.currentModule.sprints;
  const sprint = sprints[state.currentSprintIndex];
  if (!sprint) return;

  const badgeEl = document.getElementById("sprint-badge-num");
  if (badgeEl) badgeEl.innerText = `Sprint ${sprint.number} of ${sprints.length}`;

  const durEl = document.getElementById("sprint-duration-tag");
  if (durEl) durEl.innerText = `~${sprint.duration_min} mins`;

  const titleEl = document.getElementById("sprint-current-title");
  if (titleEl) titleEl.innerHTML = `<span>${sprint.title}</span>`;

  const objEl = document.getElementById("sprint-current-objective");
  if (objEl) objEl.innerText = sprint.objective;

  const boundsEl = document.getElementById("sprint-time-bounds");
  if (boundsEl) boundsEl.innerText = `${formatTime(sprint.start_sec)} - ${formatTime(sprint.end_sec)}`;

  renderSprintDrawer(sprints);
}

function selectSprint(index) {
  playSfx('click');
  if (!state.currentModule || !state.currentModule.sprints) return;
  const sprints = state.currentModule.sprints;
  if (index < 0 || index >= sprints.length) return;

  state.currentSprintIndex = index;
  state.sprintCompletedThisRun = false;
  const sprint = sprints[index];

  video.currentTime = sprint.start_sec;
  if (video.paused) video.play();

  if (sprint.slide_deck && sprint.slide_deck !== state.currentSlideDeck) {
    loadSlideDeck(sprint.slide_deck, sprint.slide_page || 1);
  } else if (sprint.slide_page) {
    setSlidePage(sprint.slide_page, false);
  }

  renderCurrentSprintCard();
}

function prevSprint() {
  selectSprint(state.currentSprintIndex - 1);
}

function nextSprint() {
  selectSprint(state.currentSprintIndex + 1);
}

function updateSprintUI(cur) {
  if (!state.currentModule || !state.currentModule.sprints) return;
  const sprints = state.currentModule.sprints;
  if (sprints.length === 0) return;

  // Auto detect sprint if scrubbed
  const detectedIdx = sprints.findIndex(s => cur >= s.start_sec && cur < s.end_sec);
  if (detectedIdx !== -1 && detectedIdx !== state.currentSprintIndex) {
    state.currentSprintIndex = detectedIdx;
    state.sprintCompletedThisRun = false;
    renderCurrentSprintCard();
  }

  const sprint = sprints[state.currentSprintIndex];
  if (!sprint) return;

  const remainingSec = Math.max(0, sprint.end_sec - cur);
  const countdownEl = document.getElementById("sprint-countdown");
  if (countdownEl) {
    countdownEl.innerText = `${formatTime(remainingSec)} remaining`;
  }

  const sprintDur = sprint.end_sec - sprint.start_sec;
  const sprintElapsed = Math.min(sprintDur, Math.max(0, cur - sprint.start_sec));
  const pct = Math.min(100, Math.max(0, Math.round((sprintElapsed / (sprintDur || 1)) * 100)));

  const progressBarEl = document.getElementById("sprint-progress-bar");
  const percentEl = document.getElementById("sprint-progress-percent");
  if (progressBarEl) progressBarEl.style.width = `${pct}%`;
  if (percentEl) percentEl.innerText = `${pct}% Completed`;

  if (cur >= sprint.end_sec && !state.sprintCompletedThisRun && !video.paused) {
    state.sprintCompletedThisRun = true;
    state.completedSprints.add(sprint.id);
    localStorage.setItem('or_quest_completed_sprints', JSON.stringify(Array.from(state.completedSprints)));

    const autoPause = document.getElementById("sprint-autopause")?.checked;
    if (autoPause) {
      video.pause();
    }

    playSfx('levelup');
    sendPlayerAction("sprint_complete", { sprint_id: sprint.id, module_id: state.currentModule.id });
    triggerCelebration(
      "⚡",
      `Sprint ${sprint.number} Completed!`,
      `Outstanding focus! You finished "${sprint.title}". Take a quick stretch break, then hit Next Sprint when ready! (+30 XP)`
    );
    renderSprintDrawer(sprints);
  }
}

function triggerToast(msg) {
  let toast = document.getElementById("app-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "app-toast";
    toast.className = "fixed bottom-5 right-5 z-50 bg-dark-900 border border-brand-500/50 text-brand-300 px-4 py-2.5 rounded-xl shadow-2xl text-xs font-semibold flex items-center gap-2 transition-all duration-300 opacity-0 translate-y-2 pointer-events-none";
    document.body.appendChild(toast);
  }
  toast.innerText = msg;
  toast.classList.remove("opacity-0", "translate-y-2");
  setTimeout(() => {
    toast.classList.add("opacity-0", "translate-y-2");
  }, 3500);
}

function buildSlideThumbnails(deckName, totalPages) {
  const rail = document.getElementById("slide-thumbnail-rail");
  rail.innerHTML = "";
  for (let i = 1; i <= Math.min(20, totalPages); i++) {
    const card = document.createElement("div");
    card.className = "slide-thumb-card flex-shrink-0 w-16 h-11 bg-dark-950 rounded cursor-pointer overflow-hidden border border-slate-800 relative";
    card.dataset.page = i;
    card.onclick = () => { playSfx('click'); setSlidePage(i, true); };
    card.innerHTML = `
      <img src="/api/slides/${encodeURIComponent(deckName)}/${i}.png" class="w-full h-full object-cover">
      <span class="absolute bottom-0.5 right-1 text-[9px] font-mono font-bold bg-black/70 px-1 rounded text-white">${i}</span>
    `;
    rail.appendChild(card);
  }
}

function openFullSlideModal() {
  playSfx('click');
  const modal = document.getElementById("slide-modal");
  const modalImg = document.getElementById("modal-slide-img");
  modalImg.src = document.getElementById("current-slide-img").src;
  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function closeFullSlideModal() {
  playSfx('click');
  const modal = document.getElementById("slide-modal");
  modal.classList.add("hidden");
  modal.classList.remove("flex");
}

// ----------------- INTERACTIVE TRANSCRIPT READER -----------------
async function loadTranscript(folder) {
  try {
    const res = await fetch(`/api/transcripts/${encodeURIComponent(folder)}`);
    const data = await res.json();
    state.cues = data.cues || [];
    renderTranscriptCues(state.cues);
  } catch (e) {
    console.error("Error loading transcript:", e);
  }
}

function renderTranscriptCues(cues) {
  const container = document.getElementById("transcript-container");
  container.innerHTML = "";

  if (cues.length === 0) {
    container.innerHTML = `
      <div class="text-center text-slate-500 py-12 text-xs space-y-2">
        <i data-lucide="file-question" class="w-8 h-8 mx-auto opacity-50"></i>
        <p>No transcript cues found for this module.</p>
      </div>`;
    lucide.createIcons();
    return;
  }

  cues.forEach(cue => {
    const div = document.createElement("div");
    div.id = `cue-${cue.id}`;
    div.className = "transcript-cue p-2 rounded-lg cursor-pointer text-xs text-slate-300";
    div.onclick = () => {
      playSfx('click');
      video.currentTime = cue.start;
      video.play();
      sendPlayerAction("transcript_jump", { cue_id: cue.id });
    };

    div.innerHTML = `
      <div class="flex items-center justify-between mb-1">
        <span class="font-mono text-[10px] text-accent-400 font-semibold bg-accent-500/10 px-1.5 py-0.5 rounded">[${cue.start_str}]</span>
        ${cue.speaker && cue.speaker !== "Speaker" ? `<span class="text-[10px] text-slate-400 font-medium truncate max-w-[150px]">${cue.speaker}</span>` : ""}
      </div>
      <p class="cue-text leading-relaxed text-slate-300">${cue.text}</p>
    `;
    container.appendChild(div);
  });
}

function filterTranscript(query) {
  const q = query.toLowerCase().trim();
  if (!q) {
    renderTranscriptCues(state.cues);
    return;
  }
  const filtered = state.cues.filter(c => c.text.toLowerCase().includes(q) || (c.speaker && c.speaker.toLowerCase().includes(q)));
  renderTranscriptCues(filtered);
}

// ----------------- WHISPER BACKGROUND TRANSCRIPTION -----------------
async function triggerLectureTranscription() {
  playSfx('click');
  if (!state.currentModule) return;
  const folder = state.currentModule.folder;
  const btn = document.getElementById("transcribe-now-btn");
  btn.disabled = true;
  btn.innerText = "Starting Whisper AI...";

  try {
    const res = await fetch(`/api/transcribe/${encodeURIComponent(folder)}`, { method: "POST" });
    const data = await res.json();
    alert(data.message);
    startTranscriptionPolling(folder);
  } catch (e) {
    alert("Transcription error: " + e.message);
    btn.disabled = false;
  }
}

function startTranscriptionPolling(folder) {
  if (state.transcribePollingTimer) clearInterval(state.transcribePollingTimer);
  state.transcribePollingTimer = setInterval(() => checkTranscribeStatus(folder), 3000);
}

async function checkTranscribeStatus(folder) {
  try {
    const res = await fetch(`/api/transcribe/${encodeURIComponent(folder)}/status`);
    const status = await res.json();
    const badge = document.getElementById("transcribe-progress-badge");
    const btn = document.getElementById("transcribe-now-btn");
    
    if (status.status === "transcribing" || status.status === "extracting_audio" || status.status === "loading_model") {
      badge.innerText = `${status.progress}% - ${status.message}`;
      btn.disabled = true;
      btn.innerText = `Transcribing (${status.progress}%)...`;
    } else if (status.status === "done") {
      badge.innerText = "Completed! 100%";
      btn.disabled = false;
      btn.innerText = "Transcribe Again";
      clearInterval(state.transcribePollingTimer);
      // Reload transcript
      await loadTranscript(folder);
      document.getElementById("transcribe-action-box").classList.add("hidden");
    }
  } catch (e) {
    console.warn("Status poll error:", e);
  }
}

// ----------------- CHECKPOINT QUIZ -----------------
function renderQuiz(mod) {
  const card = document.getElementById("quiz-card");
  if (!mod.quizzes || mod.quizzes.length === 0) {
    card.classList.add("hidden");
    return;
  }
  card.classList.remove("hidden");
  const quiz = mod.quizzes[state.activeQuizIndex];
  document.getElementById("quiz-step").innerText = `Question ${state.activeQuizIndex + 1} of ${mod.quizzes.length}`;
  document.getElementById("quiz-question").innerText = quiz.question;

  const optContainer = document.getElementById("quiz-options");
  optContainer.innerHTML = "";
  const feedback = document.getElementById("quiz-feedback");
  feedback.classList.add("hidden");

  quiz.options.forEach((optText, idx) => {
    const btn = document.createElement("button");
    btn.className = "w-full text-left p-2.5 rounded-lg bg-dark-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-200 transition flex items-center justify-between";
    btn.onclick = () => answerQuiz(idx, quiz, mod);
    btn.innerHTML = `<span>${optText}</span><span class="text-[10px] text-slate-500 font-mono">Option ${idx + 1}</span>`;
    optContainer.appendChild(btn);
  });
}

function answerQuiz(selectedIdx, quiz, mod) {
  const feedback = document.getElementById("quiz-feedback");
  feedback.classList.remove("hidden");

  if (selectedIdx === quiz.answer_idx) {
    playSfx('correct');
    feedback.className = "text-xs p-2.5 rounded-lg bg-brand-500/10 border border-brand-500/30 text-brand-300";
    feedback.innerHTML = `<strong>Correct! (+50 XP)</strong><br>${quiz.explanation}`;
    sendPlayerAction("complete_quiz", { quiz_id: quiz.id, score: 1, max_score: 1 });

    setTimeout(() => {
      if (state.activeQuizIndex + 1 < mod.quizzes.length) {
        state.activeQuizIndex++;
        renderQuiz(mod);
      }
    }, 2000);
  } else {
    playSfx('wrong');
    feedback.className = "text-xs p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300";
    feedback.innerHTML = `<strong>Incorrect.</strong> Try again! Hint: ${quiz.explanation}`;
  }
}

// ----------------- CAMPAIGN VIEW -----------------
function renderCampaignMap() {
  const container = document.getElementById("campaign-nodes-grid");
  container.innerHTML = "";

  state.modules.forEach((mod, idx) => {
    const card = document.createElement("div");
    card.className = "p-5 rounded-xl bg-dark-950 border border-slate-800 space-y-3 relative hover:border-brand-500/40 transition group";
    
    card.innerHTML = `
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-mono font-bold text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded">${mod.syllabus_week || `Module ${idx+1}`}</span>
        <span class="text-xs font-mono text-amber-400 font-bold">+${mod.xp_reward || 250} XP</span>
      </div>
      <h4 class="text-base font-bold text-white group-hover:text-brand-400 transition">${mod.title}</h4>
      <p class="text-xs text-slate-400 line-clamp-2 leading-relaxed">${mod.description}</p>
      
      <div class="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
        <span class="text-slate-400">${mod.duration_minutes || 90} mins</span>
        <button onclick="switchTab('theater'); onLectureSelect('${mod.id}');" class="px-3 py-1 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-semibold transition text-xs flex items-center gap-1">
          <span>Play Session</span>
          <i data-lucide="play" class="w-3 h-3"></i>
        </button>
      </div>
    `;
    container.appendChild(card);
  });
  lucide.createIcons();
}

// ----------------- OR ARCADE: MINIGAME 1 (SIMPLEX PIVOT MASTER) -----------------
function initSimplexGame() {
  const game = state.minigamesData.simplex_pivot;
  if (!game) return;
  state.simplexStep = 0;
  renderSimplexTableau();
}

function resetSimplexGame() {
  playSfx('click');
  state.simplexStep = 0;
  state.selectedEnteringVar = null;
  state.selectedLeavingVar = null;
  renderSimplexTableau();
}

function renderSimplexTableau() {
  const game = state.minigamesData.simplex_pivot;
  const currentTab = game.scenario.tableaus[state.simplexStep];
  const table = document.getElementById("simplex-tableau-table");
  table.innerHTML = "";

  // Headers
  const thead = document.createElement("thead");
  const trH = document.createElement("tr");
  currentTab.headers.forEach((h, hIdx) => {
    const th = document.createElement("th");
    th.className = "tableau-header";
    th.innerText = h;
    trH.appendChild(th);
  });
  thead.appendChild(trH);
  table.appendChild(thead);

  // Rows
  const tbody = document.createElement("tbody");
  currentTab.rows.forEach((r, rIdx) => {
    const tr = document.createElement("tr");
    tr.className = "border-b border-slate-800 hover:bg-dark-850";
    if (state.selectedLeavingVar === r.basic) tr.classList.add("row-leaving");

    // Basic col
    const tdB = document.createElement("td");
    tdB.className = "tableau-cell font-bold text-brand-400";
    tdB.innerText = r.basic;
    tr.appendChild(tdB);

    // Value cols
    r.vals.forEach((v, cIdx) => {
      const td = document.createElement("td");
      td.className = "tableau-cell";
      if (state.selectedEnteringVar === currentTab.headers[cIdx + 1]) {
        td.classList.add("col-entering");
      }
      if (state.selectedEnteringVar === currentTab.headers[cIdx + 1] && state.selectedLeavingVar === r.basic) {
        td.classList.add("pivot-element");
      }
      td.innerText = typeof v === 'number' ? (Number.isInteger(v) ? v : v.toFixed(2)) : v;
      tr.appendChild(td);
    });

    // Ratio col
    const tdR = document.createElement("td");
    tdR.className = "tableau-cell text-slate-400 font-mono";
    tdR.innerText = r.ratio || "-";
    tr.appendChild(tdR);

    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  // Setup buttons if not optimal
  const enteringContainer = document.getElementById("entering-var-buttons");
  const leavingContainer = document.getElementById("leaving-var-buttons");
  enteringContainer.innerHTML = "";
  leavingContainer.innerHTML = "";
  const feedback = document.getElementById("simplex-feedback");
  feedback.classList.add("hidden");

  if (currentTab.is_optimal) {
    feedback.className = "text-xs p-3 rounded-lg bg-brand-500/10 border border-brand-500/30 text-brand-300";
    feedback.innerText = currentTab.optimal_summary;
    feedback.classList.remove("hidden");
    document.getElementById("pivot-action-btn").disabled = true;
    return;
  }

  // Entering var buttons
  ["x1", "x2"].forEach(v => {
    const btn = document.createElement("button");
    btn.className = `px-3 py-1 rounded text-xs font-mono font-bold border transition ${state.selectedEnteringVar === v ? 'bg-accent-500 text-white border-accent-400' : 'bg-dark-800 text-slate-300 border-slate-700'}`;
    btn.innerText = v;
    btn.onclick = () => {
      playSfx('click');
      state.selectedEnteringVar = v;
      renderSimplexTableau();
      checkPivotButtonState();
    };
    enteringContainer.appendChild(btn);
  });

  // Leaving var buttons
  currentTab.rows.filter(r => !r.is_obj).forEach(r => {
    const btn = document.createElement("button");
    btn.className = `px-3 py-1 rounded text-xs font-mono font-bold border transition ${state.selectedLeavingVar === r.basic ? 'bg-red-500 text-white border-red-400' : 'bg-dark-800 text-slate-300 border-slate-700'}`;
    btn.innerText = r.basic;
    btn.onclick = () => {
      playSfx('click');
      state.selectedLeavingVar = r.basic;
      renderSimplexTableau();
      checkPivotButtonState();
    };
    leavingContainer.appendChild(btn);
  });

  checkPivotButtonState();
}

function checkPivotButtonState() {
  const btn = document.getElementById("pivot-action-btn");
  btn.disabled = !(state.selectedEnteringVar && state.selectedLeavingVar);
}

function executeSimplexPivot() {
  const game = state.minigamesData.simplex_pivot;
  const cur = game.scenario.tableaus[state.simplexStep];
  const feedback = document.getElementById("simplex-feedback");
  feedback.classList.remove("hidden");

  if (state.selectedEnteringVar === cur.entering_var && state.selectedLeavingVar === cur.leaving_var) {
    playSfx('correct');
    feedback.className = "text-xs p-3 rounded-lg bg-brand-500/10 border border-brand-500/30 text-brand-300";
    feedback.innerHTML = `<strong>Perfect Pivot! (+150 XP)</strong> ${cur.hint}`;
    sendPlayerAction("solve_pivot", {});

    setTimeout(() => {
      state.simplexStep++;
      state.selectedEnteringVar = null;
      state.selectedLeavingVar = null;
      renderSimplexTableau();
    }, 1500);
  } else {
    playSfx('wrong');
    feedback.className = "text-xs p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300";
    feedback.innerHTML = `<strong>Suboptimal choice.</strong> Remember: Pick the most negative entry in Row 0 for entering, and the strictly smallest positive ratio (RHS / positive coefficient) for leaving!`;
  }
}

// ----------------- OR ARCADE: MINIGAME 2 (2D GRAPHICAL LP) -----------------
function initGraphicalGame() {
  const game = state.minigamesData.graphical_arena;
  if (!game) return;
  
  const pointsList = document.getElementById("extreme-points-list");
  pointsList.innerHTML = "";
  game.problem.extreme_points.forEach(ep => {
    const item = document.createElement("div");
    item.className = "flex items-center justify-between p-1.5 rounded bg-dark-900 border border-slate-800";
    item.innerHTML = `<span class="text-slate-300">${ep.point}: ${ep.label}</span> <span class="text-brand-400 font-bold">Z = ${ep.z}</span>`;
    pointsList.appendChild(item);
  });
  renderGraphicalCanvas();
}

function onGraphicalSlider(val) {
  state.graphicalZ = parseFloat(val);
  document.getElementById("graphical-z-val").innerText = `Z = ${state.graphicalZ.toFixed(1)}`;
  renderGraphicalCanvas();
}

function renderGraphicalCanvas() {
  const canvas = document.getElementById("graphical-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;

  // Clear
  ctx.fillStyle = "#020617";
  ctx.fillRect(0, 0, w, h);

  const originX = 60;
  const originY = h - 50;
  const scale = 40; // 40px per unit

  // Grid
  ctx.strokeStyle = "#1e293b";
  ctx.lineWidth = 1;
  for (let x = 0; x <= 10; x++) {
    ctx.beginPath();
    ctx.moveTo(originX + x * scale, 20);
    ctx.lineTo(originX + x * scale, originY);
    ctx.stroke();
    ctx.fillStyle = "#64748b";
    ctx.font = "10px Fira Code";
    ctx.fillText(x, originX + x * scale - 3, originY + 18);
  }
  for (let y = 0; y <= 8; y++) {
    ctx.beginPath();
    ctx.moveTo(originX, originY - y * scale);
    ctx.lineTo(w - 20, originY - y * scale);
    ctx.stroke();
    ctx.fillStyle = "#64748b";
    ctx.font = "10px Fira Code";
    ctx.fillText(y, originX - 20, originY - y * scale + 4);
  }

  // Axes
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(originX, 20);
  ctx.lineTo(originX, originY);
  ctx.lineTo(w - 20, originY);
  ctx.stroke();

  // Axis Labels
  ctx.fillStyle = "#38bdf8";
  ctx.font = "bold 12px Inter";
  ctx.fillText("x1", w - 15, originY + 4);
  ctx.fillText("x2", originX - 10, 15);

  // Feasible Region Polygon: (0,0) -> (4,0) -> (4,3) -> (2,6) -> (0,6)
  const polyPoints = [
    {x: 0, y: 0},
    {x: 4, y: 0},
    {x: 4, y: 3},
    {x: 2, y: 6},
    {x: 0, y: 6}
  ];

  ctx.fillStyle = "rgba(34, 197, 94, 0.25)";
  ctx.beginPath();
  polyPoints.forEach((pt, idx) => {
    const px = originX + pt.x * scale;
    const py = originY - pt.y * scale;
    if (idx === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.closePath();
  ctx.fill();

  // Constraint Lines
  // C1: x1 = 4
  ctx.strokeStyle = "#f87171";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(originX + 4 * scale, 20);
  ctx.lineTo(originX + 4 * scale, originY);
  ctx.stroke();

  // C2: 2x2 = 12 => x2 = 6
  ctx.strokeStyle = "#60a5fa";
  ctx.beginPath();
  ctx.moveTo(originX, originY - 6 * scale);
  ctx.lineTo(originX + 8 * scale, originY - 6 * scale);
  ctx.stroke();

  // C3: 3x1 + 2x2 = 18 => (0, 9) to (6, 0)
  ctx.strokeStyle = "#34d399";
  ctx.beginPath();
  ctx.moveTo(originX + 0 * scale, originY - 9 * scale);
  ctx.lineTo(originX + 6 * scale, originY - 0 * scale);
  ctx.stroke();

  // Draw Extreme Points
  polyPoints.forEach((pt, idx) => {
    const px = originX + pt.x * scale;
    const py = originY - pt.y * scale;
    ctx.fillStyle = pt.x === 2 && pt.y === 6 ? "#facc15" : "#22c55e";
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });

  // Draw Objective Function Isoprofit Line: 3x1 + 5x2 = Z
  // => x2 = (Z - 3x1) / 5
  const Z = state.graphicalZ;
  ctx.strokeStyle = "#eab308";
  ctx.lineWidth = 2.5;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  const x1_start = 0;
  const x2_start = (Z - 3 * x1_start) / 5;
  const x1_end = Z / 3;
  const x2_end = 0;

  ctx.moveTo(originX + x1_start * scale, originY - x2_start * scale);
  ctx.lineTo(originX + x1_end * scale, originY - x2_end * scale);
  ctx.stroke();
  ctx.setLineDash([]);
}

function checkGraphicalSolution() {
  const feedback = document.getElementById("graphical-feedback");
  feedback.classList.remove("hidden");

  // Optimal Z = 36 at (2, 6)
  if (Math.abs(state.graphicalZ - 36) <= 1.0) {
    playSfx('correct');
    feedback.className = "text-xs p-3 rounded-lg bg-brand-500/10 border border-brand-500/30 text-brand-300";
    feedback.innerHTML = `<strong>Spot on! (+150 XP)</strong> Optimal extreme point reached at <strong>D (2, 6)</strong> with Maximum Objective <strong>Z* = 36</strong>! Notice how the isoprofit line touches the very last vertex of the feasible polyhedron before leaving the region!`;
    sendPlayerAction("solve_graphical", {});
  } else {
    playSfx('wrong');
    feedback.className = "text-xs p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-300";
    feedback.innerHTML = `Current Z = ${state.graphicalZ.toFixed(1)}. Try sliding Z until the dashed gold line hits the highest corner point (point D at x1=2, x2=6)!`;
  }
}

// ----------------- OR ARCADE: MINIGAME 3 (FORMULATION FORGE) -----------------
function initFormulationGame() {
  onFormulationScenarioSelect("amr_layout");
}

function onFormulationScenarioSelect(scenarioId) {
  const game = state.minigamesData.formulation_forge;
  const scenario = game.scenarios.find(s => s.id === scenarioId);
  const container = document.getElementById("formulation-scenario-body");
  container.innerHTML = "";

  const header = document.createElement("div");
  header.className = "p-4 rounded-xl bg-dark-950 border border-slate-800 space-y-2";
  header.innerHTML = `
    <h4 class="text-sm font-bold text-brand-400">${scenario.title}</h4>
    <p class="text-xs text-slate-300 leading-relaxed">${scenario.description}</p>
    <div class="text-[11px] text-slate-500 font-mono">Source: ${scenario.source}</div>
  `;
  container.appendChild(header);

  scenario.questions.forEach((q, qIdx) => {
    const qCard = document.createElement("div");
    qCard.className = "p-4 rounded-xl bg-dark-950 border border-slate-800 space-y-3";
    qCard.innerHTML = `
      <div class="text-xs font-bold text-purple-400 uppercase tracking-wider">${q.step}</div>
      <p class="text-xs font-medium text-slate-200">${q.prompt}</p>
      <div class="space-y-2" id="forge-opts-${qIdx}"></div>
      <div id="forge-feedback-${qIdx}" class="hidden text-xs p-2.5 rounded-lg"></div>
    `;
    container.appendChild(qCard);

    const optsContainer = qCard.querySelector(`#forge-opts-${qIdx}`);
    q.options.forEach((optText, optIdx) => {
      const btn = document.createElement("button");
      btn.className = "w-full text-left p-2 rounded-lg bg-dark-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 transition";
      btn.onclick = () => answerFormulationQuestion(qIdx, optIdx, q);
      btn.innerText = optText;
      optsContainer.appendChild(btn);
    });
  });
}

function answerFormulationQuestion(qIdx, optIdx, q) {
  const fb = document.getElementById(`forge-feedback-${qIdx}`);
  fb.classList.remove("hidden");
  if (optIdx === q.correct) {
    playSfx('correct');
    fb.className = "text-xs p-2.5 rounded-lg bg-brand-500/10 border border-brand-500/30 text-brand-300";
    fb.innerHTML = `<strong>Correct Formulation!</strong><br>${q.explanation}`;
    sendPlayerAction("solve_formulation", {});
  } else {
    playSfx('wrong');
    fb.className = "text-xs p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300";
    fb.innerHTML = `<strong>Incorrect.</strong> Hint: ${q.explanation}`;
  }
}

// ----------------- OR ARCADE: MINIGAME 4 (TABLEAU DETECTIVE) -----------------
function initDetectiveGame() {
  const game = state.minigamesData.tableau_detective;
  const container = document.getElementById("detective-body");
  container.innerHTML = "";

  const tableCard = document.createElement("div");
  tableCard.className = "overflow-x-auto p-4 rounded-xl bg-dark-950 border border-slate-800";
  let tableHtml = `<table class="w-full text-left text-xs font-mono border-collapse">`;
  game.puzzle.raw_tableau.forEach((row, rIdx) => {
    tableHtml += `<tr>`;
    row.forEach(cell => {
      const isRedacted = ["A", "B", "C", "D", "E", "F", "G"].includes(cell);
      const cellClass = isRedacted 
        ? "bg-yellow-500/20 text-yellow-300 font-bold border border-yellow-500/50 p-2 text-center" 
        : (rIdx === 0 ? "bg-dark-900 font-bold text-slate-200 border border-slate-700 p-2 text-right" : "border border-slate-800 p-2 text-right text-slate-300");
      tableHtml += `<td class="${cellClass}">${cell}</td>`;
    });
    tableHtml += `</tr>`;
  });
  tableHtml += `</table>`;
  tableCard.innerHTML = tableHtml;
  container.appendChild(tableCard);

  // Questions
  game.puzzle.questions.forEach((q, qIdx) => {
    const qDiv = document.createElement("div");
    qDiv.className = "p-4 rounded-xl bg-dark-950 border border-slate-800 space-y-2";
    qDiv.innerHTML = `
      <div class="text-xs font-bold text-yellow-400">Missing Variable: ${q.letter}</div>
      <p class="text-xs text-slate-300">${q.prompt}</p>
      <div class="flex items-center gap-2" id="detective-opts-${qIdx}"></div>
      <div id="detective-fb-${qIdx}" class="hidden text-xs p-2.5 rounded-lg"></div>
    `;
    container.appendChild(qDiv);

    const optsRow = qDiv.querySelector(`#detective-opts-${qIdx}`);
    q.options.forEach((optText, optIdx) => {
      const btn = document.createElement("button");
      btn.className = "px-3 py-1.5 rounded-lg bg-dark-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-white transition";
      btn.innerText = optText;
      btn.onclick = () => answerDetectiveQuestion(qIdx, optIdx, q);
      optsRow.appendChild(btn);
    });
  });
}

function answerDetectiveQuestion(qIdx, optIdx, q) {
  const fb = document.getElementById(`detective-fb-${qIdx}`);
  fb.classList.remove("hidden");
  if (optIdx === q.correct) {
    playSfx('correct');
    fb.className = "text-xs p-2.5 rounded-lg bg-brand-500/10 border border-brand-500/30 text-brand-300";
    fb.innerHTML = `<strong>Deduction Confirmed! (+250 XP)</strong><br>${q.explanation}`;
    sendPlayerAction("solve_tableau_detective", {});
  } else {
    playSfx('wrong');
    fb.className = "text-xs p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300";
    fb.innerHTML = `<strong>Incorrect.</strong> Hint: ${q.explanation}`;
  }
}

// ----------------- TROPHY ROOM & SKILLS RADAR -----------------
function renderBadges(allBadges, unlockedIds) {
  const container = document.getElementById("badges-grid");
  if (!container) return;
  container.innerHTML = "";

  allBadges.forEach(b => {
    const isUnlocked = unlockedIds.includes(b.id);
    const card = document.createElement("div");
    card.className = `p-4 rounded-xl border transition flex items-start gap-3 ${isUnlocked ? 'bg-dark-950 border-brand-500/40 shadow-lg shadow-brand-500/5' : 'bg-dark-950/40 border-slate-800/60 opacity-50'}`;
    card.innerHTML = `
      <div class="text-2xl p-2 rounded-xl bg-dark-900 border border-slate-800">${b.icon || '🏅'}</div>
      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <span class="text-xs font-bold ${isUnlocked ? 'text-white' : 'text-slate-500'}">${b.title}</span>
          ${isUnlocked ? '<span class="text-[9px] bg-brand-500/20 text-brand-400 font-mono px-1.5 py-0.2 rounded">UNLOCKED</span>' : ''}
        </div>
        <p class="text-[11px] text-slate-400 leading-snug">${b.description}</p>
        <span class="text-[10px] font-mono text-amber-400">+${b.xp || 50} XP</span>
      </div>
    `;
    container.appendChild(card);
  });
}

function renderRadarChart() {
  const canvas = document.getElementById("skillsRadarChart");
  if (!canvas) return;

  const skills = state.userProgress ? state.userProgress.skills : {
    formulation: 20,
    graphical_geometry: 20,
    simplex_tableau: 20,
    big_m_methods: 20,
    duality_theory: 20,
    or_methodology: 20
  };

  const labels = [
    "LP Formulation",
    "Graphical Geometry",
    "Simplex Tableaus",
    "Big-M & Artificials",
    "Duality & Shadows",
    "OR Methodology"
  ];
  const values = [
    skills.formulation || 20,
    skills.graphical_geometry || 20,
    skills.simplex_tableau || 20,
    skills.big_m_methods || 20,
    skills.duality_theory || 20,
    skills.or_methodology || 20
  ];

  if (state.radarChart) {
    state.radarChart.destroy();
  }

  state.radarChart = new Chart(canvas, {
    type: 'radar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Skill Proficiency (%)',
        data: values,
        fill: true,
        backgroundColor: 'rgba(34, 197, 94, 0.2)',
        borderColor: '#22c55e',
        pointBackgroundColor: '#22c55e',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#22c55e'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          min: 0,
          max: 100,
          ticks: { display: false },
          grid: { color: '#334155' },
          angleLines: { color: '#334155' },
          pointLabels: {
            color: '#94a3b8',
            font: { size: 9, family: 'Inter' }
          }
        }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
}

// ----------------- LECTURE MANAGER & INVENTORY -----------------
function renderManagerInventory() {
  const tbody = document.getElementById("manager-modules-tbody");
  tbody.innerHTML = "";

  state.modules.forEach(m => {
    const tr = document.createElement("tr");
    tr.className = "hover:bg-dark-850/50 transition";
    
    const videoCount = (m.videos || []).length;
    const hasTrans = m.has_transcript;

    tr.innerHTML = `
      <td class="py-3 px-3 font-mono font-bold text-white">${m.folder}</td>
      <td class="py-3 px-3 text-slate-300">${m.title}</td>
      <td class="py-3 px-3">
        <span class="px-2 py-0.5 rounded text-[11px] font-mono ${videoCount > 0 ? 'bg-accent-500/10 text-accent-400 border border-accent-500/20' : 'bg-red-500/10 text-red-400'}">${videoCount} MP4 file(s)</span>
      </td>
      <td class="py-3 px-3">
        ${hasTrans 
          ? '<span class="text-brand-400 flex items-center gap-1"><i data-lucide="check-circle" class="w-3.5 h-3.5"></i> VTT Ready</span>' 
          : '<span class="text-amber-400 flex items-center gap-1"><i data-lucide="alert-circle" class="w-3.5 h-3.5"></i> Missing VTT</span>'}
      </td>
      <td class="py-3 px-3 text-right">
        <button onclick="switchTab('theater'); onLectureSelect('${m.id}');" class="px-2.5 py-1 rounded bg-dark-800 hover:bg-slate-700 text-slate-200 text-xs font-medium mr-2">
          Play
        </button>
        ${!hasTrans ? `
          <button onclick="switchTab('theater'); onLectureSelect('${m.id}'); switchSideTab('transcript'); triggerLectureTranscription();" class="px-2.5 py-1 rounded bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold">
            Transcribe
          </button>` : ''}
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Slide Decks
  const slidesList = document.getElementById("manager-slides-list");
  slidesList.innerHTML = "";
  state.slideDecks.forEach(sd => {
    const item = document.createElement("div");
    item.className = "flex items-center justify-between p-2 rounded-lg bg-dark-950 border border-slate-800";
    item.innerHTML = `
      <span class="truncate">${sd.title}.pdf</span>
      <button onclick="switchTab('theater'); onSlideDeckChange('${sd.id}'); switchSideTab('slides');" class="text-xs text-brand-400 hover:text-brand-300 font-medium">View in Theater</button>
    `;
    slidesList.appendChild(item);
  });

  // Exercises
  const exercisesList = document.getElementById("manager-exercises-list");
  exercisesList.innerHTML = "";
  state.exercises.forEach(ex => {
    const item = document.createElement("div");
    item.className = "flex items-center justify-between p-2 rounded-lg bg-dark-950 border border-slate-800";
    item.innerHTML = `
      <span class="truncate">${ex.title}.pdf</span>
      <button onclick="switchTab('theater'); onSlideDeckChange('${ex.id}'); switchSideTab('slides');" class="text-xs text-accent-400 hover:text-accent-300 font-medium">Preview PDF</button>
    `;
    exercisesList.appendChild(item);
  });

  lucide.createIcons();
}

async function refreshWorkspaceScanner() {
  playSfx('click');
  await loadWorkspaceLectures();
  alert("Workspace rescan complete! Detected files updated.");
}

// ----------------- CELEBRATION MODAL -----------------
function triggerCelebration(icon, title, desc) {
  document.getElementById("celebration-icon").innerText = icon;
  document.getElementById("celebration-title").innerText = title;
  document.getElementById("celebration-desc").innerText = desc;
  const modal = document.getElementById("celebration-modal");
  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function closeCelebrationModal() {
  playSfx('click');
  const modal = document.getElementById("celebration-modal");
  modal.classList.add("hidden");
  modal.classList.remove("flex");
}

// Global hotkeys
window.addEventListener("keydown", (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
  if (e.code === "Space") {
    e.preventDefault();
    togglePlay();
  } else if (e.code === "ArrowLeft") {
    seekVideo(-10);
  } else if (e.code === "ArrowRight") {
    seekVideo(10);
  }
});

// Launch on DOM ready
document.addEventListener("DOMContentLoaded", initApp);
