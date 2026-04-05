#!/bin/bash
# JARVIS Deploy Pipeline: Plan → Code → Git → Deploy
# Usage: ./deploy-pipeline.sh "feature description"

FEATURE="$1"
if [ -z "$FEATURE" ]; then
    echo "Usage: $0 'feature description'"
    echo "Example: $0 'add user authentication'"
    exit 1
fi

echo "🚀 JARVIS Deploy Pipeline"
echo "Feature: $FEATURE"
echo "=========================================="

# Step 1: Plan
echo ""
echo "📋 Step 1: Planning..."
echo "Feature: $FEATURE"
echo "Timestamp: $(date)"

# Step 2: Git status check
echo ""
echo "📝 Step 2: Git Status"
cd /home/jarvis/jarvis-core
git status --short

# Step 3: Commit changes
echo ""
echo "💾 Step 3: Committing changes..."
git add -A
git commit -m "feat: $FEATURE" 2>/dev/null || echo "No changes to commit"

# Step 4: Push to GitHub
echo ""
echo "📤 Step 4: Pushing to GitHub..."
git push origin main 2>/dev/null || echo "Push failed or already up to date"

# Step 5: Verify
echo ""
echo "✅ Step 5: Verification"
echo "Last commit: $(git log --oneline -1)"
echo "Branch: $(git branch --show-current)"

echo ""
echo "=========================================="
echo "🎉 Deploy pipeline complete!"
