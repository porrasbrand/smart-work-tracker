#!/bin/bash
# Smart Work Tracker - Refresh Work Script
# Run this to update the dashboard with latest work sessions

echo "🔄 Refreshing Smart Work Tracker..."
echo ""

cd /home/mp/awesome/smart-work-tracker

# Step 1: Parse new/updated Claude sessions
echo "📖 Step 1/3: Parsing Claude sessions..."
node src/index.js parse
echo ""

# Step 2: Attribute segments to ActiveCollab projects
echo "🏷️  Step 2/3: Attributing to projects..."
node src/index.js attribute
echo ""

# Step 3: Auto-detect task descriptions
echo "🔍 Step 3/3: Detecting task types..."
node src/index.js detect
echo ""

echo "✅ Refresh complete!"
echo ""
echo "📊 Dashboard updated at: http://localhost:3000"
echo "   Refresh your browser to see new work"
echo ""
