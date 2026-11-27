#!/usr/bin/env bash
# Installs Design Desk for the current user: binary, icon and a launcher entry,
# so it shows up in your app launcher. No root needed. Re-run after rebuilding to update.
set -euo pipefail
cd "$(dirname "$0")/.."

BIN=src-tauri/target/release/design-desk
[ -x "$BIN" ] || { echo "No release build found. Run: npm run build" >&2; exit 1; }

install -Dm755 "$BIN" "$HOME/.local/bin/design-desk"
install -Dm644 src-tauri/icons/icon.png "$HOME/.local/share/icons/hicolor/512x512/apps/design-desk.png"
install -Dm644 src-tauri/icons/128x128.png "$HOME/.local/share/icons/hicolor/128x128/apps/design-desk.png"

cat > "$HOME/.local/share/applications/design-desk.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=Design Desk
Comment=Personal workspace for web and UX design
Exec=$HOME/.local/bin/design-desk
Icon=design-desk
Terminal=false
Categories=Graphics;
StartupWMClass=design-desk
EOF

command -v update-desktop-database >/dev/null && update-desktop-database "$HOME/.local/share/applications" || true
command -v gtk-update-icon-cache >/dev/null && gtk-update-icon-cache -q -t "$HOME/.local/share/icons/hicolor" || true
echo "Installed. Search for 'Design Desk' in your launcher."
