"""
batch_transcribe.py - Automated Multilingual Transcription for OR-Quest & MEngAI Lectures
Supports English + Filipino (Taglish) code-switching with domain-specific vocabulary prompting.
"""
import os
import sys
import time
import subprocess
from typing import List, Tuple
from faster_whisper import WhisperModel

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

BASE_DIR = r"D:\Graduate Studies MEngAI\IE 214"
AI201_DIR = r"D:\Graduate Studies MEngAI\AI 201 Lectures"

IE214_PROMPT = (
    "Operations Research lecture at University of the Philippines Diliman by Professor Lowell Lorenzo "
    "in English and Filipino Tagalog. Topics include linear programming, simplex method, objective functions, "
    "constraints, feasible regions, duality, sensitivity analysis, and mathematical modeling."
)

AI201_PROMPT = (
    "Artificial Intelligence and Machine Learning graduate lecture at University of the Philippines Diliman "
    "in English and Filipino Tagalog. Topics include genetic algorithms, principal component analysis, "
    "cluster analysis, neural networks, and classifiers."
)

def format_vtt_timestamp(seconds: float) -> str:
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = seconds % 60
    return f"{h:02d}:{m:02d}:{s:06.3f}"

def extract_audio(video_path: str, wav_path: str):
    cmd = [
        "ffmpeg", "-y", "-i", video_path,
        "-vn", "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1",
        wav_path
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)

def transcribe_file(video_path: str, vtt_path: str, model: WhisperModel, prompt: str):
    temp_wav = vtt_path + ".temp.wav"
    t0 = time.time()
    vname = os.path.basename(video_path)
    print(f"\n[{time.strftime('%H:%M:%S')}] Starting transcription for: {vname}")
    print(f"  Target VTT: {os.path.basename(vtt_path)}")

    # 1. Audio extraction (reuse if already extracted)
    if os.path.exists(temp_wav) and os.path.getsize(temp_wav) > 1024 * 1024:
        wav_size_mb = os.path.getsize(temp_wav) / (1024 * 1024)
        print(f"  [1/3] Using already extracted audio ({wav_size_mb:.1f} MB)")
    else:
        print(f"  [1/3] Extracting 16kHz mono audio via ffmpeg...")
        extract_audio(video_path, temp_wav)
        wav_size_mb = os.path.getsize(temp_wav) / (1024 * 1024)
        print(f"  [1/3] Audio extracted ({wav_size_mb:.1f} MB)")

    # 2. Transcription with multilingual whisper
    print(f"  [2/3] Transcribing with faster-whisper 'small' (English + Filipino)...")
    segments, info = model.transcribe(
        temp_wav,
        beam_size=1,
        initial_prompt=prompt,
        vad_filter=True,
        vad_parameters=dict(min_silence_duration_ms=500)
    )

    print(f"  Detected language: {info.language} (confidence: {info.language_probability:.2f}), duration: {info.duration/60:.1f} mins")

    # 3. Stream cues directly to VTT with immediate flushing
    temp_vtt = vtt_path + ".partial"
    with open(temp_vtt, "w", encoding="utf-8") as f_out:
        f_out.write("WEBVTT\n\n")
        f_out.flush()

        cue_idx = 1
        last_log = time.time()

        for seg in segments:
            s_vtt = format_vtt_timestamp(seg.start)
            e_vtt = format_vtt_timestamp(seg.end)
            text = seg.text.strip()
            f_out.write(f"{cue_idx}\n{s_vtt} --> {e_vtt}\n{text}\n\n")
            f_out.flush()
            cue_idx += 1

            if time.time() - last_log >= 15:
                pct = min(99, int((seg.end / (info.duration or 1.0)) * 100))
                print(f"    Progress: {pct}% ({int(seg.end//60)}m / {int(info.duration//60)}m, {cue_idx} cues)...")
                last_log = time.time()

    # Move partial VTT to final VTT path
    if os.path.exists(vtt_path):
        try:
            os.remove(vtt_path)
        except Exception:
            pass
    os.rename(temp_vtt, vtt_path)

    # Cleanup temp wav
    if os.path.exists(temp_wav):
        try:
            os.remove(temp_wav)
        except Exception:
            pass

    elapsed = time.time() - t0
    speed_factor = (info.duration or 1.0) / max(elapsed, 1.0)
    print(f"  [3/3] Complete! {cue_idx - 1} cues written in {elapsed/60:.1f} mins ({speed_factor:.1f}x realtime).")

