#!/bin/bash
cd ~/dev/apps/dhyaan
echo "🤖 Building Dhyaan for Android..."
eas build --platform android --profile production --local --output ~/dev/builds/dhyaan/Dhyaan.aab
echo "✅ Android build complete! → ~/dev/builds/dhyaan/Dhyaan.aab"
