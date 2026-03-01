import { supabase } from '../lib/supabase';

export interface EvidenceItemTemplate {
  id: string;
  title: string;
  help_text: string | null;
  stage: 'pre' | 'during' | 'post';
  sort_order: number;
  scope: 'property' | 'opening';
}

export interface Photo {
  id: string;
  file_url: string;
  template_id: string;
  gps_lat: number | null;
  gps_lng: number | null;
  captured_at: string;
  template?: EvidenceItemTemplate;
}

export interface Opening {
  id: string;
  opening_type: 'window' | 'door';
  opening_number: number;
  photos: Photo[];
}

export interface Area {
  id: string;
  area_name: string;
  openings: Opening[];
}

export interface PropertyElevation {
  id: string;
  elevation_label: string;
  photo_url: string;
  created_at: string;
  stage: 'pre' | 'post';
}

export interface CladdingSectionItem {
  title: string;
  has_dropdown: boolean;
  dropdown_response: string | null;
  response_notes: string | null;
  photos: {
    id: string;
    file_url: string;
    captured_at: string;
  }[];
}

export interface CladdingSection {
  section_number: number;
  section_title: string;
  items: CladdingSectionItem[];
}

export interface PropertyReportData {
  property: {
    id: string;
    property_name: string | null;
    job_reference: string;
    address_line1: string;
    address_line2: string | null;
    city: string;
    postcode: string;
    installation_date: string;
    assigned_installer_name: string | null;
    completion_percentage: number;
    status: string;
    organisation_id: string;
  };
  organisation: {
    id: string;
    name: string;
  };
  areas: Area[];
  elevationPhotos: PropertyElevation[];
  claddingSections: CladdingSection[];
  evidenceTemplates: EvidenceItemTemplate[];
  generatedAt: string;
  generatedBy: {
    id: string;
    full_name: string;
    email: string;
  };
}

