import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Card, CardBody } from '../ui/Card';
import { Spinner } from '../ui/Spinner';

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    (async () => {
      try {
        const url = window.location.href;

        const { error } = await supabase.auth.exchangeCodeForSession(url);

        if (error) {
          console.error('Magic link callback error:', error);
          navigate('/login?error=magic_link_failed');
          return;
        }

        const redirectTo = searchParams.get('redirect') || '/dashboard';
        navigate(redirectTo);
      } catch (err) {
        console.error('Unexpected error during auth callback:', err);
        navigate('/login?error=auth_failed');
      }
    })();
  }, [navigate, searchParams]);

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
          <div className="text-center space-y-4">
            <Spinner size="lg" className="mx-auto" />
            <div>
              <p className="text-gray-700 font-medium">Signing you in...</p>
              <p className="text-gray-500 text-sm mt-2">Please wait while we verify your magic link</p>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
