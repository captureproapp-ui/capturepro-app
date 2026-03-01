# CapturePro - PAS2030 Photo Evidence System

A professional window installation photo evidence management system built for PAS2030 compliance.

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

The `.env` file already contains your Supabase URL and anon key. You just need to add your service role key:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → Your Project → Settings → API
2. Copy the **service_role** key (keep this secure - it bypasses Row Level Security!)
3. Add it to `.env`:

```env
SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key_here
```

4. Verify your configuration:

```bash
npm run check-env
```

If everything is configured correctly, you'll see green checkmarks!

### 3. Seed the Database

The database tables are already created. Now create initial test data:

```bash
npm run db:seed
```

This creates:
- An organisation called "My Company"
- Admin user: `admin@test.com` / `password123`
- Installer user: `installer@test.com` / `password123`

### 4. Start the App

```bash
npm run dev
```

Visit the URL shown in your terminal and login with the credentials above!

## Features

- Multi-tenant architecture with organisation isolation
- Role-based access control (Owner, Admin, Installer)
- Property and job management
- Room/area tracking with automatic opening generation
- Photo upload with GPS location capture
- Real-time dashboards
- Secure authentication and storage

## Available Commands

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run check-env  # Verify environment variables are configured
npm run db:seed    # Seed database with test data
npm run typecheck  # Run TypeScript type checking
npm run lint       # Run ESLint
```

## What Gets Created

When you run `npm run db:seed`, the script automatically:

1. Creates an organisation called "My Company"
2. Creates two user accounts with profiles:
   - **Admin** (`admin@test.com`) - Can create properties, manage users, view all data
   - **Installer** (`installer@test.com`) - Can view assigned jobs and upload photos

Both accounts use the password: `password123`

## Workflow Example

1. Login as **admin@test.com**
2. Create a new property with job details
3. Assign the installer to the property
4. Login as **installer@test.com**
5. View your assigned jobs
6. Add rooms and specify window/door counts (openings are auto-created!)
7. Upload photos for each opening with GPS location

## Documentation

- [QUICKSTART.md](./QUICKSTART.md) - Get started in 3 steps
- [SETUP.md](./SETUP.md) - Detailed setup instructions and architecture
- [README.md](./README.md) - This file

## Project Structure

```
/
├── src/                          # Application source code
│   ├── components/              # React components
│   ├── contexts/                # Auth and state management
│   ├── services/                # Business logic
│   └── lib/                     # Utilities
├── supabase/                     # Database and edge functions
│   ├── migrations/              # SQL migrations
│   └── functions/               # Edge functions
└── public/                       # Static assets
```

## Tech Stack

- React + TypeScript
- Vite
- Tailwind CSS
- Supabase (Database, Auth, Storage, Edge Functions)
- Lucide React (Icons)

## Troubleshooting

**Environment variables not loading?**
- Make sure you've added your service role key to `.env`
- Run `npm run check-env` to verify

**Seed script fails?**
- Verify your service role key is correct
- Check you have internet connectivity to Supabase
- The database tables should already exist (migration was pre-applied)

**Users already exist?**
- The seed script will skip existing users
- You can login with the existing credentials
