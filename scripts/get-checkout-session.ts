import Stripe from 'stripe';
import 'dotenv/config';

const stripeKey = process.env.STRIPE_SECRET_KEY;

if (!stripeKey || stripeKey === 'your_stripe_secret_key_here') {
  console.error('ERROR: STRIPE_SECRET_KEY is not configured');
  console.error('Please set the STRIPE_SECRET_KEY in your .env file');
  process.exit(1);
}

const stripe = new Stripe(stripeKey, {
  apiVersion: '2024-12-18.acacia',
});

async function getCheckoutSession() {
  const customerId = 'cus_TzQB7TX0otWGhO';

  try {
    console.log(`Searching for checkout sessions for customer: ${customerId}`);

    const sessions = await stripe.checkout.sessions.list({
      customer: customerId,
      limit: 10,
    });

    if (sessions.data.length === 0) {
      console.log('\nNo checkout sessions found for this customer.');
      console.log('\nAlternative: You can create a password reset link or manually set the password.');
      return;
    }

    console.log(`\nFound ${sessions.data.length} session(s):\n`);

    for (const session of sessions.data) {
      console.log(`Session ID: ${session.id}`);
      console.log(`  Status: ${session.status}`);
      console.log(`  Email: ${session.customer_email}`);
      console.log(`  Created: ${new Date(session.created * 1000).toISOString()}`);
      console.log(`  Payment Status: ${session.payment_status}`);
      console.log(`  Mode: ${session.mode}`);
      console.log('');
    }

    const latestSession = sessions.data[0];
    const appUrl = process.env.PUBLIC_APP_URL || 'https://capturepro.work';
    const welcomeLink = `${appUrl}/welcome?session_id=${latestSession.id}`;

    console.log('='.repeat(80));
    console.log('WELCOME LINK FOR ROBIN:');
    console.log('='.repeat(80));
    console.log(welcomeLink);
    console.log('='.repeat(80));
    console.log('\nSend this link to robin@etc.team to complete registration.\n');

  } catch (error: any) {
    console.error('Error fetching checkout sessions:', error.message);
    process.exit(1);
  }
}

getCheckoutSession();
