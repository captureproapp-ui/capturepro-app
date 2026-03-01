import { supabase } from '../lib/supabase';

export interface AdjustSeatsResult {
  success: boolean;
  organisation_id: string;
  old_seat_limit: number;
  new_seat_limit: number;
}

export interface SuspendOrganisationResult {
  success: boolean;
  organisation_id: string;
  suspended_at: string;
}

export interface ReactivateOrganisationResult {
  success: boolean;
  organisation_id: string;
  reactivated_at: string;
}

export interface UpdateSubscriptionResult {
  success: boolean;
  organisation_id: string;
  new_status: string;
}

export interface AuditLog {
  id: string;
  created_at: string;
  performed_by: string;
  performer_name: string;
  performer_email: string;
  action_type: string;
  target_organisation_id: string | null;
  target_organisation_name: string | null;
  target_user_id: string | null;
  changes_made: any;
  reason: string | null;
  metadata: any;
}

export async function adjustOrganisationSeats(
  organisationId: string,
  newSeatLimit: number,
  reason?: string
): Promise<AdjustSeatsResult> {
  const { data, error } = await supabase.rpc('adjust_organisation_seats', {
    org_id: organisationId,
    new_seat_limit: newSeatLimit,
    reason: reason || null,
  });

  if (error) {
    console.error('Error adjusting seats:', error);
    throw new Error(error.message);
  }

  return data;
}

export async function suspendOrganisation(
  organisationId: string,
  reason: string
): Promise<SuspendOrganisationResult> {
  if (!reason || reason.trim() === '') {
    throw new Error('Reason is required to suspend an organisation');
  }

  const { data, error } = await supabase.rpc('suspend_organisation', {
    org_id: organisationId,
    reason: reason,
  });

  if (error) {
    console.error('Error suspending organisation:', error);
    throw new Error(error.message);
  }

  return data;
}

export async function reactivateOrganisation(
  organisationId: string,
  reason?: string
): Promise<ReactivateOrganisationResult> {
  const { data, error } = await supabase.rpc('reactivate_organisation', {
    org_id: organisationId,
    reason: reason || null,
  });

  if (error) {
    console.error('Error reactivating organisation:', error);
    throw new Error(error.message);
  }

  return data;
}

export async function updateOrganisationSubscription(
  organisationId: string,
  newStatus: string,
  newPlanId?: string,
  newMrrCents?: number,
  reason?: string
): Promise<UpdateSubscriptionResult> {
  const { data, error } = await supabase.rpc('update_organisation_subscription', {
    org_id: organisationId,
    new_status: newStatus,
    new_plan_id: newPlanId || null,
    new_mrr_cents: newMrrCents || null,
    reason: reason || null,
  });

  if (error) {
    console.error('Error updating subscription:', error);
    throw new Error(error.message);
  }

  return data;
}

export async function getAuditLogs(
  organisationId?: string,
  limit: number = 50
): Promise<AuditLog[]> {
  let query = supabase
    .from('super_admin_audit_logs')
    .select(`
      *,
      performer:profiles!super_admin_audit_logs_performed_by_fkey(full_name, email),
      target_org:organisations!super_admin_audit_logs_target_organisation_id_fkey(name)
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (organisationId) {
    query = query.eq('target_organisation_id', organisationId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching audit logs:', error);
    return [];
  }

  return (data || []).map(log => ({
    id: log.id,
    created_at: log.created_at,
    performed_by: log.performed_by,
    performer_name: log.performer?.full_name || 'Unknown',
    performer_email: log.performer?.email || 'Unknown',
    action_type: log.action_type,
    target_organisation_id: log.target_organisation_id,
    target_organisation_name: log.target_org?.name || null,
    target_user_id: log.target_user_id,
    changes_made: log.changes_made,
    reason: log.reason,
    metadata: log.metadata,
  }));
}

export async function getOrganisationUsers(organisationId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('organisation_id', organisationId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching organisation users:', error);
    return [];
  }

  return data || [];
}

export async function getOrganisationProperties(organisationId: string) {
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('organisation_id', organisationId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching organisation properties:', error);
    return [];
  }

  return data || [];
}
