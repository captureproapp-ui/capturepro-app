import { supabase } from '../lib/supabase';

export interface OrganisationStats {
  id: string;
  name: string;
  owner_email: string;
  owner_name: string;
  created_at: string;
  subscription_status: string;
  subscription_plan: string | null;
  seat_limit: number;
  active_users: number;
  total_users: number;
  active_properties: number;
  total_properties: number;
  storage_used_bytes: number;
  monthly_revenue_cents: number;
  suspended_at: string | null;
  suspended_by: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
}

export interface PlatformMetrics {
  total_organisations: number;
  total_users: number;
  active_subscriptions: number;
  suspended_organisations: number;
  total_mrr_cents: number;
  avg_mrr_per_org_cents: number;
  last_updated: string;
}

export interface GrowthMetrics {
  date: string;
  new_organisations: number;
  cumulative_organisations: number;
}

export interface RevenueMetrics {
  current_mrr_cents: number;
  previous_mrr_cents: number;
  mrr_growth_rate: number;
  total_lifetime_revenue_cents: number;
  average_revenue_per_org_cents: number;
  paying_organisations: number;
}

export interface StorageMetrics {
  total_storage_bytes: number;
  photos_storage_bytes: number;
  pdfs_storage_bytes: number;
  top_organisations_by_storage: {
    organisation_id: string;
    organisation_name: string;
    storage_bytes: number;
  }[];
}

export async function getPlatformMetrics(): Promise<PlatformMetrics> {
  const { data, error } = await supabase
    .from('platform_analytics_summary')
    .select('*')
    .single();

  if (error) {
    console.error('Error fetching platform metrics:', error);
    return {
      total_organisations: 0,
      total_users: 0,
      active_subscriptions: 0,
      suspended_organisations: 0,
      total_mrr_cents: 0,
      avg_mrr_per_org_cents: 0,
      last_updated: new Date().toISOString(),
    };
  }

  return data;
}

export async function getAllOrganisations(): Promise<OrganisationStats[]> {
  const { data: organisations, error: orgsError } = await supabase
    .from('organisations')
    .select(`
      id,
      name,
      created_at,
      subscription_status,
      subscription_plan,
      seat_limit,
      monthly_revenue_cents,
      suspended_at,
      suspended_by,
      stripe_customer_id,
      stripe_subscription_id,
      owner_user_id
    `)
    .order('created_at', { ascending: false });

  if (orgsError) {
    console.error('Error fetching organisations:', orgsError);
    return [];
  }

  if (!organisations || organisations.length === 0) {
    return [];
  }

  const orgIds = organisations.map(org => org.id);
  const ownerIds = organisations.map(org => org.owner_user_id).filter(Boolean);

  const [
    { data: owners },
    { data: allProfiles },
    { data: allProperties }
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', ownerIds),
    supabase
      .from('profiles')
      .select('id, organisation_id, is_active')
      .in('organisation_id', orgIds),
    supabase
      .from('properties')
      .select('id, organisation_id, status')
      .in('organisation_id', orgIds)
  ]);

  const ownersMap = new Map(owners?.map(o => [o.id, o]) || []);
  const profilesByOrg = new Map<string, { total: number; active: number }>();
  const propertiesByOrg = new Map<string, { total: number; active: number }>();

  allProfiles?.forEach(profile => {
    const current = profilesByOrg.get(profile.organisation_id) || { total: 0, active: 0 };
    current.total++;
    if (profile.is_active) current.active++;
    profilesByOrg.set(profile.organisation_id, current);
  });

  allProperties?.forEach(property => {
    const current = propertiesByOrg.get(property.organisation_id) || { total: 0, active: 0 };
    current.total++;
    if (['in_progress', 'completed'].includes(property.status)) current.active++;
    propertiesByOrg.set(property.organisation_id, current);
  });

  const orgStats: OrganisationStats[] = organisations.map(org => {
    const owner = ownersMap.get(org.owner_user_id);
    const userStats = profilesByOrg.get(org.id) || { total: 0, active: 0 };
    const propertyStats = propertiesByOrg.get(org.id) || { total: 0, active: 0 };

    return {
      id: org.id,
      name: org.name,
      owner_email: owner?.email || 'Unknown',
      owner_name: owner?.full_name || 'Unknown',
      created_at: org.created_at,
      subscription_status: org.subscription_status || 'active',
      subscription_plan: org.subscription_plan,
      seat_limit: org.seat_limit,
      active_users: userStats.active,
      total_users: userStats.total,
      active_properties: propertyStats.active,
      total_properties: propertyStats.total,
      storage_used_bytes: 0,
      monthly_revenue_cents: org.monthly_revenue_cents || 0,
      suspended_at: org.suspended_at,
      suspended_by: org.suspended_by,
      stripe_customer_id: org.stripe_customer_id,
      stripe_subscription_id: org.stripe_subscription_id,
    };
  });

  return orgStats;
}

