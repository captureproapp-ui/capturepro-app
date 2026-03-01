# Quick Start Guide

Get your PAS2030 system running in 3 simple steps!

## Step 1: Install

```bash
npm install
```

## Step 2: Add Your Service Role Key

1. Open the `.env` file in your project
2. Go to [Supabase Dashboard](https://supabase.com/dashboard) → Settings → API
3. Copy your **service_role** key
4. Replace `your_service_role_key_here` with your actual key

**Verify it works:**

```bash
npm run check-env
```

You should see three green checkmarks!

## Step 3: Create Test Data

```bash
npm run db:seed
```

This creates:
- Organisation: "My Company"
- Admin user: `admin@test.com` / `password123`
- Installer user: `installer@test.com` / `password123`

## Start Using the App

```bash
npm run dev
```

Open your browser to the URL shown and login!

---

**Need Help?** See [README.md](./README.md) for more details or [SETUP.md](./SETUP.md) for comprehensive documentation.
