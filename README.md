# 🎮 OR-Quest — Gamified IE 214 Learning Hub

> **IE 214 Introductory Operations Research** · UP Diliman  
> Prof. Lowell Lorenzo · MEngAI Program

A gamified desktop learning companion that turns recorded Zoom lectures into an interactive, ADHD-friendly study experience — with XP, badges, Focus Sprints, synced slides, and live subtitles.

---

## ✨ Features

### 🎥 Smart Video Player
- Streams recorded lecture videos directly from your local folder
- **Subtitle support** with customizable size (SM / MD / LG / XL) and color theme (Amber / White / Neon)
- **Playback speed control** (0.5× – 2×)
- Auto-selects the face + screen-share recording (with professor annotations) over audio-only captures

### 📄 Slide Sync
- PDF slides automatically sync to the video as you watch
- Multi-deck support — slides switch decks mid-lecture when the professor changes slide sets
- **📍 Pin Slide** — manually pin any slide to the current video timestamp and earn +20 XP
- Fine-tune slide timing with the built-in calibration tool

### 🏃 ADHD Focus Sprints
- Each lecture is broken into **5–10 minute micro-sessions** (sprints) designed for short attention spans
- A HUD card shows the current sprint goal, countdown timer, and progress bar
- Completing a sprint earns **+30 XP** and unlocks the 🏅 Sprint Champion badge at 3 sprints

### 🏆 Gamification System
| Element | Details |
|---|---|
| **XP & Levels** | Earn XP by watching, quizzing, completing sprints, and pinning slides |
| **Badges** | 12+ unlockable badges (First Steps, Speed Demon, Night Owl, Sprint Champion, Slide Calibrator…) |
| **Ranks** | Advance from *Freshman* → *Sophomore* → … → *Dean's Lister* |
| **Quizzes** | Per-module multiple-choice quizzes with instant feedback |
| **Mini-games** | Flash Cards and Quick Solve challenge modes |
| **Streak Tracking** | Daily study streak counter |

### 🖥️ Desktop App
- Launches as a standalone Windows desktop app (no browser tab, no setup)
- Double-click `OR-Quest.exe` — done

---

## 📁 Project Structure

```
IE 214/
├── app/
│   ├── backend/
│   │   ├── server.py          # FastAPI server (video streaming, slide rendering, API)
│   │   ├── course_data.py     # All modules, sprints, quizzes, badges, ranks
│   │   ├── gamification.py    # XP engine, badge unlocking, progress persistence
│   │   ├── scanner.py         # Auto-discovers lecture folders and video files
│   │   └── transcriber.py     # Background Whisper transcription → VTT subtitles
│   ├── frontend/
│   │   ├── index.html         # Single-page app UI
│   │   ├── app.js             # All frontend logic (state, video player, sprints, sync)
│   │   └── styles.css         # Theming, animations, subtitle size classes
│   └── data/                  # Runtime data (gitignored — created on first run)
│       ├── user_progress.json
│       └── custom_slide_markers.json
├── Slides/                    # PDF slide decks
├── Exercises/                 # Exercise handouts
├── Syllabus/                  # Course syllabus
├── August 10/                 # Lecture folder (MP4 video + auto-generated VTT)
├── August 17/
├── August 24/
├── September 7/
├── September 14/
├── launch_app.py              # Launcher: starts FastAPI server + opens Edge app window
├── run_app.bat                # Windows batch launcher
├── OR-Quest.exe               # Compiled standalone executable
└── icon.ico                   # App icon
```

> **Note:** `.mp4` video files and `.vtt` transcripts are excluded from this repo (too large).
> Place your lecture recordings in the corresponding `August XX/` / `September XX/` folders.

---

## 🚀 Getting Started

### Requirements
- Windows 10/11
- Python 3.10+ (with `pip`)
- Microsoft Edge (installed by default on Windows 10/11)

### Install Dependencies

```bash
pip install fastapi uvicorn pymupdf faster-whisper
```

### Run the App

**Option A — Double-click the exe (easiest):**
```
OR-Quest.exe
```

**Option B — From the command line:**
```bash
run_app.bat
```

**Option C — Python directly:**
```bash
python launch_app.py
```

The app will:
1. Start the FastAPI backend on `http://localhost:8000`
2. Open a dedicated Edge window in app mode
3. Auto-scan your lecture folders for videos and slides

### First-Time Subtitle Generation
On first play of each lecture, OR-Quest will automatically transcribe the video using
[faster-whisper](https://github.com/guillaumekynast/faster-whisper) in the background.
This may take a few minutes depending on your hardware. The `.vtt` file is saved next
to the video for instant loading on subsequent plays.

---

## 🎓 Course Modules

| # | Lecture | Topics | Sprints |
|---|---------|--------|---------|
| 1 | Aug 10 | Introduction to OR, History, Scientific Method | 8 sprints |
| 2 | Aug 17 | Linear Programming, Graphical Method | 18 sprints |
| 3 | Aug 24 | Simplex Method | 15 sprints |
| 4 | Sep 7  | Duality, Sensitivity Analysis | 11 sprints |
| 5 | Sep 14 | Transportation & Assignment Problems | 14 sprints |

---

## 🛠️ Development

### Run the backend server standalone:
```bash
cd app/backend
uvicorn server:app --reload --port 8000
```
Then open `http://localhost:8000` in any browser.

### Recompile the exe:
```bash
pip install pyinstaller
python -m PyInstaller --onefile --noconsole --icon=icon.ico --name=OR-Quest launch_app.py --clean -y
copy dist\OR-Quest.exe OR-Quest.exe
```

### Adding a New Lecture
1. Create a folder (e.g., `September 21/`) and place the MP4 recording inside
2. Add a corresponding module entry in `app/backend/course_data.py`
3. Restart the app — the scanner will auto-detect the new folder

---

## 📸 Screenshots

*Coming soon — add your own screenshots to this section!*

---

## 📝 License

Personal educational use. Course materials © UP Diliman / Prof. Lowell Lorenzo.

---

*Built with ❤️ for ADHD-friendly learning · Powered by FastAPI, faster-whisper, PyMuPDF & vanilla JS*