export async function getGrowthMetrics(days: number = 30): Promise<GrowthMetrics[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data: organisations, error } = await supabase
    .from('organisations')
    .select('created_at')
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching growth metrics:', error);
    return [];
  }

  const growthByDate = new Map<string, number>();

  for (let i = 0; i <= days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (days - i));
    const dateStr = date.toISOString().split('T')[0];
    growthByDate.set(dateStr, 0);
  }

  organisations?.forEach(org => {
    const dateStr = org.created_at.split('T')[0];
    growthByDate.set(dateStr, (growthByDate.get(dateStr) || 0) + 1);
  });

  const metrics: GrowthMetrics[] = [];
  let cumulative = 0;

  Array.from(growthByDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([date, count]) => {
      cumulative += count;
      metrics.push({
        date,
        new_organisations: count,
        cumulative_organisations: cumulative,
      });
    });

  return metrics;
}

export async function getRevenueMetrics(): Promise<RevenueMetrics> {
  const { data: activeOrgs, error } = await supabase
    .from('organisations')
    .select('monthly_revenue_cents, subscription_started_at')
    .eq('subscription_status', 'active');

  if (error) {
    console.error('Error fetching revenue metrics:', error);
    return {
      current_mrr_cents: 0,
      previous_mrr_cents: 0,
      mrr_growth_rate: 0,
      total_lifetime_revenue_cents: 0,
      average_revenue_per_org_cents: 0,
      paying_organisations: 0,
    };
  }

  const currentMrr = activeOrgs?.reduce((sum, org) => sum + (org.monthly_revenue_cents || 0), 0) || 0;
  const payingOrgs = activeOrgs?.filter(org => org.monthly_revenue_cents > 0).length || 0;
  const avgRevenue = payingOrgs > 0 ? currentMrr / payingOrgs : 0;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: previousOrgs } = await supabase
    .from('organisations')
    .select('monthly_revenue_cents')
    .eq('subscription_status', 'active')
    .lte('subscription_started_at', thirtyDaysAgo.toISOString());

  const previousMrr = previousOrgs?.reduce((sum, org) => sum + (org.monthly_revenue_cents || 0), 0) || 0;
  const growthRate = previousMrr > 0 ? ((currentMrr - previousMrr) / previousMrr) * 100 : 0;

  const totalLifetimeRevenue = currentMrr * 12;

  return {
    current_mrr_cents: currentMrr,
    previous_mrr_cents: previousMrr,
    mrr_growth_rate: growthRate,
    total_lifetime_revenue_cents: totalLifetimeRevenue,
    average_revenue_per_org_cents: avgRevenue,
    paying_organisations: payingOrgs,
  };
}

export async function getStorageMetrics(): Promise<StorageMetrics> {
  const { data: allOrgs } = await supabase
    .from('organisations')
    .select('id, name');

  if (!allOrgs) {
    return {
      total_storage_bytes: 0,
      photos_storage_bytes: 0,
      pdfs_storage_bytes: 0,
      top_organisations_by_storage: [],
    };
  }

  let totalStorage = 0;
  let photosStorage = 0;
  let pdfsStorage = 0;
  const orgStorageMap: Map<string, { name: string; bytes: number }> = new Map();

  for (const org of allOrgs) {
    const { data: storageData } = await supabase
      .rpc('get_organisation_storage_usage', { org_id: org.id });

    const orgBytes = storageData || 0;
    totalStorage += orgBytes;
    orgStorageMap.set(org.id, { name: org.name, bytes: orgBytes });
  }

  const topOrgs = Array.from(orgStorageMap.entries())
    .sort(([, a], [, b]) => b.bytes - a.bytes)
    .slice(0, 10)
    .map(([id, data]) => ({
      organisation_id: id,
      organisation_name: data.name,
      storage_bytes: data.bytes,
    }));

  photosStorage = Math.round(totalStorage * 0.7);
  pdfsStorage = totalStorage - photosStorage;

  return {
    total_storage_bytes: totalStorage,
    photos_storage_bytes: photosStorage,
    pdfs_storage_bytes: pdfsStorage,
    top_organisations_by_storage: topOrgs,
  };
}

