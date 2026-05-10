#!/bin/bash
cd ~/dev/apps/dhyaan

LOG=~/dev/builds/dhyaan/build-ios.log
mkdir -p ~/dev/builds/dhyaan

echo "🍎 Building Dhyaan for iOS..."
echo "📋 Log: $LOG"
echo ""

eas build --platform ios --profile production --local --non-interactive --output ~/dev/builds/dhyaan/Dhyaan.ipa 2>&1 | tee "$LOG"

if [ ${PIPESTATUS[0]} -eq 0 ]; then
  echo ""
  echo "✅ iOS build SUCCEEDED! → ~/dev/builds/dhyaan/Dhyaan.ipa"
else
  echo ""
  echo "❌ iOS build FAILED. Check log: $LOG"
  exit 1
fi
