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
APP_VERSION=$(sed -n 's/.*"\([0-9.]*\)".*/\1/p' version.js)

fail() { echo; echo "Build failed: $1"; exit 1; }
[[ "$(uname -s)" == "Darwin" ]] || fail "LabFlow.app must be built on macOS."
[[ -f "$PROJECT_DIR/desktop_runner.py" ]] || fail "Missing desktop_runner.py."
[[ -f "$PROJECT_DIR/resources/Appicon-1024.png" ]] || fail "Missing resources/Appicon-1024.png."
[[ -n "$APP_VERSION" ]] || fail "Could not read version.js."

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
"$BUILD_VENV/bin/python" -m PyInstaller --noconfirm --clean --windowed --name LabFlow --icon "$ICON_ICNS" --distpath "$DIST_DIR" --workpath "$BUILD_DIR/pyinstaller" --collect-all webview --add-data "$PROJECT_DIR/index.html:." --add-data "$PROJECT_DIR/styles.css:." --add-data "$PROJECT_DIR/app.js:." --add-data "$PROJECT_DIR/supabase-config.js:." --add-data "$PROJECT_DIR/version.js:." --add-data "$PROJECT_DIR/manifest.webmanifest:." --add-data "$PROJECT_DIR/sw.js:." --add-data "$PROJECT_DIR/assets:assets" --add-data "$PROJECT_DIR/fonts:fonts" --add-data "$PROJECT_DIR/resources:resources" --add-data "$PROJECT_DIR/tools:tools" "$PROJECT_DIR/desktop_runner.py"
[[ -d "$APP_PATH" ]] || fail "PyInstaller did not create $APP_PATH."
plutil -replace CFBundleShortVersionString -string "$APP_VERSION" "$APP_PATH/Contents/Info.plist"
plutil -replace CFBundleVersion -string "$APP_VERSION" "$APP_PATH/Contents/Info.plist"
find "$APP_PATH" -name .DS_Store -delete
rm -rf "$APP_FOLDER"
if command -v codesign >/dev/null 2>&1; then codesign --force --deep --sign - "$APP_PATH"; fi

# Keep the final app and reusable BuildVenv, but remove successful-build intermediates.
rm -rf "$BUILD_DIR"

echo
printf "Built: %s\n" "$APP_PATH"
printf "Icon: %s\n" "$ICON_ICNS"
