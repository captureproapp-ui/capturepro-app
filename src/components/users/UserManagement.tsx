import { useEffect, useState } from 'react';
import { supabase, Profile, Organisation, UserRole } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  Users,
  UserPlus,
  UserX,
  UserCheck,
  AlertCircle,
  Shield,
  Loader2,
  X,
  Clock,
  Trash2,
  Link2,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { Toast } from '../ui/Toast';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { AuditLogViewer } from '../admin/AuditLogViewer';
import { DropdownMenu, DropdownMenuItem } from '../ui/DropdownMenu';

type ExtendedProfile = Profile & {
  deactivatedByName?: string;
};

interface ToastState {
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ConfirmState {
  title: string;
  message: string;
  onConfirm: () => void;
  variant: 'danger' | 'warning' | 'info';
}

export function UserManagement() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<ExtendedProfile[]>([]);
  const [organisation, setOrganisation] = useState<Organisation | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddUser, setShowAddUser] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  useEffect(() => {
    fetchData();
  }, [profile]);

  const fetchData = async () => {
    if (!profile?.organisation_id) return;

    const [usersResult, orgResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('*')
        .eq('organisation_id', profile.organisation_id)
        .order('full_name'),
      supabase
        .from('organisations')
        .select('*')
        .eq('id', profile.organisation_id)
        .maybeSingle(),
    ]);

    if (usersResult.error) {
      console.error('Error fetching users:', usersResult.error);
    } else {
      const usersWithDeactivatorNames = await Promise.all(
        usersResult.data.map(async (user) => {
          if (user.deactivated_by) {
            const { data: deactivator } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', user.deactivated_by)
              .maybeSingle();
            return { ...user, deactivatedByName: deactivator?.full_name };
          }
          return user;
        })
      );
      setUsers(usersWithDeactivatorNames);
    }

    if (orgResult.error) {
      console.error('Error fetching organisation:', orgResult.error);
    } else if (orgResult.data) {
      setOrganisation(orgResult.data);
    }

    setLoading(false);
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    if (currentStatus) {
      setConfirm({
        title: 'Disable User Account',
        message: `Are you sure you want to disable ${user.full_name}'s account? They will lose access to the system immediately and be moved to the archived users section.`,
        variant: 'danger',
        onConfirm: () => performToggleUserStatus(userId, currentStatus),
      });
    } else {
      if (seatsAvailable <= 0) {
        setToast({
          message: 'Cannot reactivate user: seat limit reached. Please upgrade your plan or disable another user first.',
          type: 'error',
        });
        return;
      }

      const actionText = user.invitation_status === 'expired'
        ? `reactivate ${user.full_name} and generate a new 7-day invitation link`
        : user.invitation_status === 'pending'
        ? `reactivate ${user.full_name} and extend their invitation by 7 days`
        : `reactivate ${user.full_name}'s account`;

      setConfirm({
        title: 'Reactivate User Account',
        message: `Are you sure you want to ${actionText}? This will consume 1 seat. You will have ${seatsAvailable - 1} seats remaining.`,
        variant: 'info',
        onConfirm: () => performToggleUserStatus(userId, currentStatus),
      });
    }
  };

  const performToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    setConfirm(null);
    setActionLoading(userId);

    try {
      const user = users.find(u => u.id === userId);
      const updates: Partial<Profile> = {
        is_active: !currentStatus,
      };

      if (!currentStatus) {
        updates.deactivated_at = null;
        updates.deactivated_by = null;
        if (user?.invitation_status === 'expired' || user?.invitation_status === 'pending') {
          updates.invitation_status = 'pending';
          updates.invitation_expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        }
      } else {
        updates.deactivated_at = new Date().toISOString();
        updates.deactivated_by = profile?.id || null;
        if (user?.invitation_status === 'pending') {
          updates.invitation_status = 'expired';
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);

      if (error) {
        if (error.message.includes('seat limit')) {
          setToast({
            message: 'Cannot reactivate user: seat limit reached. Please upgrade your plan or deactivate another user first.',
            type: 'error',
          });
        } else if (error.message.includes('last admin')) {
          setToast({
            message: 'Cannot disable the last admin. Please promote another user to admin first.',
            type: 'error',
          });
        } else if (error.message.includes('permission')) {
          setToast({
            message: 'You do not have permission to perform this action.',
            type: 'error',
          });
        } else {
          setToast({
            message: `Error: ${error.message}`,
            type: 'error',
          });
        }
      } else {
        const user = users.find(u => u.id === userId);
        setToast({
          message: currentStatus
            ? `${user?.full_name} has been disabled successfully.`
            : `${user?.full_name} has been reactivated successfully.`,
          type: 'success',
        });
        await fetchData();
      }
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : 'An unexpected error occurred',
        type: 'error',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleChangeRole = async (userId: string, newRole: UserRole) => {
    setActionLoading(userId);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) {
        if (error.message.includes('last admin')) {
          setToast({
            message: 'Cannot change role: this is the last admin. Please promote another user to admin first.',
            type: 'error',
          });
        } else if (error.message.includes('permission')) {
          setToast({
            message: 'You do not have permission to change user roles.',
            type: 'error',
          });
        } else {
          setToast({
            message: `Error: ${error.message}`,
            type: 'error',
          });
        }
      } else {
        const user = users.find(u => u.id === userId);
        setToast({
          message: `${user?.full_name}'s role has been updated to ${newRole}.`,
          type: 'success',
        });
        await fetchData();
      }
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : 'An unexpected error occurred',
        type: 'error',
      });
    } finally {
      setActionLoading(null);
    }
  };


  const handleDeleteInvitedUser = async (userId: string) => {
    const userToDelete = users.find((u) => u.id === userId);
    if (!userToDelete) return;

    setConfirm({
      title: 'Delete Invitation',
      message: `Are you sure you want to delete the invitation for ${userToDelete.full_name}? This action cannot be undone.`,
      variant: 'danger',
      onConfirm: () => performDeleteInvitedUser(userId),
    });
  };

  const performDeleteInvitedUser = async (userId: string) => {
    setConfirm(null);
    setActionLoading(userId);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-invited-user`;
      const headers = {
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userId,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete user');
      }

      setToast({
        message: 'User invitation deleted successfully.',
        type: 'success',
      });
      await fetchData();
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : 'Failed to delete invitation',
        type: 'error',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReinviteExpired = async (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    setConfirm({
      title: 'Extend Invitation',
      message: `Are you sure you want to extend the invitation for ${user.full_name} by 7 days?`,
      variant: 'info',
      onConfirm: () => performReinviteExpired(userId),
    });
  };

  const performReinviteExpired = async (userId: string) => {
    setConfirm(null);
    setActionLoading(userId);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          invitation_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq('id', userId);

      if (error) {
        setToast({ message: `Error: ${error.message}`, type: 'error' });
      } else {
        const user = users.find(u => u.id === userId);
        setToast({
          message: `Invitation for ${user?.full_name} has been extended by 7 days.`,
          type: 'success',
        });
        await fetchData();
      }
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : 'An unexpected error occurred',
        type: 'error',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const isExpiredPending = (u: ExtendedProfile) =>
    u.invitation_status === 'pending' &&
    u.is_active === true &&
    u.invitation_expires_at &&
    new Date(u.invitation_expires_at) < new Date();

  const activeUsers = users.filter((u) => u.is_active === true && !isExpiredPending(u));
  const archivedUsers = users.filter((u) => u.is_active === false || isExpiredPending(u));
  const seatsUsed = activeUsers.length;
  const seatsAvailable = organisation ? organisation.seat_limit - seatsUsed : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-electric-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
          <p className="text-gray-600 mt-1">Manage users and access for your organisation</p>
        </div>
        <button
          onClick={() => setShowAddUser(true)}
          disabled={seatsAvailable <= 0}
          className="flex items-center gap-2 px-4 py-2 bg-electric-500 text-white rounded-lg hover:bg-electric-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          title={seatsAvailable <= 0 ? "Seat limit reached - upgrade plan to add more users" : ""}
        >
          <UserPlus className="w-5 h-5" />
          Create User
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Seat Usage</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {seatsUsed} / {organisation?.seat_limit || 0}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Available Seats</p>
            <p
              className={`text-2xl font-bold mt-1 ${
                seatsAvailable > 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {seatsAvailable}
            </p>
          </div>
        </div>
        {seatsAvailable <= 0 && (
          <div className="mt-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-800">
              <p className="font-medium">Seat limit reached</p>
              <p className="mt-1">
                You must deactivate a user before inviting new users, or contact support to
                increase your seat limit.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Active Users ({activeUsers.length})
          </h3>
        </div>
        <div className="divide-y divide-gray-200">
          {activeUsers.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>No active users</p>
            </div>
          ) : (
            activeUsers.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                currentUserId={profile?.id || ''}
                isLoading={actionLoading === user.id}
                onToggleStatus={handleToggleUserStatus}
                onChangeRole={handleChangeRole}
                onDeleteInvitedUser={handleDeleteInvitedUser}
                onReinviteExpired={handleReinviteExpired}
              />
            ))
          )}
        </div>
      </div>

      {archivedUsers.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <UserX className="w-5 h-5" />
              Archived Users ({archivedUsers.length})
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Disabled users who can be reinstated at any time
            </p>
          </div>
          <div className="divide-y divide-gray-200">
            {archivedUsers.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                currentUserId={profile?.id || ''}
                isLoading={actionLoading === user.id}
                onToggleStatus={handleToggleUserStatus}
                onChangeRole={handleChangeRole}
                onDeleteInvitedUser={handleDeleteInvitedUser}
                onReinviteExpired={handleReinviteExpired}
              />
            ))}
          </div>
        </div>
      )}

      {profile?.role === 'admin' && <AuditLogViewer />}

      {showAddUser && (
        <AddUserModal
          organisationId={profile?.organisation_id || ''}
          onClose={() => setShowAddUser(false)}
          onSuccess={() => {
            setShowAddUser(false);
            fetchData();
          }}
        />
      )}

      {toast && (
        <div className="fixed bottom-4 right-4 z-50">
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        </div>
      )}

      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          message={confirm.message}
          variant={confirm.variant}
          confirmLabel="Confirm"
          cancelLabel="Cancel"
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
          loading={actionLoading !== null}
        />
      )}
    </div>
  );
}

