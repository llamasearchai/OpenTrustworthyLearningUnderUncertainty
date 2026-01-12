#!/bin/bash

# Start Frontend Server Script
# Builds and serves the frontend application on a free port

set -e

echo "Building frontend application..."
cd "$(dirname "$0")/.."
pnpm build

echo "Starting preview server on free port..."
pnpm preview
