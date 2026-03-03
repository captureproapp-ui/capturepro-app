# Email System Setup Guide

## Overview

The CapturePro invitation system sends automated emails to users when they are invited to join an organization. This guide explains how to configure the email system.

## How Invitation Links Work

### Link Generation

When an admin invites a user, the system:

1. Creates a user profile in the database with `invitation_status = 'pending'`
2. Generates an invitation link using the user's ID as the token
3. Sends an email with the invitation link
4. The link format: `{PUBLIC_APP_URL}/accept-invite?token={userId}`

### Example Flow

```
1. Admin invites: user@example.com
2. System creates user with ID: a1b2c3d4-e5f6-7890-abcd-ef1234567890
3. Invitation link: https://capturepro.work/accept-invite?token=a1b2c3d4-e5f6-7890-abcd-ef1234567890
4. Email sent to user@example.com
5. User clicks link → Sets password → Account activated
```

## Required Configuration

### 1. Supabase Edge Function Environment Variables

These variables must be set in your Supabase project for Edge Functions:

**Location:** Supabase Dashboard → Project Settings → Edge Functions → Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `PUBLIC_APP_URL` | Yes | Production URL of your app | `https://capturepro.work` |
| `SENDGRID_API_KEY` | Yes | SendGrid API key for sending emails | `SG.xxxxxxxxxxxxx` |
| `EMAIL_FROM` | No | Sender email address | `noreply@capturepro.work` |

**Important Notes:**
- These are separate from the frontend `VITE_*` variables
- Edge Functions cannot access `VITE_*` variables
- Changes take effect immediately (no redeployment needed)

### 2. Frontend Environment Variables

These are build-time variables for the React app:

**Location:** Cloudflare Pages → Settings → Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `VITE_PUBLIC_APP_URL` | No | App URL (defaults to capturepro.work) |

## SendGrid Setup

### Step 1: Create SendGrid Account

1. Sign up at [SendGrid](https://sendgrid.com/)
2. Complete account verification
3. Verify your sender domain/email

### Step 2: Generate API Key

1. Go to SendGrid Dashboard → Settings → API Keys
2. Click "Create API Key"
3. Name it: "CapturePro Production"
4. Select "Full Access" or "Restricted Access" with Mail Send permissions
5. Copy the API key (shown only once!)

### Step 3: Configure Supabase

1. Open Supabase Dashboard
2. Go to Project Settings → Edge Functions → Environment Variables
3. Add/Update:
   - **Name:** `SENDGRID_API_KEY`
   - **Value:** Your SendGrid API key (starts with `SG.`)
4. Add/Update:
   - **Name:** `PUBLIC_APP_URL`
   - **Value:** `https://capturepro.work`
5. (Optional) Add:
   - **Name:** `EMAIL_FROM`
   - **Value:** `noreply@yourdomain.com`

### Step 4: Verify Domain (Recommended)

For better email deliverability:

1. Go to SendGrid → Settings → Sender Authentication
2. Click "Authenticate Your Domain"
3. Follow DNS setup instructions
4. Verify domain ownership

## Testing the Email System

### Test Invitation Flow

1. Log into admin account at capturepro.work
2. Navigate to User Management
3. Click "Invite User"
4. Fill in test user details
5. Click "Send Invitation"

### Check Email Delivery

**If SendGrid is configured:**
- Email will be sent immediately
- Check SendGrid Dashboard → Activity → Activity Feed
- Verify email appears in recipient's inbox

**If SendGrid is NOT configured:**
- No email will be sent
- Admin panel will show a warning: "Email system not configured"
- The invitation link can still be copied manually
- Check Supabase Edge Function logs for: "SendGrid not configured, skipping email send"

### Check Edge Function Logs

1. Supabase Dashboard → Edge Functions
2. Click on "invite-user" function
3. View logs tab
4. Look for messages like:
   - ✅ "Invitation email sent via SendGrid"
   - ⚠️ "SendGrid not configured, skipping email send"

## Troubleshooting

### Issue: Emails Not Sending

**Check 1: SendGrid API Key**
```bash
# Verify key is set in Supabase
# Should NOT be "your_sendgrid_api_key_here"
```

**Check 2: Edge Function Logs**
```
Supabase → Edge Functions → invite-user → Logs
Look for: "Failed to send invitation email"
```

**Check 3: SendGrid Activity**
```
SendGrid Dashboard → Activity → Activity Feed
Check for recent send attempts
```

### Issue: Wrong URL in Email

**Problem:** Email contains localhost or wrong domain

**Solution:** Set `PUBLIC_APP_URL` in Supabase Edge Functions environment variables:
```
PUBLIC_APP_URL=https://capturepro.work
```

**Note:** This is separate from `VITE_PUBLIC_APP_URL` (frontend only)

### Issue: Invitation Link Results in 404

**Problem:** User clicks link but gets "Invalid invitation"

**Check 1: Verify token in database**
```sql
SELECT id, email, invitation_status
FROM profiles
WHERE id = 'token-from-url';
```

**Check 2: Check token format**
- Should be a valid UUID
- Should match user's ID in profiles table
- No extra characters (typos like extra 'd' in 'bddde' vs 'bdde')

### Issue: "Failed to load invitation details"

**Possible causes:**
1. Token doesn't match any user in database
2. User already accepted invitation (`invitation_status = 'accepted'`)
3. Edge Function `accept-invitation` not deployed
4. Network/CORS issues

**Solution:** Check Edge Functions deployment status

## Manual Invitation Links

If email sending is not configured, you can manually share invitation links:

1. Invite user through admin panel
2. Click "Copy Link" button in User Management
3. Share the link directly with the user via:
   - Chat/messaging app
   - Alternative email
   - SMS

**Link format:**
```
https://capturepro.work/accept-invite?token={user-id}
```

## Security Considerations

### Token Security

- Tokens are user UUIDs (not temporary or expiring)
- Users with `invitation_status = 'pending'` cannot log in
- Once accepted, the invitation_status changes to 'accepted'
- Link becomes inactive after password is set

### Best Practices

1. ✅ Always use HTTPS
2. ✅ Verify sender domain with SendGrid
3. ✅ Use environment variables (never hardcode API keys)
4. ✅ Monitor SendGrid activity for suspicious patterns
5. ✅ Regularly audit pending invitations

## Production Checklist

Before going live, ensure:

- [ ] SendGrid account created and verified
- [ ] SendGrid API key generated
- [ ] Sender domain authenticated (or single sender verified)
- [ ] `SENDGRID_API_KEY` set in Supabase Edge Functions
- [ ] `PUBLIC_APP_URL` set to production domain
- [ ] Test invitation sent and received successfully
- [ ] Email appears professional and not in spam
- [ ] All links in email work correctly
- [ ] Edge Functions deployed and active

## Support

If you continue to experience issues:

1. Check Supabase Edge Function logs
2. Check SendGrid Activity Feed
3. Verify all environment variables are set correctly
4. Test with a different email address
5. Contact SendGrid support if emails are bouncing
