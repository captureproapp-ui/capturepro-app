import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Card } from '../ui/Card';
import { Spinner } from '../ui/Spinner';
import { Alert } from '../ui/Alert';
import { Shield, User, Calendar } from 'lucide-react';

interface AuditLog {
  id: string;
  admin_user_id: string | null;
  target_user_id: string | null;
  action_type: string;
  old_values: {
    is_active?: boolean;
    role?: string;
    deactivated_at?: string | null;
  };
  new_values: {
    is_active?: boolean;
    role?: string;
    deactivated_at?: string | null;
  };
  created_at: string;
  admin_profile?: {
    full_name: string;
    email: string;
  };
  target_profile?: {
    full_name: string;
    email: string;
  };
}

export function AuditLogViewer() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAuditLogs();
  }, []);

  async function loadAuditLogs() {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('audit_logs')
        .select(`
          *,
          admin_profile:profiles!audit_logs_admin_user_id_fkey(full_name, email),
          target_profile:profiles!audit_logs_target_user_id_fkey(full_name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (fetchError) throw fetchError;

      setLogs(data || []);
    } catch (err) {
      console.error('Error loading audit logs:', err);
      setError(err instanceof Error ? err.message : 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }

  function getActionBadgeColor(actionType: string) {
    switch (actionType) {
      case 'user_deactivated':
        return 'bg-red-100 text-red-800';
      case 'user_reactivated':
        return 'bg-green-100 text-green-800';
      case 'role_changed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  function formatActionType(actionType: string) {
    return actionType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  function getActionDescription(log: AuditLog) {
    const adminName = log.admin_profile?.full_name || 'Unknown admin';
    const targetName = log.target_profile?.full_name || 'Unknown user';

    switch (log.action_type) {
      case 'user_deactivated':
        return `${adminName} deactivated ${targetName}`;
      case 'user_reactivated':
        return `${adminName} reactivated ${targetName}`;
      case 'role_changed':
        return `${adminName} changed ${targetName}'s role from ${log.old_values.role} to ${log.new_values.role}`;
      default:
        return `${adminName} updated ${targetName}'s profile`;
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="error" title="Error">
        {error}
      </Alert>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <Shield className="w-5 h-5 text-gray-600" />
        <h2 className="text-lg font-semibold text-gray-900">Audit Log</h2>
        <span className="text-sm text-gray-500">
          (Last 50 actions)
        </span>
      </div>

      {logs.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No audit logs yet
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <div
              key={log.id}
              className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionBadgeColor(
                        log.action_type
                      )}`}
                    >
                      {formatActionType(log.action_type)}
                    </span>
                  </div>

                  <p className="text-sm text-gray-900 mb-2">
                    {getActionDescription(log)}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      <span>Admin: {log.admin_profile?.email || 'Unknown'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
