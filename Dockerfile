# Use Playwright's official image which includes all browser dependencies
FROM mcr.microsoft.com/playwright:v1.57.0-noble

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy prisma schema and config
COPY prisma ./prisma/
COPY prisma.config.ts ./

# Generate Prisma client
RUN npx prisma generate

# Copy the rest of the application
COPY . .

# Build the Next.js application
RUN npm run build

# Re-install Playwright browsers
RUN npx playwright install chromium

# Expose the port Next.js runs on
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Create startup script that runs migrations then starts the app
RUN echo '#!/bin/sh\n# Auto-set AUTH_URL from RENDER_EXTERNAL_URL if not provided\nif [ -z "$AUTH_URL" ] && [ -n "$RENDER_EXTERNAL_URL" ]; then\n  export AUTH_URL="https://$RENDER_EXTERNAL_URL"\nfi\nnpx prisma db push --skip-generate\nnpm start' > /app/start.sh && chmod +x /app/start.sh

# Start the application with migrations
CMD ["/app/start.sh"]
