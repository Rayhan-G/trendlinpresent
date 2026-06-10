#!/bin/bash

# Build optimizations
echo "🚀 Optimizing for 10M users..."

# Optimize images
node scripts/optimize-images.js

# Minify CSS (if you have PostCSS)
npx postcss assets/css/*.css --dir assets/css/minified

# Deploy to Cloudflare Pages
npx wrangler pages deploy . --project-name=trendlin --branch=main

echo "✅ Deployed to Cloudflare! Ready for 10M users."