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
  completedSprints: new Set(JSON.parse(localStorage.getItem('or_quest_completed_sprints') || '[]')),
  // Exam Intel & Notes
  examIntel: [],
  userNotes: [],
  examNotesScope: 'active',
  examCategoryFilter: 'all',
  examSearchQuery: '',
  capturedNoteTime: 0,
  // Session Memory & Persistence
  session: {
    last_module_id: 'module_aug10',
    last_tab: 'theater',
    last_side_tab: 'slides',
    playback_speed: 1.0,
    subtitles_enabled: true,
    subtitle_size: 'md',
    subtitle_contrast: 'amber',
    lecture_positions: {},
    lecture_streams: {},
    lecture_slides: {},
    completed_sprints: []
  },
  // Knowledge Base state
  knowledgeBaseData: [],
  kbSelectedModule: 'all',
  kbSearchQuery: ''
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
  ['theater', 'campaign', 'arcade', 'knowledgebase', 'trophy', 'manager'].forEach(t => {
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

  if (state.session) {
    state.session.last_tab = tabId;
    persistSession();
  }

  if (tabId === 'trophy') {
    renderRadarChart();
  } else if (tabId === 'arcade') {
    renderGraphicalCanvas();
  } else if (tabId === 'knowledgebase') {
    loadKnowledgeBase();
  }
}

function switchSideTab(tabId) {
  playSfx('click');
  ['slides', 'transcript', 'examnotes'].forEach(t => {
    const content = document.getElementById(`sidecontent-${t}`);
    const btn = document.getElementById(`sidetab-btn-${t}`);
    if (content) content.classList.toggle('hidden', t !== tabId);
    if (btn) {
      btn.classList.toggle('active', t === tabId);
      if (t === tabId) {
        btn.classList.remove('text-slate-400');
        if (t === 'examnotes') {
          btn.classList.add('text-amber-300');
        } else {
          btn.classList.add('text-white');
        }
      } else {
        if (t === 'examnotes') {
          btn.classList.remove('text-amber-300');
          btn.classList.add('text-amber-400');
        } else {
          btn.classList.remove('text-white');
          btn.classList.add('text-slate-400');
        }
      }
    }
  });

  if (state.session) {
    state.session.last_side_tab = tabId;
    persistSession();
  }

  if (tabId === 'examnotes') {
    renderExamNotes();
  }
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

// ----------------- TIME FORMATTING UTILITY -----------------
function formatTime(secs) {
  if (isNaN(secs) || secs === null || secs === undefined) return "00:00";
  const totalSecs = Math.max(0, Math.floor(secs));
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  if (h > 0) {
    return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  }
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

function applySubtitlePreferences() {
  if (typeof initSubtitlePreferences === 'function') {
    initSubtitlePreferences();
  }
}

// ----------------- SESSION MEMORY & PERSISTENCE -----------------
async function initSessionMemory() {
  // 1. Read localStorage
  try {
    const local = localStorage.getItem('or_quest_session');
    if (local) {
      const parsed = JSON.parse(local);
      state.session = { ...state.session, ...parsed };
    }
  } catch (e) {
    console.warn("Local session read warning:", e);
  }

  // 2. Fetch /api/session
  try {
    const res = await fetch("/api/session");
    if (res.ok) {
      const serverSession = await res.json();
      state.session = {
        ...state.session,
        ...serverSession,
        lecture_positions: {
          ...(serverSession.lecture_positions || {}),
          ...(state.session.lecture_positions || {})
        }
      };
    }
  } catch (e) {
    console.warn("Server session fetch warning:", e);
  }

  // 3. Fallback to cookies if present
  const getCookie = (name) => {
    try {
      const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
      return match ? decodeURIComponent(match[2]) : null;
    } catch (_) {
      return null;
    }
  };
  const cookieMod = getCookie('or_quest_last_module');
  const cookieTime = getCookie('or_quest_last_time');
  if (cookieMod && !state.session.last_module_id) {
    state.session.last_module_id = cookieMod;
  }
  if (cookieMod && cookieTime && !state.session.lecture_positions[cookieMod]) {
    state.session.lecture_positions[cookieMod] = parseFloat(cookieTime);
  }

  // 4. Apply remembered settings to state and UI
  if (state.session.playback_speed) {
    state.playbackSpeed = state.session.playback_speed;
    const speedSlider = document.getElementById("speed-slider");
    if (speedSlider) speedSlider.value = state.playbackSpeed;
    const speedVal = document.getElementById("speed-value");
    if (speedVal) speedVal.innerText = `${state.playbackSpeed.toFixed(2)}x`;
  }
  if (state.session.subtitles_enabled !== undefined) {
    state.subtitlesEnabled = state.session.subtitles_enabled;
    const subBtn = document.getElementById("sub-toggle-btn");
    if (subBtn) subBtn.classList.toggle("active-control", state.subtitlesEnabled);
  }
  if (state.session.subtitle_size) {
    state.subtitleSize = state.session.subtitle_size;
  }
  if (state.session.subtitle_contrast) {
    state.subtitleContrast = state.session.subtitle_contrast;
  }
  initSubtitlePreferences();
}

let sessionSaveTimeout = null;
function persistSession(immediate = false) {
  if (sessionSaveTimeout) clearTimeout(sessionSaveTimeout);

  const doSave = async () => {
    try {
      // 1. LocalStorage
      localStorage.setItem('or_quest_session', JSON.stringify(state.session));

      // 2. Cookie
      const curMod = state.session.last_module_id || 'module_aug10';
      const curPos = (state.session.lecture_positions && state.session.lecture_positions[curMod]) ? state.session.lecture_positions[curMod] : 0;
      document.cookie = `or_quest_last_module=${encodeURIComponent(curMod)}; path=/; max-age=31536000`;
      document.cookie = `or_quest_last_time=${encodeURIComponent(curPos)}; path=/; max-age=31536000`;

      // 3. API
      if (immediate && navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(state.session)], { type: 'application/json' });
        navigator.sendBeacon('/api/session', blob);
      } else {
        await fetch('/api/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(state.session)
        });
      }

      // Update HUD save indicator
      const hudSave = document.getElementById("hud-save-indicator");
      const hudSaveText = document.getElementById("hud-save-text");
      if (hudSave && hudSaveText) {
        hudSave.classList.remove("hidden");
        hudSaveText.innerText = `Saved (${formatTime(curPos)})`;
      }
    } catch (e) {
      console.warn("Session persist error:", e);
    }
  };

  if (immediate) {
    doSave();
  } else {
    sessionSaveTimeout = setTimeout(doSave, 800);
  }
}