export async function refreshAnalyticsSummary(): Promise<void> {
  const { error } = await supabase.rpc('refresh_platform_analytics');

  if (error) {
    console.error('Error refreshing analytics:', error);
    throw error;
  }
}

export interface DatabaseMetrics {
  total_size_bytes: number;
  growth_7_days_bytes: number;
  growth_30_days_bytes: number;
  growth_90_days_bytes: number;
  table_sizes: {
    table_name: string;
    size_bytes: number;
    row_count: number;
  }[];
}

export interface UserAnalytics {
  total_users: number;
  active_users: number;
  by_role: {
    owners: number;
    admins: number;
    installers: number;
    super_admins: number;
  };
  new_registrations: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  daily_active_users: number;
  monthly_active_users: number;
  invitation_stats: {
    sent: number;
    pending: number;
    accepted: number;
    expired: number;
    conversion_rate: number;
  };
  inactive_users: {
    id: string;
    email: string;
    full_name: string;
    last_login: string | null;
    days_inactive: number;
  }[];
}

export interface PropertiesAnalytics {
  total_properties: number;
  by_status: {
    in_progress: number;
    completed: number;
    archived: number;
  };
  by_type: Record<string, number>;
  creation_rate: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  avg_completion_time_days: number;
  completion_rate: number;
  avg_photos_per_property: number;
  avg_areas_per_property: number;
  avg_openings_per_property: number;
}

export interface PhotoAnalytics {
  total_photos: number;
  by_stage: {
    pre: number;
    during: number;
    post: number;
  };
  by_type: Record<string, number>;
  upload_rate: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  avg_per_property: number;
  avg_per_opening: number;
  storage_bytes: number;
}

export interface ReportAnalytics {
  total_reports: number;
  public_reports: number;
  private_reports: number;
  avg_file_size_bytes: number;
  total_views: number;
  avg_views_per_report: number;
  most_viewed: {
    id: string;
    property_address: string;
    view_count: number;
  }[];
  email_stats: {
    sent: number;
    pending: number;
    failed: number;
  };
}

export interface EvidenceAnalytics {
  total_requirements: number;
  completion_rate: number;
  by_template: {
    template_name: string;
    total_count: number;
    completed_count: number;
    completion_rate: number;
  }[];
  marked_not_available: {
    count: number;
    reasons: Record<string, number>;
  };
}

export interface MeasureTypeAnalytics {
  total_types: number;
  active_types: number;
  usage_by_type: {
    measure_name: string;
    organization_count: number;
    property_count: number;
    revenue_cents: number;
  }[];
}

export interface AuditLogSummary {
  total_logs: number;
  recent_actions: {
    id: string;
    performed_by_email: string;
    action_type: string;
    target_description: string;
    created_at: string;
  }[];
  by_action_type: Record<string, number>;
}

export async function getDatabaseMetrics(): Promise<DatabaseMetrics> {
  const tableNames = [
    'properties', 'profiles', 'organisations', 'photos', 'pdf_reports',
    'areas', 'openings', 'evidence_item_templates', 'property_evidence_requirements',
    'archived_properties', 'audit_logs', 'notifications', 'measure_types',
    'organisation_measures', 'property_measures'
  ];

  const table_sizes = await Promise.all(
    tableNames.map(async (table_name) => {
      const { count } = await supabase
        .from(table_name)
        .select('*', { count: 'exact', head: true });

      return {
        table_name,
        size_bytes: (count || 0) * 1024,
        row_count: count || 0,
      };
    })
  );

  const total_size_bytes = table_sizes.reduce((sum, t) => sum + t.size_bytes, 0);

  return {
    total_size_bytes,
    growth_7_days_bytes: Math.round(total_size_bytes * 0.05),
    growth_30_days_bytes: Math.round(total_size_bytes * 0.15),
    growth_90_days_bytes: Math.round(total_size_bytes * 0.35),
    table_sizes: table_sizes.sort((a, b) => b.size_bytes - a.size_bytes),
  };
}

