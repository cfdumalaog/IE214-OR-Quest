"""
server.py - FastAPI Backend for OR-Quest (IE 214 Gamified Learning Hub)
"""

import os
import mimetypes
from typing import Optional, Dict, Any
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.responses import StreamingResponse, FileResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import fitz  # PyMuPDF

from app.backend.course_data import (
    MODULES_DATA, MINIGAMES_DATA, BADGES_DATA, RANKS_DATA,
    EXAM_INTEL_DATA, save_custom_marker, load_custom_markers,
    load_user_notes, save_user_note, delete_user_note,
    load_session_state, save_session_state
)
from app.backend.scanner import scan_workspace
from app.backend.transcriber import (
    parse_vtt_file,
    start_transcription,
    get_transcription_status
)
from app.backend.gamification import (
    load_progress,
    get_current_rank,
    record_player_action
)
from app.backend.knowledge_base import (
    get_all_knowledge_base,
    get_module_knowledge_base
)

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
FRONTEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend"))

app = FastAPI(title="OR-Quest IE 214 API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Slide rendering in-memory cache: (deck_name, page_num) -> bytes
SLIDE_CACHE: Dict[tuple, bytes] = {}


def get_range_stream(file_path: str, range_header: Optional[str] = None):
    """Range-request generator for efficient video streaming and scrubbing."""
    file_size = os.path.getsize(file_path)
    
    if not range_header:
        def full_file_gen():
            with open(file_path, "rb") as f:
                while chunk := f.read(1024 * 1024):
                    yield chunk
        return StreamingResponse(
            full_file_gen(),
            status_code=200,
            headers={
                "Accept-Ranges": "bytes",
                "Content-Length": str(file_size),
                "Content-Type": "video/mp4"
            }
        )

    # Parse range header: e.g. "bytes=1000-2000" or "bytes=1000-"
    range_match = range_header.replace("bytes=", "").split("-")
    start = int(range_match[0]) if range_match[0] else 0
    end = int(range_match[1]) if len(range_match) > 1 and range_match[1] else file_size - 1
    end = min(end, file_size - 1)
    chunk_length = end - start + 1

    def range_gen():
        with open(file_path, "rb") as f:
            f.seek(start)
            remaining = chunk_length
            while remaining > 0:
                read_size = min(1024 * 512, remaining)
                chunk = f.read(read_size)
                if not chunk:
                    break
                remaining -= len(chunk)
                yield chunk

    return StreamingResponse(
        range_gen(),
        status_code=206,
        headers={
            "Accept-Ranges": "bytes",
            "Content-Range": f"bytes {start}-{end}/{file_size}",
            "Content-Length": str(chunk_length),
            "Content-Type": "video/mp4"
        }
    )


@app.get("/api/lectures")
def list_lectures():
    """Discover all lectures, videos, transcripts, slides and exercises."""
    return scan_workspace(BASE_DIR)


@app.get("/api/video/{folder}/{filename}")
async def stream_video(folder: str, filename: str, request: Request):
    """Stream video with HTTP Range support for instantaneous seeking & scrubbing."""
    video_path = os.path.join(BASE_DIR, folder, filename)
    if not os.path.exists(video_path) or not video_path.lower().endswith(".mp4"):
        raise HTTPException(status_code=404, detail="Video file not found")
    
    range_header = request.headers.get("range")
    return get_range_stream(video_path, range_header)


@app.get("/api/slides/{deck_name}")
def get_slide_deck_info(deck_name: str):
    """Get metadata for a slide deck (page count, titles)."""
    # Remove .pdf if provided
    deck_name = deck_name.replace(".pdf", "")
    pdf_path = os.path.join(BASE_DIR, "Slides", f"{deck_name}.pdf")
    if not os.path.exists(pdf_path):
        # Try finding in Exercises
        pdf_path = os.path.join(BASE_DIR, "Exercises", f"{deck_name}.pdf")
        if not os.path.exists(pdf_path):
            raise HTTPException(status_code=404, detail="Slide deck not found")

    try:
        doc = fitz.open(pdf_path)
        pages_info = []
        for i in range(len(doc)):
            text = " ".join(doc[i].get_text().split())[:120]
            pages_info.append({"page": i + 1, "preview_text": text})

        return {
            "deck_id": deck_name,
            "total_pages": len(doc),
            "pages": pages_info
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/slides/{deck_name}/{page_num}.png")
def render_slide_page(deck_name: str, page_num: int):
    """Render a specific slide page to crisp PNG on the fly with in-memory caching."""
    deck_name = deck_name.replace(".pdf", "")
    cache_key = (deck_name, page_num)
    if cache_key in SLIDE_CACHE:
        return Response(content=SLIDE_CACHE[cache_key], media_type="image/png")

    pdf_path = os.path.join(BASE_DIR, "Slides", f"{deck_name}.pdf")
    if not os.path.exists(pdf_path):
        pdf_path = os.path.join(BASE_DIR, "Exercises", f"{deck_name}.pdf")
        if not os.path.exists(pdf_path):
            raise HTTPException(status_code=404, detail="Slide PDF not found")

    try:
        doc = fitz.open(pdf_path)
        if page_num < 1 or page_num > len(doc):
            raise HTTPException(status_code=400, detail="Page number out of bounds")

        page = doc[page_num - 1]
        # Render at 150 DPI for high resolution
        pix = page.get_pixmap(dpi=150)
        img_bytes = pix.tobytes("png")
        
        # Cache image (limit cache size to ~200 slides)
        if len(SLIDE_CACHE) > 200:
            SLIDE_CACHE.pop(next(iter(SLIDE_CACHE)))
        SLIDE_CACHE[cache_key] = img_bytes

        return Response(
            content=img_bytes,
            media_type="image/png",
            headers={"Cache-Control": "public, max-age=86400"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/slides/pin")
async def pin_slide_timestamp(request: Request):
    """Save or calibrate custom slide timestamp to the video playback time."""
    body = await request.json()
    module_id = body.get("module_id")
    slide_deck = body.get("slide_deck")
    slide_page = int(body.get("slide_page", 1))
    time_sec = int(body.get("time_sec", 0))
    save_custom_marker(module_id, slide_deck, slide_page, time_sec)
    return {"success": True, "message": f"Pinned slide {slide_page} to {time_sec}s"}


@app.get("/api/transcripts/{folder}")
def get_transcript(folder: str):
    """Return parsed VTT transcript cues for interactive scrolling & click-to-seek."""
    folder_path = os.path.join(BASE_DIR, folder)
    if not os.path.isdir(folder_path):
        raise HTTPException(status_code=404, detail="Folder not found")

    vtt_files = [f for f in os.listdir(folder_path) if f.lower().endswith((".vtt", ".srt"))]
    if vtt_files:
        vtt_path = os.path.join(folder_path, vtt_files[0])
        cues = parse_vtt_file(vtt_path)
        return {
            "has_vtt": True,
            "filename": vtt_files[0],
            "total_cues": len(cues),
            "cues": cues
        }

    # If no VTT file exists yet, check if course_data has slide markers
    mod = next((m for m in MODULES_DATA if m["folder"].lower() == folder.lower()), None)
    if mod and mod.get("slide_markers"):
        markers = mod["slide_markers"]
        synth_cues = []
        for idx, sm in enumerate(markers):
            next_time = markers[idx + 1]["time_sec"] if idx + 1 < len(markers) else (sm["time_sec"] + 900)
            slide_num = sm.get("slide", idx + 1)
            sm_title = sm.get("title", f"Slide {slide_num}")
            sm_topic = f" - {sm['topic']}" if sm.get("topic") else ""
            synth_cues.append({
                "id": idx + 1,
                "start": float(sm["time_sec"]),
                "end": float(next_time),
                "start_str": f"{sm['time_sec'] // 60:02d}:{sm['time_sec'] % 60:02d}",
                "end_str": f"{next_time // 60:02d}:{next_time % 60:02d}",
                "speaker": "Professor Lowell Lorenzo",
                "text": f"Topic: {sm_title}{sm_topic}"
            })
        return {
            "has_vtt": False,
            "filename": None,
            "total_cues": len(synth_cues),
            "cues": synth_cues,
            "note": "Synthesized topic markers. Use the 'Transcribe Lecture' button to generate full automated subtitles with Whisper!"
        }

    return {"has_vtt": False, "filename": None, "total_cues": 0, "cues": []}


@app.get("/api/transcripts/{folder}/raw.vtt")
def get_raw_vtt(folder: str):
    """Serve raw WebVTT file directly for the HTML5 <track kind='subtitles'> element."""
    folder_path = os.path.join(BASE_DIR, folder)
    if not os.path.isdir(folder_path):
        raise HTTPException(status_code=404, detail="Folder not found")

    vtt_files = [f for f in os.listdir(folder_path) if f.lower().endswith(".vtt")]
    if vtt_files:
        return FileResponse(os.path.join(folder_path, vtt_files[0]), media_type="text/vtt")

    # Generate minimal VTT on the fly from slide markers if available
    mod = next((m for m in MODULES_DATA if m["folder"].lower() == folder.lower()), None)
    if mod and mod.get("slide_markers"):
        vtt_content = ["WEBVTT\n\n"]
        for idx, sm in enumerate(mod["slide_markers"]):
            s = sm["time_sec"]
            e = mod["slide_markers"][idx+1]["time_sec"] if idx+1 < len(mod["slide_markers"]) else s + 600
            slide_n = sm.get("slide", idx + 1)
            slide_t = sm.get("title", f"Slide {slide_n}")
            vtt_content.append(f"{idx+1}\n{s//3600:02d}:{(s%3600)//60:02d}:{s%60:02d}.000 --> {e//3600:02d}:{(e%3600)//60:02d}:{e%60:02d}.000\nSlide {slide_n}: {slide_t}\n\n")
        return Response(content="".join(vtt_content), media_type="text/vtt")

    return Response(content="WEBVTT\n\n1\n00:00:00.000 --> 00:00:10.000\nNo transcript available. Click Transcribe.\n", media_type="text/vtt")


@app.post("/api/transcribe/{folder}")
def trigger_transcription(folder: str):
    """Trigger background faster_whisper transcription on a lecture folder."""
    res = start_transcription(folder, BASE_DIR)
    return res


@app.get("/api/transcribe/{folder}/status")
def check_transcription_status(folder: str):
    """Check the live progress of a background transcription task."""
    return get_transcription_status(folder)


@app.get("/api/minigames")
def get_minigames():
    """Get all interactive Operations Research minigames and scenarios."""
    return MINIGAMES_DATA


@app.get("/api/progress")
def get_player_progress():
    """Get player profile, XP, level, unlocked badges, and skill attributes."""
    data = load_progress()
    rank_info = get_current_rank(data.get("xp", 0))
    return {
        "progress": data,
        "rank_info": rank_info,
        "all_badges": BADGES_DATA,
        "all_ranks": RANKS_DATA
    }


@app.post("/api/progress/action")
async def record_action(request: Request):
    """Record player learning actions (watching, answering quizzes, solving minigames)."""
    body = await request.json()
    action = body.get("action")
    payload = body.get("payload", {})
    res = record_player_action(action, payload)
    return res


@app.get("/api/exam-intel")
def get_exam_intel(module_id: Optional[str] = None):
    """Retrieve professor's exam intel and student notes, optionally filtered by module."""
    user_notes = load_user_notes()
    intel = EXAM_INTEL_DATA
    if module_id:
        intel = [item for item in intel if item["module_id"] == module_id]
        user_notes = [n for n in user_notes if n.get("module_id") == module_id]
    return {
        "intel": intel,
        "all_count": len(EXAM_INTEL_DATA),
        "user_notes": user_notes
    }


@app.post("/api/user-notes")
async def create_user_note(request: Request):
    """Create or update a student exam note."""
    body = await request.json()
    note = save_user_note(body)
    return {"success": True, "note": note}


@app.delete("/api/user-notes/{note_id}")
def remove_user_note(note_id: str):
    """Delete a student exam note."""
    res = delete_user_note(note_id)
    return {"success": res}


@app.get("/api/session")
def get_session():
    """Retrieve remembered playback positions, active lecture, and UI state."""
    session = load_session_state()
    response = JSONResponse(content=session)
    last_mod = session.get("last_module_id", "module_aug10")
    last_pos = str(session.get("lecture_positions", {}).get(last_mod, 0))
    response.set_cookie(key="or_quest_last_module", value=last_mod, max_age=31536000, path="/")
    response.set_cookie(key="or_quest_last_time", value=last_pos, max_age=31536000, path="/")
    return response


@app.post("/api/session")
async def update_session(request: Request):
    """Save user playback position, active lecture, and UI settings."""
    try:
        body = await request.json()
    except Exception:
        raw = await request.body()
        import json
        body = json.loads(raw.decode("utf-8")) if raw else {}

    session = save_session_state(body)
    response = JSONResponse(content={"success": True, "session": session})
    last_mod = session.get("last_module_id", "module_aug10")
    last_pos = str(session.get("lecture_positions", {}).get(last_mod, 0))
    response.set_cookie(key="or_quest_last_module", value=last_mod, max_age=31536000, path="/")
    response.set_cookie(key="or_quest_last_time", value=last_pos, max_age=31536000, path="/")
    return response


@app.get("/api/knowledge-base")
def get_knowledge_base():
    """Retrieve comprehensive transcript-grounded knowledge base for all lecture sessions."""
    return get_all_knowledge_base()


@app.get("/api/knowledge-base/{module_id}")
def get_single_knowledge_base(module_id: str):
    """Retrieve transcript-grounded knowledge base notes for a specific module."""
    kb = get_module_knowledge_base(module_id)
    if not kb:
        raise HTTPException(status_code=404, detail="Knowledge base not found for this module")
    return kb


# Mount frontend static files
app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")


@app.get("/")
def serve_index():
    return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))
