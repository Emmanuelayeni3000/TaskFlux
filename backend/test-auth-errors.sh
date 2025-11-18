#!/bin/bash

# Test script for authentication error handling
# Run this from the backend directory

echo "🔒 Testing Authentication Error Handling"
echo "========================================"

# Make sure the server is running
echo "Starting the server in the background..."
npm run dev &
SERVER_PID=$!

# Wait for server to start
echo "Waiting for server to start..."
sleep 5

BASE_URL="http://localhost:3001/api/auth"

echo ""
echo "📋 Test Results:"
echo "================"

# Test 1: Invalid email format
echo ""
echo "1️⃣  Testing invalid email format..."
curl -s -X POST "$BASE_URL/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "invalid-email", "password": "password123"}' \
  | jq -r '.message // "No message"'

# Test 2: Empty password
echo ""
echo "2️⃣  Testing empty password..."
curl -s -X POST "$BASE_URL/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": ""}' \
  | jq -r '.message // "No message"'

# Test 3: Non-existent user
echo ""
echo "3️⃣  Testing non-existent user..."
curl -s -X POST "$BASE_URL/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "nonexistent@example.com", "password": "password123"}' \
  | jq -r '.message // "No message"'

# Test 4: Wrong password for existing user (if any exists)
echo ""
echo "4️⃣  Testing wrong password..."
curl -s -X POST "$BASE_URL/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "wrongpassword"}' \
  | jq -r '.message // "No message"'

# Test 5: Rate limiting (multiple failed attempts)
echo ""
echo "5️⃣  Testing rate limiting (multiple failed attempts)..."
for i in {1..6}; do
  echo "   Attempt $i:"
  curl -s -X POST "$BASE_URL/login" \
    -H "Content-Type: application/json" \
    -d '{"email": "ratelimit@example.com", "password": "wrongpassword"}' \
    | jq -r '.message // "No message"'
  sleep 1
done

echo ""
echo "✅ Tests completed!"
echo "Check the server logs for security monitoring messages."

# Clean up
echo ""
echo "Stopping test server..."
kill $SERVER_PID 2>/dev/null

echo "🎉 Authentication error handling tests finished!"