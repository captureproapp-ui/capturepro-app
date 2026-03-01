import { useState, useEffect } from 'react';
import { AlertCircle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { validateEnvironment, logEnvironmentStatus } from '../../lib/env';

interface ConfigurationErrorProps {
  onRetry?: () => void;
  technicalDetails?: boolean;
}

export function ConfigurationError({ onRetry, technicalDetails = false }: ConfigurationErrorProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const envStatus = validateEnvironment();

  useEffect(() => {
    logEnvironmentStatus();
  }, []);

  const handleRetry = async () => {
    setRetrying(true);
    setRetryCount(prev => prev + 1);

    await new Promise(resolve => setTimeout(resolve, 1500));

    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  const autoRetryDelay = Math.min(5000 * Math.pow(2, retryCount), 30000);

  useEffect(() => {
    if (retryCount > 0 && retryCount < 3) {
      const timer = setTimeout(() => {
        handleRetry();
      }, autoRetryDelay);

      return () => clearTimeout(timer);
    }
  }, [retryCount]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-8">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="rounded-full bg-red-100 p-4">
              <AlertCircle className="w-16 h-16 text-red-600" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Configuration Error
          </h1>

          <p className="text-xl text-gray-600 mb-6">
            The app is temporarily unavailable due to a configuration issue.
          </p>

          <p className="text-gray-600 mb-8">
            Please try again shortly. If the problem persists, contact support.
          </p>

          <div className="flex justify-center gap-4 mb-8">
            <button
              onClick={handleRetry}
              disabled={retrying}
              className="flex items-center gap-2 px-6 py-3 bg-electric-500 text-white rounded-lg hover:bg-electric-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className={`w-5 h-5 ${retrying ? 'animate-spin' : ''}`} />
              {retrying ? 'Retrying...' : 'Retry Connection'}
            </button>
          </div>

          {retryCount > 0 && retryCount < 3 && (
            <p className="text-sm text-gray-500 mb-6">
              Automatically retrying in {Math.round(autoRetryDelay / 1000)} seconds...
            </p>
          )}

          {(technicalDetails || showDetails) && (
            <div className="border-t border-gray-200 pt-6 mt-6">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center gap-2 mx-auto text-gray-600 hover:text-gray-900 transition-colors"
              >
                <span className="text-sm font-medium">Technical Details</span>
                {showDetails ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {showDetails && (
                <div className="mt-4 bg-gray-50 rounded-lg p-4 text-left">
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-1">
                        Status:
                      </p>
                      <p className="text-sm text-gray-600">
                        {envStatus.isValid ? '✓ Valid' : '✗ Invalid'}
                      </p>
                    </div>

                    {envStatus.missing.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold text-gray-700 mb-1">
                          Missing Required Variables:
                        </p>
                        <ul className="text-sm text-gray-600 list-disc list-inside">
                          {envStatus.missing.map(key => (
                            <li key={key}>{key}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {envStatus.warnings.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold text-gray-700 mb-1">
                          Missing Optional Variables:
                        </p>
                        <ul className="text-sm text-gray-600 list-disc list-inside">
                          {envStatus.warnings.map(key => (
                            <li key={key}>{key}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-500">
                        This usually happens when the application has not been properly configured
                        with the necessary environment variables. Please contact your system administrator.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-8 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Need help? Contact{' '}
              <a
                href="mailto:support@capturepro.work"
                className="text-electric-500 hover:text-electric-600 font-medium"
              >
                support@capturepro.work
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
