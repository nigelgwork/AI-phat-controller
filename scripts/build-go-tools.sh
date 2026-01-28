#!/bin/bash
# Cross-compile gt and bd for Windows from Linux/WSL

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BUILD_DIR="$PROJECT_DIR/resources/bin"
TEMP_DIR="$PROJECT_DIR/.go-build-temp"

mkdir -p "$BUILD_DIR" "$TEMP_DIR"

echo "=== Building Go tools for Windows ==="
echo "Build dir: $BUILD_DIR"
echo ""

# Check for Go
if ! command -v go &> /dev/null; then
    echo "Error: Go is not installed"
    exit 1
fi

echo "Go version: $(go version)"
echo ""

# Build gt (pure Go, no CGO needed)
echo "Building gt for Windows..."
cd "$TEMP_DIR"
if [ ! -d "gastown" ]; then
    echo "Cloning gastown..."
    git clone --depth 1 https://github.com/steveyegge/gastown.git
else
    echo "Using cached gastown..."
    cd gastown && git pull && cd ..
fi
cd gastown
GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -o "$BUILD_DIR/gt.exe" ./cmd/gt
echo "Built: $BUILD_DIR/gt.exe"
echo ""

# Build bd (requires CGO for gozstd dependency)
echo "Building bd for Windows..."
cd "$TEMP_DIR"
if [ ! -d "beads" ]; then
    echo "Cloning beads..."
    git clone --depth 1 https://github.com/steveyegge/beads.git
else
    echo "Using cached beads..."
    cd beads && git pull && cd ..
fi
cd beads

# Detect cross-compilation scenario (building Windows binary on non-Windows)
if [[ "$(uname -s)" != MINGW* && "$(uname -s)" != MSYS* && "$(uname -s)" != CYGWIN* ]]; then
    # Cross-compiling from Linux/macOS to Windows — need mingw-w64 for CGO
    CROSS_CC="x86_64-w64-mingw32-gcc"
    if ! command -v "$CROSS_CC" &> /dev/null; then
        echo ""
        echo "Error: $CROSS_CC not found."
        echo ""
        echo "bd requires CGO (gozstd dependency) so cross-compiling to Windows"
        echo "needs the mingw-w64 cross-compiler."
        echo ""
        echo "Install it with:"
        echo "  Ubuntu/Debian: sudo apt-get install gcc-mingw-w64-x86-64"
        echo "  Fedora:        sudo dnf install mingw64-gcc"
        echo "  Arch:          sudo pacman -S mingw-w64-gcc"
        echo "  macOS:         brew install mingw-w64"
        echo ""
        exit 1
    fi
    echo "Using cross-compiler: $CROSS_CC"
    CC="$CROSS_CC" CGO_ENABLED=1 GOOS=windows GOARCH=amd64 go build -o "$BUILD_DIR/bd.exe" ./cmd/bd
else
    # Native Windows build
    CGO_ENABLED=1 GOOS=windows GOARCH=amd64 go build -o "$BUILD_DIR/bd.exe" ./cmd/bd
fi
echo "Built: $BUILD_DIR/bd.exe"
echo ""

echo "=== Build complete ==="
ls -la "$BUILD_DIR"
