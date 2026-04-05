#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${1:-$(pwd)}"

print_section() {
  printf '\n== %s ==\n' "$1"
}

count_files() {
  local dir="$1"
  find "$dir" -type f 2>/dev/null | wc -l | tr -d ' '
}

show_samples() {
  local dir="$1"
  find "$dir" -type f 2>/dev/null | sed -n '1,10p'
}

show_recent() {
  local dir="$1"
  find "$dir" -type f -print0 2>/dev/null | xargs -0 ls -lt 2>/dev/null | sed -n '1,10p'
}

print_section "Environment"
printf 'User: %s\n' "$(id -un)"
printf 'Home: %s\n' "$HOME"
printf 'Project: %s\n' "$PROJECT_DIR"

print_section "Likely Asset Paths"
paths=(
  "$PROJECT_DIR/data/uploads"
  "$PROJECT_DIR/backend/uploads"
  "$HOME/blog_assets/uploads"
  "$HOME/blog-assets/uploads"
  "/root/blog_assets/uploads"
  "/root/blog-assets/uploads"
)

for path in "${paths[@]}"; do
  if [[ -d "$path" ]]; then
    printf '[FOUND] %s (%s files)\n' "$path" "$(count_files "$path")"
    show_samples "$path"
  else
    printf '[MISS ] %s\n' "$path"
  fi
done

print_section "Recent Cover Files"
for path in "${paths[@]}"; do
  if [[ -d "$path" ]]; then
    printf '\n%s\n' "$path"
    find "$path" -type f \( -path '*/cover/*' -o -name 'cover_*' \) 2>/dev/null | sed -n '1,20p'
  fi
done

print_section "Recently Modified Files"
for path in "${paths[@]}"; do
  if [[ -d "$path" ]]; then
    printf '\n%s\n' "$path"
    show_recent "$path"
  fi
done

if command -v docker >/dev/null 2>&1; then
  print_section "Docker Containers"
  docker ps -a --format 'table {{.ID}}\t{{.Names}}\t{{.Status}}\t{{.Image}}'

  backend_containers="$(docker ps -a --format '{{.ID}} {{.Names}}' | awk '/blog_backend/ {print $1}')"
  if [[ -n "$backend_containers" ]]; then
    print_section "Backend Container Mounts"
    while read -r container_id; do
      [[ -n "$container_id" ]] || continue
      printf '\nContainer: %s\n' "$container_id"
      docker inspect "$container_id" --format '{{range .Mounts}}{{println .Source "->" .Destination}}{{end}}'
    done <<<"$backend_containers"

    print_section "Container /app/uploads Snapshots"
    while read -r container_id; do
      [[ -n "$container_id" ]] || continue
      printf '\nContainer: %s\n' "$container_id"
      docker exec "$container_id" sh -lc 'if [ -d /app/uploads ]; then find /app/uploads -type f | sed -n "1,20p"; else echo "/app/uploads missing"; fi' 2>/dev/null || true
    done <<<"$backend_containers"
  fi
else
  print_section "Docker"
  echo "docker not found; skipping container inspection"
fi

print_section "Suggested Restore Commands"
cat <<'EOF'
1. If the old files are in a bind mount:
   cp -a /old/path/. "$HOME/blog_assets/uploads/"

2. If an old container still has /app/uploads:
   docker cp <container_id>:/app/uploads/. "$HOME/blog_assets/uploads/"

3. After restore, verify:
   find "$HOME/blog_assets/uploads" -type f | wc -l
   find "$HOME/blog_assets/uploads" -type f | rg 'cover_' | sed -n '1,20p'
EOF
