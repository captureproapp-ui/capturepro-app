import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { Card, CardBody } from '../ui/Card';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';

export function CheckoutSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session_id');
  const [redirectCountdown, setRedirectCountdown] = useState(5);

  useEffect(() => {
    console.log('[CheckoutSuccessPage] User landed on /checkout/success', {
      hasSessionId: !!sessionId,
      sessionId: sessionId || 'missing',
      timestamp: new Date().toISOString(),
    });

    if (sessionId) {
      console.log('[CheckoutSuccessPage] Redirecting to /welcome with session_id');
      navigate(`/welcome?session_id=${sessionId}`, { replace: true });
    }
  }, [sessionId, navigate]);

  useEffect(() => {
    if (!sessionId && redirectCountdown > 0) {
      const timer = setTimeout(() => {
        setRedirectCountdown(redirectCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (!sessionId && redirectCountdown === 0) {
      navigate('/checkout', { replace: true });
    }
  }, [sessionId, redirectCountdown, navigate]);

  if (!sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-navy-950 via-navy-900 to-navy-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,175,255,0.1),transparent_50%)]"></div>
        <Card variant="elevated" className="relative w-full max-w-md">
          <CardBody className="p-8">
            <div className="flex flex-col items-center justify-center space-y-6">
              <AlertCircle size={64} className="text-red-500 drop-shadow-lg" />

              <h1 className="text-2xl font-bold text-center text-gray-900">
                Checkout Session Error
              </h1>

              <Alert variant="error" className="w-full">
                <p className="text-sm">
                  Missing session_id. Please return to pricing and complete checkout again.
                </p>
              </Alert>

              <div className="w-full space-y-3">
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full"
                  onClick={() => navigate('/checkout')}
                >
                  Go back to pricing
                </Button>

                <p className="text-center text-sm text-gray-600">
                  Redirecting automatically in {redirectCountdown} second{redirectCountdown !== 1 ? 's' : ''}...
                </p>
              </div>

              <div className="text-center pt-4 border-t border-gray-200 w-full">
                <p className="text-sm text-gray-600">
                  Need help?{' '}
                  <a
                    href="mailto:support@capturepro.work"
                    className="text-electric-500 hover:text-electric-600"
                  >
                    Contact support
                  </a>
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return null;
}