function showResumeToast(timeSec) {
  const existing = document.getElementById("resume-toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.id = "resume-toast";
  toast.className = "absolute bottom-16 left-6 z-40 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-dark-900/95 border border-brand-500/50 shadow-2xl backdrop-blur-md animate-fade-in";
  toast.innerHTML = `
    <span class="text-sm">📍</span>
    <span class="text-xs text-slate-200">Resumed at <strong class="text-brand-400 font-mono">${formatTime(timeSec)}</strong></span>
    <button onclick="restartLectureFromBeginning()" class="text-xs font-semibold px-2 py-0.5 rounded bg-brand-500/20 text-brand-300 hover:bg-brand-500/30 transition">
      Start from 00:00
    </button>
    <button onclick="this.parentElement.remove()" class="text-slate-400 hover:text-white text-xs ml-1">✕</button>
  `;
  const videoWrapper = document.getElementById("main-video")?.parentElement;
  if (videoWrapper) {
    videoWrapper.style.position = 'relative';
    videoWrapper.appendChild(toast);
    setTimeout(() => {
      if (toast.parentElement) toast.remove();
    }, 8000);
  }
}

function restartLectureFromBeginning() {
  playSfx('click');
  const video = document.getElementById("main-video");
  if (video) {
    video.currentTime = 0;
    if (state.currentModule && state.session) {
      state.session.lecture_positions[state.currentModule.id] = 0;
      persistSession(true);
    }
  }
  const toast = document.getElementById("resume-toast");
  if (toast) toast.remove();
}

// ----------------- DATA LOADING -----------------
async function initApp() {
  try { lucide.createIcons(); } catch (e) { console.warn("Lucide icons:", e); }
  try { await initSessionMemory(); } catch (e) { console.warn("Session memory:", e); }
  try { initSubtitlePreferences(); } catch (e) { console.warn("Subtitle preferences:", e); }
  try { await loadProgress(); } catch (e) { console.warn("Progress load:", e); }
  try { await loadMinigames(); } catch (e) { console.warn("Minigames load:", e); }
  try { await loadExamIntel(); } catch (e) { console.warn("Exam intel load:", e); }
  try { await loadWorkspaceLectures(); } catch (e) { console.error("Workspace lectures load failed:", e); }
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
      const initialModId = (state.session && state.session.last_module_id && state.modules.some(m => m.id === state.session.last_module_id))
        ? state.session.last_module_id
        : state.modules[0].id;
      loadModule(initialModId);
      const lecSelect = document.getElementById("lecture-selector");
      if (lecSelect) lecSelect.value = initialModId;

      if (state.session && state.session.last_tab && state.session.last_tab !== 'theater') {
        switchTab(state.session.last_tab);
      }
      if (state.session && state.session.last_side_tab && state.session.last_side_tab !== 'slides') {
        switchSideTab(state.session.last_side_tab);
      }
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

  // Load video source & restore remembered playback position
  const video = document.getElementById("main-video");
  const savedPos = (state.session && state.session.lecture_positions) ? (state.session.lecture_positions[moduleId] || 0) : 0;
  if (state.session) {
    state.session.last_module_id = moduleId;
    persistSession();
  }

  if (state.currentStream) {
    video.src = `/api/video/${encodeURIComponent(mod.folder)}/${encodeURIComponent(state.currentStream)}`;
    if (savedPos > 3) {
      const seekToSaved = () => {
        if (video.duration && savedPos < (video.duration - 5)) {
          video.currentTime = savedPos;
          showResumeToast(savedPos);
        }
      };
      if (video.readyState >= 1 && video.duration) {
        seekToSaved();
      } else {
        video.addEventListener("loadedmetadata", seekToSaved, { once: true });
      }
    }
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

  // Update Exam Alert Banner & Counts
  updateLectureExamBanner(mod);
  updateExamCounts();
  const examContent = document.getElementById("sidecontent-examnotes");
  if (examContent && !examContent.classList.contains("hidden")) {
    renderExamNotes();
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
const progressBar = document.getElementById("video-progress");
const timeDisplay = document.getElementById("time-display");
const subtitleOverlay = document.getElementById("subtitle-overlay");
const subtitleText = document.getElementById("subtitle-text");

function togglePlay() {
  playSfx('click');
  const wasPaused = (video.paused || video.ended);
  if (wasPaused) {
    video.play().catch(e => console.warn("Video play error:", e));
  } else {
    video.pause();
  }
  // Flash center indicator: ▶ when playing, ⏸ when paused
  const flash = document.getElementById('play-flash');
  const flashIcon = document.getElementById('play-flash-icon');
  if (flash && flashIcon) {
    flashIcon.textContent = wasPaused ? '▶' : '⏸';
    flash.classList.remove('opacity-0');
    clearTimeout(flash._timer);
    flash._timer = setTimeout(() => flash.classList.add('opacity-0'), 600);
  }
}

function updatePlayBtn(isPlaying) {
  const btn = document.getElementById('play-icon');
  const playBtnEl = document.getElementById('play-btn');
  if (btn) btn.textContent = isPlaying ? '⏸' : '▶';
  if (playBtnEl) playBtnEl.title = isPlaying ? "Pause (Space)" : "Play (Space)";
}

video.addEventListener("play", () => {
  updatePlayBtn(true);
});

video.addEventListener("pause", () => {
  updatePlayBtn(false);
  if (state.currentModule && state.session) {
    state.session.lecture_positions[state.currentModule.id] = Math.floor(video.currentTime || 0);
    persistSession(true);
  }
});

video.addEventListener("ended", () => {
  updatePlayBtn(false);
  if (state.currentModule && state.session) {
    state.session.lecture_positions[state.currentModule.id] = 0;
    persistSession(true);
  }
});

video.addEventListener("seeked", () => {
  if (state.currentModule && state.session) {
    state.session.lecture_positions[state.currentModule.id] = Math.floor(video.currentTime || 0);
    persistSession();
  }
});

window.addEventListener("beforeunload", () => {
  if (state.currentModule && state.session && video.currentTime) {
    state.session.lecture_positions[state.currentModule.id] = Math.floor(video.currentTime);
  }
  persistSession(true);
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden && state.currentModule && state.session && video.currentTime) {
    state.session.lecture_positions[state.currentModule.id] = Math.floor(video.currentTime);
    persistSession(true);
  }
});

// Keyboard navigation: Spacebar toggles Play/Pause, Arrow keys seek
document.addEventListener("keydown", (e) => {
  if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) return;
  if (e.code === "Space") {
    e.preventDefault();
    togglePlay();
  } else if (e.code === "ArrowLeft") {
    e.preventDefault();
    seekVideo(-10);
  } else if (e.code === "ArrowRight") {
    e.preventDefault();
    seekVideo(10);
  }
});


function seekVideo(seconds) {
  playSfx('click');
  video.currentTime = Math.max(0, Math.min(video.duration || 0, video.currentTime + seconds));
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

  // Periodic session position auto-save every 5 seconds
  const intSec = Math.floor(cur);
  if (intSec % 5 === 0 && intSec > 0 && state.currentModule && state.session) {
    if (state.session.lecture_positions[state.currentModule.id] !== intSec) {
      state.session.lecture_positions[state.currentModule.id] = intSec;
      persistSession();
    }
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

  if (state.session) {
    state.session.playback_speed = speed;
    persistSession();
  }

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

  if (state.session) {
    state.session.playback_speed = speed;
    persistSession();
  }
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

  if (state.session) {
    state.session.subtitles_enabled = state.subtitlesEnabled;
    persistSession();
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

  let sprint = sprints[state.currentSprintIndex];
  if (!sprint) return;

  // 1. ACTIVE SPRINT COMPLETION CHECK (evaluated first so auto-detect never skips it)
  if (cur >= sprint.end_sec && !state.sprintCompletedThisRun) {
    state.sprintCompletedThisRun = true;
    state.completedSprints.add(sprint.id);
    localStorage.setItem('or_quest_completed_sprints', JSON.stringify(Array.from(state.completedSprints)));

    // Auto-Pause check: pause video immediately to give the user a rest break
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

    // Keep progress bar at 100% and countdown at 00:00 during completion pause
    const countdownEl = document.getElementById("sprint-countdown");
    if (countdownEl) countdownEl.innerText = "00:00 (Break Time)";
    const progressBarEl = document.getElementById("sprint-progress-bar");
    const percentEl = document.getElementById("sprint-progress-percent");
    if (progressBarEl) progressBarEl.style.width = "100%";
    if (percentEl) percentEl.innerText = "100% Completed";
    return;
  }

  // 2. AUTO-DETECT SPRINT ON SCRUBBING (only if scrubbed outside current bounds)
  if (cur < sprint.start_sec || (cur > sprint.end_sec + 2 && state.sprintCompletedThisRun)) {
    const detectedIdx = sprints.findIndex(s => cur >= s.start_sec && cur < s.end_sec);
    if (detectedIdx !== -1 && detectedIdx !== state.currentSprintIndex) {
      state.currentSprintIndex = detectedIdx;
      state.sprintCompletedThisRun = false;
      renderCurrentSprintCard();
      sprint = sprints[state.currentSprintIndex];
    }
  }

  // 3. UPDATE COUNTDOWN & PROGRESS BAR
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

// ----------------- EXAM INTEL & PROFESSOR'S NOTES CONTROLLER -----------------
async function loadExamIntel() {
  try {
    const res = await fetch("/api/exam-intel");
    const data = await res.json();
    state.examIntel = data.intel || [];
    
    // Merge backend user notes with any local cached notes
    const localNotes = JSON.parse(localStorage.getItem("or_quest_user_notes") || "[]");
    const backendNotes = data.user_notes || [];
    const notesMap = new Map();
    backendNotes.forEach(n => notesMap.set(n.id, n));
    localNotes.forEach(n => { if (!notesMap.has(n.id)) notesMap.set(n.id, n); });
    state.userNotes = Array.from(notesMap.values());
    
    updateExamCounts();
  } catch (e) {
    console.error("Error loading exam intel:", e);
  }
}

function updateLectureExamBanner(mod) {
  const banner = document.getElementById("lec-exam-alert-banner");
  if (!banner || !mod) return;
  const modIntel = state.examIntel.filter(i => i.module_id === mod.id);
  if (modIntel.length > 0) {
    banner.classList.remove("hidden");
    const titleEl = document.getElementById("lec-exam-alert-title");
    const descEl = document.getElementById("lec-exam-alert-desc");
    const topItem = modIntel.find(i => i.severity === 'critical') || modIntel[0];
    if (titleEl) {
      titleEl.innerText = `${modIntel.length} Exam Alert${modIntel.length > 1 ? 's' : ''} in this Lecture! (${topItem.title})`;
    }
    if (descEl) {
      descEl.innerText = `Prof. Lorenzo: "${topItem.quote.slice(0, 110)}..."`;
    }
  } else {
    banner.classList.add("hidden");
  }
}

function updateExamCounts() {
  const curModId = state.currentModule ? state.currentModule.id : null;
  const activeIntelCount = curModId ? state.examIntel.filter(i => i.module_id === curModId).length : 0;
  const activeUserCount = curModId ? state.userNotes.filter(n => n.module_id === curModId).length : 0;
  const totalActive = activeIntelCount + activeUserCount;
  const totalAll = state.examIntel.length + state.userNotes.length;

  const badge = document.getElementById("exam-notes-badge");
  if (badge) badge.innerText = totalAll;

  const scopeActiveEl = document.getElementById("scope-active-count");
  if (scopeActiveEl) scopeActiveEl.innerText = totalActive;

  const scopeAllEl = document.getElementById("scope-all-count");
  if (scopeAllEl) scopeAllEl.innerText = totalAll;
}

function setExamNotesScope(scope) {
  playSfx('click');
  state.examNotesScope = scope;
  const btnActive = document.getElementById("scope-btn-active");
  const btnAll = document.getElementById("scope-btn-all");

  if (scope === 'active') {
    if (btnActive) btnActive.className = "px-2.5 py-1 rounded-md font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 transition";
    if (btnAll) btnAll.className = "px-2.5 py-1 rounded-md font-semibold text-slate-400 hover:text-white transition";
  } else {
    if (btnAll) btnAll.className = "px-2.5 py-1 rounded-md font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 transition";
    if (btnActive) btnActive.className = "px-2.5 py-1 rounded-md font-semibold text-slate-400 hover:text-white transition";
  }
  renderExamNotes();
}

function filterExamNotes(query) {
  state.examSearchQuery = query;
  renderExamNotes();
}

function onExamCategoryFilter(category) {
  playSfx('click');
  state.examCategoryFilter = category;
  renderExamNotes();
}

function openExamTabForCurrentLecture() {
  playSfx('click');
  switchSideTab('examnotes');
  setExamNotesScope('active');
  const panel = document.getElementById("sidecontent-examnotes");
  if (panel && window.innerWidth < 1024) {
    panel.scrollIntoView({ behavior: 'smooth' });
  }
}

function renderExamNotes() {
  const container = document.getElementById("examnotes-container");
  if (!container) return;
  container.innerHTML = "";

  const currentModId = state.currentModule ? state.currentModule.id : null;
  const scope = state.examNotesScope;
  const cat = state.examCategoryFilter;
  const q = state.examSearchQuery.toLowerCase().trim();

  let items = [];

  // 1. Gather professor exam intel
  if (cat !== 'user') {
    state.examIntel.forEach(item => {
      items.push({ ...item, is_user_note: false });
    });
  }

  // 2. Gather student personal notes
  if (cat === 'all' || cat === 'user') {
    state.userNotes.forEach(un => {
      items.push({
        id: un.id,
        module_id: un.module_id,
        folder: un.folder || (state.modules.find(m => m.id === un.module_id)?.folder || "IE 214"),
        lecture_date: un.lecture_date || un.created_at || "Personal Note",
        time_sec: un.time_sec || 0,
        time_str: formatTime(un.time_sec || 0),
        category: 'user',
        category_label: 'Student Note',
        severity: 'user',
        title: un.title,
        speaker: 'You (Personal Note)',
        quote: un.note,
        summary: 'Custom student reminder saved in OR-Quest.',
        action_rule: null,
        created_at: un.created_at,
        is_user_note: true
      });
    });
  }

  // 3. Filter by scope (active vs all)
  if (scope === 'active' && currentModId) {
    items = items.filter(it => it.module_id === currentModId);
  }

  // 4. Filter by category
  if (cat !== 'all') {
    items = items.filter(it => it.category === cat);
  }

  // 5. Filter by search query
  if (q) {
    items = items.filter(it => 
      (it.title && it.title.toLowerCase().includes(q)) ||
      (it.quote && it.quote.toLowerCase().includes(q)) ||
      (it.summary && it.summary.toLowerCase().includes(q)) ||
      (it.action_rule && it.action_rule.toLowerCase().includes(q)) ||
      (it.category_label && it.category_label.toLowerCase().includes(q)) ||
      (it.folder && it.folder.toLowerCase().includes(q))
    );
  }

  // Sort critical warnings to the top
  const severityRank = { 'critical': 1, 'high': 2, 'gold': 2, 'warning': 3, 'user': 4, 'info': 5, 'theory': 6 };
  items.sort((a, b) => (severityRank[a.severity] || 99) - (severityRank[b.severity] || 99));

  if (items.length === 0) {
    container.innerHTML = `
      <div class="text-center text-slate-500 py-12 text-xs space-y-2">
        <i data-lucide="bookmark-x" class="w-8 h-8 mx-auto opacity-50"></i>
        <p class="font-medium text-slate-400">No exam notes found matching your filter.</p>
        <p class="text-[11px] text-slate-500">Switch scope to "All Lectures" or add a new personal note!</p>
      </div>`;
    lucide.createIcons();
    return;
  }

  items.forEach(it => {
    const card = document.createElement("div");
    const sevClass = `card-${it.severity || 'info'}`;
    card.className = `exam-intel-card ${sevClass} p-3.5 rounded-xl bg-dark-950/90 text-xs space-y-2.5`;

    let badgeColor = 'bg-blue-500/15 text-blue-300 border-blue-500/30';
    let icon = '📌';
    if (it.severity === 'critical') {
      badgeColor = 'bg-red-500/15 text-red-300 border-red-500/30';
      icon = '🚨';
    } else if (it.severity === 'high' || it.severity === 'gold') {
      badgeColor = 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      icon = '🎯';
    } else if (it.severity === 'warning') {
      badgeColor = 'bg-orange-500/15 text-orange-300 border-orange-500/30';
      icon = '⚠️';
    } else if (it.is_user_note) {
      badgeColor = 'bg-purple-500/15 text-purple-300 border-purple-500/30';
      icon = '📝';
    }

    card.innerHTML = `
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-1.5 flex-wrap">
          <span class="px-2 py-0.5 rounded text-[10px] font-bold border ${badgeColor} flex items-center gap-1">
            <span>${icon}</span>
            <span>${it.category_label || 'Exam Intel'}</span>
          </span>
          <span class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-dark-900 border border-slate-800 text-slate-400">
            ${it.folder || 'Lecture'}
          </span>
        </div>

        <div class="flex items-center gap-1.5">
          <button onclick="seekToExamTimestamp('${it.module_id}', '${it.folder}', ${it.time_sec})" class="px-2 py-0.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[11px] font-mono font-bold flex items-center gap-1 transition" title="Seek video to this exact moment">
            <span>▶</span>
            <span>${it.time_str || formatTime(it.time_sec)}</span>
          </button>
          ${it.is_user_note ? `
            <button onclick="deleteStudentNote('${it.id}')" class="p-1 rounded text-slate-500 hover:text-red-400 transition" title="Delete note">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
          ` : ''}
        </div>
      </div>

      <div>
        <h4 class="font-bold text-white text-sm leading-snug">${it.title}</h4>
        <p class="text-[11px] text-slate-300 mt-1 leading-relaxed">${it.summary || ''}</p>
      </div>

      <!-- QUOTE BOX -->
      <div class="exam-quote-box p-2.5 rounded-lg text-slate-300 text-[11px] leading-relaxed">
        <div class="text-[10px] font-semibold text-slate-400 not-italic mb-1 flex items-center gap-1">
          <span>🗣️</span>
          <span>${it.speaker || 'Professor Lowell Lorenzo'}:</span>
        </div>
        "${it.quote}"
      </div>

      <!-- ACTIONABLE RULE / FORMULA BOX -->
      ${it.action_rule ? `
        <div class="exam-rule-box p-2.5 rounded-lg text-amber-200/90 text-[11px] leading-relaxed">
          <div class="font-bold text-amber-300 text-[10px] uppercase tracking-wider flex items-center gap-1 mb-0.5">
            <span>🎯</span>
            <span>Exam Action Rule & Strategy:</span>
          </div>
          <div>${it.action_rule}</div>
        </div>
      ` : ''}
    `;

    container.appendChild(card);
  });

  lucide.createIcons();
}

async function seekToExamTimestamp(moduleId, folder, timeSec) {
  playSfx('click');
  const video = document.getElementById("main-video");

  // Switch lecture if needed
  if (!state.currentModule || state.currentModule.id !== moduleId) {
    const targetMod = state.modules.find(m => m.id === moduleId || m.folder === folder);
    if (targetMod) {
      document.getElementById("lecture-selector").value = targetMod.id;
      await loadModule(targetMod.id);
      triggerToast(`Switched to ${targetMod.folder} for this exam hint!`);
    }
  }

  // Seek and play
  video.currentTime = timeSec;
  video.play().catch(e => console.warn("Video seek play error:", e));

  // Visual flash
  const flash = document.getElementById('play-flash');
  const flashIcon = document.getElementById('play-flash-icon');
  if (flash && flashIcon) {
    flashIcon.textContent = '🎯';
    flash.classList.remove('opacity-0');
    clearTimeout(flash._timer);
    flash._timer = setTimeout(() => flash.classList.add('opacity-0'), 800);
  }

  triggerToast(`🎯 Jumped to ${formatTime(timeSec)}: Professor Lorenzo discussing exam topic`);
  sendPlayerAction("exam_intel_seek", { module: moduleId, time_sec: timeSec });
}

function toggleAddNoteDrawer() {
  playSfx('click');
  const drawer = document.getElementById("add-student-note-drawer");
  if (!drawer) return;
  const isHidden = drawer.classList.contains("hidden");
  drawer.classList.toggle("hidden");
  if (isHidden) {
    captureCurrentVideoTimeToNote();
    const titleInput = document.getElementById("student-note-title");
    if (titleInput) titleInput.focus();
  }
}

function captureCurrentVideoTimeToNote() {
  const cur = Math.floor(video.currentTime || 0);
  state.capturedNoteTime = cur;
  const display = document.getElementById("add-note-time-display");
  if (display) display.innerText = formatTime(cur);
}

async function submitStudentNote() {
  playSfx('click');
  const titleInput = document.getElementById("student-note-title");
  const bodyInput = document.getElementById("student-note-body");
  const title = titleInput.value.trim();
  const body = bodyInput.value.trim();

  if (!title && !body) {
    triggerToast("Please write a title or note content first!");
    return;
  }

  const curMod = state.currentModule;
  const payload = {
    module_id: curMod ? curMod.id : "general",
    folder: curMod ? curMod.folder : "IE 214",
    time_sec: state.capturedNoteTime || Math.floor(video.currentTime || 0),
    title: title || "Exam Note",
    note: body || title
  };

  try {
    const res = await fetch("/api/user-notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      state.userNotes.unshift(data.note);
      localStorage.setItem("or_quest_user_notes", JSON.stringify(state.userNotes));
      titleInput.value = "";
      bodyInput.value = "";
      toggleAddNoteDrawer();
      updateExamCounts();
      renderExamNotes();
      playSfx('correct');
      triggerToast("✨ Personal note saved successfully!");
      sendPlayerAction("add_exam_note", { id: data.note.id });
    }
  } catch (err) {
    console.error("Save note error:", err);
  }
}

async function deleteStudentNote(noteId) {
  playSfx('click');
  try {
    const res = await fetch(`/api/user-notes/${encodeURIComponent(noteId)}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      state.userNotes = state.userNotes.filter(n => n.id !== noteId);
      localStorage.setItem("or_quest_user_notes", JSON.stringify(state.userNotes));
      updateExamCounts();
      renderExamNotes();
      triggerToast("Note deleted.");
    }
  } catch (err) {
    console.error("Delete note error:", err);
  }
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

// ==================== KNOWLEDGE BASE LOGIC ====================

async function loadKnowledgeBase() {
  try {
    if (!state.knowledgeBaseData || state.knowledgeBaseData.length === 0) {
      const res = await fetch("/api/knowledge-base");
      if (res.ok) {
        state.knowledgeBaseData = await res.json();
      }
    }
    renderKnowledgeBaseView();
  } catch (e) {
    console.error("Error loading knowledge base:", e);
  }
}

function selectKnowledgeBaseModule(modId) {
  playSfx('click');
  state.kbSelectedModule = modId;

  // Update active chip styling
  document.querySelectorAll(".kb-chip").forEach(chip => {
    chip.classList.remove("active", "bg-brand-600", "text-white");
    chip.classList.add("bg-dark-800", "text-slate-300");
  });
  const activeBtn = document.getElementById(`kb-chip-${modId}`);
  if (activeBtn) {
    activeBtn.classList.add("active", "bg-brand-600", "text-white");
    activeBtn.classList.remove("bg-dark-800", "text-slate-300");
  }

  renderKnowledgeBaseView();
}

function handleKnowledgeBaseSearch() {
  const input = document.getElementById("kb-search-input");
  state.kbSearchQuery = input ? input.value.trim().toLowerCase() : "";
  const clearBtn = document.getElementById("kb-search-clear");
  if (clearBtn) {
    clearBtn.classList.toggle("hidden", !state.kbSearchQuery);
  }
  renderKnowledgeBaseView();
}

function clearKnowledgeBaseSearch() {
  playSfx('click');
  const input = document.getElementById("kb-search-input");
  if (input) input.value = "";
  state.kbSearchQuery = "";
  const clearBtn = document.getElementById("kb-search-clear");
  if (clearBtn) clearBtn.classList.add("hidden");
  renderKnowledgeBaseView();
}

function renderKnowledgeBaseView() {
  const container = document.getElementById("kb-content-container");
  if (!container) return;

  if (!state.knowledgeBaseData || state.knowledgeBaseData.length === 0) {
    container.innerHTML = `
      <div class="p-8 text-center text-slate-400 bg-dark-900 rounded-2xl border border-slate-800">
        <i data-lucide="loader" class="w-8 h-8 animate-spin mx-auto mb-2 text-brand-400"></i>
        <p class="text-sm">Loading transcript-grounded knowledge base...</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  // Filter modules by chip selection
  let filteredModules = state.knowledgeBaseData;
  if (state.kbSelectedModule !== 'all') {
    filteredModules = filteredModules.filter(m => m.module_id === state.kbSelectedModule);
  }

  const query = state.kbSearchQuery;
  let html = "";

  filteredModules.forEach(mod => {
    // If query exists, filter internal items
    const matchesModule = !query || 
      mod.title.toLowerCase().includes(query) || 
      mod.topic.toLowerCase().includes(query) || 
      mod.executive_summary.toLowerCase().includes(query);

    const matchingConcepts = (mod.core_concepts || []).filter(c => 
      !query || matchesModule || c.term.toLowerCase().includes(query) || c.definition.toLowerCase().includes(query) || c.category.toLowerCase().includes(query)
    );

    const matchingMath = (mod.mathematical_models || []).filter(m => 
      !query || matchesModule || m.name.toLowerCase().includes(query) || (m.notes && m.notes.toLowerCase().includes(query)) || m.latex.toLowerCase().includes(query)
    );

    const matchingAlgorithms = (mod.algorithms_and_steps || []).filter(a => 
      !query || matchesModule || a.name.toLowerCase().includes(query) || (a.notes && a.notes.toLowerCase().includes(query)) || a.steps.some(s => s.toLowerCase().includes(query))
    );

    const matchingDiscussions = (mod.classroom_discussions || []).filter(d => 
      !query || matchesModule || d.topic.toLowerCase().includes(query) || d.student_question.toLowerCase().includes(query) || d.professor_answer.toLowerCase().includes(query)
    );

    const matchingWatchpoints = (mod.exam_watchpoints || []).filter(w => 
      !query || matchesModule || w.title.toLowerCase().includes(query) || w.warning.toLowerCase().includes(query) || w.rule.toLowerCase().includes(query)
    );

    // If query provided and nothing matches in this module, skip
    if (query && !matchesModule && matchingConcepts.length === 0 && matchingMath.length === 0 && 
        matchingAlgorithms.length === 0 && matchingDiscussions.length === 0 && matchingWatchpoints.length === 0) {
      return;
    }

    html += `
      <div class="p-6 rounded-2xl bg-dark-900 border border-slate-800 shadow-xl space-y-6">
        
        <!-- MODULE BANNER -->
        <div class="border-b border-slate-800 pb-4">
          <div class="flex flex-wrap items-center justify-between gap-2 mb-1.5">
            <div class="flex items-center gap-2">
              <span class="px-2.5 py-0.5 rounded-md bg-brand-500/10 border border-brand-500/30 text-brand-400 font-mono text-xs font-semibold">
                ${mod.lecture_date}
              </span>
              <span class="text-xs text-slate-400 font-mono">Duration: ${mod.duration_min} mins</span>
            </div>
            <button onclick="jumpToKnowledgeTimestamp('${mod.module_id}', 0)" class="flex items-center gap-1 px-3 py-1 rounded-lg bg-brand-600/20 hover:bg-brand-600/30 border border-brand-500/40 text-brand-300 text-xs font-semibold transition">
              <i data-lucide="play" class="w-3.5 h-3.5"></i>
              <span>Play Session Video</span>
            </button>
          </div>
          <h3 class="text-lg font-black text-white">${mod.title}</h3>
          <p class="text-xs text-brand-400 font-medium">${mod.topic}</p>
          <div class="mt-3 p-3.5 rounded-xl bg-dark-950/80 border border-slate-800/80 text-xs text-slate-300 leading-relaxed">
            <strong class="text-slate-100 font-semibold block mb-1">📋 Executive Summary:</strong>
            ${mod.executive_summary}
          </div>
        </div>

        <!-- 1. CORE CONCEPTS -->
        ${matchingConcepts.length > 0 ? `
          <div class="space-y-3">
            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <span class="text-brand-400">💡</span> Core Theoretical Concepts (${matchingConcepts.length})
            </h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              ${matchingConcepts.map(c => `
                <div class="p-3.5 rounded-xl bg-dark-950 border border-slate-800 hover:border-brand-500/40 transition flex flex-col justify-between">
                  <div>
                    <div class="flex items-center justify-between gap-2 mb-1">
                      <span class="font-bold text-sm text-brand-300">${c.term}</span>
                      <span class="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">${c.category}</span>
                    </div>
                    <p class="text-xs text-slate-300 leading-relaxed">${c.definition}</p>
                  </div>
                  <div class="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
                    <span class="text-slate-500 font-mono">Lecture ref:</span>
                    <button onclick="jumpToKnowledgeTimestamp('${mod.module_id}', ${c.time_sec || 0})" class="inline-flex items-center gap-1 font-mono font-bold text-accent-400 hover:text-accent-300 bg-accent-500/10 hover:bg-accent-500/20 px-2 py-0.5 rounded transition">
                      <span>▶</span>
                      <span>${c.timestamp || formatTime(c.time_sec || 0)}</span>
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- 2. MATHEMATICAL MODELS & FORMULAS -->
        ${matchingMath.length > 0 ? `
          <div class="space-y-3">
            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <span class="text-accent-400">📐</span> Mathematical Formulations & KaTeX (${matchingMath.length})
            </h4>
            <div class="space-y-3">
              ${matchingMath.map(m => `
                <div class="p-4 rounded-xl bg-dark-950 border border-slate-800 space-y-2">
                  <div class="flex items-center justify-between">
                    <span class="font-bold text-xs text-white">${m.name}</span>
                    ${m.time_sec ? `
                      <button onclick="jumpToKnowledgeTimestamp('${mod.module_id}', ${m.time_sec})" class="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-accent-400 hover:text-accent-300 bg-accent-500/10 px-2 py-0.5 rounded transition">
                        <span>▶</span>
                        <span>${m.timestamp || formatTime(m.time_sec)}</span>
                      </button>
                    ` : ''}
                  </div>
                  <div class="kb-math-block overflow-x-auto p-3 rounded-lg bg-dark-900 border border-slate-800/80 font-mono text-xs text-emerald-300 text-center">
                    $$${m.latex}$$
                  </div>
                  ${m.notes ? `<p class="text-[11px] text-slate-400 italic">${m.notes}</p>` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- 3. ALGORITHMS & STEP-BY-STEP PROCEDURES -->
        ${matchingAlgorithms.length > 0 ? `
          <div class="space-y-3">
            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <span class="text-yellow-400">⚙️</span> Algorithmic Execution Steps (${matchingAlgorithms.length})
            </h4>
            <div class="space-y-3">
              ${matchingAlgorithms.map(a => `
                <div class="p-4 rounded-xl bg-dark-950 border border-slate-800 space-y-3">
                  <span class="font-bold text-xs text-yellow-300 block">${a.name}</span>
                  <div class="space-y-1.5">
                    ${a.steps.map((s, idx) => `
                      <div class="flex items-start gap-2.5 text-xs text-slate-300">
                        <span class="w-5 h-5 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center justify-center font-mono text-[10px] font-bold shrink-0 mt-0.5">${idx + 1}</span>
                        <span class="leading-relaxed">${s}</span>
                      </div>
                    `).join('')}
                  </div>
                  ${a.notes ? `<p class="text-[11px] text-slate-400 bg-dark-900 p-2 rounded border border-slate-800 italic">💡 ${a.notes}</p>` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- 4. CLASSROOM DISCUSSIONS & STUDENT Q&A -->
        ${matchingDiscussions.length > 0 ? `
          <div class="space-y-3">
            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <span class="text-cyan-400">💬</span> Classroom Q&A & Student Inquiries (${matchingDiscussions.length})
            </h4>
            <div class="space-y-3">
              ${matchingDiscussions.map(d => `
                <div class="p-4 rounded-xl bg-dark-950 border border-slate-800 space-y-3">
                  <div class="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                    <span class="font-bold text-xs text-cyan-300 flex items-center gap-1.5">
                      <span>📌</span>
                      <span>Topic: ${d.topic}</span>
                    </span>
                    <button onclick="jumpToKnowledgeTimestamp('${mod.module_id}', ${d.time_sec || 0})" class="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-accent-400 hover:text-accent-300 bg-accent-500/10 px-2 py-0.5 rounded transition">
                      <span>▶</span>
                      <span>${d.timestamp || formatTime(d.time_sec || 0)}</span>
                    </button>
                  </div>
                  <div class="space-y-2 text-xs">
                    <div class="p-2.5 rounded-lg bg-dark-900 border border-slate-800/60">
                      <strong class="text-slate-400 text-[11px] block mb-0.5">👤 Student Question:</strong>
                      <span class="text-slate-200">"${d.student_question}"</span>
                    </div>
                    <div class="p-2.5 rounded-lg bg-brand-950/40 border border-brand-500/20">
                      <strong class="text-brand-400 text-[11px] block mb-0.5">🎓 Prof. Lowell Lorenzo:</strong>
                      <span class="text-slate-200">"${d.professor_answer}"</span>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- 5. EXAM WATCHPOINTS & TRAPS -->
        ${matchingWatchpoints.length > 0 ? `
          <div class="space-y-3">
            <h4 class="text-xs font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
              <span class="text-red-400">⚠️</span> Exam Watchpoints & Pitfalls (${matchingWatchpoints.length})
            </h4>
            <div class="space-y-2.5">
              ${matchingWatchpoints.map(w => `
                <div class="p-3.5 rounded-xl bg-red-950/20 border border-red-500/30 space-y-2">
                  <div class="flex items-center justify-between gap-2">
                    <span class="font-bold text-xs text-red-300 flex items-center gap-1.5">
                      <span>🚨</span>
                      <span>${w.title}</span>
                    </span>
                    <button onclick="jumpToKnowledgeTimestamp('${mod.module_id}', ${w.time_sec || 0})" class="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-red-300 hover:text-white bg-red-500/20 px-2 py-0.5 rounded transition">
                      <span>▶</span>
                      <span>${w.timestamp || formatTime(w.time_sec || 0)}</span>
                    </button>
                  </div>
                  <p class="text-xs text-slate-300"><strong class="text-red-400 font-semibold">Trap Warning:</strong> ${w.warning}</p>
                  <p class="text-xs text-emerald-300 bg-emerald-950/30 p-2 rounded border border-emerald-500/20"><strong class="font-semibold text-emerald-400">Actionable Rule:</strong> ${w.rule}</p>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

      </div>
    `;
  });

  if (!html) {
    html = `
      <div class="p-12 text-center text-slate-400 bg-dark-900 rounded-2xl border border-slate-800 space-y-2">
        <span class="text-3xl block">🔍</span>
        <h4 class="font-bold text-white text-sm">No knowledge base items found</h4>
        <p class="text-xs text-slate-400">No terms, formulas, or Q&A match your search query "${state.kbSearchQuery}".</p>
        <button onclick="clearKnowledgeBaseSearch()" class="mt-2 px-3 py-1.5 rounded-xl bg-brand-600 text-white text-xs font-semibold">Clear Search</button>
      </div>
    `;
  }

  container.innerHTML = html;
  lucide.createIcons();
  renderMathInContainer(container);
}

function renderMathInContainer(container) {
  if (window.renderMathInElement) {
    try {
      window.renderMathInElement(container, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "$", right: "$", display: false }
        ],
        throwOnError: false
      });
    } catch (e) {
      console.warn("KaTeX rendering warning:", e);
    }
  }
}

async function jumpToKnowledgeTimestamp(moduleId, timeSec) {
  playSfx('click');
  switchTab('theater');
  if (!state.currentModule || state.currentModule.id !== moduleId) {
    await loadModule(moduleId);
    const select = document.getElementById("lecture-selector");
    if (select) select.value = moduleId;
  }
  const video = document.getElementById("main-video");
  if (video) {
    video.currentTime = timeSec;
    video.play().catch(e => console.warn("Video play error:", e));
  }
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
