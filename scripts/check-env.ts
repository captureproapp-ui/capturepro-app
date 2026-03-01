import { config } from 'dotenv';

config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Checking environment variables...\n');

let hasErrors = false;

if (!supabaseUrl) {
  console.error('❌ VITE_SUPABASE_URL is not set');
  hasErrors = true;
} else {
  console.log('✅ VITE_SUPABASE_URL is set');
}

if (!supabaseAnonKey) {
  console.error('❌ VITE_SUPABASE_ANON_KEY is not set');
  hasErrors = true;
} else {
  console.log('✅ VITE_SUPABASE_ANON_KEY is set');
}

if (!supabaseServiceKey || supabaseServiceKey === 'your_service_role_key_here') {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is not set or is still using placeholder value');
  console.log('\n📝 To fix this:');
  console.log('   1. Go to https://supabase.com/dashboard');
  console.log('   2. Select your project');
  console.log('   3. Go to Settings → API');
  console.log('   4. Copy the service_role key');
  console.log('   5. Update the SUPABASE_SERVICE_ROLE_KEY in your .env file\n');
  hasErrors = true;
} else {
  console.log('✅ SUPABASE_SERVICE_ROLE_KEY is set');
}

if (hasErrors) {
  console.error('\n❌ Environment setup is incomplete\n');
  process.exit(1);
} else {
  console.log('\n✅ All environment variables are configured correctly!\n');
}
