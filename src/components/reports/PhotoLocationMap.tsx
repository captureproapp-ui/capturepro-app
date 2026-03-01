import { MapPin } from 'lucide-react';
import { Photo } from '../../lib/supabase';

interface PhotoLocationMapProps {
  photos: Array<Photo & { template?: { title: string } }>;
  propertyAddress?: string;
}

export function PhotoLocationMap({ photos, propertyAddress }: PhotoLocationMapProps) {
  const photosWithLocation = photos.filter(p => p.gps_lat && p.gps_lng);

  if (photosWithLocation.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-8 text-center">
        <MapPin className="w-12 h-12 mx-auto text-gray-400 mb-3" />
        <p className="text-gray-600">No location data available for photos</p>
      </div>
    );
  }

  const bounds = photosWithLocation.reduce(
    (acc, photo) => {
      if (!photo.gps_lat || !photo.gps_lng) return acc;
      return {
        minLat: Math.min(acc.minLat, photo.gps_lat),
        maxLat: Math.max(acc.maxLat, photo.gps_lat),
        minLng: Math.min(acc.minLng, photo.gps_lng),
        maxLng: Math.max(acc.maxLng, photo.gps_lng),
      };
    },
    {
      minLat: photosWithLocation[0].gps_lat!,
      maxLat: photosWithLocation[0].gps_lat!,
      minLng: photosWithLocation[0].gps_lng!,
      maxLng: photosWithLocation[0].gps_lng!,
    }
  );

  const centerLat = (bounds.minLat + bounds.maxLat) / 2;
  const centerLng = (bounds.minLng + bounds.maxLng) / 2;

  const mapUrl = `https://www.google.com/maps?q=${centerLat},${centerLng}&z=18&output=embed`;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden" style={{ height: '400px' }}>
        <iframe
          src={mapUrl}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="Photo locations map"
        />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-green-600" />
          Photo Locations ({photosWithLocation.length} photos with GPS)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
          {photosWithLocation.map((photo, index) => (
            <a
              key={photo.id}
              href={`https://www.google.com/maps?q=${photo.gps_lat},${photo.gps_lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-2 p-2 rounded hover:bg-gray-50 transition-colors text-sm group"
            >
              <div className="flex-shrink-0 w-8 h-8 bg-green-100 text-green-700 rounded-full flex items-center justify-center font-semibold text-xs">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate group-hover:text-green-600 transition-colors">
                  {photo.template?.title || 'Photo'}
                </p>
                <p className="text-xs text-gray-500">
                  {photo.gps_lat?.toFixed(6)}, {photo.gps_lng?.toFixed(6)}
                  {photo.gps_accuracy && ` (±${Math.round(photo.gps_accuracy)}m)`}
                </p>
              </div>
            </a>
          ))}
        </div>
      </div>

      {propertyAddress && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
          <p className="font-medium text-blue-900">Property Address:</p>
          <p className="text-blue-700 mt-1">{propertyAddress}</p>
        </div>
      )}
    </div>
  );
}
