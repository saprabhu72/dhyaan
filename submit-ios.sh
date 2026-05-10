#!/bin/bash
cd ~/dev/apps/dhyaan

IPA=$(ls -t ~/dev/builds/dhyaan/*.ipa 2>/dev/null | head -1)
if [ -z "$IPA" ]; then
  echo "❌ No .ipa file found in ~/dev/builds/dhyaan/. Run the iOS build first."
  exit 1
fi
echo "📦 Submitting $IPA to App Store..."
eas submit --platform ios --profile production --non-interactive --path "$IPA"
echo "✅ Submission complete!"
