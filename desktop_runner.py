#!/usr/bin/env python3
"""Run LabFlow in a PyWebView desktop window with a managed local server."""

from __future__ import annotations
import argparse
import http.server
import os
import platform
import signal
import sys
import threading
import webbrowser
from pathlib import Path


ROOT = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent))
APP_DATA = (
    Path.home() / "Library" / "Application Support" / "LabFlow"
    if getattr(sys, "frozen", False) and platform.system() == "Darwin"
    else ROOT / ".webview-data"
)
server = None
window = None

def apply_macos_light_titlebar(target_window) -> bool:
    """Keep the native macOS title bar in Aqua/light appearance."""
    if platform.system() != "Darwin":
        return False
    try:
        from AppKit import NSAppearance, NSAppearanceNameAqua, NSColor, NSWindowTitleVisible

        native = getattr(target_window, "native", None)
        if native is None:
            return False

        native.setAppearance_(NSAppearance.appearanceNamed_(NSAppearanceNameAqua))
        native.setTitlebarAppearsTransparent_(False)
        native.setTitleVisibility_(NSWindowTitleVisible)
        native.setBackgroundColor_(NSColor.windowBackgroundColor())
        native.setTabbingMode_(2)  # NSWindowTabbingModeDisallowed

        content_view = native.contentView()
        if content_view is not None and content_view.superview() is not None:
            titlebar = content_view.superview().subviews().lastObject()
            if titlebar is not None:
                titlebar.setBackgroundColor_(NSColor.windowBackgroundColor())
        return True
    except Exception:
        # AppKit/PyObjC is only available on macOS; browser/Linux runs are unchanged.
        return False

class LabFlowServer(http.server.ThreadingHTTPServer):
    allow_reuse_address = True
    daemon_threads = True

def stop_app(*_args) -> None:
    global server
    try:
        if window is not None:
            window.destroy()
    except Exception:
        pass
    if server is not None:
        threading.Thread(target=server.shutdown, daemon=True).start()

def main() -> None:
    global server, window
    parser = argparse.ArgumentParser()
    parser.add_argument("--browser", action="store_true", help="Open LabFlow in the default browser")
    args = parser.parse_args()
    os.chdir(ROOT)
    handler = lambda *args, **kwargs: http.server.SimpleHTTPRequestHandler(*args, directory=str(ROOT), **kwargs)
    for port in (8000, 8001, 8002):
        try:
            server = LabFlowServer(("127.0.0.1", port), handler)
            break
        except OSError:
            continue
    else:
        print("Could not find an available local port (tried 8000–8002).", file=sys.stderr)
        raise SystemExit(1)
    url = f"http://127.0.0.1:{port}/"
    for name in ("SIGTERM", "SIGINT", "SIGHUP"):
        if hasattr(signal, name):
            signal.signal(getattr(signal, name), stop_app)
    if args.browser:
        print(f"LabFlow browser mode: {url}")
        webbrowser.open(url)
        try:
            server.serve_forever()
        finally:
            stop_app()
            server.server_close()
        return
    try:
        import webview
    except ImportError:
        print("PyWebView is not installed. Run: python3 -m pip install pywebview", file=sys.stderr)
        raise SystemExit(1)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    window = webview.create_window("", url, width=1280, height=860, min_size=(900, 600), resizable=True)
    window.events.before_show += lambda: apply_macos_light_titlebar(window)
    window.events.closed += stop_app
    try:
        APP_DATA.mkdir(parents=True, exist_ok=True)
        webview.start(private_mode=False, storage_path=str(APP_DATA))
    finally:
        stop_app()
        if server is not None:
            server.server_close()

if __name__ == "__main__":
    main()
