#!/bin/bash

# Configuration
VERCEL_SYNC_HOOK="https://telegram-bot-tawny-chi.vercel.app/api/webhook/sync"
PROJECT_DIR="/Users/laurence/works/still building /proxy"

echo "🚀 Starting Nexus Sync Process..."

# 1. Run Scraper
echo "🔍 Phase 1: Scraping and Validating Proxies..."
cd "$PROJECT_DIR"
npm start

# 2. Sync to Bot Folder
echo "📦 Phase 2: Updating Bot Cache..."
cp "$PROJECT_DIR/results.json" "$PROJECT_DIR/telegram-bot/results.json"


# 3. Commit and Push to GitHub
echo "📤 Phase 3: Pushing to GitHub..."
git add .
git commit -m "Auto-sync: Updated proxies $(date +'%Y-%m-%d %H:%M:%S')"
git push origin main

# 4. Trigger Vercel Sync
echo "📡 Phase 4: Notifying Vercel Bot..."
curl -X POST "$VERCEL_SYNC_HOOK"

echo "✅ Sync Complete! Your bot and dashboard are now up to date."
