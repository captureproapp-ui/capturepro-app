# PAS2030 Photo Evidence System - Setup Guide

## What You Have

A fully functional PAS2030 window installation photo evidence management system with:

### Core Features
- **Multi-tenant Architecture**: Separate organisations with their own data
- **Role-Based Access**: Owner, Admin, and Installer roles with different permissions
- **Property Management**: Create and track installation jobs with full address details
- **Room/Area Management**: Add rooms with custom names and specify windows/doors to replace
- **Auto-Generated Openings**: Automatically creates Window 1, Window 2, Door 1, etc. based on counts
- **Photo Management**: Upload up to 45 photos per opening with GPS location capture
- **Photo Categorization**: Label photos as Before, During, After, or Detail
- **Real-Time Dashboard**: Role-specific dashboards showing job statistics
- **Secure Authentication**: Supabase Auth with email/password login

### Built With
- React + TypeScript
- Tailwind CSS for styling
- Supabase for database, authentication, and storage
- Lucide React for icons

## Automated Setup (Recommended)

The database setup and initial data creation is now fully automated!

### Step 1: Get Your Supabase Service Role Key

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **API**
4. Copy the **service_role** key (not the anon key)
5. Add it to your `.env` file:

```env
SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key_here
```

### Step 2: Run the Seed Script

The database tables are already created. Now just run:

```bash
npm run db:seed
```

This will automatically:
- Create an organisation called "My Company"
- Create an admin user: `admin@test.com` / `password123`
- Create an installer user: `installer@test.com` / `password123`

### Step 3: Start Using the App

```bash
npm run dev
```

Login with the credentials created above and start using the system!

### Step 4: Verify Storage Bucket

The photo storage bucket is automatically created when you run the migrations. To verify it exists:

1. Go to your Supabase Dashboard
2. Navigate to **Storage** in the left sidebar
3. Confirm you see a bucket named **photos**
4. If the bucket doesn't exist, the migrations will create it automatically

The storage bucket is configured to:
- Allow public read access to all uploaded photos
- Require authentication for uploading photos
- Accept image files (JPEG, PNG, WebP) up to 10MB
- Store photos in organized folders by property/area/opening

---

## Manual Setup (Alternative)

If you prefer to set up the database manually, you can run SQL directly:

### Create Test Organisation and Users

Run this SQL in your Supabase SQL Editor to create test accounts:

```sql
-- Create a test organisation
INSERT INTO organisations (name)
VALUES ('Test Company Ltd')
RETURNING id;

-- Note the organisation ID from above, then use it below

-- Create test owner account (replace 'YOUR_ORG_ID' with actual ID from above)
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role
)
VALUES (
  gen_random_uuid(),
  'owner@test.com',
  crypt('password123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  false,
  'authenticated'
);

-- Create profile for owner
INSERT INTO profiles (id, email, full_name, role, organisation_id)
SELECT
  id,
  'owner@test.com',
  'Platform Owner',
  'owner',
  'YOUR_ORG_ID'  -- Replace with your organisation ID
FROM auth.users WHERE email = 'owner@test.com';

-- Create admin account
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role
)
VALUES (
  gen_random_uuid(),
  'admin@test.com',
  crypt('password123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  false,
  'authenticated'
);

-- Create profile for admin
INSERT INTO profiles (id, email, full_name, role, organisation_id)
SELECT
  id,
  'admin@test.com',
  'Office Admin',
  'admin',
  'YOUR_ORG_ID'  -- Replace with your organisation ID
FROM auth.users WHERE email = 'admin@test.com';

-- Create installer account
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role
)
VALUES (
  gen_random_uuid(),
  'installer@test.com',
  crypt('password123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  false,
  'authenticated'
);

-- Create profile for installer
INSERT INTO profiles (id, email, full_name, role, organisation_id)
SELECT
  id,
  'installer@test.com',
  'John Installer',
  'installer',
  'YOUR_ORG_ID'  -- Replace with your organisation ID
FROM auth.users WHERE email = 'installer@test.com';
```

### Step 2: Login Credentials

Use these credentials to test different roles:

- **Platform Owner**: owner@test.com / password123
- **Admin**: admin@test.com / password123
- **Installer**: installer@test.com / password123

### Step 3: Test the Workflow

