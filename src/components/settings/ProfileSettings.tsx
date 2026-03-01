import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  User,
  Mail,
  Building2,
  Shield,
  Calendar,
  Loader2,
  Save,
  X,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { OrganisationSettings } from './OrganisationSettings';

type Tab = 'profile' | 'organisation';

export function ProfileSettings() {
  const { profile, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [showEmailWarning, setShowEmailWarning] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name);
      setEmail(profile.email);
    }
  }, [profile]);

  useEffect(() => {
    if (profile) {
      const nameChanged = fullName !== profile.full_name;
      const emailChanged = email !== profile.email;
      setHasChanges(nameChanged || emailChanged);
    }
  }, [fullName, email, profile]);

  const handleCancel = () => {
    if (profile) {
      setFullName(profile.full_name);
      setEmail(profile.email);
      setError('');
      setSuccess('');
      setShowEmailWarning(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!profile) return;

    const emailChanged = email !== profile.email;

    if (emailChanged && !showEmailWarning) {
      setShowEmailWarning(true);
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (fullName !== profile.full_name) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ full_name: fullName })
          .eq('id', profile.id);

        if (profileError) throw profileError;
      }

      if (emailChanged) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: email,
        });

        if (emailError) throw emailError;

        setSuccess(
          'Profile updated! A confirmation email has been sent to your new email address. Please verify it to complete the change.'
        );
      } else {
        setSuccess('Profile updated successfully!');
      }

      await refreshProfile();
      setShowEmailWarning(false);

      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-electric-500"></div>
      </div>
    );
  }

  const showOrgTab = profile.role === 'admin' || profile.role === 'owner';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Settings</h2>
        <p className="text-gray-600 mt-1.5">Manage your account and organisation preferences</p>
      </div>

      {showOrgTab && (
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex gap-6">
            <button
              onClick={() => setActiveTab('profile')}
              className={`py-3 px-1 border-b-2 font-semibold text-sm transition-colors ${
                activeTab === 'profile'
                  ? 'border-electric-500 text-electric-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Profile
              </div>
            </button>
            <button
              onClick={() => setActiveTab('organisation')}
              className={`py-3 px-1 border-b-2 font-semibold text-sm transition-colors ${
                activeTab === 'organisation'
                  ? 'border-electric-500 text-electric-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Organisation
              </div>
            </button>
          </nav>
        </div>
      )}

      {activeTab === 'organisation' && showOrgTab ? (
        <OrganisationSettings />
      ) : (
        <div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200/60 shadow-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200/60 bg-gradient-to-r from-gray-50 to-white">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <User className="w-5 h-5" />
                Profile Information
              </h3>
              <p className="text-sm text-gray-600 mt-1">Update your personal details</p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 shadow-sm">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-red-800">Error</p>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                  </div>
                </div>
              )}

              {success && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3 shadow-sm">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-green-800">Success</p>
                    <p className="text-sm text-green-700 mt-1">{success}</p>
                  </div>
                </div>
              )}

              {showEmailWarning && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl shadow-sm">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-yellow-800">
                        Important: Email Change Confirmation Required
                      </p>
                      <ul className="text-sm text-yellow-700 mt-2 space-y-1 list-disc list-inside">
                        <li>A confirmation email will be sent to your new email address</li>
                        <li>You must verify the new email before the change takes effect</li>
                        <li>Your current email will remain active until verification</li>
                      </ul>
                      <p className="text-sm text-yellow-800 font-semibold mt-3">
                        Are you sure you want to proceed?
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  maxLength={100}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-electric-500 focus:border-electric-500 transition-all shadow-sm"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setShowEmailWarning(false);
                  }}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-electric-500 focus:border-electric-500 transition-all shadow-sm"
                  placeholder="Enter your email address"
                />
                {email !== profile.email && (
                  <p className="text-xs text-yellow-700 mt-2 flex items-center gap-1.5 font-medium">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Email change requires verification
                  </p>
                )}
              </div>

              {hasChanges && (
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={loading}
                    className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold active:scale-95"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-electric-500 to-electric-600 text-white rounded-xl hover:from-electric-600 hover:to-electric-700 transition-all shadow-lg shadow-electric-500/30 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2 font-semibold active:scale-95"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200/60 p-6 shadow-lg">
            <h3 className="text-lg font-bold text-gray-900 mb-5">Account Details</h3>
            <div className="space-y-5">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-600 mb-2">
                  <Shield className="w-4 h-4" />
                  <span>Role</span>
                </div>
                <p className="text-gray-900 font-medium capitalize ml-6">{profile.role}</p>
              </div>

              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-600 mb-2">
                  <Building2 className="w-4 h-4" />
                  <span>Organization</span>
                </div>
                <p className="text-gray-900 font-medium ml-6">
                  {profile.organisation_id ? 'Member' : 'No organization'}
                </p>
              </div>

              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-600 mb-2">
                  <Calendar className="w-4 h-4" />
                  <span>Member Since</span>
                </div>
                <p className="text-gray-900 font-medium ml-6">
                  {new Date(profile.created_at).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>

              {profile.super_admin && (
                <div className="pt-4 border-t border-gray-200">
                  <div className="px-4 py-3 bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-xl shadow-sm">
                    <p className="text-sm font-bold text-purple-900 flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Super Admin
                    </p>
                    <p className="text-xs text-purple-700 mt-1.5 font-medium">
                      You have platform-wide administrative access
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-electric-50 border border-blue-200/60 rounded-xl p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-blue-700 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-900">Email Security</p>
                <p className="text-xs text-blue-800 mt-1.5 leading-relaxed">
                  All email changes require verification to ensure account security. You will
                  continue to use your current email until the new one is verified.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
        </div>
      )}
    </div>
  );
}
