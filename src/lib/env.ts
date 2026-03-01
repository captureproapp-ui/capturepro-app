export const ENV_VAR_NAMES = {
  VITE_SUPABASE_URL: 'VITE_SUPABASE_URL',
  VITE_SUPABASE_ANON_KEY: 'VITE_SUPABASE_ANON_KEY',
  VITE_STRIPE_PUBLISHABLE_KEY: 'VITE_STRIPE_PUBLISHABLE_KEY',
  VITE_PUBLIC_APP_URL: 'VITE_PUBLIC_APP_URL',
} as const;

export type EnvValidationResult = {
  isValid: boolean;
  missing: string[];
  warnings: string[];
  hasSupabase: boolean;
  hasStripe: boolean;
  details: {
    supabaseUrl: string | undefined;
    supabaseAnonKey: string | undefined;
    stripeKey: string | undefined;
    publicAppUrl: string;
  };
};

function isValidUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function isValidKey(value: string | undefined): boolean {
  return typeof value === 'string' && value.length > 0 && !value.includes('your_') && !value.includes('_here');
}

export function getEnvVar(name: keyof typeof ENV_VAR_NAMES): string | undefined {
  return import.meta.env[name];
}

export function getSupabaseUrl(): string | undefined {
  const url = getEnvVar('VITE_SUPABASE_URL');
  if (!url) return undefined;
  return url.replace(/\/$/, '');
}

export function getSupabaseAnonKey(): string | undefined {
  return getEnvVar('VITE_SUPABASE_ANON_KEY');
}

export function getStripePublishableKey(): string | undefined {
  return getEnvVar('VITE_STRIPE_PUBLISHABLE_KEY');
}

export function getPublicAppUrl(): string {
  return getEnvVar('VITE_PUBLIC_APP_URL') || 'https://capturepro.work';
}

export function validateEnvironment(): EnvValidationResult {
  const missing: string[] = [];
  const warnings: string[] = [];

  const supabaseUrl = getSupabaseUrl();
  const supabaseAnonKey = getSupabaseAnonKey();
  const stripeKey = getStripePublishableKey();
  const publicAppUrl = getPublicAppUrl();

  if (!isValidUrl(supabaseUrl)) {
    missing.push(ENV_VAR_NAMES.VITE_SUPABASE_URL);
  }

  if (!isValidKey(supabaseAnonKey)) {
    missing.push(ENV_VAR_NAMES.VITE_SUPABASE_ANON_KEY);
  }

  if (!isValidKey(stripeKey)) {
    warnings.push(ENV_VAR_NAMES.VITE_STRIPE_PUBLISHABLE_KEY);
  }

  const hasSupabase = isValidUrl(supabaseUrl) && isValidKey(supabaseAnonKey);
  const hasStripe = isValidKey(stripeKey);

  return {
    isValid: missing.length === 0,
    missing,
    warnings,
    hasSupabase,
    hasStripe,
    details: {
      supabaseUrl,
      supabaseAnonKey,
      stripeKey,
      publicAppUrl,
    },
  };
}

export function isDebugEnabled(): boolean {
  if (import.meta.env.DEV) return true;

  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    return params.get('debug') === '1';
  }

  return false;
}

export function logEnvironmentStatus(verbose = false): void {
  const result = validateEnvironment();
  const debug = isDebugEnabled();

  if (result.isValid && !verbose && !debug) {
    console.log('✓ Environment configuration valid');
    return;
  }

  console.group('🔧 Environment Configuration Status');

  if (result.isValid) {
    console.log('✓ All required environment variables are configured');
  } else {
    console.error('✗ Configuration is incomplete');
  }

  if (result.missing.length > 0) {
    console.group('❌ Missing required environment variables:');
    result.missing.forEach(key => {
      console.error(`  ${key}: NOT SET`);
    });
    console.groupEnd();
  }

  if (result.warnings.length > 0) {
    console.group('⚠️ Missing optional environment variables:');
    result.warnings.forEach(key => {
      console.warn(`  ${key}: NOT SET`);
    });
    console.groupEnd();
  }

  if (debug || verbose) {
    console.group('📋 Environment Details:');
    console.log('Supabase:', result.hasSupabase ? '✓ Configured' : '✗ Not configured');
    console.log('Stripe:', result.hasStripe ? '✓ Configured' : '✗ Not configured');

    if (debug) {
      console.group('🔍 Debug Values:');
      console.log('Supabase URL:', result.details.supabaseUrl || 'NOT SET');
      console.log('Supabase Anon Key:', result.details.supabaseAnonKey ? `${result.details.supabaseAnonKey.substring(0, 20)}...` : 'NOT SET');
      console.log('Stripe Publishable Key:', result.details.stripeKey ? `${result.details.stripeKey.substring(0, 20)}...` : 'NOT SET');
      console.log('Public App URL:', result.details.publicAppUrl);
      console.log('Mode:', import.meta.env.MODE);
      console.log('Dev Mode:', import.meta.env.DEV);
      console.log('Prod Mode:', import.meta.env.PROD);
      console.groupEnd();
    }
    console.groupEnd();
  }

  console.groupEnd();
}

export function probeEnvironment(): void {
  console.group('🔍 Environment Probe');

  console.log('Import Meta Env:', import.meta.env);

  console.group('Defined Variables:');
  Object.keys(ENV_VAR_NAMES).forEach(key => {
    const value = import.meta.env[key];
    if (value) {
      const masked = value.length > 20 ? `${value.substring(0, 20)}...` : value;
      console.log(`${key}: ${masked}`);
    } else {
      console.log(`${key}: NOT DEFINED`);
    }
  });
  console.groupEnd();

  console.log('Window location:', typeof window !== 'undefined' ? window.location.href : 'N/A');
  console.log('Debug enabled:', isDebugEnabled());

  console.groupEnd();
}
