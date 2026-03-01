import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { getSupabaseUrl, getSupabaseAnonKey } from '../../lib/env';
import { Card, CardBody } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { Spinner } from '../ui/Spinner';
import { ProgressBar } from '../ui/ProgressBar';

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
}

export function RegisterPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session_id');

  const [email, setEmail] = useState('');
  const [organisationName, setOrganisationName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingSession, setLoadingSession] = useState(true);

  useEffect(() => {
    if (!sessionId) {
      setError('Invalid registration link. Please contact support.');
      setLoadingSession(false);
      return;
    }

    fetchSessionData();
  }, [sessionId]);

  const fetchSessionData = async () => {
    try {
      const supabaseUrl = getSupabaseUrl();
      const supabaseAnonKey = getSupabaseAnonKey();

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('App configuration error. Please try again shortly.');
      }

      const response = await fetch(
        `${supabaseUrl}/functions/v1/complete-registration?sessionId=${sessionId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${supabaseAnonKey}`,
          },
        }
      );

      const data = await response.json();

      if (response.status === 404 && data.retryable) {
        setTimeout(fetchSessionData, 2000);
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch session data');
      }

      setEmail(data.email || '');
      setOrganisationName(data.organisationName || 'Your Organisation');
      setLoadingSession(false);
    } catch (err: any) {
      console.error('Error fetching session:', err);
      setError(err.message || 'Unable to load registration details. Please try again or contact support.');
      setLoadingSession(false);
    }
  };

  const getPasswordStrength = (pwd: string): PasswordStrength => {
    if (!pwd) return { score: 0, label: '', color: 'bg-gray-200' };
    if (pwd.length < 8) return { score: 1, label: 'Too short', color: 'bg-red-500' };

    let score = 0;
    if (pwd.length >= 12) score++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    if (/[^a-zA-Z0-9]/.test(pwd)) score++;

    if (score === 0) return { score: 1, label: 'Weak', color: 'bg-red-500' };
    if (score === 1) return { score: 2, label: 'Fair', color: 'bg-orange-500' };
    if (score === 2) return { score: 3, label: 'Good', color: 'bg-yellow-500' };
    return { score: 4, label: 'Strong', color: 'bg-green-500' };
  };

  const passwordStrength = getPasswordStrength(password);
  const passwordsMatch = password && confirmPassword && password === confirmPassword;
  const passwordsDontMatch = password && confirmPassword && password !== confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const supabaseUrl = getSupabaseUrl();
      const supabaseAnonKey = getSupabaseAnonKey();

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('App configuration error. Please try again shortly.');
      }

      if (!supabase) {
        throw new Error('Database connection unavailable. Please try again shortly.');
      }

      const response = await fetch(
        `${supabaseUrl}/functions/v1/complete-registration`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({
            sessionId,
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete registration');
      }

      if (data.session) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }

      navigate('/dashboard');
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'Failed to complete registration. Please try again.');
      setLoading(false);
    }
  };

  if (loadingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900">
        <Card variant="elevated" className="w-full max-w-md">
          <CardBody className="p-8">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Spinner size="lg" />
              <p className="text-gray-600">Loading your registration details...</p>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900">
      <Card variant="elevated" className="w-full max-w-md">
        <CardBody className="p-8">
        <div className="flex items-center justify-center mb-8">
          <img
            src="/brand/image.png"
            alt="CapturePro"
            className="w-32 h-32 object-contain"
          />
        </div>

        <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">
          Welcome to CapturePro!
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Set your password to complete registration
        </p>

          {organisationName && (
            <Alert variant="success" className="mb-6">
              <p className="text-sm text-center">
                <strong>Organisation:</strong> {organisationName}
              </p>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="error">{error}</Alert>
            )}

            <Input
              id="email"
              type="email"
              label="Email Address"
              value={email}
              disabled
            />

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-electric-500 focus:border-transparent transition-shadow pr-10"
                placeholder="At least 8 characters"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

              {password && (
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-gray-600">Password strength:</span>
                    <span className="text-xs font-semibold text-gray-900">{passwordStrength.label}</span>
                  </div>
                  <ProgressBar
                    value={passwordStrength.score}
                    max={4}
                    variant={
                      passwordStrength.score === 4 ? 'success' :
                      passwordStrength.score === 3 ? 'default' :
                      passwordStrength.score === 2 ? 'warning' : 'error'
                    }
                  />
                </div>
              )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-electric-500 focus:border-transparent transition-shadow pr-10"
                placeholder="Re-enter your password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {confirmPassword && (
              <div className="mt-2 flex items-center space-x-1 text-sm">
                {passwordsMatch ? (
                  <>
                    <CheckCircle2 size={16} className="text-green-500" />
                    <span className="text-green-600">Passwords match</span>
                  </>
                ) : passwordsDontMatch ? (
                  <>
                    <XCircle size={16} className="text-red-500" />
                    <span className="text-red-600">Passwords do not match</span>
                  </>
                ) : null}
              </div>
            )}
          </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              disabled={!passwordsMatch || password.length < 8}
              className="w-full"
            >
              Create Account
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Need help?{' '}
              <a
                href="https://www.capturepro.work/support"
                className="text-electric-500 hover:text-electric-600"
              >
                Contact support
              </a>
            </p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