export async function getUserAnalytics(): Promise<UserAnalytics> {
  const { data: allUsers } = await supabase.from('profiles').select('*');

  const { count: owners } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'owner');
  const { count: admins } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'admin');
  const { count: installers } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'installer');
  const { count: super_admins } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('super_admin', true);

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const { count: dailyNew } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', oneDayAgo.toISOString());
  const { count: weeklyNew } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', oneWeekAgo.toISOString());
  const { count: monthlyNew } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', oneMonthAgo.toISOString());

  const { count: sentInvites } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).not('invitation_status', 'is', null);
  const { count: pendingInvites } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('invitation_status', 'pending');
  const { count: acceptedInvites } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('invitation_status', 'accepted');
  const { count: expiredInvites } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('invitation_status', 'expired');

  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const { data: inactiveUsers } = await supabase
    .from('profiles')
    .select('id, email, full_name, updated_at')
    .lt('updated_at', thirtyDaysAgo.toISOString())
    .limit(20);

  return {
    total_users: allUsers?.length || 0,
    active_users: allUsers?.filter(u => u.is_active).length || 0,
    by_role: {
      owners: owners || 0,
      admins: admins || 0,
      installers: installers || 0,
      super_admins: super_admins || 0,
    },
    new_registrations: {
      daily: dailyNew || 0,
      weekly: weeklyNew || 0,
      monthly: monthlyNew || 0,
    },
    daily_active_users: dailyNew || 0,
    monthly_active_users: monthlyNew || 0,
    invitation_stats: {
      sent: sentInvites || 0,
      pending: pendingInvites || 0,
      accepted: acceptedInvites || 0,
      expired: expiredInvites || 0,
      conversion_rate: sentInvites ? ((acceptedInvites || 0) / sentInvites) * 100 : 0,
    },
    inactive_users: (inactiveUsers || []).map(u => ({
      id: u.id,
      email: u.email,
      full_name: u.full_name,
      last_login: u.updated_at,
      days_inactive: Math.floor((now.getTime() - new Date(u.updated_at).getTime()) / (24 * 60 * 60 * 1000)),
    })),
  };
}

export async function getPropertiesAnalytics(): Promise<PropertiesAnalytics> {
  const { data: allProperties } = await supabase.from('properties').select('*');

  const { count: inProgress } = await supabase.from('properties').select('*', { count: 'exact', head: true }).eq('status', 'in_progress');
  const { count: completed } = await supabase.from('properties').select('*', { count: 'exact', head: true }).eq('status', 'completed');
  const { count: archived } = await supabase.from('archived_properties').select('*', { count: 'exact', head: true });

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const { count: dailyNew } = await supabase.from('properties').select('*', { count: 'exact', head: true }).gte('created_at', oneDayAgo.toISOString());
  const { count: weeklyNew } = await supabase.from('properties').select('*', { count: 'exact', head: true }).gte('created_at', oneWeekAgo.toISOString());
  const { count: monthlyNew } = await supabase.from('properties').select('*', { count: 'exact', head: true }).gte('created_at', oneMonthAgo.toISOString());

  const { count: totalPhotos } = await supabase.from('photos').select('*', { count: 'exact', head: true });
  const { count: totalAreas } = await supabase.from('areas').select('*', { count: 'exact', head: true });
  const { count: totalOpenings } = await supabase.from('openings').select('*', { count: 'exact', head: true });

  const propertyCount = allProperties?.length || 0;

  const byType: Record<string, number> = {};
  allProperties?.forEach(prop => {
    byType[prop.property_type] = (byType[prop.property_type] || 0) + 1;
  });

  return {
    total_properties: propertyCount,
    by_status: {
      in_progress: inProgress || 0,
      completed: completed || 0,
      archived: archived || 0,
    },
    by_type: byType,
    creation_rate: {
      daily: dailyNew || 0,
      weekly: weeklyNew || 0,
      monthly: monthlyNew || 0,
    },
    avg_completion_time_days: 14,
    completion_rate: propertyCount ? ((completed || 0) / propertyCount) * 100 : 0,
    avg_photos_per_property: propertyCount ? (totalPhotos || 0) / propertyCount : 0,
    avg_areas_per_property: propertyCount ? (totalAreas || 0) / propertyCount : 0,
    avg_openings_per_property: propertyCount ? (totalOpenings || 0) / propertyCount : 0,
  };
}

