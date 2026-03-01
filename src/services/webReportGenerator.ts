import { PropertyReportData, Photo, CladdingSection } from './reportDataCollector';

interface PhotoReference {
  photo: Photo;
  reference: string;
}

export class WebReportGenerator {
  private appendixPhotos: PhotoReference[] = [];
  private photoCounter: number = 0;

  generateReport(data: PropertyReportData): string {
    console.log('[WEB] Starting web report generation for property:', data.property.job_reference);

    this.appendixPhotos = [];
    this.photoCounter = 0;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.property.property_name || 'Property Report'} - ${data.property.job_reference}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1a202c;
      background-color: #f7fafc;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      background-color: white;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .header {
      background: linear-gradient(135deg, #141d2e 0%, #1e3a5f 100%);
      color: white;
      padding: 3rem 2rem;
      text-align: center;
    }

    .header h1 {
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
      font-weight: 700;
    }

    .header .subtitle {
      font-size: 1.25rem;
      opacity: 0.95;
      margin-bottom: 1rem;
    }

    .cover-section {
      padding: 2rem;
      border-bottom: 2px solid #e2e8f0;
    }

    .property-title {
      font-size: 2rem;
      font-weight: 700;
      margin-bottom: 1rem;
      color: #141d2e;
    }

    .job-reference {
      font-size: 1.5rem;
      font-weight: 600;
      color: #2d3748;
      margin-bottom: 1.5rem;
    }

    .address {
      font-size: 1.1rem;
      color: #4a5568;
      margin-bottom: 1.5rem;
      line-height: 1.8;
    }

    .details-table {
      width: 100%;
      border-collapse: collapse;
      margin: 1.5rem 0;
    }

    .details-table td {
      padding: 0.75rem;
      border-bottom: 1px solid #e2e8f0;
    }

    .details-table td:first-child {
      font-weight: 600;
      width: 200px;
      color: #2d3748;
    }

    .elevation-photo {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      margin-top: 1.5rem;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .toc-section {
      padding: 2rem;
      background-color: #f7fafc;
      border-bottom: 2px solid #e2e8f0;
    }

    .toc-title {
      font-size: 1.75rem;
      font-weight: 700;
      margin-bottom: 1.5rem;
      color: #141d2e;
    }

    .toc-list {
      list-style: none;
    }

    .toc-list li {
      padding: 0.75rem;
      margin-bottom: 0.5rem;
      background-color: white;
      border-radius: 6px;
      border-left: 4px solid #00d9ff;
    }

    .toc-list a {
      color: #2d3748;
      text-decoration: none;
      font-weight: 500;
      transition: color 0.2s;
    }

    .toc-list a:hover {
      color: #00d9ff;
    }

    .content-section {
      padding: 2rem;
    }

    .area-section {
      margin-bottom: 3rem;
      padding-bottom: 2rem;
      border-bottom: 2px solid #e2e8f0;
    }

    .area-section:last-child {
      border-bottom: none;
    }

    .area-title {
      font-size: 1.75rem;
      font-weight: 700;
      color: #141d2e;
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 3px solid #00d9ff;
    }

    .area-subtitle {
      color: #718096;
      font-size: 1rem;
      margin-bottom: 1.5rem;
    }

    .opening-section {
      margin-bottom: 2rem;
      background-color: #f7fafc;
      padding: 1.5rem;
      border-radius: 8px;
    }

    .opening-title {
      font-size: 1.5rem;
      font-weight: 600;
      color: #2d3748;
      margin-bottom: 1rem;
    }

    .stage-section {
      margin-bottom: 1.5rem;
    }

    .stage-title {
      font-size: 1.25rem;
      font-weight: 600;
      color: #4a5568;
      margin-bottom: 1rem;
      text-transform: capitalize;
    }

    .photo-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .photo-card {
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      transition: transform 0.2s, box-shadow 0.2s;
      cursor: pointer;
    }

    .photo-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
    }

    .photo-card img {
      width: 100%;
      height: 250px;
      object-fit: cover;
    }

    .photo-caption {
      padding: 0.75rem;
      font-size: 0.875rem;
      color: #4a5568;
    }

    .photo-reference {
      display: block;
      font-weight: 600;
      color: #00d9ff;
      margin-bottom: 0.25rem;
    }

    .photo-metadata-inline {
      padding: 0 0.75rem 0.75rem 0.75rem;
      font-size: 0.75rem;
      color: #718096;
      border-top: 1px solid #e2e8f0;
    }

