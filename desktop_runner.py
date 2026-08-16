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
import traceback
import webbrowser
from pathlib import Path


ROOT = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent))
APP_VERSION = "1.0"
APP_DATA = (
    Path.home() / "Library" / "Application Support" / "LabFlow"
    if getattr(sys, "frozen", False) and platform.system() == "Darwin"
    else ROOT / ".webview-data"
)
server = None
window = None
mac_menu_target = None

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


try:
    from Foundation import NSObject
except ImportError:
    class NSObject:
        pass


class LabFlowMenuTarget(NSObject):
    """Bridge a native macOS menu item to the existing web About modal."""

    def initWithWindow_(self, target_window):
        self = super().init()
        if self is not None:
            self.target_window = target_window
        return self

    def showAbout_(self, _sender):
        self.target_window.evaluate_js("aboutModal()")


def install_macos_help_menu(target_window) -> bool:
    """Add Help > About LabFlow to the native macOS application menu."""
    global mac_menu_target
    if platform.system() != "Darwin":
        return False
    try:
        from AppKit import NSApp, NSMenu, NSMenuItem

        main_menu = NSApp().mainMenu()
        if main_menu is None:
            return False
        mac_menu_target = LabFlowMenuTarget.alloc().initWithWindow_(target_window)
        # Match Beaver: replace the macOS application menu About action too.
        app_menu = main_menu.itemAtIndex_(0).submenu() if main_menu.numberOfItems() else None
        if app_menu is not None:
            for item in app_menu.itemArray():
                if str(item.title()).lower().startswith("about"):
                    item.setTitle_("About LabFlow")
                    item.setAction_("showAbout:")
                    item.setTarget_(mac_menu_target)
                    break

        # Match Beaver: expose the custom About action under Help.
        help_menu = None
        for item in main_menu.itemArray():
            if item.title() == "Help":
                help_menu = item.submenu()
                break
        if help_menu is None:
            help_menu = NSMenu.alloc().initWithTitle_("Help")
            help_item = NSMenuItem.alloc().initWithTitle_action_keyEquivalent_("Help", None, "")
            help_item.setSubmenu_(help_menu)
            main_menu.addItem_(help_item)
        if not any(str(item.title()) == "About LabFlow" for item in help_menu.itemArray()):
            about_item = NSMenuItem.alloc().initWithTitle_action_keyEquivalent_(
                "About LabFlow", "showAbout:", ""
            )
            about_item.setTarget_(mac_menu_target)
            help_menu.addItem_(about_item)
        return True
    except Exception:
        traceback.print_exc()
        return False

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
    window = webview.create_window(f"LabFlow {APP_VERSION}", url, width=1280, height=860, min_size=(900, 600), resizable=True)
    def prepare_native_window():
        apply_macos_light_titlebar(window)
        install_macos_help_menu(window)

    window.events.before_show += prepare_native_window
    window.events.closed += stop_app
    try:
        APP_DATA.mkdir(parents=True, exist_ok=True)
        webview.start(prepare_native_window, private_mode=False, storage_path=str(APP_DATA))
    finally:
        stop_app()
        if server is not None:
            server.server_close()

if __name__ == "__main__":
    main()
