#!/usr/bin/env bash
#
# Оновлення розширення Component Preview до останньої версії.
#
# Вимоги: gh (GitHub CLI), встановлений та авторизований.
#   brew install gh && gh auth login
#
# Використання:
#   ./scripts/update-extension.sh          — встановити в Cursor
#   ./scripts/update-extension.sh code     — встановити в VS Code
#

set -euo pipefail

REPO="artem-levchenko-2/cursor-extension"
IDE="${1:-cursor}"
TMP_DIR=$(mktemp -d)

cleanup() { rm -rf "$TMP_DIR"; }
trap cleanup EXIT

# --- Перевірка залежностей ---

if ! command -v gh &>/dev/null; then
  echo "Помилка: GitHub CLI (gh) не встановлено."
  echo "Встановіть: brew install gh && gh auth login"
  exit 1
fi

if ! command -v "$IDE" &>/dev/null; then
  echo "Помилка: команда '$IDE' не знайдена."
  if [ "$IDE" = "cursor" ]; then
    echo "Відкрийте Cursor → Cmd+Shift+P → 'Shell Command: Install cursor command in PATH'"
  fi
  exit 1
fi

# --- Завантаження останнього релізу ---

echo "Завантаження останньої версії з $REPO..."

gh release download --repo "$REPO" --pattern "*.vsix" --dir "$TMP_DIR" --clobber

VSIX_FILE=$(ls "$TMP_DIR"/*.vsix 2>/dev/null | head -1)

if [ -z "$VSIX_FILE" ]; then
  echo "Помилка: .vsix файл не знайдено у останньому релізі."
  exit 1
fi

VERSION=$(basename "$VSIX_FILE" | sed 's/component-preview-//;s/\.vsix//')
echo "Знайдено версію: $VERSION"

# --- Встановлення ---

echo "Встановлення в $IDE..."
"$IDE" --install-extension "$VSIX_FILE"

echo ""
echo "Готово! Component Preview $VERSION встановлено."
echo "Перезавантажте вікно IDE: Cmd+Shift+P → 'Developer: Reload Window'"
