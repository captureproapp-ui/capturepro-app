# CapturePro Backend Setup Guide

This document explains how to configure the backend services for the CapturePro app (app.capturepro.net).

## Overview

All backend functionality lives in this app project, including:
- Stripe payment processing and webhooks
- SendGrid email delivery
- Supabase Edge Functions
- User authentication and invitations
- Database management

## Required Configuration

### 1. Stripe Setup

#### Get Your Stripe Keys
1. Create a Stripe account at https://dashboard.stripe.com/register
2. Navigate to Developers → API keys
3. Copy your keys:
   - **Publishable key** (starts with `pk_`)
   - **Secret key** (starts with `sk_`)

#### Configure Stripe Products
1. Go to Products in your Stripe dashboard
2. Create three subscription products:
   - **Starter** ($49/month) - Price ID: `price_starter_monthly`
   - **Professional** ($99/month) - Price ID: `price_professional_monthly`
   - **Enterprise** ($199/month) - Price ID: `price_enterprise_monthly`

3. Update the price IDs in `src/components/checkout/CheckoutPage.tsx` if they differ

#### Set Up Webhook
1. Go to Developers → Webhooks in Stripe
2. Add endpoint: `https://xtihebyjngwjdyljfrl.supabase.co/functions/v1/stripe-webhook`
3. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy the webhook signing secret (starts with `whsec_`)

#### Update Environment Variables
Add to your `.env` file:
```bash
STRIPE_SECRET_KEY=sk_your_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
VITE_STRIPE_PUBLISHABLE_KEY=pk_your_publishable_key_here
```

### 2. SendGrid Setup

#### Create SendGrid Account
1. Sign up at https://signup.sendgrid.com/
2. Verify your sender email or domain
3. Navigate to Settings → API Keys
4. Create a new API key with "Mail Send" permissions
5. Copy the API key (starts with `SG.`)

#### Update Environment Variables
Add to your `.env` file:
```bash
SENDGRID_API_KEY=SG.your_api_key_here
EMAIL_FROM=noreply@capturepro.net
```

**Note:** Make sure to verify your sender email/domain in SendGrid before sending emails.

### 3. Supabase Edge Functions Setup

#### Required Environment Variables in Supabase

**CRITICAL:** Edge Functions run on Supabase's servers and need their own environment variables. Your local `.env` file is NOT used by deployed edge functions.

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/xtihebyjngwjdyljfrl
2. Navigate to **Settings** → **Edge Functions** → **Secrets**
3. Add these environment variables:

```bash
PUBLIC_APP_URL=https://capturepro.work
EMAIL_FROM=noreply@capturepro.net
SENDGRID_API_KEY=SG.your_actual_api_key_here
STRIPE_SECRET_KEY=sk_your_actual_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_actual_webhook_secret_here
```

**Important Notes:**
- `PUBLIC_APP_URL` must be set to the correct app URL (`https://capturepro.work`) for invitation links to work
- These are separate from your local `.env` file
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are automatically available to edge functions

#### Edge Functions Overview

The following Edge Functions are included:

**stripe-webhook**
- Handles Stripe webhook events for subscription management
- Processes checkout completion, subscription updates, and payment events

**create-checkout-session**
- Creates Stripe checkout sessions for new subscriptions
- Called from the /checkout page

**invite-user**
- Sends branded invitation emails to new users
- Creates user accounts and sends acceptance links
- Builds invitation URLs using `PUBLIC_APP_URL` environment variable

**send-email**
- Generic email sending function
- Supports custom HTML templates via SendGrid

**send-report-notification**
- Sends email notifications when reports are generated

**complete-registration**
- Handles user registration completion

**delete-invited-user**
- Removes invited users who haven't accepted

#### Deploy Edge Functions

After setting environment variables in Supabase dashboard:

```bash
# Make the deployment script executable
chmod +x scripts/deploy-edge-functions.sh

# Deploy all edge functions
./scripts/deploy-edge-functions.sh
```

Or deploy individually:
```bash
supabase functions deploy invite-user --project-ref xtihebyjngwjdyljfrl
supabase functions deploy send-email --project-ref xtihebyjngwjdyljfrl
# ... etc
```

**Important:** You must redeploy edge functions after updating environment variables in Supabase for changes to take effect.

### 4. Database Configuration

The database is already configured with:
- ✅ Organisations table with Stripe fields
- ✅ Profiles table with invitation tracking
- ✅ RLS policies for secure data access
- ✅ Invitation acceptance tracking

No additional database setup is required.

## User Flows

### New Organisation Signup Flow
1. User visits `/checkout` page (linked from marketing website)
2. Selects a pricing plan
3. Enters organisation and admin details
4. Completes Stripe checkout
5. Stripe webhook creates organisation and sends invitation email
6. Admin receives email with link to `/accept-invite?token={userId}`
7. Admin sets password and account is activated

### Existing User Invitation Flow
1. Admin logs into app
2. Goes to User Management
3. Clicks "Invite User"
4. Enters user details (name, email, role)
5. System creates user account
6. SendGrid sends branded invitation email
7. User receives email with acceptance link
8. User sets password and can log in

### Accept Invitation Flow
1. User clicks link in invitation email
2. Lands on `/accept-invite?token={userId}` page
3. Sees their email and organisation name
4. Sets a password (minimum 8 characters)
5. Account is activated
6. Redirected to login page

## Security Considerations

### Environment Variables
- All secrets are stored in `.env` and **never** committed to the repository
- Supabase automatically provides these to Edge Functions
- Frontend uses `VITE_` prefix for client-side variables

### Stripe Webhook Security
- Webhook signature verification is **mandatory**
- Uses `stripe.webhooks.constructEventAsync()` with crypto provider
- Rejects requests without valid signatures

### Email Security
- SendGrid API key is stored server-side only
- Email templates are validated before sending
- Rate limiting is handled by SendGrid

### Database Security
- All tables have Row Level Security (RLS) enabled
- Service role key used only in Edge Functions
- User operations validated against organisation membership

## Testing

### Test Stripe Integration
1. Use Stripe test mode keys (start with `pk_test_` and `sk_test_`)
2. Use test card: `4242 4242 4242 4242`
3. Any future expiry date and CVC

### Test SendGrid
1. Use a verified sender email
2. Send test emails to yourself first
3. Check spam folder if emails don't arrive

### Test Invitation Flow
1. Create a test organisation
2. Invite a test user
3. Check email delivery
4. Complete invitation acceptance
5. Verify user can log in

## Troubleshooting

### Emails Not Sending
- Verify SendGrid API key is correct
- Check sender email/domain is verified in SendGrid
- Review Edge Function logs in Supabase dashboard

### Stripe Webhook Failures
- Verify webhook secret is correct
- Check Edge Function logs for errors
- Test webhook endpoint with Stripe CLI

### Users Can't Accept Invitations
- Check token in URL matches user ID in database
- Verify profile has `invitation_status = 'pending'`
- Check database RLS policies allow the operation

## Support

For issues or questions:
- Check Supabase Edge Function logs
- Review Stripe webhook event logs
- Contact support@capturepro.net