    .photo-metadata-inline div {
      padding: 0.25rem 0;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .photo-metadata-inline svg {
      width: 14px;
      height: 14px;
      flex-shrink: 0;
    }

    .photo-metadata-inline strong {
      color: #4a5568;
      font-weight: 600;
    }

    .gps-link {
      color: #00d9ff;
      text-decoration: none;
      transition: color 0.2s;
      cursor: pointer;
    }

    .gps-link:hover {
      color: #00b8d9;
      text-decoration: underline;
    }

    .appendix-section {
      padding: 2rem;
      background-color: #f7fafc;
    }

    .appendix-title {
      font-size: 1.75rem;
      font-weight: 700;
      color: #141d2e;
      margin-bottom: 1.5rem;
    }

    .appendix-photo {
      margin-bottom: 2rem;
      background: white;
      padding: 1.5rem;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .appendix-photo-title {
      font-size: 1.25rem;
      font-weight: 600;
      color: #2d3748;
      margin-bottom: 1rem;
    }

    .appendix-photo img {
      width: 100%;
      height: 500px;
      object-fit: contain;
      background-color: #f7fafc;
      border-radius: 6px;
      margin-bottom: 1rem;
    }

    .photo-metadata {
      font-size: 0.875rem;
      color: #718096;
      line-height: 1.8;
    }

    .photo-metadata strong {
      color: #4a5568;
    }

    .lightbox {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.9);
      z-index: 1000;
      padding: 2rem;
      overflow: auto;
    }

    .lightbox.active {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .lightbox-content {
      max-width: 90%;
      max-height: 90%;
      position: relative;
    }

    .lightbox-content img {
      max-width: 100%;
      max-height: 90vh;
      object-fit: contain;
      border-radius: 8px;
    }

    .lightbox-close {
      position: absolute;
      top: -2rem;
      right: 0;
      color: white;
      font-size: 2rem;
      cursor: pointer;
      background: none;
      border: none;
      padding: 0.5rem 1rem;
    }

    .lightbox-close:hover {
      color: #00d9ff;
    }

    .sticky-nav {
      position: sticky;
      top: 0;
      background: white;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      padding: 1rem 2rem;
      z-index: 100;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .sticky-nav h2 {
      font-size: 1.25rem;
      color: #2d3748;
    }

    @media print {
      .sticky-nav {
        display: none;
      }

      .photo-card {
        break-inside: avoid;
      }

      .opening-section {
        break-inside: avoid;
      }
    }

    @media (max-width: 768px) {
      .header h1 {
        font-size: 1.75rem;
      }

      .property-title {
        font-size: 1.5rem;
      }

      .photo-grid {
        grid-template-columns: 1fr;
      }

      .details-table td:first-child {
        width: 120px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="sticky-nav">
      <h2>${data.property.property_name || 'Property Report'}</h2>
      <div style="font-size: 0.875rem; color: #718096;">
        Job Ref: ${data.property.job_reference}
      </div>
    </div>

    <div class="header">
      <h1>CapturePro</h1>
      <div class="subtitle">General Installation Evidence Report</div>
    </div>

    <div class="cover-section">
      <h2 class="property-title">${data.property.property_name || 'Property Report'}</h2>
      <div class="job-reference">Job Reference: ${data.property.job_reference}</div>

      <div class="address">
        ${[data.property.address_line1, data.property.address_line2, data.property.city, data.property.postcode]
          .filter(Boolean)
          .join('<br>')}
      </div>

      <table class="details-table">
        <tr>
          <td>Organisation</td>
          <td>${data.organisation.name}</td>
        </tr>
        <tr>
          <td>Installation Date</td>
          <td>${new Date(data.property.installation_date).toLocaleDateString('en-GB')}</td>
        </tr>
        <tr>
          <td>Installer</td>
          <td>${data.property.assigned_installer_name || 'Not assigned'}</td>
        </tr>
        <tr>
          <td>Measure Type</td>
          <td>B3 Windows and Doors</td>
        </tr>
        <tr>
          <td>Generated</td>
          <td>${new Date(data.generatedAt).toLocaleString('en-GB')}</td>
        </tr>
        <tr>
          <td>Generated By</td>
          <td>${data.generatedBy.full_name}</td>
        </tr>
      </table>

      ${
        data.elevationPhotos.filter((e) => e.stage === 'pre').length > 0
          ? `<img src="${data.elevationPhotos.filter((e) => e.stage === 'pre').find((e) => e.elevation_label.toLowerCase().includes('front'))?.photo_url || data.elevationPhotos.filter((e) => e.stage === 'pre')[0].photo_url}" alt="Property Elevation" class="elevation-photo" loading="lazy" />`
          : ''
      }
    </div>

    <div class="toc-section">
      <h2 class="toc-title">Table of Contents</h2>
      <ul class="toc-list">
        ${this.getAllPhotosWithLocation(data).length > 0 ? '<li><a href="#location-map">Photo Location Map</a></li>' : ''}
        ${data.elevationPhotos.filter((e) => e.stage === 'pre').length > 0 ? '<li><a href="#pre-elevations">Pre-Installation Elevations</a></li>' : ''}
        ${data.areas
          .filter((area) => area.openings.length > 0)
          .map((area) => `<li><a href="#area-${this.sanitizeId(area.area_name)}">${area.area_name}</a></li>`)
          .join('')}
        ${data.elevationPhotos.filter((e) => e.stage === 'post').length > 0 ? '<li><a href="#post-elevations">Post-Installation Elevations</a></li>' : ''}
        ${data.claddingSections.length > 0 ? '<li><a href="#cladding-evidence">Cladding Installation Evidence</a></li>' : ''}
        ${data.claddingSections.map((s) => `<li style="padding-left: 2rem;"><a href="#cladding-section-${s.section_number}">Section ${s.section_number}: ${s.section_title}</a></li>`).join('')}
        <li><a href="#appendix">Appendix - Full Size Photos</a></li>
      </ul>
    </div>

    ${this.generateLocationMapSection(data)}

    ${this.generateElevationsSectionByStage(data, 'pre', 'Pre-Installation Elevations', 'pre-elevations')}

    <div class="content-section">
      ${this.generateAreaSections(data)}
    </div>

    ${this.generateElevationsSectionByStage(data, 'post', 'Post-Installation Elevations', 'post-elevations')}

    ${this.generateCladdingSections(data.claddingSections)}

    <div class="appendix-section" id="appendix">
      <h2 class="appendix-title">Appendix - Full Size Photos</h2>
      ${this.generateAppendix()}
    </div>
  </div>

  <div class="lightbox" id="lightbox">
    <div class="lightbox-content">
      <button class="lightbox-close" onclick="closeLightbox()">&times;</button>
      <img id="lightbox-img" src="" alt="Full size photo" />
    </div>
  </div>

  <script>
    function openLightbox(imgSrc) {
      document.getElementById('lightbox').classList.add('active');
      document.getElementById('lightbox-img').src = imgSrc;
      document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
      document.getElementById('lightbox').classList.remove('active');
      document.body.style.overflow = 'auto';
    }

    document.getElementById('lightbox').addEventListener('click', function(e) {
      if (e.target === this) {
        closeLightbox();
      }
    });

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        closeLightbox();
      }
    });
  </script>
</body>
</html>
    `;

    console.log('[WEB] Web report generation complete');
    console.log(`[WEB] Generated HTML with ${this.appendixPhotos.length} photos`);

    return html;
  }

  private sanitizeId(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }

  private getAllPhotosWithLocation(data: PropertyReportData): Photo[] {
    const photos: Photo[] = [];

    data.areas.forEach(area => {
      area.openings.forEach(opening => {
        opening.photos.forEach(photo => {
          if (photo.gps_lat && photo.gps_lng) {
            photos.push(photo);
          }
        });
      });
    });

    return photos;
  }

  private generateLocationMapSection(data: PropertyReportData): string {
    const photosWithLocation = this.getAllPhotosWithLocation(data);

    if (photosWithLocation.length === 0) {
      return '';
    }

    const bounds = photosWithLocation.reduce(
      (acc, photo) => ({
        minLat: Math.min(acc.minLat, photo.gps_lat!),
        maxLat: Math.max(acc.maxLat, photo.gps_lat!),
        minLng: Math.min(acc.minLng, photo.gps_lng!),
        maxLng: Math.max(acc.maxLng, photo.gps_lng!),
      }),
      {
        minLat: photosWithLocation[0].gps_lat!,
        maxLat: photosWithLocation[0].gps_lat!,
        minLng: photosWithLocation[0].gps_lng!,
        maxLng: photosWithLocation[0].gps_lng!,
      }
    );

    const centerLat = (bounds.minLat + bounds.maxLat) / 2;
    const centerLng = (bounds.minLng + bounds.maxLng) / 2;

    const propertyAddress = [
      data.property.address_line1,
      data.property.address_line2,
      data.property.city,
      data.property.postcode
    ].filter(Boolean).join(', ');

    return `
      <div class="content-section" id="location-map" style="border-bottom: 2px solid #e2e8f0;">
        <h2 class="area-title">Photo Location Map</h2>
        <div class="area-subtitle">${photosWithLocation.length} photos with GPS coordinates</div>

        <div style="margin-top: 1.5rem;">
          <div style="border-radius: 8px; overflow: hidden; height: 400px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
            <iframe
              src="https://www.google.com/maps?q=${centerLat},${centerLng}&z=18&output=embed"
              width="100%"
              height="100%"
              style="border: 0;"
              loading="lazy"
              referrerpolicy="no-referrer-when-downgrade"
              title="Photo locations map"
            ></iframe>
          </div>

          <div style="margin-top: 1.5rem; background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1.5rem;">
            <h3 style="font-size: 1.125rem; font-weight: 600; color: #2d3748; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
              </svg>
              Photo Locations (${photosWithLocation.length} photos with GPS)
            </h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 0.75rem; max-height: 300px; overflow-y: auto;">
              ${photosWithLocation.map((photo, index) => `
                <a
                  href="https://www.google.com/maps?q=${photo.gps_lat},${photo.gps_lng}"
                  target="_blank"
                  rel="noopener noreferrer"
                  style="display: flex; align-items: start; gap: 0.5rem; padding: 0.75rem; border-radius: 6px; text-decoration: none; color: inherit; transition: background-color 0.2s;"
                  onmouseover="this.style.backgroundColor='#f7fafc'"
                  onmouseout="this.style.backgroundColor='transparent'"
                >
                  <div style="flex-shrink: 0; width: 32px; height: 32px; background-color: #d1fae5; color: #065f46; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 0.875rem;">
                    ${index + 1}
                  </div>
                  <div style="flex: 1; min-width: 0;">
                    <p style="font-weight: 500; color: #1a202c; margin-bottom: 0.25rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                      ${photo.template?.title || 'Photo'}
                    </p>
                    <p style="font-size: 0.75rem; color: #718096;">
                      ${photo.gps_lat.toFixed(6)}, ${photo.gps_lng.toFixed(6)}
                    </p>
                  </div>
                </a>
              `).join('')}
            </div>
          </div>

          <div style="margin-top: 1rem; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 1rem;">
            <p style="font-weight: 500; color: #1e3a8a; margin-bottom: 0.25rem;">Property Address:</p>
            <p style="color: #1e40af;">${propertyAddress}</p>
          </div>
        </div>
      </div>
    `;
  }

  private generateElevationsSectionByStage(
    data: PropertyReportData,
    stage: 'pre' | 'post',
    sectionTitle: string,
    sectionId: string
  ): string {
    const elevationsForStage = data.elevationPhotos.filter((e) => e.stage === stage);

    if (elevationsForStage.length === 0) {
      return '';
    }

    return `
      <div class="content-section" id="${sectionId}" style="border-bottom: 2px solid #e2e8f0;">
        <h2 class="area-title">${sectionTitle}</h2>
        <div class="area-subtitle">${elevationsForStage.length} elevation photo(s)</div>

        <div class="photo-grid" style="margin-top: 1.5rem;">
          ${elevationsForStage
            .map((elevation) => {
              this.photoCounter++;
              const reference = `Photo ${this.photoCounter}`;
              const photo = {
                id: elevation.id,
                file_url: elevation.photo_url,
                photo_url: elevation.photo_url,
                template_id: '',
                gps_lat: null,
                gps_lng: null,
                captured_at: elevation.created_at,
                template: {
                  id: '',
                  title: `${elevation.elevation_label} Elevation`,
                  help_text: `Property elevation view - ${elevation.elevation_label}`,
                  stage: stage,
                  sort_order: 0,
                  scope: 'property' as const,
                },
              };
              this.appendixPhotos.push({ photo, reference });

              const timestamp = new Date(elevation.created_at).toLocaleString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              return `
                <div class="photo-card" onclick="openLightbox('${elevation.photo_url}')">
                  <img src="${elevation.photo_url}" alt="${elevation.elevation_label} Elevation" loading="lazy" />
                  <div class="photo-caption">
                    <span class="photo-reference">${reference}</span>
                    ${elevation.elevation_label} Elevation
                  </div>
                  <div class="photo-metadata-inline">
                    <div>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                      </svg>
                      <span>${timestamp}</span>
                    </div>
                  </div>
                </div>
              `;
            })
            .join('')}
        </div>
      </div>
    `;
  }

  private generateAreaSections(data: PropertyReportData): string {
    return data.areas
      .filter((area) => area.openings.length > 0)
      .map((area) => {
        return `
          <div class="area-section" id="area-${this.sanitizeId(area.area_name)}">
            <h2 class="area-title">${area.area_name}</h2>
            <div class="area-subtitle">${area.openings.length} opening(s)</div>

            ${area.openings
              .map((opening) => {
                const openingTitle = `${opening.opening_type.charAt(0).toUpperCase() + opening.opening_type.slice(1)} ${opening.opening_number}`;

                const photosByStage = {
                  pre: opening.photos.filter((p) => p.template?.stage === 'pre'),
                  during: opening.photos.filter((p) => p.template?.stage === 'during'),
                  post: opening.photos.filter((p) => p.template?.stage === 'post'),
                };

                return `
                  <div class="opening-section">
                    <h3 class="opening-title">${openingTitle}</h3>

                    ${['pre', 'during', 'post']
                      .map((stage) => {
                        const stagePhotos = photosByStage[stage as keyof typeof photosByStage];
                        if (stagePhotos.length === 0) return '';

                        return `
                          <div class="stage-section">
                            <h4 class="stage-title">${stage === 'pre' ? 'Pre-Installation' : stage === 'during' ? 'During Installation' : 'Post-Installation'}</h4>
                            <div class="photo-grid">
                              ${stagePhotos
                                .map((photo) => {
                                  this.photoCounter++;
                                  const reference = `Photo ${this.photoCounter}`;
                                  this.appendixPhotos.push({ photo, reference });

                                  const timestamp = new Date(photo.captured_at).toLocaleString('en-GB', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  });

                                  return `
                                    <div class="photo-card" onclick="openLightbox('${photo.file_url}')">
                                      <img src="${photo.file_url}" alt="${photo.template?.title || 'Photo'}" loading="lazy" />
                                      <div class="photo-caption">
                                        <span class="photo-reference">${reference}</span>
                                        ${photo.template?.title || 'Photo'}
                                      </div>
                                      <div class="photo-metadata-inline">
                                        <div>
                                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                                            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                                          </svg>
                                          <span>${timestamp}</span>
                                        </div>
                                        ${photo.gps_lat && photo.gps_lng ? `
                                          <div>
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                                            </svg>
                                            <a href="https://www.google.com/maps?q=${photo.gps_lat},${photo.gps_lng}" target="_blank" rel="noopener noreferrer" class="gps-link" onclick="event.stopPropagation();">${photo.gps_lat.toFixed(6)}, ${photo.gps_lng.toFixed(6)}</a>
                                          </div>
                                        ` : `
                                          <div>
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                                            </svg>
                                            <span style="color: #a0aec0;">Location not available</span>
                                          </div>
                                        `}
                                      </div>
                                    </div>
                                  `;
                                })
                                .join('')}
                            </div>
                          </div>
                        `;
                      })
                      .join('')}
                  </div>
                `;
              })
              .join('')}
          </div>
        `;
      })
      .join('');
  }

  private generateCladdingSections(sections: CladdingSection[]): string {
    if (sections.length === 0) return '';

    return `
      <div class="content-section" id="cladding-evidence" style="border-bottom: 2px solid #e2e8f0;">
        <h2 class="area-title">Cladding Installation Evidence</h2>
        <div class="area-subtitle">HardiePlank cladding installation documentation</div>

        ${sections.map((section) => `
          <div id="cladding-section-${section.section_number}" style="margin-bottom: 2rem; padding: 1.5rem; background-color: #f7fafc; border-radius: 8px;">
            <h3 style="font-size: 1.25rem; font-weight: 600; color: #2d3748; margin-bottom: 1rem;">
              <span style="display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 50%; background-color: #2d3748; color: white; font-size: 0.875rem; font-weight: 700; margin-right: 0.75rem;">${section.section_number}</span>
              ${section.section_title}
            </h3>

            ${section.items.map((item) => {
              if (item.has_dropdown) {
                const response = item.dropdown_response === 'yes' ? 'Yes' : item.dropdown_response === 'no' ? 'No' : 'Not answered';
                let itemHtml = `
                  <div style="margin-bottom: 1rem; padding: 1rem; background: white; border-radius: 6px; border: 1px solid #e2e8f0;">
                    <div style="font-weight: 500; color: #1a202c; margin-bottom: 0.5rem;">${item.title}</div>
                    <div style="font-size: 0.875rem; color: #4a5568;">
                      <strong>Response:</strong> ${response}
                    </div>
                `;

                if (item.dropdown_response === 'yes' && item.response_notes) {
                  itemHtml += `<div style="font-size: 0.875rem; color: #4a5568; margin-top: 0.25rem;"><strong>Description:</strong> ${item.response_notes}</div>`;
                }

                if (item.photos.length > 0) {
                  itemHtml += `
                    <div class="photo-grid" style="margin-top: 0.75rem;">
                      ${item.photos.map((photo) => {
                        this.photoCounter++;
                        const reference = `Photo ${this.photoCounter}`;
                        this.appendixPhotos.push({
                          photo: {
                            id: photo.id,
                            file_url: photo.file_url,
                            template_id: '',
                            gps_lat: null,
                            gps_lng: null,
                            captured_at: photo.captured_at,
                            template: {
                              id: '',
                              title: item.title,
                              help_text: null,
                              stage: 'pre',
                              sort_order: 0,
                              scope: 'property',
                            },
                          },
                          reference,
                        });

                        const timestamp = new Date(photo.captured_at).toLocaleString('en-GB', {
                          day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                        });

                        return `
                          <div class="photo-card" onclick="openLightbox('${photo.file_url}')">
                            <img src="${photo.file_url}" alt="${item.title}" loading="lazy" />
                            <div class="photo-caption">
                              <span class="photo-reference">${reference}</span>
                              ${item.title}
                            </div>
                            <div class="photo-metadata-inline">
                              <div>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                                </svg>
                                <span>${timestamp}</span>
                              </div>
                            </div>
                          </div>
                        `;
                      }).join('')}
                    </div>
                  `;
                }

                itemHtml += '</div>';
                return itemHtml;
              }

              if (item.photos.length === 0) return '';

              return `
                <div style="margin-bottom: 1rem;">
                  <div style="font-weight: 500; color: #1a202c; margin-bottom: 0.5rem;">${item.title}</div>
                  <div class="photo-grid">
                    ${item.photos.map((photo) => {
                      this.photoCounter++;
                      const reference = `Photo ${this.photoCounter}`;
                      this.appendixPhotos.push({
                        photo: {
                          id: photo.id,
                          file_url: photo.file_url,
                          template_id: '',
                          gps_lat: null,
                          gps_lng: null,
                          captured_at: photo.captured_at,
                          template: {
                            id: '',
                            title: item.title,
                            help_text: null,
                            stage: 'pre',
                            sort_order: 0,
                            scope: 'property',
                          },
                        },
                        reference,
                      });

                      const timestamp = new Date(photo.captured_at).toLocaleString('en-GB', {
                        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      });

                      return `
                        <div class="photo-card" onclick="openLightbox('${photo.file_url}')">
                          <img src="${photo.file_url}" alt="${item.title}" loading="lazy" />
                          <div class="photo-caption">
                            <span class="photo-reference">${reference}</span>
                            ${item.title}
                          </div>
                          <div class="photo-metadata-inline">
                            <div>
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                              </svg>
                              <span>${timestamp}</span>
                            </div>
                          </div>
                        </div>
                      `;
                    }).join('')}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `).join('')}
      </div>
    `;
  }

  private generateAppendix(): string {
    return this.appendixPhotos
      .map(({ photo, reference }) => {
        return `
          <div class="appendix-photo">
            <h3 class="appendix-photo-title">${reference}: ${photo.template?.title || 'Photo'}</h3>
            <img src="${photo.file_url}" alt="${photo.template?.title || 'Photo'}" loading="lazy" />
            <div class="photo-metadata">
              ${photo.template?.help_text ? `<div><strong>Description:</strong> ${photo.template.help_text}</div>` : ''}
              <div><strong>Captured:</strong> ${new Date(photo.captured_at).toLocaleString('en-GB')}</div>
              ${photo.gps_lat && photo.gps_lng ? `<div><strong>GPS:</strong> <a href="https://www.google.com/maps?q=${photo.gps_lat},${photo.gps_lng}" target="_blank" rel="noopener noreferrer" class="gps-link">${photo.gps_lat.toFixed(6)}, ${photo.gps_lng.toFixed(6)}</a> (Click to view on map)</div>` : ''}
            </div>
          </div>
        `;
      })
      .join('');
  }
}

export function generateWebReport(data: PropertyReportData): string {
  const generator = new WebReportGenerator();
  return generator.generateReport(data);
}