def find_ie214_targets() -> List[Tuple[str, str, str]]:
    targets = []
    folders = ["August 10", "August 17", "August 24", "September 7", "September 14"]
    for folder in folders:
        fpath = os.path.join(BASE_DIR, folder)
        if not os.path.exists(fpath):
            continue
        mp4s = [f for f in os.listdir(fpath) if f.lower().endswith(".mp4")]
        if not mp4s:
            continue
        best_mp4 = None
        for candidate in mp4s:
            name_lower = candidate.lower()
            if ("1920" in name_lower or "1080" in name_lower) and "avo" not in name_lower and "gvo" not in name_lower:
                if folder == "August 10" or "gallery" not in name_lower:
                    best_mp4 = candidate
                    break
        if not best_mp4:
            best_mp4 = mp4s[0]

        vtt_name = f"{os.path.splitext(best_mp4)[0]}.transcript.vtt"
        vtt_path = os.path.join(fpath, vtt_name)
        if not os.path.exists(vtt_path):
            targets.append((os.path.join(fpath, best_mp4), vtt_path, IE214_PROMPT))
        else:
            print(f"[SKIP] VTT already exists for {folder}: {vtt_name}")
    return targets

def find_ai201_targets() -> List[Tuple[str, str, str]]:
    targets = []
    if not os.path.exists(AI201_DIR):
        return targets
    for f in os.listdir(AI201_DIR):
        if f.lower().endswith(".mp4"):
            vtt_name = f"{os.path.splitext(f)[0]}.transcript.vtt"
            vtt_path = os.path.join(AI201_DIR, vtt_name)
            if not os.path.exists(vtt_path):
                targets.append((os.path.join(AI201_DIR, f), vtt_path, AI201_PROMPT))
            else:
                print(f"[SKIP] VTT already exists for AI 201: {vtt_name}")
    return targets

def main():
    print("=" * 70)
    print("  Multilingual Speech-to-Text Transcription Worker")
    print("  Course: IE 214 Introductory Operations Research")
    print("  Target Languages: English + Filipino (Tagalog / Taglish)")
    print("=" * 70)

    all_targets = find_ie214_targets()

    print(f"\nPending transcription queue: {len(all_targets)} lecture(s)")
    for idx, (vid, vtt, _) in enumerate(all_targets, 1):
        print(f"  {idx}. {os.path.basename(vid)}")

    if not all_targets:
        print("\nAll lectures already have transcript files! Nothing to transcribe.")
        return

    print(f"\nLoading faster-whisper 'small' multilingual model (CPU, int8, 8 threads)...")
    model = WhisperModel("small", device="cpu", compute_type="int8", cpu_threads=8)
    print("Model loaded successfully into memory.")

    for idx, (vid, vtt, prompt) in enumerate(all_targets, 1):
        print(f"\n=======================================================")
        print(f"  Processing [{idx}/{len(all_targets)}]: {os.path.basename(vid)}")
        print(f"=======================================================")
        try:
            transcribe_file(vid, vtt, model, prompt)
        except Exception as e:
            print(f"[ERROR] Failed transcribing {os.path.basename(vid)}: {e}")

    print("\n" + "=" * 70)
    print("  All pending transcriptions completed successfully!")
    print("=" * 70)

if __name__ == "__main__":
    main()
