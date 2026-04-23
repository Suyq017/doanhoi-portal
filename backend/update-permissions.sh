#!/bin/bash

# Script to update permissions and sync super_admin role
# This script runs the consolidated permissions update flow

echo "🚀 Starting permissions and role update..."
echo ""

echo "📝 Running permissions update..."
npm run update:permissions

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Failed to update permissions!"
    exit 1
fi

echo ""
echo "✅ Permissions updated successfully!"
echo ""
echo "✅ All updates completed successfully!"
echo ""
echo "📊 Summary:"
echo "   - Permissions database updated"
echo "   - super_admin role synced with latest permissions"
echo ""
echo "🎉 Done!"
