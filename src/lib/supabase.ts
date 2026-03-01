import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseUrl, getSupabaseAnonKey, validateEnvironment } from './env';

function createSupabaseClient(): SupabaseClient | null {
  const supabaseUrl = getSupabaseUrl();
  const supabaseAnonKey = getSupabaseAnonKey();

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase environment variables are not configured');
    return null;
  }

  try {
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    });
  } catch (error) {
    console.error('Failed to create Supabase client:', error);
    return null;
  }
}

export const supabase = createSupabaseClient();

export function isSupabaseConfigured(): boolean {
  const envStatus = validateEnvironment();
  return envStatus.hasSupabase && supabase !== null;
}

export type UserRole = 'owner' | 'admin' | 'installer';

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  organisation_id: string | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  deactivated_at: string | null;
  deactivated_by: string | null;
  invitation_status: 'pending' | 'accepted' | 'expired' | null;
  invited_at: string | null;
  invitation_accepted_at: string | null;
  invited_by: string | null;
  super_admin: boolean;
};

export type Organisation = {
  id: string;
  name: string;
  created_at: string;
  owner_user_id: string | null;
  settings: Record<string, unknown>;
  seat_limit: number;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  subscription_plan: string | null;
};

export type PropertyType = 'mid_terrace' | 'end_terrace' | 'detached' | 'semi_detached' | 'bungalow' | 'flat' | 'other';
export type PropertyStatus = 'in_progress' | 'completed' | 'archived';

export type Property = {
  id: string;
  organisation_id: string;
  job_ref: string;
  property_name: string | null;
  address_line_1: string;
  address_line_2: string | null;
  city: string;
  postcode: string;
  installation_date: string;
  property_type: PropertyType;
  status: PropertyStatus;
  assigned_installer_ids: string[];
  assigned_installer_name: string | null;
  completion_percentage: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
};

export type AreaType = 'external' | 'room';

export type MeasureType = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  icon_name: string;
  color_class: string;
  is_active: boolean;
  created_at: string;
  stripe_payment_link_url: string | null;
};

export type MeasureDetail = {
  name: string;
  count: number;
  icon: string;
  color: string;
};

export type PropertyMeasuresSummary = {
  property_id: string;
  job_ref: string;
  organisation_id: string;
  measure_type_ids: string[];
  measure_codes: string[];
  measure_names: string[];
  measures_detail: Record<string, MeasureDetail>;
};

export type Area = {
  id: string;
  property_id: string;
  area_name: string;
  area_type: AreaType;
  custom_room_name: string | null;
  windows_to_replace_count: number;
  doors_to_replace_count: number;
  measure_type_id: string | null;
  measure_count: number;
  created_at: string;
  updated_at: string;
};

export type OpeningType = 'window' | 'door';

export type Opening = {
  id: string;
  area_id: string;
  opening_type: OpeningType;
  opening_number: number;
  notes: string | null;
  created_at: string;
};

export type PhotoType = 'before' | 'during' | 'after' | 'detail';
export type EvidenceStage = 'before' | 'during' | 'after';

export type Photo = {
  id: string;
  opening_id: string;
  property_id: string | null;
  file_url: string;
  file_name: string;
  photo_type: PhotoType;
  metadata: Record<string, unknown>;
  latitude: number | null;
  longitude: number | null;
  captured_at: string;
  uploaded_at: string;
  uploaded_by: string | null;
  display_order: number;
  template_id: string | null;
  stage: EvidenceStage | null;
  notes: string | null;
  gps_lat: number | null;
  gps_lng: number | null;
  gps_accuracy: number | null;
  marked_not_available_at: string | null;
  not_available_reason: string | null;
  marked_not_available_by: string | null;
  uploader_name_snapshot: string | null;
};
