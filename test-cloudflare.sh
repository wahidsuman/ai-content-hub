#!/bin/bash

echo "==================================="
echo "Cloudflare Credentials Test"
echo "==================================="
echo ""
echo "Please enter your Cloudflare credentials to test them:"
echo ""

read -p "Enter your CLOUDFLARE_ACCOUNT_ID: " ACCOUNT_ID
read -s -p "Enter your CLOUDFLARE_API_TOKEN: " API_TOKEN
echo ""
echo ""

echo "Testing API Token..."
echo "-------------------"

# Test 1: Verify token works
RESPONSE=$(curl -s -X GET "https://api.cloudflare.com/client/v4/user/tokens/verify" \
     -H "Authorization: Bearer $API_TOKEN" \
     -H "Content-Type: application/json")

SUCCESS=$(echo $RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin).get('success', False))")

if [ "$SUCCESS" = "True" ]; then
    echo "✅ API Token is valid!"
else
    echo "❌ API Token is invalid!"
    echo "Response: $RESPONSE"
    exit 1
fi

# Test 2: List workers
echo ""
echo "Testing Worker Access..."
echo "------------------------"

WORKERS=$(curl -s -X GET "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/workers/scripts" \
     -H "Authorization: Bearer $API_TOKEN" \
     -H "Content-Type: application/json")

WORKER_SUCCESS=$(echo $WORKERS | python3 -c "import sys, json; print(json.load(sys.stdin).get('success', False))")

if [ "$WORKER_SUCCESS" = "True" ]; then
    echo "✅ Can access workers!"
    echo ""
    echo "Workers found:"
    echo $WORKERS | python3 -c "import sys, json; [print(f'  - {s[\"id\"]}') for s in json.load(sys.stdin).get('result', [])]"
else
    echo "❌ Cannot access workers!"
    echo "Response: $WORKERS"
    echo ""
    echo "This usually means:"
    echo "1. Wrong Account ID"
    echo "2. Token doesn't have 'Workers Scripts:Read' permission"
    echo "3. Token is scoped to wrong account"
fi

echo ""
echo "==================================="
echo "To fix GitHub deployment:"
echo "1. Go to: https://github.com/wahidsuman/ai-content-hub/settings/secrets/actions"
echo "2. Update CLOUDFLARE_ACCOUNT_ID to: $ACCOUNT_ID"
echo "3. Update CLOUDFLARE_API_TOKEN with your token"
echo "==================================="