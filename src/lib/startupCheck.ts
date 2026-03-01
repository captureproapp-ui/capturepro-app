import { validateEnvironment, logEnvironmentStatus, isDebugEnabled, probeEnvironment } from './env';

export interface StartupCheckResult {
  canStart: boolean;
  error?: string;
  shouldShowError: boolean;
}

export function performStartupCheck(): StartupCheckResult {
  const debug = isDebugEnabled();

  if (debug) {
    console.log('🚀 Starting application with debug mode enabled');
    probeEnvironment();
  }

  const envStatus = validateEnvironment();

  logEnvironmentStatus(debug);

  if (!envStatus.isValid) {
    if (debug) {
      console.error('❌ Startup failed: Environment validation failed');
      console.error('Missing variables:', envStatus.missing);
    }

    return {
      canStart: false,
      error: 'Missing required environment variables',
      shouldShowError: true,
    };
  }

  if (!envStatus.hasSupabase) {
    console.error('❌ Supabase configuration is invalid or missing');
    if (debug) {
      console.error('Supabase URL:', envStatus.details.supabaseUrl || 'NOT SET');
      console.error('Supabase Anon Key:', envStatus.details.supabaseAnonKey ? 'SET' : 'NOT SET');
    }

    return {
      canStart: false,
      error: 'Database connection unavailable',
      shouldShowError: true,
    };
  }

  if (debug) {
    console.log('✅ All startup checks passed');
    console.log('Application ready to start');
  } else {
    console.log('✓ Startup checks passed');
  }

  return {
    canStart: true,
    shouldShowError: false,
  };
}
