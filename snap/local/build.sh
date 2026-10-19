#!/usr/bin/env bash
set -euo pipefail

: "${CRAFT_PART_SRC:?Run this helper through Snapcraft}"
: "${CRAFT_PART_BUILD:?Run this helper through Snapcraft}"
: "${CRAFT_PART_INSTALL:?Run this helper through Snapcraft}"
: "${CRAFT_ARCH_BUILD_FOR:?Run this helper through Snapcraft}"
[[ "$CRAFT_ARCH_BUILD_FOR" == amd64 ]] || {
  printf '%s\n' 'Org Notes currently packages only Linux amd64.' >&2
  exit 1
}

# Exact upstream release archives, authenticated against committed SHA-256
# values from each release's official checksum manifest. No floating installers.
readonly bun_version=1.4.2
readonly node_version=24.21.0
readonly rust_version=1.94.1
readonly target=x86_64-unknown-linux-gnu
readonly tools="$CRAFT_PART_BUILD/snap-toolchain"
mkdir -p "$tools/downloads" "$tools/node" "$tools/bun" "$tools/rust"
cd "$tools/downloads"

curl --fail --location --proto '=https' --tlsv1.2 \
  "https://github.com/oven-sh/bun/releases/download/bun-v${bun_version}/bun-linux-x64-baseline.zip" \
  --output bun.zip
printf '%s  %s\n' \
  c678040f14fe0440eb839d37cbd0ce4c051a32da72806ac97de6a6aab6bf728f bun.zip | sha256sum --check --strict
unzip -oq bun.zip -d "$tools/bun"

curl --fail --location --proto '=https' --tlsv1.2 \
  "https://nodejs.org/dist/v${node_version}/node-v${node_version}-linux-x64.tar.xz" \
  --output node.tar.xz
printf '%s  %s\n' \
  fd8e59d5a511510f6a298afb548f18c7d2b1be404d8b4a27d94fbe49f56cb2d6 node.tar.xz | sha256sum --check --strict
tar -xJf node.tar.xz --strip-components=1 -C "$tools/node"

curl --fail --location --proto '=https' --tlsv1.2 \
  "https://static.rust-lang.org/dist/rust-${rust_version}-${target}.tar.xz" \
  --output rust.tar.xz
printf '%s  %s\n' \
  294b3d81fa72e62581276290c60c81eb8b58498d333d422ca1dfc432877d0c40 rust.tar.xz | sha256sum --check --strict
tar -xJf rust.tar.xz
bash "rust-${rust_version}-${target}/install.sh" \
  --prefix="$tools/rust" \
  --components="rustc,cargo,rust-std-${target}" \
  --disable-ldconfig

export PATH="$tools/bun/bun-linux-x64-baseline:$tools/node/bin:$tools/rust/bin:$PATH"
export CARGO_HOME="$tools/cargo-home"
export CARGO_TARGET_DIR="$CRAFT_PART_BUILD/cargo-target"
export PUPPETEER_SKIP_DOWNLOAD=true
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
export NODE_ENV=production

cd "$CRAFT_PART_SRC"
# One workspace install, with dev tools included for TypeScript/Vite/Tauri.
# NODE_ENV is set only for the release frontend, not for dependency pruning.
NODE_ENV=development bun install --frozen-lockfile

cd apps/desktop
# Tauri runs the existing beforeBuildCommand exactly once; no deb/AppImage
# build, extraction, frontend duplicate or search for a convenient executable.
bun run tauri build --ci --no-bundle \
  --target "$target" \
  --config "$CRAFT_PART_SRC/snap/tauri.conf.json" \
  -- --locked

install -Dm755 "$CARGO_TARGET_DIR/$target/release/grain" \
  "$CRAFT_PART_INSTALL/bin/grain"
install -Dm644 "$CRAFT_PART_SRC/snap/gui/org-notes.desktop" \
  "$CRAFT_PART_INSTALL/usr/share/applications/org-notes.desktop"
install -Dm644 "$CRAFT_PART_SRC/snap/gui/org-notes.png" \
  "$CRAFT_PART_INSTALL/meta/gui/org-notes.png"
install -Dm644 "$CRAFT_PART_SRC/LICENSE" \
  "$CRAFT_PART_INSTALL/usr/share/licenses/org-notes/LICENSE"
