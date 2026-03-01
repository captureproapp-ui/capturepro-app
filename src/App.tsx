import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/routing/ProtectedRoute';
import { AuthenticatedApp } from './components/app/AuthenticatedApp';
import { LoginPage } from './components/auth/LoginPage';
import { RegisterPage } from './components/auth/RegisterPage';
import { WelcomePage } from './components/auth/WelcomePage';
import { ChooseMeasurePage } from './components/onboarding/ChooseMeasurePage';
import { AcceptInvitePage } from './components/auth/AcceptInvitePage';
import { AuthCallbackPage } from './components/auth/AuthCallbackPage';
import { CheckoutPage } from './components/checkout/CheckoutPage';
import { CheckoutSuccessPage } from './components/checkout/CheckoutSuccessPage';
import { LandingPage } from './components/landing/LandingPage';
import { PublicWebReportViewer } from './components/reports/PublicWebReportViewer';
import { ConfigurationError } from './components/errors/ConfigurationError';
import { performStartupCheck } from './lib/startupCheck';

export default function App() {
  const startupCheck = performStartupCheck();

  if (!startupCheck.canStart) {
    return <ConfigurationError onRetry={() => window.location.reload()} />;
  }

  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/welcome" element={<WelcomePage />} />
        <Route path="/onboarding/choose-measure" element={<ChooseMeasurePage />} />
        <Route path="/accept-invite" element={<AcceptInvitePage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
<Route path="/share/:shareToken" element={<PublicWebReportViewer />} />

        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <AuthenticatedApp />
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
  );
}
