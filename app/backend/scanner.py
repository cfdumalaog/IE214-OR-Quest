"""
scanner.py - Dynamic Lecture, Video, Slide and Exercise Scanner
"""

import os
import glob
from typing import List, Dict, Any
from app.backend.course_data import MODULES_DATA, load_custom_markers


def scan_workspace(base_dir: str) -> Dict[str, Any]:
    """Scan the workspace for lecture folders, videos, transcripts, slides and exercises."""
    lecture_modules = []
    
    # Map predefined modules by folder name
    predefined_by_folder = {m["folder"].lower(): m for m in MODULES_DATA}

    # Find candidate lecture directories (any folder containing .mp4 or .vtt, or matching predefined)
    for entry in os.scandir(base_dir):
        if not entry.is_dir() or entry.name in ("app", ".git", "Slides", "Exercises", "Syllabus"):
            continue

        folder_name = entry.name
        folder_path = entry.path

        # Find mp4 files
        mp4_files = []
        for f in os.scandir(folder_path):
            if f.is_file() and f.name.lower().endswith(".mp4"):
                # Classify stream type
                fn = f.name.lower()
                if "avo" in fn:
                    stream_type = "Speaker Camera Only (No Slides)"
                elif "gvo" in fn:
                    stream_type = "Gallery Grid (No Slides)"
                elif "1920" in fn or "1080" in fn:
                    stream_type = "Screen Share & Annotations (Face + Slides)"
                elif "gallery" in fn:
                    stream_type = "Gallery View"
                else:
                    stream_type = "Lecture Video"

                mp4_files.append({
                    "filename": f.name,
                    "size_bytes": f.stat().st_size,
                    "size_mb": round(f.stat().st_size / (1024 * 1024), 1),
                    "stream_type": stream_type
                })

        # Sort mp4 files so Screen Share with Annotations comes first
        def mp4_priority(item):
            name = item["filename"].lower()
            # 1. Main shared screen recordings (1920 or 1080, no avo/gvo)
            if ("1920" in name or "1080" in name) and "avo" not in name and "gvo" not in name:
                # If non-gallery, top priority 0. If gallery_1920 (August 10), priority 1
                return 0 if "gallery" not in name else 1
            if "avo" in name:
                return 5
            if "gvo" in name:
                return 6
            return 4
        mp4_files.sort(key=mp4_priority)

        # Find vtt or srt transcripts
        vtt_files = [f.name for f in os.scandir(folder_path) if f.is_file() and f.name.lower().endswith((".vtt", ".srt"))]

        # Check if known in MODULES_DATA
        meta = predefined_by_folder.get(folder_name.lower())
        if meta:
            mod = dict(meta)
            mod["videos"] = mp4_files
            mod["transcripts"] = vtt_files
            mod["has_transcript"] = len(vtt_files) > 0
            if mp4_files and not any(v["filename"] == mod.get("default_video") for v in mp4_files):
                mod["default_video"] = mp4_files[0]["filename"]

            # Merge any user-pinned slide markers
            custom_markers = load_custom_markers().get(mod["id"], [])
            if custom_markers:
                existing_markers = list(mod.get("slide_markers", []))
                for cm in custom_markers:
                    match = next((m for m in existing_markers if m["slide"] == cm["slide"] and m.get("deck") == cm.get("deck")), None)
                    if match:
                        match["time_sec"] = cm["time_sec"]
                    else:
                        existing_markers.append(cm)
                existing_markers.sort(key=lambda x: x["time_sec"])
                mod["slide_markers"] = existing_markers

            lecture_modules.append(mod)
        elif mp4_files or vtt_files:
            # Dynamically discovered new lecture (user is still downloading!)
            lecture_modules.append({
                "id": f"module_dynamic_{folder_name.lower().replace(' ', '_')}",
                "folder": folder_name,
                "date": folder_name,
                "title": f"IE 214 Lecture ({folder_name})",
                "subtitle": "Newly Downloaded Lecture Session",
                "syllabus_week": "Class Session",
                "syllabus_topic": "Operations Research Topics",
                "default_video": mp4_files[0]["filename"] if mp4_files else "",
                "default_slide_deck": "Set 1 Slides rev 1",
                "duration_minutes": 90.0,
                "xp_reward": 300,
                "description": f"Lecture recording session discovered in folder '{folder_name}'.",
                "slide_markers": [],
                "key_concepts": [],
                "quizzes": [],
                "videos": mp4_files,
                "transcripts": vtt_files,
                "has_transcript": len(vtt_files) > 0
            })

    # Sort lectures chronologically if possible
    # We order predefined first in their predefined order, then dynamic
    order_map = {m["folder"]: i for i, m in enumerate(MODULES_DATA)}
    lecture_modules.sort(key=lambda m: order_map.get(m["folder"], 999))

    # Scan available Slides
    slides_dir = os.path.join(base_dir, "Slides")
    slide_decks = []
    if os.path.exists(slides_dir):
        for f in os.scandir(slides_dir):
            if f.is_file() and f.name.lower().endswith(".pdf"):
                deck_id = os.path.splitext(f.name)[0]
                slide_decks.append({
                    "id": deck_id,
                    "filename": f.name,
                    "title": deck_id
                })
    slide_decks.sort(key=lambda s: s["id"])

    # Scan Exercises
    exercises_dir = os.path.join(base_dir, "Exercises")
    exercises = []
    if os.path.exists(exercises_dir):
        for f in os.scandir(exercises_dir):
            if f.is_file() and f.name.lower().endswith(".pdf"):
                exercises.append({
                    "id": os.path.splitext(f.name)[0],
                    "filename": f.name,
                    "title": os.path.splitext(f.name)[0]
                })

    return {
        "modules": lecture_modules,
        "slide_decks": slide_decks,
        "exercises": exercises
    }
