#!/bin/bash

echo "🚀 Setting up Clerk React Sample for AI Agents Platform"
echo "=================================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
node_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$node_version" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) found"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create .env.local if it doesn't exist
if [ ! -f ".env.local" ]; then
    echo "📝 Creating .env.local file..."
    cp env.example .env.local
    echo "⚠️  Please edit .env.local and add your Clerk Publishable Key"
else
    echo "✅ .env.local already exists"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env.local and add your Clerk Publishable Key"
echo "2. Make sure your AI Agents Platform backend is running on http://localhost:3000"
echo "3. Run 'npm start' to start the development server"
echo ""
echo "🔗 Get your Clerk key from: https://dashboard.clerk.com/"
echo ""

# Check if .env.local has been configured
if grep -q "pk_test_your_publishable_key_here" .env.local 2>/dev/null; then
    echo "⚠️  Remember to replace 'pk_test_your_publishable_key_here' with your actual Clerk key!"
fi 
