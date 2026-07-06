# vcglOne

vcglOne is a production-conscious internal workforce operations platform for attendance visibility, location-aware daily check-in/check-out, leave governance, employee records, admin approvals, reporting, and audit logs.

The app is built for Vercel from day one with Next.js App Router, TypeScript, Tailwind CSS, PostgreSQL, Prisma ORM, credentials authentication, bcrypt password hashing, server-side RBAC, and CSV exports.

## Features

- Secure credentials login with bcrypt password hashes and Auth.js/NextAuth sessions.
- Role-based workspaces for Employee, Manager, HR Admin, and Super Admin.
- Daily check-in/check-out with one-time browser GPS capture only when the employee clicks the action.
- Location denial fallback: attendance can still be submitted with a required note and is marked Pending Review.
- Duplicate check-in/check-out prevention and check-out-before-check-in prevention.
- Admin attendance review with GPS coordinates, accuracy, timestamps, user agent, notes, manual adjustment, and audit logs.
- Leave types, leave balances by employee/year, leave requests, manager/admin approvals, rejection comments, and balance deduction on approval.
- Employee, department, work policy, report, CSV export, and audit log pages.

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui-style components on Radix UI primitives
- Lucide React icons
- Framer Motion
- Sonner notifications
- React Hook Form with Zod validation
- TanStack Query
- TanStack Table
- Recharts
- react-error-boundary and Sentry-ready error capture
- PostgreSQL only
- Prisma ORM and Prisma migrations
- NextAuth/Auth.js credentials provider
- bcryptjs
- Zod
- Vercel-compatible Node.js runtime routes/actions

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create your environment file:

```bash
cp .env.example .env
```

3. Add `DATABASE_URL`. Add `DIRECT_URL` if your provider has a separate direct connection string.

4. Run migrations:

```bash
npm run prisma:migrate
```

5. Set the `BOOTSTRAP_SUPER_ADMIN_*` variables, then create the first Super Admin:

```bash
npm run prisma:seed
```

6. Start the dev server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Environment Variables

Required:

- `DATABASE_URL`
- `DIRECT_URL`
- `NEXTAUTH_SECRET`
- `AUTH_SECRET` optional alias; set it to the same value as `NEXTAUTH_SECRET` if your host expects Auth.js naming
- `NEXTAUTH_URL`
- `APP_URL`
- `NODE_ENV`
- `SENTRY_DSN` optional
- `NEXT_PUBLIC_SENTRY_DSN` optional
- `SENTRY_ORG` optional
- `SENTRY_PROJECT` optional

Do not commit real credentials.

## Database Setup

This app uses PostgreSQL and Prisma migrations. Do not use SQLite. Do not use `prisma db push` for production.

Useful commands:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:deploy
npm run prisma:studio
npm run prisma:seed
```

Production migrations should use:

```bash
npm run prisma:deploy
```

Avoid destructive resets in production. `npm run db:reset` is for local development only.

## Vercel Deployment

1. Create a PostgreSQL database on Neon, Supabase, or Aiven.
2. Add `DATABASE_URL` and `DIRECT_URL` to Vercel project environment variables.
3. Add a strong `NEXTAUTH_SECRET`. In Vercel, also add `AUTH_SECRET` with the same value if you want compatibility with newer Auth.js naming.
4. Set `NEXTAUTH_URL` and `APP_URL` to your production Vercel URL.
5. Deploy to Vercel.
6. Ensure the Vercel build runs `npm run build`, which generates Prisma Client before `next build`.
7. Run `npm run prisma:deploy` against production before or during release.
8. Confirm login, attendance, leave approval, admin dashboard, CSV export, and audit logs.

All database routes and actions use Node.js runtime.

## Neon Setup

- Create a Neon project and PostgreSQL database.
- Use the pooled/serverless connection string for `DATABASE_URL` if desired.
- Use the direct connection string for `DIRECT_URL` where migrations require it.
- Keep SSL enabled.

## Supabase Setup

- Create a Supabase project.
- Use the pooler connection string for `DATABASE_URL` when appropriate.
- Use the direct database connection string for `DIRECT_URL` where appropriate.

## Aiven Setup

- Create an Aiven PostgreSQL service.
- Use the standard PostgreSQL connection string for `DATABASE_URL`.
- `DIRECT_URL` can be the same connection string unless your network topology requires a different migration URL.

## Account Bootstrap

The seed command does not create demo employees, departments, attendance, leave, or known default passwords. It creates the first Super Admin only when no Super Admin exists. Configure these values before running it:

- `BOOTSTRAP_SUPER_ADMIN_EMAIL`
- `BOOTSTRAP_SUPER_ADMIN_PASSWORD` (minimum 12 characters)
- `BOOTSTRAP_SUPER_ADMIN_FIRST_NAME`
- `BOOTSTRAP_SUPER_ADMIN_LAST_NAME`

After bootstrap, the Super Admin creates HR Admin, Manager, and Employee accounts from the admin console. HR Admin accounts can create and manage Employee and Manager accounts but cannot create, view for editing, promote, or modify Super Admin or other HR Admin accounts.

## Production Checklist

- Set a real `NEXTAUTH_SECRET`.
- Set `AUTH_SECRET` to the same value if your deployment environment expects it.
- Set production `NEXTAUTH_URL`.
- Use a production PostgreSQL database.
- Run Prisma migrations with `prisma migrate deploy`.
- Create the first Super Admin.
- Configure leave types.
- Configure work policy.
- Test check-in/check-out on mobile.
- Test location permission granted.
- Test location permission denied.
- Test Pending Review attendance.
- Test leave application.
- Test leave approval.
- Test CSV export.
- Test role restrictions.
- Test audit logs.


