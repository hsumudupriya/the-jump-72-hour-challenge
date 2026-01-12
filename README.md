# AI Email Sorter

An AI-powered email sorting application that automatically categorizes, summarizes, and helps you manage your Gmail inbox using Google's Gemini AI.

![Next.js](https://img.shields.io/badge/Next.js-16.1-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![Prisma](https://img.shields.io/badge/Prisma-7-2D3748)
![Gemini](https://img.shields.io/badge/Gemini-2.5_Flash-4285F4)

## Features

-   🔐 **Google OAuth Sign-in** - Secure authentication with Gmail API access
-   📧 **Multi-Account Support** - Connect multiple Gmail accounts to one profile
-   🏷️ **Custom Categories** - Create categories with names, descriptions, and colors for AI sorting
-   🤖 **AI Email Processing** - Automatic categorization and summarization using Gemini AI
-   📦 **Auto-Archive** - Emails are archived in Gmail after import (removed from inbox, not deleted)
-   👁️ **Email Viewing** - View AI summaries and original email content in slide-out panels
-   ✅ **Bulk Actions** - Select multiple emails for delete or unsubscribe
-   🔗 **AI Unsubscribe Agent** - Automated browser agent that navigates unsubscribe pages and fills forms
-   📊 **AI Usage Tracking** - Monitor token consumption and estimated costs per user

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Key Decisions & Improvements](#key-decisions--improvements)
3. [Prerequisites](#prerequisites)
4. [Local Development Setup](#local-development-setup)
5. [Deployment to Render](#deployment-to-render)
6. [User Guide](#user-guide)
7. [API Endpoints](#api-endpoints)
8. [Testing](#testing)

---

## Tech Stack

| Layer                  | Technology        | Purpose                                |
| ---------------------- | ----------------- | -------------------------------------- |
| **Framework**          | Next.js 16.1      | Full-stack React with App Router       |
| **Language**           | TypeScript 5.x    | Type safety                            |
| **Auth**               | NextAuth.js v5    | Google OAuth with token management     |
| **Database**           | PostgreSQL 18     | Persistent data storage                |
| **ORM**                | Prisma 7          | Database access with pg adapter        |
| **AI**                 | Gemini 2.5 Flash  | Email categorization & summarization   |
| **Styling**            | Tailwind CSS 4    | Utility-first CSS                      |
| **Components**         | shadcn/ui         | Pre-built accessible components        |
| **Browser Automation** | Playwright 1.57   | Headless browser for unsubscribe agent |
| **Rate Limiting**      | Bottleneck        | Gmail API rate limiting                |
| **Testing**            | Jest + Playwright | Unit + E2E testing                     |
| **Deployment**         | Render (Docker)   | Hosting + PostgreSQL                   |

---

## Key Decisions & Improvements

### Architecture Decisions

1. **NextAuth v5 (beta)** - Required for Next.js App Router support with proper server-side session handling

2. **Docker Deployment** - Playwright requires specific browser dependencies that aren't available on Render's standard Node runtime. Using `mcr.microsoft.com/playwright:v1.57.0-noble` as the base image provides all necessary dependencies.

3. **Gemini 2.5 Flash** - Selected for cost-effectiveness:

    - Input tokens: $0.075 per 1M tokens
    - Output tokens: $0.30 per 1M tokens
    - Streaming support for real-time token counting

4. **OAuth Popup Flow** - For linking additional Gmail accounts, a popup window is used instead of full page redirect to maintain user context in the dashboard.

5. **Polling vs Push** - Currently uses cron-based polling for email sync. Gmail Push Notifications (Pub/Sub) is documented as a future enhancement for real-time updates.

### Security Improvements

6. **Account Validation** - Prevents users from linking Gmail accounts that are already connected to another user, avoiding data leakage between accounts.

7. **Sign-in Validation** - Secondary accounts (linked accounts) cannot be used to sign in directly, ensuring users always authenticate with their primary account.

8. **AUTH_URL Auto-Configuration** - Uses Render's `RENDER_EXTERNAL_URL` environment variable as a fallback, eliminating manual URL configuration on deployment.

### UX Improvements

9. **Email Viewer Sheet** - Slide-out panel instead of modal for viewing emails, providing better context and easier navigation.

10. **AI Usage Dashboard** - Real-time tracking of AI token consumption and estimated costs, filterable by time period (today, week, month, all-time).

---

## Prerequisites

Before setting up the application, you'll need to configure the following services:

### 1. Google Cloud Console (OAuth + Gmail API)

**Console URL:** https://console.cloud.google.com/

1. Create a new project: "AI Email Sorter"
2. Enable the Gmail API:
    - Go to APIs & Services → Library
    - Search for "Gmail API" → Enable
3. Configure OAuth Consent Screen:
    - Go to APIs & Services → OAuth consent screen
    - User Type: External
    - App name: "AI Email Sorter"
    - Add scopes: `gmail.readonly`, `gmail.modify`, `openid`, `email`, `profile`
    - Add test users (your Gmail addresses)
4. Create OAuth Credentials:
    - Go to APIs & Services → Credentials
    - Create Credentials → OAuth client ID
    - Application type: Web application
    - Authorized JavaScript origins: `http://localhost:3000`
    - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
    - **Save the Client ID and Client Secret**

### 2. Google AI Studio (Gemini API Key)

**Console URL:** https://aistudio.google.com/

1. Sign in with your Google account
2. Go to Get API Key in the left sidebar
3. Create API Key → Select your Google Cloud project
4. **Save the API key**

### 3. PostgreSQL Database

For local development, you can use:

-   Docker: `docker run --name postgres -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres:18`
-   Local installation
-   Cloud database (Render, Supabase, etc.)

---

## Local Development Setup

### 1. Clone and Install

```bash
git clone <repository-url>
cd the-jump-paid-challenge/app
npm install
```

### 2. Environment Variables

Create a `.env` file in the `app` directory:

```env
# Google OAuth (from Google Cloud Console)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Auth.js Secret (generate with: npx auth secret)
AUTH_SECRET=your_generated_auth_secret

# Database URL
DATABASE_URL=postgresql://postgres:password@localhost:5432/email_sorter

# Gemini AI (from Google AI Studio)
GEMINI_API_KEY=your_gemini_api_key

# Cron Job Security (any random 32-character string)
CRON_SECRET=your_random_cron_secret

# App URL (for local development)
AUTH_URL=http://localhost:3000
```

### 3. Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# (Optional) Open Prisma Studio to inspect data
npx prisma studio
```

### 4. Install Playwright Browsers

```bash
npx playwright install chromium
```

### 5. Start Development Server

```bash
npm run dev
```

Visit http://localhost:3000 to access the application.

---

## Deployment to Render

### Option 1: Using Render Blueprint (Recommended)

1. Fork/clone this repository to your GitHub account
2. Go to https://dashboard.render.com/
3. Click "New" → "Blueprint"
4. Connect your GitHub repository
5. Render will detect `render.yaml` and create:
    - Web service (Docker)
    - PostgreSQL database
6. After deployment, set the following environment variables in the Render Dashboard:
    - `GOOGLE_CLIENT_ID` - From Google Cloud Console
    - `GOOGLE_CLIENT_SECRET` - From Google Cloud Console
    - `GEMINI_API_KEY` - From Google AI Studio

### Option 2: Manual Setup

#### Create PostgreSQL Database

1. Go to Render Dashboard → New → PostgreSQL
2. Name: `email-sorter-db`
3. Plan: Free (dev) or Basic ($6/mo for production)
4. Create and copy the External Connection String

#### Create Web Service

1. Go to Render Dashboard → New → Web Service
2. Connect your GitHub repository
3. Configure:
    - Name: `ai-email-sorter`
    - Runtime: Docker
    - Plan: Starter ($7/month)
4. Add environment variables:
    - `NODE_ENV`: `production`
    - `AUTH_TRUST_HOST`: `true`
    - `DATABASE_URL`: (paste from PostgreSQL)
    - `AUTH_SECRET`: (generate a random string)
    - `GOOGLE_CLIENT_ID`: (from Google Cloud Console)
    - `GOOGLE_CLIENT_SECRET`: (from Google Cloud Console)
    - `GEMINI_API_KEY`: (from Google AI Studio)
    - `CRON_SECRET`: (generate a random string)

### Update Google OAuth Redirect URIs

After deployment, add your Render URL to Google Cloud Console:

1. Go to APIs & Services → Credentials
2. Edit your OAuth client
3. Add Authorized JavaScript origins: `https://your-app.onrender.com`
4. Add Authorized redirect URIs: `https://your-app.onrender.com/api/auth/callback/google`
5. Add Authorized redirect URIs: `https://your-app.onrender.com/api/auth/link-account/callback` (for multi-account linking)

### Setting Up the Cron Job for Email Sync

The app needs periodic email syncing. Set up a cron job to call the sync endpoint:

#### Option A: Use Render Cron Jobs (Recommended)

1. Go to Render Dashboard → New → Cron Job
2. Name: `email-sync-cron`
3. Schedule: `*/5 * * * *` (every 5 minutes)
4. Command:
    ```bash
    curl -X POST https://your-app.onrender.com/api/cron/sync-emails -H "Authorization: Bearer YOUR_CRON_SECRET"
    ```
5. Replace `YOUR_CRON_SECRET` with the value from your environment variables

#### Option B: Use External Cron Service

Use a free service like [cron-job.org](https://cron-job.org):

1. Create an account
2. Create a new cron job:
    - URL: `https://your-app.onrender.com/api/cron/sync-emails`
    - Method: POST
    - Headers: `Authorization: Bearer YOUR_CRON_SECRET`
    - Schedule: Every 5 minutes

---

## User Guide

### Getting Started

1. **Sign In** - Click "Sign in with Google" on the landing page
2. **Grant Permissions** - Allow the app to access your Gmail (read and modify)
3. **Create Categories** - Set up categories like "Work", "Personal", "Newsletters", etc.
4. **Sync Emails** - Click "Sync Emails" to import your inbox emails

### Managing Categories

-   **Create**: Click "Create Category" and enter a name, description (helps AI categorize), and color
-   **Edit**: Click the edit icon on any category card
-   **Delete**: Click the delete icon (emails in this category will become uncategorized)

### Viewing Emails

1. Click on a category to see all emails sorted into it
2. Click on an email card to open the detailed view
3. The AI summary appears at the top, with the full email content below

### Bulk Actions

1. Use checkboxes to select multiple emails
2. Click "Select All" to select all visible emails
3. Use the floating action bar to:
    - **Delete**: Permanently delete selected emails
    - **Unsubscribe**: Let the AI agent unsubscribe you from mailing lists

### AI Unsubscribe Agent

The unsubscribe agent automatically:

1. Navigates to the unsubscribe page
2. Identifies unsubscribe buttons, links, or forms
3. Clicks buttons or fills out forms (email confirmation)
4. Reports success or failure

**Note**: Some websites may require CAPTCHA or additional verification that the agent cannot complete.

### Connecting Additional Gmail Accounts

1. Click "Add Account" in the accounts section
2. A popup will open for Google OAuth
3. Grant permissions for the additional account
4. Emails from all connected accounts will be synced and sorted

### Monitoring AI Usage

View your AI token consumption and estimated costs:

1. Go to the Usage section in your dashboard
2. Filter by time period (Today, This Week, This Month, All Time)
3. See breakdown by operation type (categorization, summarization, etc.)

---

## API Endpoints

### Authentication

| Endpoint                          | Method | Description                           |
| --------------------------------- | ------ | ------------------------------------- |
| `/api/auth/[...nextauth]`         | ALL    | NextAuth.js handlers                  |
| `/api/auth/link-account`          | GET    | Initiate OAuth for additional account |
| `/api/auth/link-account/callback` | GET    | OAuth callback for additional account |

### Accounts

| Endpoint        | Method | Description                   |
| --------------- | ------ | ----------------------------- |
| `/api/accounts` | GET    | List connected email accounts |
| `/api/accounts` | POST   | Connect a new email account   |

### Categories

| Endpoint               | Method | Description            |
| ---------------------- | ------ | ---------------------- |
| `/api/categories`      | GET    | List user's categories |
| `/api/categories`      | POST   | Create a new category  |
| `/api/categories/[id]` | PUT    | Update a category      |
| `/api/categories/[id]` | DELETE | Delete a category      |

### Emails

| Endpoint                  | Method | Description               |
| ------------------------- | ------ | ------------------------- |
| `/api/emails/sync`        | POST   | Trigger manual email sync |
| `/api/emails/[id]`        | GET    | Get single email details  |
| `/api/emails/[id]`        | DELETE | Delete an email           |
| `/api/emails/bulk-delete` | POST   | Delete multiple emails    |

### Unsubscribe

| Endpoint           | Method | Description               |
| ------------------ | ------ | ------------------------- |
| `/api/unsubscribe` | POST   | Unsubscribe from an email |

### Cron Jobs

| Endpoint                | Method | Description                                                |
| ----------------------- | ------ | ---------------------------------------------------------- |
| `/api/cron/sync-emails` | POST   | Sync emails for all active accounts (requires CRON_SECRET) |

### Usage

| Endpoint     | Method | Description             |
| ------------ | ------ | ----------------------- |
| `/api/usage` | GET    | Get AI usage statistics |

---

## Testing

### Unit Tests

```bash
npm run test           # Run all unit tests
npm run test:watch     # Run in watch mode
npm run test:coverage  # Run with coverage report
```

### E2E Tests

```bash
npm run test:e2e       # Run Playwright E2E tests
npm run test:e2e:ui    # Run with Playwright UI
```

### Test Files

-   `__tests__/unit/` - Jest unit tests
-   `__tests__/e2e/` - Playwright E2E tests

---

## Project Structure

```
app/
├── prisma/
│   └── schema.prisma       # Database schema
├── src/
│   ├── app/
│   │   ├── api/            # API routes
│   │   ├── dashboard/      # Dashboard pages
│   │   ├── login/          # Login page
│   │   └── layout.tsx      # Root layout
│   ├── components/
│   │   ├── auth/           # Auth components
│   │   ├── categories/     # Category components
│   │   ├── dashboard/      # Dashboard components
│   │   ├── emails/         # Email components
│   │   └── ui/             # shadcn/ui components
│   ├── lib/
│   │   ├── ai/             # Gemini AI utilities
│   │   ├── agent/          # Unsubscribe agent
│   │   ├── validations/    # Zod schemas
│   │   ├── auth.ts         # NextAuth configuration
│   │   ├── email-sync.ts   # Email sync logic
│   │   ├── gmail.ts        # Gmail API client
│   │   ├── prisma.ts       # Prisma client
│   │   └── url.ts          # URL utilities
│   └── types/              # TypeScript types
├── __tests__/
│   ├── unit/               # Unit tests
│   └── e2e/                # E2E tests
├── Dockerfile              # Docker configuration
├── render.yaml             # Render Blueprint
└── package.json
```

---

## License

This project was built as part of a 72-hour coding challenge.

---

## Acknowledgments

-   [Next.js](https://nextjs.org/) - React framework
-   [Prisma](https://www.prisma.io/) - Database ORM
-   [NextAuth.js](https://authjs.dev/) - Authentication
-   [shadcn/ui](https://ui.shadcn.com/) - UI components
-   [Google Gemini](https://ai.google.dev/) - AI models
-   [Playwright](https://playwright.dev/) - Browser automation
-   [Render](https://render.com/) - Deployment platform
