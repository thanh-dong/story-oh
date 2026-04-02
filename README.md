# StoryTime

Interactive branching stories for kids aged 4-12. Children choose their path, shape the story, and discover gentle life lessons along the way.

## Features

- **Interactive stories** with branching choices and multiple endings
- **AI story generation** powered by OpenAI (GPT-4o) with configurable parameters
- **Text-to-speech** read-aloud using OpenAI TTS
- **Credit system** for AI generation with admin controls
- **User story management** — users create private stories, admins create public ones
- **Multi-language** support (English, Vietnamese, German)
- **Authentication** via better-auth (email/password + Google OAuth)
- **Admin dashboard** for story and user management

## Prerequisites

You need accounts/keys for these services:

| Service | What for | Where to get it |
|---------|----------|----------------|
| **Supabase** | PostgreSQL database | [supabase.com](https://supabase.com) — create a free project |
| **OpenAI** | AI story generation + TTS | [platform.openai.com](https://platform.openai.com) — get an API key |
| **Google OAuth** (optional) | Social sign-in | [console.cloud.google.com](https://console.cloud.google.com) — create OAuth credentials |

## Setup

### 1. Clone and install

```bash
git clone https://github.com/thanh-dong/story-oh.git
cd story-oh
npm install
```

### 2. Configure environment

Create `.env.local` in the project root:

```env
# Database — Supabase connection string (Project Settings > Database > Connection string > URI)
DATABASE_URL="postgresql://postgres.[your-project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"

# Auth — better-auth configuration
BETTER_AUTH_SECRET="your-random-secret-at-least-32-characters"
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_BETTER_AUTH_URL="http://localhost:3000"

# AI — OpenAI API (used for story generation + TTS)
AI_BASE_URL="https://api.openai.com/v1"
AI_API_KEY="sk-proj-your-openai-api-key"
AI_MODEL="gpt-4o"

# Google OAuth (optional — omit to disable social sign-in)
# GOOGLE_CLIENT_ID="your-google-client-id"
# GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

### 3. Set up the database

Push the Drizzle schema to create all tables:

```bash
npm run db:push
```

Seed test accounts for development:

```bash
npm run db:seed
```

This creates:
- `admin@test.com` / `password123` (admin role)
- `user@test.com` / `password123` (user role, 100 credits)

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Development vs Production

| | Development | Production |
|---|---|---|
| **Email verification** | Disabled | Required |
| **Google OAuth** | Optional (works without keys) | Recommended |
| **Dev login shortcuts** | Shown on login page | Hidden |
| **Admin access** | Use `admin@test.com` | Manage via seed script |

## Project Structure

```
src/
├── app/
│   ├── admin/          # Admin dashboard (stories + users)
│   ├── api/
│   │   ├── admin/      # Admin API (stories CRUD, user management)
│   │   ├── auth/       # better-auth handler
│   │   ├── stories/    # User story CRUD + AI generation + progress
│   │   ├── me/         # Current user endpoints (credits)
│   │   └── tts/        # Text-to-speech endpoint
│   ├── explore/        # Public story browsing
│   ├── library/        # User's stories + reading progress
│   ├── login/          # Sign in
│   ├── signup/         # Create account
│   └── story/[id]/     # Story detail + reader
├── components/
│   ├── admin/          # Story form, tree editor, generate form
│   ├── story-reader.tsx
│   ├── story-card.tsx
│   ├── navbar.tsx
│   └── ui/             # shadcn/ui components
└── lib/
    ├── auth.ts         # better-auth config
    ├── auth-client.ts  # Browser auth client
    ├── credits.ts      # Credit cost calculation
    ├── story-generation.ts  # Shared AI generation logic
    ├── db/
    │   ├── index.ts    # Drizzle client
    │   ├── schema.ts   # Database schema
    │   └── seed.ts     # Dev seed script
    ├── types.ts        # TypeScript interfaces
    ├── gradients.ts    # Story cover gradients
    └── tree-utils.ts   # Story tree ↔ React Flow conversion
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run db:push` | Push schema to database |
| `npm run db:seed` | Seed test accounts |
| `npm run db:studio` | Open Drizzle Studio (DB browser) |

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: PostgreSQL (Supabase) via Drizzle ORM
- **Auth**: better-auth
- **AI**: OpenAI API (GPT-4o for generation, TTS-1 for read-aloud)
- **UI**: Tailwind CSS 4 + shadcn/ui (base-ui)
- **Tree Editor**: React Flow + Dagre auto-layout
