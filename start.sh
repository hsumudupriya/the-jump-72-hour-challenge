#!/bin/sh

# Auto-set AUTH_URL from RENDER_EXTERNAL_URL if not provided
if [ -z "$AUTH_URL" ] && [ -n "$RENDER_EXTERNAL_URL" ]; then
  export AUTH_URL="https://$RENDER_EXTERNAL_URL"
fi

# Run Prisma migrations
npx prisma db push --skip-generate

# Start the Next.js application
npm start
