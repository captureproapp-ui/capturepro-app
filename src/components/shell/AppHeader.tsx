import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut, Menu, X } from 'lucide-react';
import { NotificationBell } from '../notifications/NotificationBell';

interface AppHeaderProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export function AppHeader({ sidebarOpen, onToggleSidebar }: AppHeaderProps) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-b border-gray-200/60 z-50 shadow-sm">
      <div className="flex items-center justify-between px-4 lg:px-6 py-3.5">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-all duration-200 active:scale-95"
          >
            {sidebarOpen ? <X className="w-5 h-5 text-gray-700" /> : <Menu className="w-5 h-5 text-gray-700" />}
          </button>

          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity group"
          >
            <img
              src="/brand/image.png"
              alt="CapturePro"
              className="h-9 w-auto object-contain transition-transform group-hover:scale-105"
            />
            <div>
              <h1 className="text-lg font-bold text-gray-900 leading-tight">CapturePro</h1>
              <p className="text-xs text-gray-600 hidden sm:block">Installation Evidence System</p>
            </div>
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-gray-900">
              {profile?.full_name}
              {profile?.super_admin && (
                <span className="ml-2 px-2.5 py-0.5 text-xs font-semibold bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-full shadow-sm">
                  Super Admin
                </span>
              )}
            </p>
            <p className="text-xs text-gray-600 capitalize font-medium">{profile?.role}</p>
          </div>
          <NotificationBell />
          <button
            onClick={handleSignOut}
            className="p-2.5 hover:bg-gray-100 rounded-lg transition-all duration-200 active:scale-95 group"
            title="Sign Out"
          >
            <LogOut className="w-5 h-5 text-gray-600 group-hover:text-gray-900 transition-colors" />
          </button>
        </div>
      </div>
    </div>
  );
}