export async function collectReportData(propertyId: string): Promise<PropertyReportData> {
  console.log('[DATA] Starting data collection for property:', propertyId);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  console.log('[DATA] Fetching property details...');
  const { data: property, error: propertyError } = await supabase
    .from('properties')
    .select(`
      id,
      property_name,
      job_ref,
      address_line_1,
      address_line_2,
      city,
      postcode,
      installation_date,
      assigned_installer_name,
      status,
      organisation_id,
      organisations!inner(id, name)
    `)
    .eq('id', propertyId)
    .maybeSingle();

  if (propertyError) {
    throw new Error(`Failed to fetch property: ${propertyError.message}`);
  }

  if (!property) {
    throw new Error('Property not found');
  }

  console.log('[DATA] Property found:', property.job_ref);

  const { data: completionData, error: completionError } = await supabase
    .from('property_completion_summary')
    .select('completion_percentage')
    .eq('id', propertyId)
    .maybeSingle();

  if (completionError) {
    throw new Error(`Failed to fetch completion status: ${completionError.message}`);
  }

  const completionPercentage = completionData?.completion_percentage || 0;

  if (completionPercentage < 100) {
    throw new Error('Property must be 100% complete before generating report');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || !profile) {
    throw new Error('Failed to fetch user profile');
  }

  const { data: evidenceTemplates, error: templatesError } = await supabase
    .from('evidence_item_templates')
    .select('id, title, help_text, stage, sort_order, scope')
    .order('stage')
    .order('sort_order');

  if (templatesError) {
    throw new Error(`Failed to fetch evidence templates: ${templatesError.message}`);
  }

  console.log('[DATA] Fetching areas...');
  const { data: areas, error: areasError } = await supabase
    .from('areas')
    .select(`
      id,
      area_name
    `)
    .eq('property_id', propertyId)
    .order('created_at');

  if (areasError) {
    throw new Error(`Failed to fetch areas: ${areasError.message}`);
  }

  console.log('[DATA] Found', areas?.length || 0, 'areas');

  const areasWithData: Area[] = [];
  for (const area of areas || []) {
    console.log('[DATA] Fetching openings for area:', area.area_name);
    const { data: openings, error: openingsError } = await supabase
      .from('openings')
      .select(`
        id,
        opening_type,
        opening_number
      `)
      .eq('area_id', area.id)
      .order('opening_number');

    if (openingsError) {
      throw new Error(`Failed to fetch openings for area ${area.id}: ${openingsError.message}`);
    }

    console.log('[DATA] Found', openings?.length || 0, 'openings in area:', area.area_name);

    const openingsWithPhotos: Opening[] = [];
    for (const opening of openings || []) {
      console.log('[DATA] Fetching photos for opening:', opening.opening_type, opening.opening_number);
      const { data: photos, error: photosError } = await supabase
        .from('photos')
        .select(`
          id,
          file_url,
          template_id,
          gps_lat,
          gps_lng,
          captured_at
        `)
        .eq('opening_id', opening.id)
        .order('captured_at');

      if (photosError) {
        throw new Error(`Failed to fetch photos for opening ${opening.id}: ${photosError.message}`);
      }

      console.log('[DATA] Found', photos?.length || 0, 'photos');

      const photosWithTemplates = (photos || []).map((photo) => {
        const template = evidenceTemplates?.find((t) => t.id === photo.template_id);
        return {
          ...photo,
          template,
        };
      });

      openingsWithPhotos.push({
        ...opening,
        photos: photosWithTemplates,
      });
    }

    areasWithData.push({
      ...area,
      openings: openingsWithPhotos,
    });
  }

  console.log('[DATA] Fetching elevation photos...');
  const { data: elevationPhotoData, error: elevationsError } = await supabase
    .from('photos')
    .select(`
      id,
      file_url,
      uploaded_at,
      template_id,
      evidence_item_templates!inner(title, stage, scope)
    `)
    .eq('property_id', propertyId)
    .is('opening_id', null)
    .eq('evidence_item_templates.scope', 'property')
    .order('uploaded_at');

  if (elevationsError) {
    throw new Error(`Failed to fetch elevation photos: ${elevationsError.message}`);
  }

  const elevationPhotos: PropertyElevation[] = (elevationPhotoData || [])
    .map((photo: any) => ({
      id: photo.id,
      elevation_label: photo.evidence_item_templates.title,
      photo_url: photo.file_url,
      created_at: photo.uploaded_at,
      stage: photo.evidence_item_templates.stage === 'pre' ? 'pre' : 'post',
    }))
    .sort((a, b) => {
      if (a.stage === b.stage) {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      return a.stage === 'pre' ? -1 : 1;
    });

  console.log('[DATA] Found', elevationPhotos?.length || 0, 'elevation photos');

  console.log('[DATA] Fetching cladding section data...');
  const claddingSections: CladdingSection[] = [];

  const { data: claddingRequirements } = await supabase
    .from('property_evidence_requirements')
    .select(`
      id,
      template_id,
      dropdown_response,
      response_notes,
      evidence_item_templates!inner(
        title,
        section_number,
        section_title,
        has_dropdown,
        scope,
        measure_type_id,
        sort_order
      )
    `)
    .eq('property_id', propertyId)
    .not('evidence_item_templates.section_number', 'is', null);

  if (claddingRequirements && claddingRequirements.length > 0) {
    const sectionMap = new Map<number, CladdingSection>();

    for (const req of claddingRequirements) {
      const tmpl = req.evidence_item_templates as any;
      const sectionNum = tmpl.section_number as number;

      if (!sectionMap.has(sectionNum)) {
        sectionMap.set(sectionNum, {
          section_number: sectionNum,
          section_title: tmpl.section_title,
          items: [],
        });
      }

      const { data: itemPhotos } = await supabase
        .from('photos')
        .select('id, file_url, captured_at')
        .eq('property_id', propertyId)
        .is('opening_id', null)
        .eq('template_id', req.template_id)
        .order('captured_at');

      sectionMap.get(sectionNum)!.items.push({
        title: tmpl.title,
        has_dropdown: tmpl.has_dropdown || false,
        dropdown_response: req.dropdown_response,
        response_notes: req.response_notes,
        photos: (itemPhotos || []).map((p) => ({
          id: p.id,
          file_url: p.file_url,
          captured_at: p.captured_at,
        })),
      });
    }

    const sorted = Array.from(sectionMap.values()).sort((a, b) => a.section_number - b.section_number);
    claddingSections.push(...sorted);
  }

  console.log('[DATA] Found', claddingSections.length, 'cladding sections');
  console.log('[DATA] Data collection complete');

  return {
    property: {
      id: property.id,
      property_name: property.property_name,
      job_reference: property.job_ref,
      address_line1: property.address_line_1,
      address_line2: property.address_line_2,
      city: property.city,
      postcode: property.postcode,
      installation_date: property.installation_date,
      assigned_installer_name: property.assigned_installer_name,
      completion_percentage: completionPercentage,
      status: property.status,
      organisation_id: property.organisation_id,
    },
    organisation: {
      id: (property.organisations as any).id,
      name: (property.organisations as any).name,
    },
    areas: areasWithData,
    elevationPhotos: elevationPhotos || [],
    claddingSections,
    evidenceTemplates: evidenceTemplates || [],
    generatedAt: new Date().toISOString(),
    generatedBy: profile,
  };
}
