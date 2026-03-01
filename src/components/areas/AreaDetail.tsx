import { useEffect, useState } from 'react';
import { supabase, Area, Opening, Photo } from '../../lib/supabase';
import { ArrowLeft, Camera, Upload } from 'lucide-react';
import { LocationBadge } from '../ui/LocationBadge';

type AreaDetailProps = {
  areaId: string;
  onBack: () => void;
  onUploadPhotos: (openingId: string) => void;
};

type OpeningWithPhotos = Opening & {
  photos: Photo[];
};

export function AreaDetail({ areaId, onBack, onUploadPhotos }: AreaDetailProps) {
  const [area, setArea] = useState<Area | null>(null);
  const [openings, setOpenings] = useState<OpeningWithPhotos[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAreaData = async () => {
      const { data: areaData, error: areaError } = await supabase
        .from('areas')
        .select('*')
        .eq('id', areaId)
        .maybeSingle();

      if (areaError) {
        console.error('Error fetching area:', areaError);
        setLoading(false);
        return;
      }

      setArea(areaData);

      const { data: openingsData, error: openingsError } = await supabase
        .from('openings')
        .select('*')
        .eq('area_id', areaId)
        .order('opening_type')
        .order('opening_number');

      if (openingsError) {
        console.error('Error fetching openings:', openingsError);
        setLoading(false);
        return;
      }

      const openingsWithPhotos = await Promise.all(
        (openingsData || []).map(async (opening) => {
          const { data: photosData } = await supabase
            .from('photos')
            .select('*')
            .eq('opening_id', opening.id)
            .order('display_order');

          return {
            ...opening,
            photos: photosData || [],
          };
        })
      );

      setOpenings(openingsWithPhotos);
      setLoading(false);
    };

    fetchAreaData();
  }, [areaId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-electric-500"></div>
      </div>
    );
  }

  if (!area) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Area not found</p>
        <button
          onClick={onBack}
          className="mt-4 text-electric-500 hover:text-electric-600 font-medium"
        >
          Go Back
        </button>
      </div>
    );
  }

  const totalPhotos = openings.reduce((sum, opening) => sum + opening.photos.length, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900">
            {area.area_name}
            {area.custom_room_name && ` - ${area.custom_room_name}`}
          </h2>
          <p className="text-gray-600 mt-1">
            {area.windows_to_replace_count > 0 &&
              `${area.windows_to_replace_count} windows`}
            {area.windows_to_replace_count > 0 && area.doors_to_replace_count > 0 && ', '}
            {area.doors_to_replace_count > 0 && `${area.doors_to_replace_count} doors`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Openings</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{openings.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Photos</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{totalPhotos}</p>
            </div>
            <Camera className="w-8 h-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Max Photos Per Opening</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">45</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {openings.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <Camera className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">No openings in this area</p>
          </div>
        ) : (
          openings.map((opening) => (
            <div
              key={opening.id}
              className="bg-white rounded-lg border border-gray-200 overflow-hidden"
            >
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 capitalize">
                      {opening.opening_type} {opening.opening_number}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {opening.photos.length} of 45 photos
                    </p>
                  </div>
                  <button
                    onClick={() => onUploadPhotos(opening.id)}
                    className="flex items-center gap-2 bg-electric-500 text-white px-4 py-2 rounded-lg hover:bg-electric-600 transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    Upload Photos
                  </button>
                </div>
              </div>

              <div className="p-6">
                {opening.photos.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Camera className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p>No photos uploaded yet</p>
                    <button
                      onClick={() => onUploadPhotos(opening.id)}
                      className="mt-4 text-electric-500 hover:text-electric-600 font-medium"
                    >
                      Upload your first photo
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {opening.photos.map((photo) => (
                      <div
                        key={photo.id}
                        className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 hover:border-electric-500 transition-colors group"
                      >
                        <img
                          src={photo.file_url}
                          alt={photo.file_name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-2 left-2">
                          <LocationBadge
                            gpsLat={photo.gps_lat}
                            gpsLng={photo.gps_lng}
                            gpsAccuracy={photo.gps_accuracy}
                            size="small"
                          />
                        </div>
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-opacity flex items-end">
                          <div className="p-2 w-full opacity-0 group-hover:opacity-100 transition-opacity">
                            <span
                              className={`inline-block px-2 py-1 text-xs font-medium rounded text-white ${
                                photo.photo_type === 'before'
                                  ? 'bg-orange-500'
                                  : photo.photo_type === 'after'
                                  ? 'bg-green-500'
                                  : photo.photo_type === 'during'
                                  ? 'bg-electric-500'
                                  : 'bg-gray-500'
                              }`}
                            >
                              {photo.photo_type}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
