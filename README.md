This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

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

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


## Paystack setup

Paperbag uses Paystack for payment verification, payout account verification, transfer recipients, and restaurant payouts.

1. Copy `.env.example` to `.env.local` and add your Paystack secret key as `PAYSTACK_SECRET_KEY`.
2. Use a Paystack **test** secret key for local development.
3. In the Paystack dashboard, set the webhook URL to:
   `https://YOUR_DOMAIN/api/paystack/webhook`
4. For fully automated restaurant payouts, disable transfer OTP confirmation in Paystack. If OTP remains enabled, Paperbag will create the transfer but it will remain pending confirmation.
5. Localhost cannot receive Paystack webhooks; use a public development URL when testing webhook delivery.

The bank setup flow resolves the Nigerian account number through Paystack, creates a reusable `nuban` transfer recipient, and stores the returned recipient code. Payouts are only built from successfully paid restaurant orders that have reached `DELIVERED` or `PICKED_UP` and have not already been included in another payout.


## Demo dashboard seed

Use the demo seed when you need realistic restaurant data without manually creating users, menu items, orders, riders, reviews, and complaints.

```powershell
npm.cmd run seed:demo
```

The seed targets `SEED_RESTAURANT_ID` when set; otherwise it uses the first restaurant with an active owner. It creates Clerk Development users when `CLERK_SECRET_KEY` is available, and refuses to create demo users in a live Clerk instance unless `ALLOW_LIVE_CLERK_SEED=1` is explicitly set.

Seeded Clerk test addresses use the `+clerk_test` pattern. In Clerk Development instances they can use the test email code `424242`. When password sign-in is enabled, the default seed password is `PaperbagDemo!2026` unless `SEED_TEST_PASSWORD` overrides it.

The seed creates current pending/preparing/ready/out-for-delivery orders plus historical delivered, picked-up, and cancelled orders across the last two weeks. Re-running it replaces non-payout demo orders so the "just arrived" timestamps stay fresh.
