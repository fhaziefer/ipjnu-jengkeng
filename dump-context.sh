#!/usr/bin/env bash
set -euo pipefail

OUT_DIR="ai_context"
TIMESTAMP=$(date +'%Y-%m-%d_%H-%M-%S')

echo "🧹 Resetting output dir: ${OUT_DIR}"
rm -rf "${OUT_DIR}"
mkdir -p "${OUT_DIR}"

append_file() {
  local f="$1"
  echo ""
  echo "<file path=\"$f\">"
  cat "$f"
  echo "</file>"
}

dump_targets() {
  local output_file="$1"
  shift
  local targets=("$@")

  echo "📦 Generating $(basename "$output_file") ..."
  echo "<context_dump>" > "$output_file"

  for target in "${targets[@]}"; do
    if [[ -f "$target" ]]; then
      append_file "$target" >> "$output_file"
    elif [[ -d "$target" ]]; then
      # Cari semua file dalam folder, abaikan file gambar/icon
      while IFS= read -r f; do
        append_file "$f" >> "$output_file"
      done < <(find "$target" -type f \! -name "*.ico" \! -name "*.png" \! -name "*.jpg" \! -name "*.svg" \! -name "*.DS_Store")
    fi
  done

  echo "</context_dump>" >> "$output_file"
}

# =========================
# 0) Tree Structure
# =========================
echo "🌳 Generating context_tree.txt..."
{
  echo "<project_structure>"
  if command -v tree >/dev/null 2>&1; then
    tree -a -I "node_modules|.git|.next|.vercel|ai_context|*.png|*.ico" .
  else
    find . -maxdepth 4 -print
  fi
  echo "</project_structure>"
} > "${OUT_DIR}/${TIMESTAMP}_context_tree.txt"

# =========================
# 1) Core Config
# =========================
dump_targets "${OUT_DIR}/${TIMESTAMP}_context_core.txt" \
  "package.json" "tsconfig.json" "next.config.ts" "eslint.config.mjs" "postcss.config.mjs" "next-env.d.ts"

# =========================
# 2) UI Components
# =========================
dump_targets "${OUT_DIR}/${TIMESTAMP}_context_components.txt" "src/components"

# =========================
# 3) App (Pages & Layout)
# =========================
dump_targets "${OUT_DIR}/${TIMESTAMP}_context_app.txt" "src/app"

# =========================
# 4) Logic, Hooks, & Store
# =========================
dump_targets "${OUT_DIR}/${TIMESTAMP}_context_logic.txt" "src/lib" "src/hooks" "src/store"

echo ""
echo "✅ DONE. Silakan cek folder '${OUT_DIR}'!"