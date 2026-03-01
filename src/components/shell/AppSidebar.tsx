import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Home,
  FolderOpen,
  Users,
  Settings,
  Building2,
  BarChart3,
  Archive,
  FileText,
} from 'lucide-react';

type NavItem = {
  label: string;
  icon: typeof Home;
  path: string;
  roles: string[];
  superAdminOnly?: boolean;
};

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: Home, path: '/dashboard', roles: ['owner', 'admin', 'installer'] },
  { label: 'My Jobs', icon: FolderOpen, path: '/my-jobs', roles: ['installer'] },
  { label: 'All Properties', icon: FolderOpen, path: '/properties', roles: ['owner', 'admin'] },
  { label: 'Users', icon: Users, path: '/users', roles: ['owner', 'admin'] },
  { label: 'Organisations', icon: Building2, path: '/organisations', roles: ['owner'] },
  { label: 'Reports', icon: FileText, path: '/reports', roles: ['owner', 'admin'] },
  { label: 'Archive', icon: Archive, path: '/archive', roles: ['owner', 'admin'] },
  { label: 'Platform Analytics', icon: BarChart3, path: '/platform-analytics', roles: ['owner', 'admin', 'installer'], superAdminOnly: true },
  { label: 'Settings', icon: Settings, path: '/settings', roles: ['owner', 'admin', 'installer'] },
];

interface AppSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AppSidebar({ isOpen, onClose }: AppSidebarProps) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const filteredNavItems = navItems.filter((item) => {
    if (item.superAdminOnly) {
      return profile?.super_admin === true;
    }
    return item.roles.includes(profile?.role || '');
  });

  return (
    <aside
      className={`
        fixed lg:static inset-y-0 left-0 top-16
        w-64 bg-gradient-to-b from-navy-900 via-navy-900 to-navy-950 border-r border-navy-800/50
        transform transition-transform duration-300 ease-in-out z-40 shadow-xl
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}
    >
      <nav className="p-4 space-y-1">
        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');

          return (
            <button
              key={item.path}
              onClick={() => {
                navigate(item.path);
                onClose();
              }}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-lg
                transition-all duration-200 text-left font-medium
                ${
                  isActive
                    ? 'bg-gradient-to-r from-electric-500 to-electric-600 text-white shadow-lg shadow-electric-500/30 scale-[1.02]'
                    : 'text-gray-400 hover:bg-navy-800/60 hover:text-white hover:translate-x-1'
                }
              `}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
