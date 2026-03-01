# CapturePro Troubleshooting Guide

## Common Issues and Solutions

### Invitation Links Point to Wrong Domain

**Problem:** When inviting users, the email invitation link points to `capturepro.net` instead of `capturepro.work`.

**Root Cause:** The `PUBLIC_APP_URL` environment variable is not set in Supabase's Edge Function settings.

**Solution:**

1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/xtihebyjngwjdyljfrl
2. Navigate to **Settings** → **Edge Functions** → **Secrets**
3. Add or update the environment variable:
   - Key: `PUBLIC_APP_URL`
   - Value: `https://capturepro.work`
4. Redeploy the edge functions:
   ```bash
   supabase functions deploy invite-user --project-ref xtihebyjngwjdyljfrl
   supabase functions deploy send-report-notification --project-ref xtihebyjngwjdyljfrl
   ```
5. Test by inviting a new user

**Note:** Your local `.env` file is only used during local development. Deployed edge functions need their environment variables set in the Supabase dashboard.

---

### Reports Show "Could not find a relationship" Error

**Problem:** When viewing reports, you see an error: "Could not find a relationship between 'pdf_reports' and 'profiles' in the schema cache"

**Root Cause:** The Supabase query is not specifying which foreign key columns to use for the relationship.

**Solution:** The query needs to explicitly specify the foreign key columns:
- Change `profiles(...)` to `profiles!generated_by(...)`
- Change `properties(...)` to `properties!property_id(...)`

This tells Supabase which columns to use for joining the tables.

---

### Emails Not Being Sent

**Problem:** Users are not receiving invitation or notification emails.

**Checklist:**

1. **Verify SendGrid API Key is Set**
   - Check Supabase Dashboard → Settings → Edge Functions → Secrets
   - Ensure `SENDGRID_API_KEY` is set with a valid API key (starts with `SG.`)

2. **Verify Sender Email is Verified**
   - Go to SendGrid Dashboard → Settings → Sender Authentication
   - Verify your sender email or domain

3. **Check Edge Function Logs**
   - Go to Supabase Dashboard → Edge Functions → Logs
   - Look for errors in `invite-user` or `send-email` functions

4. **Verify Environment Variables**
   - Ensure `EMAIL_FROM` is set to a verified email address
   - Check that SendGrid API key has "Mail Send" permissions

---

### Users Can't Accept Invitations

**Problem:** Users click invitation link but can't complete acceptance.

**Possible Causes:**

1. **Invalid Token**
   - Token in URL must match a user ID in the database
   - Check database: `SELECT * FROM profiles WHERE id = 'token_value'`

2. **Profile Status Issue**
   - Profile must have `invitation_status = 'pending'`
   - Check database: `SELECT invitation_status FROM profiles WHERE id = 'token_value'`

3. **RLS Policy Issue**
   - The accept-invite page needs special RLS policies to work
   - Check migration: `20251230200657_handle_invitation_acceptance.sql`

---

### Stripe Webhook Not Working

**Problem:** Organisations not created after successful Stripe checkout.

**Checklist:**

1. **Verify Webhook URL**
   - Stripe Dashboard → Developers → Webhooks
   - URL should be: `https://xtihebyjngwjdyljfrl.supabase.co/functions/v1/stripe-webhook`

2. **Verify Webhook Secret**
   - Supabase Dashboard → Settings → Edge Functions → Secrets
   - `STRIPE_WEBHOOK_SECRET` must match webhook signing secret from Stripe

3. **Check Webhook Events**
   - Stripe Dashboard → Developers → Webhooks → [your webhook] → Events
   - Look for failed events and error messages

4. **Check Edge Function Logs**
   - Supabase Dashboard → Edge Functions → `stripe-webhook` → Logs
   - Look for error messages

---

### Build Failures

**Problem:** `npm run build` fails with TypeScript errors.

**Common Solutions:**

1. **Type Errors in Database Queries**
   - Run `npm run typecheck` to see detailed errors
   - Ensure query fields match database schema
   - Use `.maybeSingle()` for queries that might return null

2. **Missing Dependencies**
   - Run `npm install` to ensure all packages are installed
   - Check `package.json` for correct versions

3. **Import Errors**
   - Check that all imports use correct paths
   - Verify file extensions (.tsx, .ts) are correct

---

### Database Permission Errors

**Problem:** Users get "permission denied" errors when accessing data.

**Common Causes:**

1. **RLS Policy Issue**
   - All tables have Row Level Security enabled
   - Check policies: `SELECT * FROM pg_policies WHERE tablename = 'your_table'`

2. **Organisation ID Mismatch**
   - Most data is scoped to organisations
   - Verify user's `organisation_id` matches the data they're trying to access

3. **Role Restrictions**
   - Some features are restricted by role (admin, installer, owner)
   - Check user's role: `SELECT role FROM profiles WHERE id = auth.uid()`

---

## Getting Help

If you're still experiencing issues:

1. **Check Edge Function Logs**
   - Supabase Dashboard → Edge Functions → Logs

2. **Check Database Logs**
   - Supabase Dashboard → Database → Logs

3. **Review Recent Migrations**
   - Check `supabase/migrations/` for recent changes

4. **Contact Support**
   - Email: support@capturepro.net
   - Include error messages and relevant log entries
