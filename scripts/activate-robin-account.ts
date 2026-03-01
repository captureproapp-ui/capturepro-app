import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('ERROR: Supabase credentials not found');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function activateRobinAccount() {
  const email = 'robin@etc.team';
  const temporaryPassword = 'Welcome2024!'; // Robin should change this after first login

  try {
    console.log(`\nActivating account for: ${email}`);

    // Get Robin's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, organisation_id, invitation_status, full_name')
      .eq('email', email)
      .maybeSingle();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      process.exit(1);
    }

    if (!profile) {
      console.error(`\nERROR: No profile found for ${email}`);
      console.error('Please ensure the account was created first.');
      process.exit(1);
    }

    console.log(`Found profile: ${profile.full_name} (${profile.id})`);
    console.log(`Current status: ${profile.invitation_status}`);

    // Set password for the user
    console.log('\nSetting password...');
    const { error: passwordError } = await supabase.auth.admin.updateUserById(
      profile.id,
      { password: temporaryPassword }
    );

    if (passwordError) {
      console.error('Error setting password:', passwordError);
      process.exit(1);
    }

    // Activate the profile
    console.log('Activating profile...');
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        is_active: true,
        invitation_status: 'accepted',
        invitation_accepted_at: new Date().toISOString(),
      })
      .eq('id', profile.id);

    if (updateError) {
      console.error('Error updating profile:', updateError);
      process.exit(1);
    }

    // Get organisation details
    const { data: org } = await supabase
      .from('organisations')
      .select('name, id')
      .eq('id', profile.organisation_id)
      .single();

    const appUrl = process.env.PUBLIC_APP_URL || 'https://capturepro.work';

    console.log('\n' + '='.repeat(80));
    console.log('ACCOUNT ACTIVATED SUCCESSFULLY!');
    console.log('='.repeat(80));
    console.log(`\nEmail: ${email}`);
    console.log(`Temporary Password: ${temporaryPassword}`);
    console.log(`Organisation: ${org?.name || 'Unknown'}`);
    console.log(`Login URL: ${appUrl}/login`);
    console.log('\n' + '='.repeat(80));
    console.log('IMPORTANT: Robin should change the password after first login!');
    console.log('='.repeat(80));
    console.log('\nSend these credentials to robin@etc.team\n');

  } catch (error: any) {
    console.error('\nError activating account:', error.message);
    process.exit(1);
  }
}

activateRobinAccount();
