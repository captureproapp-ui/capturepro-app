import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function createSuperAdmin() {
  const email = 'capturepro.app@gmail.com';
  const password = 'Tottenham76!';
  const fullName = 'Super Administrator';

  console.log('Creating super admin account...');

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
    },
  });

  if (authError) {
    console.error('Error creating auth user:', authError);
    return;
  }

  console.log('Auth user created:', authData.user.id);

  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: authData.user.id,
      email,
      full_name: fullName,
      role: 'owner',
      organisation_id: null,
      super_admin: true,
      is_active: true,
      invitation_status: 'accepted',
    });

  if (profileError) {
    console.error('Error creating profile:', profileError);
    return;
  }

  console.log('Super admin account created successfully!');
  console.log('Email:', email);
  console.log('Password:', password);
}

createSuperAdmin();
