import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { getSupabaseUrl, getSupabaseAnonKey } from '../../lib/env';
import { CheckCircle, AlertCircle, Loader2, Clock } from 'lucide-react';

export function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [userInfo, setUserInfo] = useState<{
    email: string;
    fullName: string;
    organisationName: string;
    expiresAt: string | null;
  } | null>(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const isValidatingRef = useRef(false);

  const getTimeRemaining = useMemo(() => {
    if (!userInfo?.expiresAt) return null;
    const now = new Date();
    const expires = new Date(userInfo.expiresAt);
    const diff = expires.getTime() - now.getTime();

    if (diff <= 0) return 'Expired';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
    return 'Less than 1 hour';
  }, [userInfo?.expiresAt]);

  const validateToken = useCallback(async () => {
    if (!token) {
      console.error('❌ No token provided');
      setError('Invalid invitation link');
      setLoading(false);
      return;
    }

    if (isValidatingRef.current) {
      console.log('⏳ Validation already in progress, skipping...');
      return;
    }

    isValidatingRef.current = true;
    console.log('🔍 Starting token validation for:', token);

    try {
      if (!supabase) {
        console.error('❌ Supabase client not initialized');
        setError('Application configuration error');
        setLoading(false);
        isValidatingRef.current = false;
        return;
      }

      console.log('📡 Calling RPC function get_invitation_by_token...');

      const { data, error: rpcError } = await supabase.rpc('get_invitation_by_token', {
        p_token: token
      });

      console.log('📥 RPC response:', { data, error: rpcError });

      if (rpcError) {
        console.error('❌ RPC error:', rpcError);
        setError('Failed to validate invitation');
        setLoading(false);
        isValidatingRef.current = false;
        return;
      }

      if (!data) {
        console.error('❌ No data returned from RPC');
        setError('Invalid response from server');
        setLoading(false);
        isValidatingRef.current = false;
        return;
      }

      if (data.error) {
        console.error('❌ Validation failed:', data.error);
        setError(data.error);
        setLoading(false);
        isValidatingRef.current = false;
        return;
      }

      console.log('✅ Validation successful, checking required fields...');

      if (!data.email || !data.fullName || !data.organisationName) {
        console.error('❌ Missing required fields in response:', {
          hasEmail: !!data.email,
          hasFullName: !!data.fullName,
          hasOrganisationName: !!data.organisationName,
        });
        setError('Invalid response format from server');
        setLoading(false);
        isValidatingRef.current = false;
        return;
      }

      const userInfoData = {
        email: data.email,
        fullName: data.fullName,
        organisationName: data.organisationName,
        expiresAt: data.expiresAt || null,
      };

      console.log('📝 Setting user info:', userInfoData);
      setError('');
      setUserInfo(userInfoData);
      console.log('✅ User info set successfully, component should now render form');
    } catch (err) {
      console.error('❌ Unexpected error during validation:', err);
      console.error('Error stack:', err instanceof Error ? err.stack : 'No stack');
      setError(`Failed to validate invitation: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      console.log('🏁 Validation complete, setting loading to false');
      setLoading(false);
      isValidatingRef.current = false;
    }
  }, [token]);

  useEffect(() => {
    validateToken();
  }, [validateToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setSubmitting(true);

    try {
      if (!token || !userInfo) {
        throw new Error('Invalid invitation');
      }

      const supabaseUrl = getSupabaseUrl();
      const anonKey = getSupabaseAnonKey();

      if (!supabaseUrl || !anonKey) {
        throw new Error('Application configuration error');
      }

      const response = await fetch(
        `${supabaseUrl}/functions/v1/accept-invitation`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${anonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token, password }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept invitation');
      }

      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      console.error('Error accepting invitation:', err);
      setError(err instanceof Error ? err.message : 'Failed to accept invitation');
      setSubmitting(false);
    }
  };

  console.log('🎨 Rendering AcceptInvitePage:', { loading, error, hasUserInfo: !!userInfo, success });

  if (loading) {
    console.log('🔄 Rendering loading state');
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,175,255,0.15),transparent_50%)]"></div>
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 border border-gray-100">
          <div className="flex flex-col items-center">
            <Loader2 className="w-12 h-12 text-electric-500 animate-spin" />
            <p className="text-gray-600 mt-4 font-medium">Validating invitation...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !userInfo) {
    console.log('❌ Rendering error state:', error);
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,175,255,0.15),transparent_50%)]"></div>
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 border border-gray-100">
          <div className="flex flex-col items-center text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mb-4 drop-shadow-lg" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Unable to Continue</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-gradient-to-r from-electric-500 to-electric-600 text-white py-3 rounded-xl font-semibold hover:from-electric-600 hover:to-electric-700 focus:outline-none focus:ring-2 focus:ring-electric-500 focus:ring-offset-2 transition-all shadow-lg shadow-electric-500/30 active:scale-[0.98]"
            >
              Try Again
            </button>
            <p className="text-sm text-gray-500 mt-4">
              If the problem persists, please contact support.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    console.log('✅ Rendering success state');
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,175,255,0.15),transparent_50%)]"></div>
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 border border-gray-100">
          <div className="flex flex-col items-center text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mb-4 drop-shadow-lg" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to CapturePro!</h1>
            <p className="text-gray-600 mb-4">Your account is now active.</p>
            <p className="text-sm text-gray-500">Redirecting to login...</p>
          </div>
        </div>
      </div>
    );
  }

  console.log('📝 Rendering registration form');

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,175,255,0.15),transparent_50%)]"></div>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 border border-gray-100">
        <div className="flex items-center justify-center mb-6">
          <img
            src="/brand/image.png"
            alt="CapturePro"
            className="w-24 h-24 object-contain drop-shadow-lg"
          />
        </div>

        <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">
          Complete Your Registration
        </h1>
        <p className="text-center text-gray-600 mb-6 text-sm">
          Welcome, <strong className="font-semibold">{userInfo?.fullName}</strong>!
        </p>

        <div className="bg-gradient-to-r from-blue-50 to-electric-50 border border-blue-200/60 rounded-xl p-4 mb-6 shadow-sm">
          <p className="text-sm text-blue-900">
            You've been invited to join <strong className="font-semibold">{userInfo?.organisationName}</strong>.
            Set your password to get started.
          </p>
        </div>

        {userInfo?.expiresAt && (
          <div className={`border rounded-xl p-4 mb-6 shadow-sm flex items-start gap-3 ${
            getTimeRemaining === 'Expired'
              ? 'bg-red-50 border-red-200'
              : getTimeRemaining?.includes('hour')
              ? 'bg-yellow-50 border-yellow-200'
              : 'bg-gray-50 border-gray-200'
          }`}>
            <Clock className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
              getTimeRemaining === 'Expired'
                ? 'text-red-600'
                : getTimeRemaining?.includes('hour')
                ? 'text-yellow-600'
                : 'text-gray-600'
            }`} />
            <div>
              <p className={`text-sm font-medium ${
                getTimeRemaining === 'Expired'
                  ? 'text-red-900'
                  : getTimeRemaining?.includes('hour')
                  ? 'text-yellow-900'
                  : 'text-gray-900'
              }`}>
                {getTimeRemaining === 'Expired'
                  ? 'This invitation link has expired'
                  : `This link expires in ${getTimeRemaining}`
                }
              </p>
              <p className={`text-xs mt-1 ${
                getTimeRemaining === 'Expired'
                  ? 'text-red-700'
                  : getTimeRemaining?.includes('hour')
                  ? 'text-yellow-700'
                  : 'text-gray-600'
              }`}>
                Expires on {new Date(userInfo.expiresAt).toLocaleDateString()} at {new Date(userInfo.expiresAt).toLocaleTimeString()}
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl text-sm flex items-start gap-2 shadow-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={userInfo?.email || ''}
              disabled
              className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-600 cursor-not-allowed"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
              Create Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-electric-500 focus:border-electric-500 transition-all shadow-sm"
              placeholder="At least 8 characters"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-electric-500 focus:border-electric-500 transition-all shadow-sm"
              placeholder="Re-enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-gradient-to-r from-electric-500 to-electric-600 text-white py-3 rounded-xl font-semibold hover:from-electric-600 hover:to-electric-700 focus:outline-none focus:ring-2 focus:ring-electric-500 focus:ring-offset-2 transition-all shadow-lg shadow-electric-500/30 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed disabled:shadow-none active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Setting up your account...
              </>
            ) : (
              'Complete Registration'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
