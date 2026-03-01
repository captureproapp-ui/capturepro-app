import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables:');
  if (!supabaseUrl) console.error('- VITE_SUPABASE_URL');
  if (!supabaseServiceKey) console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function seed() {
  console.log('🌱 Starting database seed...\n');

  try {
    console.log('1️⃣  Creating organisation...');
    const { data: org, error: orgError } = await supabase
      .from('organisations')
      .insert({
        name: 'My Company',
        settings: {}
      })
      .select()
      .single();

    if (orgError) {
      if (orgError.code === '23505') {
        console.log('   ⚠️  Organisation already exists, skipping...\n');
        const { data: existingOrg } = await supabase
          .from('organisations')
          .select()
          .eq('name', 'My Company')
          .single();

        if (existingOrg) {
          console.log(`   ✅ Using existing organisation: ${existingOrg.id}\n`);
          await seedUsers(existingOrg.id);
        }
        return;
      }
      throw orgError;
    }

    console.log(`   ✅ Organisation created: ${org.id}\n`);

    await seedUsers(org.id);

    console.log('\n✅ Database seeded successfully!\n');
    console.log('📋 Test Credentials:');
    console.log('   Admin: admin@test.com / password123');
    console.log('   Installer: installer@test.com / password123\n');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

async function seedUsers(organisationId: string) {
  console.log('2️⃣  Creating admin user...');
  const { data: adminUser, error: adminAuthError } = await supabase.auth.admin.createUser({
    email: 'admin@test.com',
    password: 'password123',
    email_confirm: true,
    user_metadata: {
      full_name: 'Office Admin'
    }
  });

  if (adminAuthError) {
    if (adminAuthError.message.includes('already registered')) {
      console.log('   ⚠️  Admin user already exists, skipping...\n');
    } else {
      throw adminAuthError;
    }
  } else {
    console.log(`   ✅ Admin auth user created: ${adminUser.user.id}`);

    const { error: adminProfileError } = await supabase
      .from('profiles')
      .insert({
        id: adminUser.user.id,
        email: 'admin@test.com',
        full_name: 'Office Admin',
        role: 'admin',
        organisation_id: organisationId
      });

    if (adminProfileError) {
      throw adminProfileError;
    }
    console.log('   ✅ Admin profile created\n');
  }

  console.log('3️⃣  Creating installer user...');
  const { data: installerUser, error: installerAuthError } = await supabase.auth.admin.createUser({
    email: 'installer@test.com',
    password: 'password123',
    email_confirm: true,
    user_metadata: {
      full_name: 'John Installer'
    }
  });

  if (installerAuthError) {
    if (installerAuthError.message.includes('already registered')) {
      console.log('   ⚠️  Installer user already exists, skipping...\n');
    } else {
      throw installerAuthError;
    }
  } else {
    console.log(`   ✅ Installer auth user created: ${installerUser.user.id}`);

    const { error: installerProfileError } = await supabase
      .from('profiles')
      .insert({
        id: installerUser.user.id,
        email: 'installer@test.com',
        full_name: 'John Installer',
        role: 'installer',
        organisation_id: organisationId
      });

    if (installerProfileError) {
      throw installerProfileError;
    }
    console.log('   ✅ Installer profile created\n');
  }
}

seed();