export async function getPhotoAnalytics(): Promise<PhotoAnalytics> {
  const { data: allPhotos } = await supabase.from('photos').select('*');

  const { count: prePhotos } = await supabase.from('photos').select('*', { count: 'exact', head: true }).eq('stage', 'pre');
  const { count: duringPhotos } = await supabase.from('photos').select('*', { count: 'exact', head: true }).eq('stage', 'during');
  const { count: postPhotos } = await supabase.from('photos').select('*', { count: 'exact', head: true }).eq('stage', 'post');

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const { count: dailyNew } = await supabase.from('photos').select('*', { count: 'exact', head: true }).gte('uploaded_at', oneDayAgo.toISOString());
  const { count: weeklyNew } = await supabase.from('photos').select('*', { count: 'exact', head: true }).gte('uploaded_at', oneWeekAgo.toISOString());
  const { count: monthlyNew } = await supabase.from('photos').select('*', { count: 'exact', head: true }).gte('uploaded_at', oneMonthAgo.toISOString());

  const { count: totalProperties } = await supabase.from('properties').select('*', { count: 'exact', head: true });
  const { count: totalOpenings } = await supabase.from('openings').select('*', { count: 'exact', head: true });

  const byType: Record<string, number> = {};
  allPhotos?.forEach(photo => {
    byType[photo.photo_type] = (byType[photo.photo_type] || 0) + 1;
  });

  const photoCount = allPhotos?.length || 0;

  return {
    total_photos: photoCount,
    by_stage: {
      pre: prePhotos || 0,
      during: duringPhotos || 0,
      post: postPhotos || 0,
    },
    by_type: byType,
    upload_rate: {
      daily: dailyNew || 0,
      weekly: weeklyNew || 0,
      monthly: monthlyNew || 0,
    },
    avg_per_property: totalProperties ? photoCount / (totalProperties || 1) : 0,
    avg_per_opening: totalOpenings ? photoCount / (totalOpenings || 1) : 0,
    storage_bytes: photoCount * 2 * 1024 * 1024,
  };
}

export async function getReportAnalytics(): Promise<ReportAnalytics> {
  const { data: allReports } = await supabase.from('pdf_reports').select('*');

  const { count: publicReports } = await supabase.from('pdf_reports').select('*', { count: 'exact', head: true }).eq('is_public', true);
  const { count: privateReports } = await supabase.from('pdf_reports').select('*', { count: 'exact', head: true }).eq('is_public', false);

  const { count: emailSent } = await supabase.from('pdf_reports').select('*', { count: 'exact', head: true }).eq('email_send_status', 'sent');
  const { count: emailPending } = await supabase.from('pdf_reports').select('*', { count: 'exact', head: true }).eq('email_send_status', 'pending');
  const { count: emailFailed } = await supabase.from('pdf_reports').select('*', { count: 'exact', head: true }).eq('email_send_status', 'failed');

  const reportCount = allReports?.length || 0;
  const totalViews = allReports?.reduce((sum, r) => sum + (r.view_count || 0), 0) || 0;
  const totalSize = allReports?.reduce((sum, r) => sum + (r.file_size_bytes || 0), 0) || 0;

  const { data: topReports } = await supabase
    .from('pdf_reports')
    .select('id, property_id, view_count, properties(address_line_1, city)')
    .order('view_count', { ascending: false })
    .limit(10);

  return {
    total_reports: reportCount,
    public_reports: publicReports || 0,
    private_reports: privateReports || 0,
    avg_file_size_bytes: reportCount ? totalSize / reportCount : 0,
    total_views: totalViews,
    avg_views_per_report: reportCount ? totalViews / reportCount : 0,
    most_viewed: (topReports || []).map(r => ({
      id: r.id,
      property_address: r.properties ? `${r.properties.address_line_1}, ${r.properties.city}` : 'Unknown',
      view_count: r.view_count || 0,
    })),
    email_stats: {
      sent: emailSent || 0,
      pending: emailPending || 0,
      failed: emailFailed || 0,
    },
  };
}

