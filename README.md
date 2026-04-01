<div align="center">

# 📊 Meta Ads CRM

**A modern, production-ready CRM for managing Meta (Facebook/Instagram) ad leads**

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

[Features](#-features) · [Tech Stack](#-tech-stack) · [Getting Started](#-getting-started) · [Configuration](#-configuration) · [API Reference](#-api-reference) · [Contributing](#-contributing) · [License](#-license)

</div>

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔄 **Real-time Lead Capture** | Receive leads instantly via Meta webhook integration |
| 📥 **CSV Import** | Bulk-import leads from Meta's exported CSV files with duplicate detection |
| 📊 **Analytics Dashboard** | KPIs, conversion rates, revenue tracking and lead trend charts |
| 📣 **Ad Performance** | Campaign, ad set, and ad-level spend/CPL/click insights from Meta Graph API |
| 💬 **WhatsApp Integration** | One-click WhatsApp messaging with bilingual templates (EN/ES) |
| 🔐 **Secure Auth** | JWT sessions, rate limiting, and timing-safe password comparison |
| 🌙 **Dark UI** | Sleek dark theme built with Tailwind CSS and Radix UI |

---

## 🛠 Tech Stack

- **Framework** — [Next.js 14](https://nextjs.org/) (App Router, Server Components)
- **Language** — [TypeScript 5.6](https://www.typescriptlang.org/)
- **Database** — [PostgreSQL](https://www.postgresql.org/) via [Prisma ORM](https://www.prisma.io/)
- **Auth** — JWT ([jose](https://github.com/panva/jose)) with httpOnly cookies
- **UI** — [Tailwind CSS](https://tailwindcss.com/) + [Radix UI](https://www.radix-ui.com/)
- **Charts** — [Recharts](https://recharts.org/)
- **Icons** — [Lucide React](https://lucide.dev/)
- **CSV** — [PapaParse](https://www.papaparse.com/)

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database

### Installation

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd meta-ads-crm

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your values (see Configuration section)

# 4. Push database schema
npm run db:push

# 5. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and register your first account via `/api/auth/register`.

### Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Start production server (auto-pushes DB schema) |
| `npm run db:push` | Push Prisma schema to database |
| `npm run db:studio` | Open Prisma Studio (visual DB browser) |
| `npm run db:seed` | Seed database with initial data |

---

## ⚙️ Configuration

Create a `.env.local` file in the project root:

```env
# ─── Database ────────────────────────────────────────────────
DATABASE_URL="postgresql://user:password@localhost:5432/meta_ads_crm"

# ─── Authentication ──────────────────────────────────────────
JWT_SECRET="your-strong-jwt-secret"       # Used to sign session tokens

# ─── Meta Integration ────────────────────────────────────────
META_APP_SECRET="your-meta-app-secret"            # For webhook HMAC verification
META_WEBHOOK_VERIFY_TOKEN="your-verify-token"     # For webhook handshake
```

> **Note:** Meta API credentials (access token, ad account ID, page ID) can also be configured at runtime via the **Settings** page inside the app.

---

## 🗂 Project Structure

```
├── app/
│   ├── (dashboard)/           # Protected dashboard routes
│   │   ├── page.tsx           # 📊 Main dashboard
│   │   ├── leads/             # 👥 Lead management
│   │   ├── ads/               # 📣 Ad analytics
│   │   └── settings/          # ⚙️  App settings
│   ├── api/
│   │   ├── auth/              # Login / logout
│   │   ├── leads/             # Lead CRUD + CSV import
│   │   ├── meta/              # Webhook + Graph API
│   │   └── dashboard/         # Analytics aggregation
│   └── login/                 # Public login page
│
├── components/
│   ├── dashboard/             # KPI cards, charts, feeds
│   ├── leads/                 # Leads table, WhatsApp button, CSV modal
│   ├── ads/                   # Campaign tables, CPL trend, donut charts
│   ├── layout/                # Sidebar, TopBar
│   └── ui/                    # Reusable Radix UI components
│
├── lib/
│   ├── auth.ts                # JWT helpers
│   ├── db.ts                  # Prisma client singleton
│   ├── meta.ts                # Meta Graph API client
│   ├── rate-limit.ts          # Login rate limiter
│   └── csv-parser.ts          # CSV import logic
│
└── prisma/
    └── schema.prisma          # Database schema
```

---

## 📡 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Authenticate with admin password |
| `POST` | `/api/auth/logout` | Clear session cookie |
| `GET` | `/api/leads` | List leads (supports filters) |
| `POST` | `/api/leads` | Create a lead |
| `GET` | `/api/leads/:id` | Get lead detail |
| `PATCH` | `/api/leads/:id` | Update lead |
| `POST` | `/api/leads/import` | Preview or import CSV |
| `GET` | `/api/meta/ads` | Fetch Meta campaign insights |
| `GET/POST` | `/api/meta/webhook` | Meta webhook (verify + receive) |
| `GET` | `/api/dashboard` | Dashboard analytics |
| `GET/POST` | `/api/settings` | Read / update settings |

---

## 🔒 Security

- **JWT sessions** — 7-day expiry, stored as httpOnly cookies
- **Rate limiting** — 5 failed login attempts triggers a 30-minute block
- **Timing-safe** — Password comparison uses constant-time algorithm
- **Webhook verification** — HMAC-SHA256 signature validation on all Meta payloads
- **Security headers** — CSP, HSTS, X-Frame-Options via `next.config.mjs`

---

## 🗄 Database Schema

```prisma
model Lead {
  id           String    @id @default(cuid())
  metaLeadId   String?   @unique
  name         String
  email        String?
  phone        String?
  campaignId   String?
  campaignName String?
  adsetName    String?
  adName       String?
  formName     String?
  status       String    @default("new")   // new | contacted | booked | closed | lost
  bookingDate  DateTime?
  saleAmount   Float?
  notes        String?
  source       String    @default("webhook") // webhook | csv
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
}

model Settings {
  id                  Int     @id @default(1)
  metaAccessToken     String?
  metaAdAccountId     String?
  metaPageId          String?
  webhookVerifyToken  String?
  waMessageTemplate   String?   // English template
  waMessageTemplateEs String?   // Spanish template
}
```

---

## 📸 Pages at a Glance

| Page | Route | Description |
|---|---|---|
| Dashboard | `/` | KPIs, lead trends, recent activity |
| Leads | `/leads` | Filterable lead table with WhatsApp actions |
| Lead Detail | `/leads/:id` | Full lead info, status update, notes |
| Ads | `/ads` | Campaign spend, CPL, clicks from Meta API |
| Settings | `/settings` | Meta credentials and message templates |
| Login | `/login` | Password-protected entry |

---

---

## 🤝 Contributing

Contributions are welcome! Whether it's a bug fix, new feature, or documentation improvement — please feel free to open an issue or submit a pull request.

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to get started, branch naming, commit conventions, and the PR process.

Please read our [Code of Conduct](CODE_OF_CONDUCT.md) before contributing.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

<div align="center">

Built with ❤️ using Next.js, Prisma, and Meta's Graph API

</div>
