import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardBody } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [useMagicLink, setUseMagicLink] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [resetPasswordMode, setResetPasswordMode] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const { signIn, signInWithMagicLink, resetPassword } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMagicLinkSent(false);
    setResetEmailSent(false);
    setLoading(true);

    if (resetPasswordMode) {
      const { error } = await resetPassword(email);

      if (error) {
        setError(error.message);
        setLoading(false);
      } else {
        setResetEmailSent(true);
        setLoading(false);
      }
    } else if (useMagicLink) {
      const { error } = await signInWithMagicLink(email);

      if (error) {
        setError(error.message);
        setLoading(false);
      } else {
        setMagicLinkSent(true);
        setLoading(false);
      }
    } else {
      const { error } = await signIn(email, password);

      if (error) {
        setError(error.message);
        setLoading(false);
      } else {
        setLoading(false);
        navigate('/dashboard', { replace: true });
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,175,255,0.15),transparent_50%)]"></div>
      <Card variant="elevated" className="relative w-full max-w-md">
        <CardBody className="p-8">
          <div className="flex items-center justify-center mb-6">
            <img
              src="/brand/image.png"
              alt="CapturePro"
              className="w-24 h-24 object-contain drop-shadow-lg"
            />
          </div>

          <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">
            {resetPasswordMode ? 'Reset Password' : 'CapturePro App'}
          </h1>
          <p className="text-center text-gray-600 mb-8 text-sm">
            {resetPasswordMode
              ? 'Enter your email to receive a password reset link'
              : 'Sign in to manage your installations'
            }
          </p>

          {!resetPasswordMode && (
            <Alert variant="info" className="mb-6">
              <p className="text-sm">
                <strong className="font-semibold">Tip for mobile users:</strong> Bookmark this page for quick access
              </p>
            </Alert>
          )}

          {!resetPasswordMode && (
            <div className="flex border-b border-gray-200 mb-6">
            <button
              type="button"
              onClick={() => {
                setUseMagicLink(false);
                setError('');
                setMagicLinkSent(false);
              }}
              className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-all duration-200 ${
                !useMagicLink
                  ? 'border-electric-500 text-electric-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Password
            </button>
            <button
              type="button"
              onClick={() => {
                setUseMagicLink(true);
                setError('');
                setMagicLinkSent(false);
              }}
              className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-all duration-200 ${
                useMagicLink
                  ? 'border-electric-500 text-electric-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Magic Link
            </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <Alert variant="error" onClose={() => setError('')}>
                {error}
              </Alert>
            )}

            {magicLinkSent && (
              <Alert variant="success" title="Magic link sent!">
                Check your email for a secure sign-in link. The link will expire in 1 hour.
              </Alert>
            )}

            {resetEmailSent && (
              <Alert variant="success" title="Password reset email sent!">
                Check your email for a password reset link. If you don't see it, check your spam folder.
              </Alert>
            )}

            <Input
              id="email"
              type="email"
              name="email"
              autoComplete="email"
              label="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@company.com"
            />

            {!useMagicLink && !resetPasswordMode && (
              <Input
                id="password"
                type="password"
                name="password"
                autoComplete="current-password"
                label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
              />
            )}

            {useMagicLink && (
              <Alert variant="info">
                We'll send you a secure sign-in link via email. No password needed!
              </Alert>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full"
            >
              {resetPasswordMode ? 'Send Reset Link' : useMagicLink ? 'Send Magic Link' : 'Sign In'}
            </Button>
          </form>

          {!resetPasswordMode && !useMagicLink && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => {
                  setResetPasswordMode(true);
                  setError('');
                  setMagicLinkSent(false);
                }}
                className="text-sm text-electric-600 hover:text-electric-700 font-medium transition-colors"
              >
                Forgot your password?
              </button>
            </div>
          )}

          {resetPasswordMode && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => {
                  setResetPasswordMode(false);
                  setError('');
                  setResetEmailSent(false);
                }}
                className="text-sm text-electric-600 hover:text-electric-700 font-medium transition-colors"
              >
                Back to Sign In
              </button>
            </div>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Contact your administrator for account access
            </p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