1. **Login as Admin** (admin@test.com)
   - View the Admin Dashboard
   - Click "All Properties" → "New Property"
   - Fill in job details and assign the installer
   - Property is created with "External" area automatically

2. **Add Rooms**
   - Click on the property to view details
   - Click "Add Room"
   - Select room type (e.g., "Living Room")
   - Enter number of windows and doors
   - Openings are automatically created

3. **Upload Photos as Installer** (installer@test.com)
   - Login as installer
   - View "My Jobs" in the dashboard
   - Click on assigned property → area/room
   - Click "Upload Photos" on any opening
   - Select photos (system captures GPS location automatically)
   - Categorize photos (Before/During/After/Detail)
   - Upload (max 45 photos per opening)

## Features Completed

✅ Database schema with all relationships
✅ Multi-tenant architecture with RLS
✅ Email/password authentication
✅ Role-based navigation (Owner/Admin/Installer)
✅ Property creation and management
✅ Room/area management with standard room types
✅ Auto-generation of openings based on counts
✅ Photo upload with GPS capture
✅ Photo storage in Supabase Storage
✅ Installer and Admin dashboards
✅ Properties list with filtering
✅ Property detail views
✅ Area/room detail views with photo galleries

## Features To Be Built

The following features were planned but not yet implemented:

- User invitation and management interface
- Organisation management interface (currently manual via SQL)
- Checklist system (templates and completion tracking)
- PDF report generation with before/after layouts
- Archive system with 30-day retention
- Analytics dashboard for platform owners
- Bulk operations
- Export functionality
- Advanced search and filtering
- Mobile app considerations
- Email notifications

## Architecture Notes

### Database Triggers
- **External Area Creation**: Automatically creates "External" area when a new property is created
- **Opening Creation**: Automatically creates Window 1-N and Door 1-M when a room is saved/updated
- **Timestamp Updates**: Automatically updates `updated_at` fields on changes

### Security
- Row Level Security (RLS) enabled on all tables
- Organisation-level data isolation
- Role-based access control in policies
- Storage bucket policies for photo access
- No direct table access without authentication

### Photo Management
- Max 45 photos per opening (enforced at application level)
- GPS location captured via browser API
- Fallback to manual location entry if GPS unavailable
- EXIF data extraction (basic implementation)
- Photo categorization (before/during/after/detail)
- Public read access for photos (authenticated write access)

## Development Commands

```bash
# Start development server (automatic)
npm run dev

# Build for production
npm run build

# Type checking
npm run typecheck

# Linting
npm run lint
```

## Next Steps

1. Test the core workflow with all three user roles
2. Implement user management interface
3. Add checklist system for compliance tracking
4. Build PDF generation with professional layouts
5. Implement archive system with automatic cleanup
6. Add email notifications for key events
7. Build analytics and reporting features

## Troubleshooting

### Photo Upload Failures

If photos fail to upload with an error like "Failed to upload photo. Please try again.", check these common issues:

1. **Missing Storage Bucket**
   - Go to Supabase Dashboard → Storage
   - Verify the `photos` bucket exists
   - If missing, run the migrations again or create it manually

2. **Storage Policies Not Set**
   - The migrations automatically create the necessary RLS policies
   - Verify policies exist in Supabase Dashboard → Storage → photos → Policies
   - Required policies:
     - "Authenticated users can upload photos" (INSERT)
     - "Public read access to photos" (SELECT)
     - "Users can update own photos" (UPDATE)
     - "Users can delete own photos" (DELETE)

3. **File Size Too Large**
   - Maximum file size is 10MB per photo
   - Compress images before uploading if needed

4. **Network Issues**
   - Check your internet connection
   - Verify Supabase project is active (not paused)

5. **Browser Console Errors**
   - Open browser developer tools (F12)
   - Check Console tab for detailed error messages
   - Look for storage-related errors or permission issues

If uploads still fail after checking the above:
- Check that your Supabase project URL and anon key are correct in `.env`
- Verify you're logged in (authentication token is valid)
- Try logging out and logging back in

### General Debugging Tips

- Always check the browser console for detailed error messages
- Verify database migrations have run successfully
- Ensure your `.env` file has all required variables
- Check Supabase Dashboard logs for server-side errors

## Support

For questions or issues, refer to the implementation plan and requirements document.
