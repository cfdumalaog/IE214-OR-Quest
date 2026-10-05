"""
gamification.py - Persistent Player Progression, XP, Leveling, and Badge System
"""

import os
import json
from datetime import datetime, date
from typing import Dict, Any, List, Optional
from app.backend.course_data import RANKS_DATA, BADGES_DATA

PROGRESS_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "user_progress.json")

DEFAULT_PROGRESS = {
    "xp": 0,
    "level": 1,
    "rank_title": "OR Novice",
    "watch_time_seconds": 0,
    "transcript_jumps": 0,
    "completed_modules": [],
    "completed_quizzes": {},
    "unlocked_badges": [],
    "minigame_scores": {},
    "max_speed_used": 1.0,
    "study_streak_days": 1,
    "last_active_date": str(date.today()),
    "skills": {
        "formulation": 10,
        "graphical_geometry": 10,
        "simplex_tableau": 10,
        "big_m_methods": 10,
        "duality_theory": 10,
        "or_methodology": 15
    }
}


def load_progress() -> Dict[str, Any]:
    if os.path.exists(PROGRESS_FILE):
        try:
            with open(PROGRESS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                # Merge with default in case of missing keys
                for k, v in DEFAULT_PROGRESS.items():
                    if k not in data:
                        data[k] = v
                return data
        except Exception:
            pass
    return dict(DEFAULT_PROGRESS)


def save_progress(data: Dict[str, Any]):
    os.makedirs(os.path.dirname(PROGRESS_FILE), exist_ok=True)
    with open(PROGRESS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def get_current_rank(xp: int) -> Dict[str, Any]:
    current_rank = RANKS_DATA[0]
    next_rank = None
    for i, r in enumerate(RANKS_DATA):
        if xp >= r["min_xp"]:
            current_rank = r
            next_rank = RANKS_DATA[i + 1] if i + 1 < len(RANKS_DATA) else None
        else:
            break
    
    current_min = current_rank["min_xp"]
    next_min = next_rank["min_xp"] if next_rank else current_min + 2000
    progress_pct = min(100, int(((xp - current_min) / (next_min - current_min)) * 100)) if next_rank else 100

    return {
        "current_rank": current_rank,
        "next_rank": next_rank,
        "progress_pct": progress_pct,
        "xp_to_next": (next_min - xp) if next_rank else 0
    }


def update_activity_streak(data: Dict[str, Any]):
    today_str = str(date.today())
    last_str = data.get("last_active_date")
    if last_str != today_str:
        try:
            last_date = datetime.strptime(last_str, "%Y-%m-%d").date()
            diff = (date.today() - last_date).days
            if diff == 1:
                data["study_streak_days"] = data.get("study_streak_days", 1) + 1
            elif diff > 1:
                data["study_streak_days"] = 1
        except Exception:
            data["study_streak_days"] = 1
        data["last_active_date"] = today_str


def check_and_unlock_badge(badge_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    if badge_id not in data.get("unlocked_badges", []):
        badge = next((b for b in BADGES_DATA if b["id"] == badge_id), None)
        if badge:
            data.setdefault("unlocked_badges", []).append(badge_id)
            data["xp"] += badge.get("xp", 50)
            return badge
    return None


def add_xp(amount: int, skill_category: Optional[str] = None) -> Dict[str, Any]:
    data = load_progress()
    old_xp = data.get("xp", 0)
    old_rank_info = get_current_rank(old_xp)
    
    data["xp"] = old_xp + amount
    if skill_category and skill_category in data.get("skills", {}):
        data["skills"][skill_category] = min(100, data["skills"][skill_category] + int(amount / 20))

    new_rank_info = get_current_rank(data["xp"])
    data["level"] = new_rank_info["current_rank"]["rank"]
    data["rank_title"] = new_rank_info["current_rank"]["title"]
    
    update_activity_streak(data)
    save_progress(data)

    leveled_up = new_rank_info["current_rank"]["rank"] > old_rank_info["current_rank"]["rank"]
    return {
        "xp_added": amount,
        "total_xp": data["xp"],
        "level": data["level"],
        "rank_title": data["rank_title"],
        "leveled_up": leveled_up,
        "rank_info": new_rank_info
    }


def record_player_action(action: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    data = load_progress()
    unlocked = []

    if action == "watch_video":
        secs = payload.get("seconds", 30)
        speed = payload.get("speed", 1.0)
        data["watch_time_seconds"] = data.get("watch_time_seconds", 0) + secs
        if speed > data.get("max_speed_used", 1.0):
            data["max_speed_used"] = speed

        # Check badges
        b1 = check_and_unlock_badge("first_play", data)
        if b1: unlocked.append(b1)

        if speed >= 1.5:
            b2 = check_and_unlock_badge("speed_demon", data)
            if b2: unlocked.append(b2)

        # Passive XP for watching (10 XP per 60s)
        earned_xp = int(secs / 6)
        data["xp"] += earned_xp

    elif action == "transcript_jump":
        data["transcript_jumps"] = data.get("transcript_jumps", 0) + 1
        data["xp"] += 15
        if data["transcript_jumps"] >= 5:
            b = check_and_unlock_badge("transcript_scout", data)
            if b: unlocked.append(b)

    elif action == "slide_sync":
        b = check_and_unlock_badge("slide_synced", data)
        if b: unlocked.append(b)

    elif action == "solve_pivot":
        data["xp"] += 150
        data["skills"]["simplex_tableau"] = min(100, data["skills"]["simplex_tableau"] + 15)
        b = check_and_unlock_badge("pivot_master", data)
        if b: unlocked.append(b)

    elif action == "solve_graphical":
        data["xp"] += 150
        data["skills"]["graphical_geometry"] = min(100, data["skills"]["graphical_geometry"] + 15)
        b = check_and_unlock_badge("graphical_guru", data)
        if b: unlocked.append(b)

    elif action == "solve_formulation":
        data["xp"] += 200
        data["skills"]["formulation"] = min(100, data["skills"]["formulation"] + 20)
        b = check_and_unlock_badge("formulation_forge", data)
        if b: unlocked.append(b)

    elif action == "solve_tableau_detective":
        data["xp"] += 250
        data["skills"]["simplex_tableau"] = min(100, data["skills"]["simplex_tableau"] + 20)
        b = check_and_unlock_badge("tableau_detective", data)
        if b: unlocked.append(b)

    elif action == "complete_quiz":
        quiz_id = payload.get("quiz_id")
        score = payload.get("score", 0)
        max_score = payload.get("max_score", 3)
        data.setdefault("completed_quizzes", {})[quiz_id] = {"score": score, "max": max_score}
        data["xp"] += (score * 50)
        if score == max_score and max_score > 0:
            b = check_and_unlock_badge("quiz_flawless", data)
            if b: unlocked.append(b)

    elif action == "sprint_complete":
        data["sprints_completed"] = data.get("sprints_completed", 0) + 1
        data["xp"] += 30
        data.setdefault("skills", {})
        data["skills"]["or_methodology"] = min(100, data["skills"].get("or_methodology", 10) + 5)
        if data["sprints_completed"] >= 3:
            b = check_and_unlock_badge("sprint_champion", data)
            if b: unlocked.append(b)

    elif action == "pin_slide":
        data["slides_calibrated"] = data.get("slides_calibrated", 0) + 1
        data["xp"] += 20
        b = check_and_unlock_badge("slide_calibrator", data)
        if b: unlocked.append(b)

    if data.get("study_streak_days", 1) >= 3:
        b = check_and_unlock_badge("study_streak_3", data)
        if b: unlocked.append(b)

    rank_info = get_current_rank(data["xp"])
    data["level"] = rank_info["current_rank"]["rank"]
    data["rank_title"] = rank_info["current_rank"]["title"]

    update_activity_streak(data)
    save_progress(data)

    return {
        "progress": data,
        "rank_info": rank_info,
        "newly_unlocked_badges": unlocked,
        "all_badges": BADGES_DATA,
        "all_ranks": RANKS_DATA
    }
