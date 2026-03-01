import { useState, useEffect } from 'react';
import { Archive, Calendar, Users, Building2, HardDrive } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

interface ArchivedOrganisation {
  id: string;
  original_organisation_id: string;
  organisation_data: any;
  archived_at: string;
  archived_by: string;
  archived_reason: string;
  auto_delete_at: string;
  stripe_subscription_status: string;
  can_be_restored: boolean;
  user_count: number;
  property_count: number;
  total_storage_bytes: number;
  created_at: string;
}

export function ArchivedOrganisationsView() {
  const [archivedOrgs, setArchivedOrgs] = useState<ArchivedOrganisation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadArchivedOrganisations();
  }, []);

  const loadArchivedOrganisations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('archived_organisations')
        .select('*')
        .order('archived_at', { ascending: false });

      if (error) throw error;
      setArchivedOrgs(data || []);
    } catch (error) {
      console.error('Error loading archived organisations:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const getDaysUntilDeletion = (deleteDate: string) => {
    const now = new Date();
    const deleteAt = new Date(deleteDate);
    const diffTime = deleteAt.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading archived organisations...</p>
        </div>
      </div>
    );
  }

  if (archivedOrgs.length === 0) {
    return (
      <Card>
        <div className="text-center py-12">
          <Archive className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No Archived Organisations</h3>
          <p className="text-slate-600">Archived organisations will appear here</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Archived Organisations</h2>
          <p className="text-slate-600 mt-1">{archivedOrgs.length} organisation{archivedOrgs.length !== 1 ? 's' : ''} archived</p>
        </div>
      </div>

      <div className="grid gap-4">
        {archivedOrgs.map((archived) => {
          const orgData = archived.organisation_data.organisation;
          const daysUntilDeletion = getDaysUntilDeletion(archived.auto_delete_at);

          return (
            <Card key={archived.id} className="hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-slate-900">{orgData.name}</h3>
                      <Badge variant="error">Archived</Badge>
                      {archived.can_be_restored ? (
                        <Badge variant="warning">Restorable</Badge>
                      ) : (
                        <Badge variant="default">Permanent</Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-600">
                      Archived on {formatDate(archived.archived_at)}
                    </p>
                    {archived.archived_reason && (
                      <p className="text-sm text-slate-700 mt-2">
                        <strong>Reason:</strong> {archived.archived_reason}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-600">Users</p>
                      <p className="font-semibold text-slate-900">{archived.user_count}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-600">Properties</p>
                      <p className="font-semibold text-slate-900">{archived.property_count}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-600">Storage</p>
                      <p className="font-semibold text-slate-900">{formatBytes(archived.total_storage_bytes)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-600">Deletion</p>
                      <p className="font-semibold text-slate-900">{daysUntilDeletion} days</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-600">Stripe Status:</span>
                    <Badge variant={archived.stripe_subscription_status === 'paused' ? 'warning' : 'default'}>
                      {archived.stripe_subscription_status}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    {archived.can_be_restored && (
                      <Button variant="primary" size="sm">
                        Restore
                      </Button>
                    )}
                    {daysUntilDeletion <= 0 && (
                      <Button variant="danger" size="sm">
                        Delete Permanently
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
