import { MapPin } from 'lucide-react';

interface LocationBadgeProps {
  gpsLat: number | null;
  gpsLng: number | null;
  gpsAccuracy?: number | null;
  size?: 'small' | 'medium' | 'large';
  showCoordinates?: boolean;
}

export function LocationBadge({
  gpsLat,
  gpsLng,
  gpsAccuracy,
  size = 'small',
  showCoordinates = false
}: LocationBadgeProps) {
  const hasLocation = gpsLat !== null && gpsLng !== null;

  const sizeClasses = {
    small: 'px-1.5 py-0.5 text-xs',
    medium: 'px-2 py-1 text-sm',
    large: 'px-3 py-1.5 text-base'
  };

  const iconSizes = {
    small: 'w-3 h-3',
    medium: 'w-4 h-4',
    large: 'w-5 h-5'
  };

  if (!hasLocation) {
    return (
      <div
        className={`inline-flex items-center gap-1 rounded ${sizeClasses[size]} bg-gray-800/70 text-gray-300 backdrop-blur-sm`}
        title="Location not available"
      >
        <MapPin className={iconSizes[size]} />
        <span>No GPS</span>
      </div>
    );
  }

  const accuracyColor = gpsAccuracy && gpsAccuracy > 100
    ? 'bg-yellow-600/70 text-yellow-100'
    : 'bg-green-600/70 text-green-100';

  const coordinates = showCoordinates
    ? `${gpsLat.toFixed(6)}, ${gpsLng.toFixed(6)}`
    : 'GPS';

  const accuracyText = gpsAccuracy
    ? ` (±${Math.round(gpsAccuracy)}m)`
    : '';

  return (
    <a
      href={`https://www.google.com/maps?q=${gpsLat},${gpsLng}`}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1 rounded ${sizeClasses[size]} ${accuracyColor} backdrop-blur-sm hover:opacity-90 transition-opacity`}
      title={`Location: ${gpsLat.toFixed(6)}, ${gpsLng.toFixed(6)}${accuracyText}\nClick to view on Google Maps`}
      onClick={(e) => e.stopPropagation()}
    >
      <MapPin className={iconSizes[size]} />
      <span className="font-medium">{coordinates}</span>
    </a>
  );
}
