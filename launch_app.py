"""
launch_app.py - Native Desktop Application Launcher for OR-Quest
Starts the local backend server (if not already running) and opens a standalone
desktop window (via Edge/Chrome App Mode) without browser toolbars or tabs.
"""

import os
import sys
import time
import subprocess
import urllib.request
import webbrowser

PORT = 8000
APP_URL = f"http://127.0.0.1:{PORT}"

# Resolve the actual application root directory
if getattr(sys, 'frozen', False):
    # Running inside PyInstaller executable (e.g. d:\Graduate Studies MEngAI\IE 214\OR-Quest.exe)
    BASE_DIR = os.path.dirname(os.path.abspath(sys.executable))
else:
    # Running as Python script
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))


def show_error_dialog(title: str, message: str):
    """Display a native Windows error dialog if available."""
    if os.name == 'nt':
        try:
            import ctypes
            ctypes.windll.user32.MessageBoxW(0, message, title, 0x10)  # 0x10 = MB_ICONERROR
            return
        except Exception:
            pass
    print(f"[{title}] {message}", file=sys.stderr)


def is_server_ready() -> bool:
    """Check if the backend FastAPI server is responding on port 8000."""
    try:
        req = urllib.request.Request(f"{APP_URL}/api/lectures", headers={"User-Agent": "ORQuestLauncher"})
        with urllib.request.urlopen(req, timeout=1.2) as res:
            return res.status == 200
    except Exception:
        return False


def get_python_interpreter() -> str:
    """Locate a valid system Python interpreter that has required libraries."""
    candidates = [
        r"C:\Python313\python.exe",
        r"C:\Python312\python.exe",
        r"C:\Python311\python.exe",
        os.path.expandvars(r"%LOCALAPPDATA%\Programs\Python\Python313\python.exe"),
        os.path.expandvars(r"%LOCALAPPDATA%\Programs\Python\Python312\python.exe"),
        "python.exe"
    ]
    if not getattr(sys, 'frozen', False):
        candidates.insert(0, sys.executable)

    # Exclude our own compiled executable name
    candidates = [c for c in candidates if "or-quest" not in c.lower()]

    for p in candidates:
        try:
            res = subprocess.run(
                [p, "-c", "import uvicorn; import fastapi"],
                capture_output=True,
                text=True,
                timeout=2.5
            )
            if res.returncode == 0:
                return p
        except Exception:
            continue

    return "python.exe"


def start_backend_server():
    """Start uvicorn server in the background if not already running."""
    if is_server_ready():
        return None, True

    python_exe = get_python_interpreter()
    log_dir = os.path.join(BASE_DIR, "app", "data")
    os.makedirs(log_dir, exist_ok=True)
    log_path = os.path.join(log_dir, "server.log")

    try:
        log_file = open(log_path, "a", encoding="utf-8")
        log_file.write(f"\n=======================================================\n")
        log_file.write(f"OR-Quest Server Started: {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
        log_file.write(f"Working Dir: {BASE_DIR}\n")
        log_file.write(f"Python Exec: {python_exe}\n")
        log_file.write(f"=======================================================\n")
        log_file.flush()
    except Exception:
        log_file = subprocess.DEVNULL

    cmd = [
        python_exe, "-m", "uvicorn",
        "app.backend.server:app",
        "--host", "127.0.0.1",
        "--port", str(PORT)
    ]

    creationflags = 0x08000000 if os.name == 'nt' else 0  # CREATE_NO_WINDOW
    try:
        proc = subprocess.Popen(
            cmd,
            cwd=BASE_DIR,
            stdout=log_file,
            stderr=subprocess.STDOUT,
            creationflags=creationflags
        )
    except Exception as e:
        show_error_dialog(
            "OR-Quest Launch Error",
            f"Failed to launch Python server process:\n\n{e}\n\nPlease verify that Python 3 is installed."
        )
        return None, False

    # Wait for server to come online (up to 12 seconds)
    for _ in range(40):
        if is_server_ready():
            return proc, True
        time.sleep(0.3)

    # Check if process crashed immediately
    if proc.poll() is not None:
        show_error_dialog(
            "OR-Quest Startup Error",
            f"The local application server process terminated unexpectedly (code {proc.returncode}).\n\n"
            f"Details have been written to:\n{log_path}"
        )
        return proc, False

    show_error_dialog(
        "OR-Quest Server Timeout",
        f"Server did not respond within 12 seconds on http://127.0.0.1:{PORT}.\n\n"
        f"Check log file at:\n{log_path}"
    )
    return proc, False


def launch_app_window(server_proc):
    """Launch the dedicated App Mode window and monitor application lifecycle."""
    browser_candidates = [
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
        os.path.expandvars(r"%ProgramFiles%\Google\Chrome\Application\chrome.exe"),
        os.path.expandvars(r"%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"),
        os.path.expandvars(r"%LocalAppData%\Google\Chrome\Application\chrome.exe")
    ]

    selected_browser = None
    for b in browser_candidates:
        if os.path.exists(b):
            selected_browser = b
            break

    profile_dir = os.path.join(BASE_DIR, "app", "data", "app_profile")
    os.makedirs(profile_dir, exist_ok=True)

    if selected_browser:
        app_args = [
            selected_browser,
            f"--app={APP_URL}",
            f"--user-data-dir={profile_dir}",
            "--window-size=1480,940",
            "--start-maximized"
        ]
        try:
            browser_proc = subprocess.Popen(app_args)
            browser_proc.wait()
        except KeyboardInterrupt:
            pass
        finally:
            if server_proc and server_proc.poll() is None:
                server_proc.terminate()
    else:
        webbrowser.open(APP_URL)
        try:
            while is_server_ready():
                time.sleep(2)
        except KeyboardInterrupt:
            if server_proc and server_proc.poll() is None:
                server_proc.terminate()


def main():
    os.chdir(BASE_DIR)
    server_proc, ready = start_backend_server()
    if ready:
        launch_app_window(server_proc)


if __name__ == "__main__":
    main()
