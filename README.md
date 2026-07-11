This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/pages/api-reference/create-next-app).

## Getting Started

Create `.env.local` before starting the app:

```bash
SUPABASE_URL=https://jioosrbwgchukicvocls.supabase.co
FUNCTION_SECRET=replace-with-the-same-secret-used-by-the-edge-function
NEXT_PUBLIC_FUNCTION_SECRET=replace-with-the-same-secret-used-by-the-edge-function
```

The upload page sends `NEXT_PUBLIC_FUNCTION_SECRET` to the Pages API route. The
route verifies it against the server-side `FUNCTION_SECRET` before forwarding
normalized JSON to the Edge Function.

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `pages/index.tsx`. The page auto-updates as you edit the file.

[API routes](https://nextjs.org/docs/pages/building-your-application/routing/api-routes) can be accessed on [http://localhost:3000/api/hello](http://localhost:3000/api/hello). This endpoint can be edited in `pages/api/hello.ts`.

The `pages/api` directory is mapped to `/api/*`. Files in this directory are treated as [API routes](https://nextjs.org/docs/pages/building-your-application/routing/api-routes) instead of React pages.

This project uses [`next/font`](https://nextjs.org/docs/pages/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn-pages-router) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/pages/building-your-application/deploying) for more details.

## Deploying the upload fix

The frontend and Edge Function must be deployed together because the function
now accepts normalized JSON instead of a multipart Excel file.

```bash
supabase functions deploy upload-excel --project-ref jioosrbwgchukicvocls --no-verify-jwt
```

Add `SUPABASE_URL`, `FUNCTION_SECRET`, and `NEXT_PUBLIC_FUNCTION_SECRET` to the
Vercel project environment, then deploy the Next.js application. The browser
parses the workbook without cell styles, while Supabase only validates rows and
performs database writes.