type UserRowProps = {
  user: ExtendedProfile;
  currentUserId: string;
  isLoading: boolean;
  onToggleStatus: (userId: string, currentStatus: boolean) => void;
  onChangeRole: (userId: string, newRole: UserRole) => void;
  onDeleteInvitedUser: (userId: string) => void;
  onReinviteExpired: (userId: string) => void;
};

function UserRow({ user, currentUserId, isLoading, onToggleStatus, onChangeRole, onDeleteInvitedUser, onReinviteExpired }: UserRowProps) {
  const [copied, setCopied] = useState(false);
  const isCurrentUser = user.id === currentUserId;
  const isPending = user.invitation_status === 'pending';

  const getExpiryInfo = () => {
    if (!user.invitation_expires_at) return null;

    const expiryDate = new Date(user.invitation_expires_at);
    const now = new Date();
    const hoursUntilExpiry = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    const daysUntilExpiry = hoursUntilExpiry / 24;

    if (hoursUntilExpiry < 0) {
      return { text: 'Expired', isExpiringSoon: false, isExpired: true };
    } else if (hoursUntilExpiry < 24) {
      return { text: `Expires in ${Math.floor(hoursUntilExpiry)} hours`, isExpiringSoon: true, isExpired: false };
    } else if (daysUntilExpiry < 2) {
      return { text: 'Expires tomorrow', isExpiringSoon: true, isExpired: false };
    } else {
      return { text: `Expires in ${Math.floor(daysUntilExpiry)} days`, isExpiringSoon: false, isExpired: false };
    }
  };

  const expiryInfo = isPending && user.is_active ? getExpiryInfo() : null;

  const handleCopyInvitationLink = () => {
    const inviteUrl = `${window.location.origin}/accept-invite?token=${user.id}`;
    navigator.clipboard.writeText(inviteUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-gray-900">
              {user.full_name}
              {isCurrentUser && <span className="text-gray-500 text-sm ml-2">(You)</span>}
            </h4>
            {user.role === 'admin' && (
              <Shield className="w-4 h-4 text-electric-500" title="Admin" />
            )}
            {isPending && user.is_active === true && !expiryInfo?.isExpired && (
              <span className={`px-2 py-0.5 text-xs font-medium rounded flex items-center gap-1 ${
                expiryInfo?.isExpiringSoon
                  ? 'bg-orange-100 text-orange-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {expiryInfo?.isExpiringSoon ? (
                  <AlertTriangle className="w-3 h-3" />
                ) : (
                  <Clock className="w-3 h-3" />
                )}
                Setup Pending
                {expiryInfo?.isExpiringSoon && ` - ${expiryInfo.text}`}
              </span>
            )}
            {(expiryInfo?.isExpired || (user.is_active === false && user.invitation_status === 'expired')) && (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Invitation Expired
              </span>
            )}
            {user.is_active === false && user.deactivated_at && (
              <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs font-medium rounded flex items-center gap-1">
                <UserX className="w-3 h-3" />
                Disabled by Admin
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 mt-1">{user.email}</p>
          {isPending && user.is_active && !expiryInfo?.isExpired && user.invited_at && (
            <p className="text-xs text-gray-500 mt-1">
              Invited {new Date(user.invited_at).toLocaleDateString()}
              {expiryInfo && (
                <span className={expiryInfo.isExpiringSoon ? 'text-orange-600 font-medium ml-1' : 'ml-1'}>
                  • {expiryInfo.text}
                </span>
              )}
            </p>
          )}
          {expiryInfo?.isExpired && user.invited_at && (
            <p className="text-xs text-gray-500 mt-1">
              Invited {new Date(user.invited_at).toLocaleDateString()} • Expired {user.invitation_expires_at && new Date(user.invitation_expires_at).toLocaleDateString()}
            </p>
          )}
          {user.is_active === false && user.invitation_status === 'expired' && user.deactivated_at && (
            <p className="text-xs text-gray-500 mt-1">
              Archived {new Date(user.deactivated_at).toLocaleDateString()} - Invitation never completed
            </p>
          )}
          {user.is_active === false && user.deactivated_at && (
            <p className="text-xs text-gray-500 mt-1">
              Archived {new Date(user.deactivated_at).toLocaleDateString()}
              {user.deactivatedByName && ` by ${user.deactivatedByName}`}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 ml-4">
          {user.is_active === true && !isCurrentUser && !isPending && (
            <select
              value={user.role}
              onChange={(e) => onChangeRole(user.id, e.target.value as UserRole)}
              disabled={isLoading}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="installer">Installer</option>
              <option value="admin">Admin</option>
            </select>
          )}

          {!isCurrentUser && (() => {
            const menuItems: DropdownMenuItem[] = [];

            if (user.is_active === false) {
              menuItems.push({
                label: user.invitation_status === 'expired' ? 'Reinvite User' : 'Reactivate User',
                icon: isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />,
                onClick: () => onToggleStatus(user.id, false),
                disabled: isLoading,
                variant: 'success',
              });
            }

            if (isPending && expiryInfo?.isExpired) {
              menuItems.push(
                {
                  label: 'Reinvite User',
                  icon: isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />,
                  onClick: () => onReinviteExpired(user.id),
                  disabled: isLoading,
                  variant: 'success',
                },
                {
                  label: 'Delete Invitation',
                  icon: isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />,
                  onClick: () => onDeleteInvitedUser(user.id),
                  disabled: isLoading,
                  variant: 'danger',
                }
              );
            }

            if (isPending && user.is_active === true && !expiryInfo?.isExpired) {
              menuItems.push(
                {
                  label: copied ? 'Copied!' : 'Copy Invitation Link',
                  icon: copied ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />,
                  onClick: handleCopyInvitationLink,
                  variant: 'success',
                },
                {
                  label: 'Delete Invitation',
                  icon: isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />,
                  onClick: () => onDeleteInvitedUser(user.id),
                  disabled: isLoading,
                  variant: 'danger',
                }
              );
            }

            if (user.is_active === true && !isPending) {
              menuItems.push({
                label: 'Disable User',
                icon: isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserX className="w-4 h-4" />,
                onClick: () => onToggleStatus(user.id, user.is_active),
                disabled: isLoading,
                variant: 'danger',
              });
            }

            return menuItems.length > 0 ? (
              <DropdownMenu items={menuItems} align="right" />
            ) : null;
          })()}
        </div>
      </div>
    </div>
  );
}

type AddUserModalProps = {
  organisationId: string;
  onClose: () => void;
  onSuccess: () => void;
};

function AddUserModal({ organisationId, onClose, onSuccess }: AddUserModalProps) {
  const { profile } = useAuth();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('installer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [invitationUrl, setInvitationUrl] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [seatsRemaining, setSeatsRemaining] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-user`;
      const headers = {
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email,
          fullName,
          role,
          organisationId,
          invitedBy: profile?.id,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to create user');
      }

      setInvitationUrl(result.invitationUrl);
      setSeatsRemaining(result.seatsRemaining);
      setShowSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(invitationUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleClose = () => {
    if (showSuccess) {
      onSuccess();
    } else {
      onClose();
    }
  };

  if (showSuccess) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-md w-full">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">User Created Successfully</h3>
            <button
              onClick={handleClose}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800 font-medium">
                User created! {seatsRemaining !== null && `You have ${seatsRemaining} seats remaining.`}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-700 font-medium mb-2">
                Share this secure link to complete setup:
              </p>
              <p className="text-xs text-gray-600 mb-3">
                This link expires in 7 days and can only be used once.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={invitationUrl}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono"
                />
                <button
                  onClick={handleCopyLink}
                  className="px-4 py-2 bg-electric-500 text-white rounded-lg hover:bg-electric-600 transition-colors flex items-center gap-2"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Link2 className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="pt-4">
              <button
                onClick={handleClose}
                className="w-full px-4 py-2 bg-electric-500 text-white rounded-lg hover:bg-electric-600 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Create New User</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-electric-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-electric-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              A secure link will be generated that expires in 7 days
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-electric-500 focus:border-transparent"
            >
              <option value="installer">Installer</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-electric-500 text-white rounded-lg hover:bg-electric-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating User...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Create User
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
