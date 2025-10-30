#!/bin/bash

# Script to update permissions and super_admin role
# This script will:
# 1. Update all permissions in the database
# 2. Update super_admin role with latest permissions

echo "🚀 Starting permissions and role update..."
echo ""

# Step 1: Update permissions
echo "📝 Step 1/2: Updating permissions..."
npm run update:permissions

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Failed to update permissions!"
    exit 1
fi

echo ""
echo "✅ Permissions updated successfully!"
echo ""

# Step 2: Update super_admin role
echo "👤 Step 2/2: Updating super_admin role..."
npm run update:super-admin

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Failed to update super_admin role!"
    exit 1
fi

echo ""
echo "✅ All updates completed successfully!"
echo ""
echo "📊 Summary:"
echo "   - Permissions database updated"
echo "   - super_admin role updated with latest permissions"
echo ""
echo "🎉 Done!"
