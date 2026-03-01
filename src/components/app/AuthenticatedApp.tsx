import { useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AppShell } from '../shell/AppShell';
import { AdminDashboard } from '../dashboard/AdminDashboard';
import { InstallerDashboard } from '../dashboard/InstallerDashboard';
import { PropertiesList } from '../properties/PropertiesList';
import { PropertyDetail } from '../properties/PropertyDetail';
import { CreatePropertyForm } from '../properties/CreatePropertyForm';
import { AddRoomForm } from '../properties/AddRoomForm';
import { AreaDetail } from '../areas/AreaDetail';
import { OpeningsList } from '../openings/OpeningsList';
import { OpeningChecklist } from '../openings/OpeningChecklist';
import { PhotoUploadForm } from '../photos/PhotoUploadForm';
import { PropertyElevationsChecklist } from '../properties/PropertyElevationsChecklist';
import { CladdingImageChecklist } from '../properties/CladdingImageChecklist';
import { RequirementsManagement } from '../admin/RequirementsManagement';
import { UserManagement } from '../users/UserManagement';
import { ReportsManagement } from '../reports/ReportsManagement';
import { WebReportViewer } from '../reports/WebReportViewer';
import { ArchiveManagement } from '../archive/ArchiveManagement';
import { ProfileSettings } from '../settings/ProfileSettings';
import { ArchivedOrganisationsView } from '../dashboard/ArchivedOrganisationsView';
import PlatformAnalyticsDashboard from '../dashboard/PlatformAnalyticsDashboard';

function DashboardPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  if (profile?.role === 'installer') {
    return (
      <InstallerDashboard
        onSelectProperty={(id) => navigate(`/properties/${id}`)}
      />
    );
  }

  return <AdminDashboard />;
}

function PropertiesPage() {
  const navigate = useNavigate();

  return (
    <PropertiesList
      onCreateNew={() => navigate('/properties/new')}
      onSelectProperty={(id) => navigate(`/properties/${id}`)}
    />
  );
}

function PropertyDetailPage() {
  const navigate = useNavigate();
  const { id: propertyId = '' } = useParams<{ id: string }>();
  const location = useLocation();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const afterId = location.pathname.split(`/properties/${propertyId}/`)[1] || '';
  const subView = afterId;

  if (subView.startsWith('areas/') && subView.includes('/photos/')) {
    const parts = subView.split('/');
    const openingId = parts[3] || '';
    return (
      <PhotoUploadForm
        openingId={openingId}
        onClose={() => navigate(`/properties/${propertyId}/areas/${parts[1]}`)}
        onSuccess={() => navigate(`/properties/${propertyId}/areas/${parts[1]}`)}
      />
    );
  }

  if (subView.startsWith('areas/')) {
    const areaId = subView.split('/')[1] || '';
    return (
      <AreaDetail
        areaId={areaId}
        onBack={() => navigate(`/properties/${propertyId}`)}
        onUploadPhotos={(openingId) =>
          navigate(`/properties/${propertyId}/areas/${areaId}/photos/${openingId}`)
        }
      />
    );
  }

  if (subView === 'add-room') {
    return (
      <AddRoomForm
        propertyId={propertyId}
        onClose={() => navigate(`/properties/${propertyId}`)}
        onSuccess={() => {
          setRefreshTrigger((t) => t + 1);
          navigate(`/properties/${propertyId}`);
        }}
      />
    );
  }

  if (subView.startsWith('openings/') && subView.split('/').length >= 3) {
    const openingId = subView.split('/')[1] || '';
    return (
      <OpeningChecklist
        openingId={openingId}
        onBack={() => navigate(`/properties/${propertyId}/openings`)}
      />
    );
  }

  if (subView === 'openings') {
    return (
      <OpeningsList
        propertyId={propertyId}
        onBack={() => navigate(`/properties/${propertyId}`)}
        onSelectOpening={(openingId) =>
          navigate(`/properties/${propertyId}/openings/${openingId}/checklist`)
        }
      />
    );
  }

  if (subView === 'elevations') {
    return (
      <PropertyElevationsChecklist
        propertyId={propertyId}
        onBack={() => navigate(`/properties/${propertyId}`)}
      />
    );
  }

  if (subView === 'cladding') {
    return (
      <CladdingImageChecklist
        propertyId={propertyId}
        onBack={() => navigate(`/properties/${propertyId}`)}
      />
    );
  }

  if (subView === 'requirements') {
    return (
      <RequirementsManagement
        propertyId={propertyId}
        onBack={() => navigate(`/properties/${propertyId}`)}
      />
    );
  }

  return (
    <PropertyDetail
      propertyId={propertyId}
      onBack={() => navigate('/properties')}
      onAddRoom={() => navigate(`/properties/${propertyId}/add-room`)}
      onViewArea={(areaId) => navigate(`/properties/${propertyId}/areas/${areaId}`)}
      onViewOpenings={() => navigate(`/properties/${propertyId}/openings`)}
      onViewElevations={() => navigate(`/properties/${propertyId}/elevations`)}
      onViewImageChecklist={() => navigate(`/properties/${propertyId}/cladding`)}
      onManageRequirements={() => navigate(`/properties/${propertyId}/requirements`)}
      refreshTrigger={refreshTrigger}
    />
  );
}

function CreatePropertyPage() {
  const navigate = useNavigate();

  return (
    <CreatePropertyForm
      onClose={() => navigate('/properties')}
      onSuccess={() => navigate('/properties')}
    />
  );
}

const PUBLIC_PREFIXES = [
  '/onboarding',
  '/checkout',
  '/share',
  '/welcome',
  '/accept-invite',
  '/auth/callback',
  '/register',
  '/login',
];

export function AuthenticatedApp() {
  const location = useLocation();
  const isPublicRoute = PUBLIC_PREFIXES.some((p) => location.pathname.startsWith(p));

  if (isPublicRoute) return null;

  return (
    <AppShell>
      <Routes>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/my-jobs" element={<PropertiesPage />} />
        <Route path="/properties" element={<PropertiesPage />} />
        <Route path="/properties/new" element={<CreatePropertyPage />} />
        <Route path="/properties/:id/*" element={<PropertyDetailPage />} />
        <Route path="/users" element={<UserManagement />} />
        <Route path="/organisations" element={<ArchivedOrganisationsView />} />
        <Route path="/reports" element={<ReportsManagement />} />
        <Route path="/reports/:reportId" element={<WebReportViewer />} />
        <Route path="/archive" element={<ArchiveManagement />} />
        <Route path="/platform-analytics" element={<PlatformAnalyticsDashboard />} />
        <Route path="/settings" element={<ProfileSettings />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AppShell>
  );
}
