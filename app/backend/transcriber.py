"""
transcriber.py - VTT Parser and Whisper Transcription Worker
"""

import os
import re
import subprocess
import threading
import time
from typing import List, Dict, Any, Optional

TRANSCRIPTION_TASKS: Dict[str, Dict[str, Any]] = {}
_TASK_LOCK = threading.Lock()


def parse_vtt_timestamp(ts: str) -> float:
    """Parse VTT timestamp 'HH:MM:SS.mmm' or 'MM:SS.mmm' into total seconds."""
    ts = ts.strip().replace(",", ".")
    parts = ts.split(":")
    if len(parts) == 3:
        h, m, s = parts
        return float(h) * 3600 + float(m) * 60 + float(s)
    elif len(parts) == 2:
        m, s = parts
        return float(m) * 60 + float(s)
    return float(ts)


def format_seconds_to_vtt(seconds: float) -> str:
    """Convert float seconds to 'HH:MM:SS.mmm'."""
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = seconds % 60
    return f"{h:02d}:{m:02d}:{s:06.3f}"


def parse_vtt_file(file_path: str) -> List[Dict[str, Any]]:
    """Parse WebVTT file into a list of structured cue dictionaries."""
    if not os.path.exists(file_path):
        return []

    cues = []
    with open(file_path, "r", encoding="utf-8", errors="replace") as f:
        lines = f.readlines()

    cue_re = re.compile(r"(\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d+)?)\s*-->\s*(\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d+)?)")
    
    i = 0
    cue_idx = 1
    while i < len(lines):
        line = lines[i].strip()
        match = cue_re.search(line)
        if match:
            start_str, end_str = match.groups()
            start_sec = parse_vtt_timestamp(start_str)
            end_sec = parse_vtt_timestamp(end_str)
            
            # Read next lines until empty line
            text_lines = []
            i += 1
            while i < len(lines) and lines[i].strip():
                text_lines.append(lines[i].strip())
                i += 1
            
            raw_text = " ".join(text_lines)
            speaker = ""
            text = raw_text
            
            # Check for speaker prefix e.g. "Lowell Lorenzo: ..."
            speaker_match = re.match(r"^([^:]+):\s*(.*)$", raw_text)
            if speaker_match:
                speaker = speaker_match.group(1).strip()
                text = speaker_match.group(2).strip()

            cues.append({
                "id": cue_idx,
                "start": start_sec,
                "end": end_sec,
                "start_str": format_seconds_to_vtt(start_sec)[:8],
                "end_str": format_seconds_to_vtt(end_sec)[:8],
                "speaker": speaker or "Speaker",
                "text": text
            })
            cue_idx += 1
        else:
            i += 1

    return cues


def get_transcription_status(folder_name: str) -> Dict[str, Any]:
    with _TASK_LOCK:
        if folder_name in TRANSCRIPTION_TASKS:
            return dict(TRANSCRIPTION_TASKS[folder_name])
        return {"status": "idle", "progress": 0, "message": "No active transcription."}


def transcribe_video_background(video_path: str, output_vtt_path: str, folder_name: str):
    """Run faster_whisper in a background thread and generate standard WebVTT subtitles."""
    def worker():
        try:
            with _TASK_LOCK:
                TRANSCRIPTION_TASKS[folder_name] = {
                    "status": "extracting_audio",
                    "progress": 5,
                    "message": "Extracting audio with ffmpeg..."
                }

            temp_audio = output_vtt_path + ".temp.wav"
            cmd = [
                "ffmpeg", "-y", "-i", video_path,
                "-vn", "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1",
                temp_audio
            ]
            subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)

            with _TASK_LOCK:
                TRANSCRIPTION_TASKS[folder_name] = {
                    "status": "loading_model",
                    "progress": 20,
                    "message": "Initializing faster_whisper model..."
                }

            from faster_whisper import WhisperModel
            model = WhisperModel("tiny.en", device="cpu", compute_type="int8")

            with _TASK_LOCK:
                TRANSCRIPTION_TASKS[folder_name] = {
                    "status": "transcribing",
                    "progress": 35,
                    "message": "Transcribing speech to text..."
                }

            segments, info = model.transcribe(temp_audio, beam_size=1)
            duration = info.duration or 1.0

            vtt_lines = ["WEBVTT\n\n"]
            cue_count = 1

            for seg in segments:
                start_vtt = format_seconds_to_vtt(seg.start)
                end_vtt = format_seconds_to_vtt(seg.end)
                text = seg.text.strip()
                vtt_lines.append(f"{cue_count}\n{start_vtt} --> {end_vtt}\n{text}\n\n")
                cue_count += 1
                
                # Update progress
                current_pct = min(95, 35 + int((seg.end / duration) * 60))
                with _TASK_LOCK:
                    TRANSCRIPTION_TASKS[folder_name]["progress"] = current_pct
                    TRANSCRIPTION_TASKS[folder_name]["message"] = f"Transcribing ({int(seg.end//60)}m / {int(duration//60)}m)..."

            with open(output_vtt_path, "w", encoding="utf-8") as f:
                f.writelines(vtt_lines)

            # Cleanup temp audio
            if os.path.exists(temp_audio):
                try:
                    os.remove(temp_audio)
                except Exception:
                    pass

            with _TASK_LOCK:
                TRANSCRIPTION_TASKS[folder_name] = {
                    "status": "done",
                    "progress": 100,
                    "message": "Transcription completed successfully!"
                }

        except Exception as e:
            with _TASK_LOCK:
                TRANSCRIPTION_TASKS[folder_name] = {
                    "status": "error",
                    "progress": 0,
                    "message": f"Transcription failed: {str(e)}"
                }

    t = threading.Thread(target=worker, daemon=True)
    t.start()


def start_transcription(folder_name: str, base_dir: str) -> Dict[str, Any]:
    """Start transcription for a given lecture folder if not already running."""
    with _TASK_LOCK:
        current = TRANSCRIPTION_TASKS.get(folder_name)
        if current and current.get("status") in ("extracting_audio", "loading_model", "transcribing"):
            return {"success": False, "message": "Transcription already in progress for this module."}

    folder_path = os.path.join(base_dir, folder_name)
    if not os.path.isdir(folder_path):
        return {"success": False, "message": f"Folder {folder_name} not found."}

    # Find the best video file in folder (prefer screen share or avo)
    mp4s = [f for f in os.listdir(folder_path) if f.lower().endswith(".mp4")]
    if not mp4s:
        return {"success": False, "message": f"No MP4 video files found in {folder_name}."}

    best_mp4 = mp4s[0]
    for candidate in mp4s:
        if "1920x1" in candidate or "1080" in candidate:
            best_mp4 = candidate
            break
        elif "avo" in candidate:
            best_mp4 = candidate

    video_path = os.path.join(folder_path, best_mp4)
    output_vtt = os.path.join(folder_path, f"{os.path.splitext(best_mp4)[0]}.transcript.vtt")

    transcribe_video_background(video_path, output_vtt, folder_name)
    return {"success": True, "message": f"Transcription started for {folder_name} using {best_mp4}."}