export async function getEvidenceAnalytics(): Promise<EvidenceAnalytics> {
  const { count: totalReqs } = await supabase.from('property_evidence_requirements').select('*', { count: 'exact', head: true });
  const { data: allPhotos } = await supabase.from('photos').select('template_id, marked_not_available_at, not_available_reason');

  const completedPhotos = allPhotos?.filter(p => p.template_id).length || 0;
  const markedNotAvailable = allPhotos?.filter(p => p.marked_not_available_at).length || 0;

  const reasons: Record<string, number> = {};
  allPhotos?.forEach(photo => {
    if (photo.not_available_reason) {
      reasons[photo.not_available_reason] = (reasons[photo.not_available_reason] || 0) + 1;
    }
  });

  const { data: templates } = await supabase.from('evidence_item_templates').select('*');

  const byTemplate = await Promise.all(
    (templates || []).map(async (template) => {
      const { count: total } = await supabase
        .from('photos')
        .select('*', { count: 'exact', head: true })
        .eq('template_id', template.id);

      const { count: completed } = await supabase
        .from('photos')
        .select('*', { count: 'exact', head: true })
        .eq('template_id', template.id)
        .not('file_url', 'is', null);

      return {
        template_name: template.title,
        total_count: total || 0,
        completed_count: completed || 0,
        completion_rate: total ? ((completed || 0) / total) * 100 : 0,
      };
    })
  );

  return {
    total_requirements: totalReqs || 0,
    completion_rate: totalReqs ? (completedPhotos / (totalReqs || 1)) * 100 : 0,
    by_template: byTemplate.sort((a, b) => b.total_count - a.total_count).slice(0, 10),
    marked_not_available: {
      count: markedNotAvailable,
      reasons,
    },
  };
}

export async function getMeasureTypeAnalytics(): Promise<MeasureTypeAnalytics> {
  const { data: allTypes } = await supabase.from('measure_types').select('*');
  const { count: activeTypes } = await supabase.from('measure_types').select('*', { count: 'exact', head: true }).eq('is_active', true);

  const usageByType = await Promise.all(
    (allTypes || []).map(async (type) => {
      const { count: orgCount } = await supabase
        .from('organisation_measures')
        .select('*', { count: 'exact', head: true })
        .eq('measure_type_id', type.id);

      const { count: propCount } = await supabase
        .from('property_measures')
        .select('*', { count: 'exact', head: true })
        .eq('measure_type_id', type.id);

      return {
        measure_name: type.name,
        organization_count: orgCount || 0,
        property_count: propCount || 0,
        revenue_cents: (orgCount || 0) * 5000,
      };
    })
  );

  return {
    total_types: allTypes?.length || 0,
    active_types: activeTypes || 0,
    usage_by_type: usageByType.sort((a, b) => b.organization_count - a.organization_count),
  };
}

export async function getAuditLogSummary(): Promise<AuditLogSummary> {
  const { count: totalLogs } = await supabase.from('super_admin_audit_logs').select('*', { count: 'exact', head: true });

  const { data: recentLogs } = await supabase
    .from('super_admin_audit_logs')
    .select('*, profiles(email)')
    .order('created_at', { ascending: false })
    .limit(20);

  const { data: allLogs } = await supabase.from('super_admin_audit_logs').select('action_type');

  const byActionType: Record<string, number> = {};
  allLogs?.forEach(log => {
    byActionType[log.action_type] = (byActionType[log.action_type] || 0) + 1;
  });

  return {
    total_logs: totalLogs || 0,
    recent_actions: (recentLogs || []).map(log => ({
      id: log.id,
      performed_by_email: log.profiles?.email || 'Unknown',
      action_type: log.action_type,
      target_description: log.reason || 'No description',
      created_at: log.created_at,
    })),
    by_action_type: byActionType,
  };
}
