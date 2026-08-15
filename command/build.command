#!/bin/zsh
# Build LabFlow.app on macOS.
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
PROJECT_DIR=$(cd "$SCRIPT_DIR/.." && pwd)
cd "$PROJECT_DIR"

PYTHON_BIN="${PYTHON_BIN:-python3}"
BUILD_VENV="$PROJECT_DIR/BuildVenv"
BUILD_DIR="$PROJECT_DIR/build"
DIST_DIR="$PROJECT_DIR/dist"
ICONSET="$BUILD_DIR/labflow.iconset"
ICON_ICNS="$BUILD_DIR/labflow.icns"
APP_PATH="$DIST_DIR/LabFlow.app"
APP_FOLDER="$DIST_DIR/LabFlow"

fail() { echo; echo "Build failed: $1"; exit 1; }
[[ "$(uname -s)" == "Darwin" ]] || fail "LabFlow.app must be built on macOS."
[[ -f "$PROJECT_DIR/desktop_runner.py" ]] || fail "Missing desktop_runner.py."
[[ -f "$PROJECT_DIR/resources/Appicon-1024.png" ]] || fail "Missing resources/Appicon-1024.png."

mkdir -p "$BUILD_DIR" "$DIST_DIR"
echo "Preparing isolated build environment..."
"$PYTHON_BIN" -m venv "$BUILD_VENV"
"$BUILD_VENV/bin/python" -m pip install --upgrade pip setuptools wheel
"$BUILD_VENV/bin/python" -m pip install -r requirements-desktop.txt pyinstaller

echo "Preparing macOS App icon..."
rm -rf "$ICONSET"
mkdir -p "$ICONSET"
for size in 16 32 128 256 512; do
  sips -z $size $size "$PROJECT_DIR/resources/Appicon-1024.png" --out "$ICONSET/icon_${size}x${size}.png" >/dev/null
  sips -z $((size * 2)) $((size * 2)) "$PROJECT_DIR/resources/Appicon-1024.png" --out "$ICONSET/icon_${size}x${size}@2x.png" >/dev/null
done
iconutil -c icns "$ICONSET" -o "$ICON_ICNS"

rm -rf "$BUILD_DIR/pyinstaller" "$APP_PATH"
echo "Building LabFlow.app..."
"$BUILD_VENV/bin/python" -m PyInstaller --noconfirm --clean --windowed --name LabFlow --icon "$ICON_ICNS" --distpath "$DIST_DIR" --workpath "$BUILD_DIR/pyinstaller" --collect-all webview --add-data "$PROJECT_DIR/index.html:." --add-data "$PROJECT_DIR/styles.css:." --add-data "$PROJECT_DIR/app.js:." --add-data "$PROJECT_DIR/supabase-config.js:." --add-data "$PROJECT_DIR/manifest.webmanifest:." --add-data "$PROJECT_DIR/sw.js:." --add-data "$PROJECT_DIR/assets:assets" --add-data "$PROJECT_DIR/fonts:fonts" --add-data "$PROJECT_DIR/resources:resources" "$PROJECT_DIR/desktop_runner.py"
[[ -d "$APP_PATH" ]] || fail "PyInstaller did not create $APP_PATH."
find "$APP_PATH" -name .DS_Store -delete
rm -rf "$APP_FOLDER"
if command -v codesign >/dev/null 2>&1; then codesign --force --deep --sign - "$APP_PATH"; fi

echo
printf "Built: %s\n" "$APP_PATH"
printf "Icon: %s\n" "$ICON_ICNS"
