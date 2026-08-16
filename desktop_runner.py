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
DEBUG = os.environ.get("LABFLOW_DEBUG") == "1"
APP_DATA = (
    Path.home() / "Library" / "Application Support" / "LabFlow"
    if getattr(sys, "frozen", False) and platform.system() == "Darwin"
    else ROOT / ".webview-data"
)
server = None
window = None
_menu_main_thread_target = None


def debug_log(message: str) -> None:
    if DEBUG:
        print(message, flush=True)


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


def remove_default_macos_about_menu():
    """Remove only macOS's standard About action from the application menu."""
    if platform.system() != "Darwin":
        return
    try:
        from AppKit import NSApp

        main_menu = NSApp.mainMenu()
        if main_menu is None or main_menu.numberOfItems() == 0:
            return
        app_menu = main_menu.itemAtIndex_(0).submenu()
        if app_menu is None:
            return
        removed = 0
        for index in range(app_menu.numberOfItems() - 1, -1, -1):
            item = app_menu.itemAtIndex_(index)
            if str(item.action()) == "orderFrontStandardAboutPanel:":
                app_menu.removeItemAtIndex_(index)
                removed += 1
        debug_log(f"DEFAULT ABOUT ITEMS REMOVED: {removed}")
    except Exception as error:
        if DEBUG:
            print(f"Could not remove the default macOS About menu: {error}", file=sys.stderr)


class LabFlowServer(http.server.ThreadingHTTPServer):
    allow_reuse_address = True
    daemon_threads = True


class LabFlowRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)


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
    handler = LabFlowRequestHandler
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
    window = webview.create_window("LabFlow", url, width=1280, height=860, min_size=(900, 600), resizable=True)

    def schedule_remove_default_macos_about_menu():
        global _menu_main_thread_target
        if platform.system() != "Darwin":
            return
        from Foundation import NSObject
        if _menu_main_thread_target is None:
            class MenuMainThreadTarget(NSObject):
                def removeDefaultAbout_(self, sender):
                    remove_default_macos_about_menu()
            _menu_main_thread_target = MenuMainThreadTarget.alloc().init()
        _menu_main_thread_target.performSelectorOnMainThread_withObject_waitUntilDone_(
            "removeDefaultAbout:", None, False
        )

    def show_about():
        debug_log("ABOUT CALLBACK FIRED")
        schedule_remove_default_macos_about_menu()
        if window is not None:
            window.evaluate_js("if (typeof aboutModal === \"function\") { aboutModal(); }")

    from webview.menu import Menu, MenuAction
    if platform.system() == "Darwin":
        # This setting is not sufficient in every PyWebView/macOS combination;
        # AppKit cleanup above removes the standard About action.
        webview.settings["SHOW_DEFAULT_MENUS"] = False
        app_menu = [Menu("__app__", [MenuAction("About LabFlow", show_about)])]
    else:
        app_menu = [Menu("Help", [MenuAction("About LabFlow", show_about)])]

    def prepare_window():
        apply_macos_light_titlebar(window)
        schedule_remove_default_macos_about_menu()

    # The menu is fully populated only after the native window is shown.
    window.events.before_show += prepare_window
    window.events.shown += lambda: schedule_remove_default_macos_about_menu()
    window.events.closed += stop_app
    try:
        APP_DATA.mkdir(parents=True, exist_ok=True)
        webview.start(private_mode=False, storage_path=str(APP_DATA), menu=app_menu)
    finally:
        stop_app()
        if server is not None:
            server.server_close()

if __name__ == "__main__":
    main()
