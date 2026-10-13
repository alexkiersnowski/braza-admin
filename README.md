# Braza Admin

Internal operations admin for Braza, a meal-prep service in Warsaw. Staff use it to manage customers, weekly orders, meals, and production.

## Stack

- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS and Radix UI
- next-intl (English and Polish)
- Supabase (Postgres, accessed with the server-side secret key)
- Anthropic SDK for the natural-language command bar

## Local development

```bash
npm install
cp .env.example .env.local
```

Fill in `.env.local`, then start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).
