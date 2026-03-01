import { supabase } from '../lib/supabase';

export type PropertyDetailsUpdate = {
  job_ref: string;
  address_line_1: string;
  address_line_2: string | null;
  city: string;
  postcode: string;
};

export async function updatePropertyDetails(
  propertyId: string,
  updates: PropertyDetailsUpdate
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('📝 propertyService.updatePropertyDetails called:', {
      propertyId,
      updates
    });

    const { error } = await supabase
      .from('properties')
      .update({
        job_ref: updates.job_ref,
        address_line_1: updates.address_line_1,
        address_line_2: updates.address_line_2,
        city: updates.city,
        postcode: updates.postcode,
        updated_at: new Date().toISOString(),
      })
      .eq('id', propertyId);

    if (error) {
      console.error('❌ Database error updating property details:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ propertyService: Property details update successful');
    return { success: true };
  } catch (error) {
    console.error('❌ Unexpected error updating property details:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

export async function updatePropertyInstallers(
  propertyId: string,
  installerIds: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('📝 propertyService.updatePropertyInstallers called:', {
      propertyId,
      installerIds,
      installerCount: installerIds.length
    });

    const { error } = await supabase
      .from('properties')
      .update({
        assigned_installer_ids: installerIds,
        updated_at: new Date().toISOString(),
      })
      .eq('id', propertyId);

    if (error) {
      console.error('❌ Database error updating property installers:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ propertyService: Update successful');
    return { success: true };
  } catch (error) {
    console.error('❌ Unexpected error updating installers:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

export async function fetchInstallerNames(
  installerIds: string[]
): Promise<{ id: string; full_name: string; email: string }[]> {
  if (installerIds.length === 0) return [];

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', installerIds);

    if (error) {
      console.error('Error fetching installer names:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Unexpected error fetching installer names:', error);
    return [];
  }
}
