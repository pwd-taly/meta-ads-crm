# Meta Ads CRM Project Overview

## Purpose
Multi-tenancy CRM application for managing leads from Meta Ads campaigns. Phase 0 (Multi-Tenancy Foundation) is complete. Now implementing Phase 1 Stream 1 (AI & Automation).

## Tech Stack
- **Framework:** Next.js 14.2 (TypeScript)
- **Database:** PostgreSQL with Prisma ORM
- **UI:** Radix UI components + Tailwind CSS
- **Auth:** JWT via jose library
- **API:** Next.js API routes with middleware
- **Meta Integration:** Meta Ads API (webhooks for leads)

## Project Structure
- `app/` - Next.js pages and API routes
  - `app/api/` - API endpoints
  - `app/(dashboard)/` - Dashboard pages (authenticated)
  - `app/login/` - Login page
- `lib/` - Utilities and business logic
  - `lib/db.ts` - Prisma client
  - `lib/api-middleware.ts` - Auth & org enforcement
  - `lib/auth.ts` - JWT auth helpers
  - `lib/meta.ts` - Meta API integration
- `prisma/` - Database schema and migrations
- `components/` - React components
- `tests/` - Test files (to be created)

## Database Models (Phase 0 Complete)
- Organization, User, OrganizationMember
- MetaAdAccount, Campaign, Lead, APIIntegration, Settings

## Code Style
- TypeScript with strict typing
- Next.js API route handlers
- Prisma for all DB access
- Middleware for auth + orgId extraction
- Tailwind for styling

## Key Commands
- `npm run dev` - Start dev server
- `npm run build` - Build production
- `npm run start` - Run production
- `npx prisma db push` - Apply schema changes
- `npx prisma studio` - Database GUI
- `npx prisma migrate dev --name <name>` - Create migrations
- `npm run db:seed` - Seed database
