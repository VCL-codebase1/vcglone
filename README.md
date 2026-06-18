# WorkforceOps

WorkforceOps is a production-conscious internal workforce operations platform for attendance visibility, location-aware daily check-in/check-out, leave governance, employee records, admin approvals, reporting, and audit logs.

The app is built for Vercel from day one with Next.js App Router, TypeScript, Tailwind CSS, PostgreSQL, Prisma ORM, credentials authentication, bcrypt password hashing, server-side RBAC, CSV exports, and a cloud-storage abstraction for leave documents.

## Features

- Secure credentials login with bcrypt password hashes and Auth.js/NextAuth sessions.
- Role-based workspaces for Employee, Manager, HR Admin, and Super Admin.
- Daily check-in/check-out with one-time browser GPS capture only when the employee clicks the action.
- Location denial fallback: attendance can still be submitted with a required note and is marked Pending Review.
- Duplicate check-in/check-out prevention and check-out-before-check-in prevention.
- Admin attendance review with GPS coordinates, accuracy, timestamps, user agent, notes, manual adjustment, and audit logs.
- Leave types, leave balances by employee/year, leave requests, manager/admin approvals, rejection comments, and balance deduction on approval.
- Employee, department, work policy, report, CSV export, and audit log pages.
- Upload abstraction for Supabase Storage, Cloudinary, and S3-compatible storage. If no provider is configured, attachment upload is disabled gracefully.

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
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

5. Seed demo data:

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
- `NEXTAUTH_URL`
- `APP_URL`
- `UPLOAD_PROVIDER`
- `MAX_FILE_UPLOAD_MB`
- `NODE_ENV`

Optional provider secrets are documented in `.env.example`. Do not commit real credentials.

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
3. Add a strong `NEXTAUTH_SECRET`.
4. Set `NEXTAUTH_URL` and `APP_URL` to your production Vercel URL.
5. Set `UPLOAD_PROVIDER=none` unless you have wired a supported cloud provider.
6. Deploy to Vercel.
7. Ensure the Vercel build runs `npm run build`, which generates Prisma Client before `next build`.
8. Run `npm run prisma:deploy` against production before or during release.
9. Confirm login, attendance, leave approval, admin dashboard, CSV export, and audit logs.

All database routes and actions use Node.js runtime. Uploaded files are not written permanently to the Vercel filesystem.

## Neon Setup

- Create a Neon project and PostgreSQL database.
- Use the pooled/serverless connection string for `DATABASE_URL` if desired.
- Use the direct connection string for `DIRECT_URL` where migrations require it.
- Keep SSL enabled.

## Supabase Setup

- Create a Supabase project.
- Use the pooler connection string for `DATABASE_URL` when appropriate.
- Use the direct database connection string for `DIRECT_URL` where appropriate.
- If you later enable Supabase Storage, wire the service role key only on the server.

## Aiven Setup

- Create an Aiven PostgreSQL service.
- Use the standard PostgreSQL connection string for `DATABASE_URL`.
- `DIRECT_URL` can be the same connection string unless your network topology requires a different migration URL.

## Upload Storage

`UPLOAD_PROVIDER` controls attachment behavior:

- `none`: upload fields are disabled gracefully.
- `supabase`: intended for Supabase Storage.
- `cloudinary`: intended for Cloudinary signed uploads.
- `s3`: intended for S3-compatible storage.

The abstraction lives in `lib/storage.ts`. Production provider credentials must stay server-side and must not be exposed to the client.

Allowed file types: PDF, JPG, JPEG, PNG. File size is controlled by `MAX_FILE_UPLOAD_MB`.

## Demo Accounts

All demo accounts use password:

```text
Password123!
```

- Super Admin: `superadmin@workforceops.local`
- HR Admin: `hr@workforceops.local`
- Manager: `manager@workforceops.local`
- Employee: `employee@workforceops.local`
- Employee: `engineer@workforceops.local`

## Production Checklist

- Set a real `NEXTAUTH_SECRET`.
- Set production `NEXTAUTH_URL`.
- Use a production PostgreSQL database.
- Run Prisma migrations with `prisma migrate deploy`.
- Create the first Super Admin.
- Configure leave types.
- Configure work policy.
- Configure upload provider if document upload is required.
- Test check-in/check-out on mobile.
- Test location permission granted.
- Test location permission denied.
- Test Pending Review attendance.
- Test leave application.
- Test leave approval.
- Test CSV export.
- Test role restrictions.
- Test audit logs.
