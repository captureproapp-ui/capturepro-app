#!/bin/bash

# Deploy all edge functions to Supabase
# Make sure you have the Supabase CLI installed and are logged in

echo "Deploying CapturePro Edge Functions..."
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "Error: Supabase CLI is not installed."
    echo "Install it with: npm install -g supabase"
    exit 1
fi

# Check if logged in
if ! supabase projects list &> /dev/null; then
    echo "Error: Not logged in to Supabase."
    echo "Login with: supabase login"
    exit 1
fi

echo "Deploying invite-user function..."
supabase functions deploy invite-user --project-ref xtihebyjngwjdyljfrl

echo ""
echo "Deploying send-email function..."
supabase functions deploy send-email --project-ref xtihebyjngwjdyljfrl

echo ""
echo "Deploying complete-registration function..."
supabase functions deploy complete-registration --project-ref xtihebyjngwjdyljfrl

echo ""
echo "Deploying delete-invited-user function..."
supabase functions deploy delete-invited-user --project-ref xtihebyjngwjdyljfrl

echo ""
echo "Deploying send-report-notification function..."
supabase functions deploy send-report-notification --project-ref xtihebyjngwjdyljfrl

echo ""
echo "Deploying create-checkout-session function..."
supabase functions deploy create-checkout-session --project-ref xtihebyjngwjdyljfrl

echo ""
echo "Deploying stripe-webhook function..."
supabase functions deploy stripe-webhook --project-ref xtihebyjngwjdyljfrl

echo ""
echo "✅ All edge functions deployed successfully!"
echo ""
echo "Next steps:"
echo "1. Make sure environment variables are set in Supabase Dashboard:"
echo "   - Settings > Edge Functions > Secrets"
echo "2. Test the invitation flow by inviting a new user"
