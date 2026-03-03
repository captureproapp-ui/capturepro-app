import exifr from 'exifr';

export type EXIFData = {
  gps_lat: number | null;
  gps_lng: number | null;
  capturedAt: string;
};

export type BrowserLocation = {
  gps_lat: number;
  gps_lng: number;
  gps_accuracy: number;
};

export async function extractEXIFData(file: File): Promise<EXIFData> {
  try {
    const exifData = await exifr.parse(file, {
      gps: true,
      pick: ['DateTimeOriginal', 'CreateDate', 'ModifyDate', 'latitude', 'longitude'],
    });

    if (exifData) {
      const capturedAt =
        exifData.DateTimeOriginal ||
        exifData.CreateDate ||
        exifData.ModifyDate ||
        new Date().toISOString();

      return {
        gps_lat: exifData.latitude ?? null,
        gps_lng: exifData.longitude ?? null,
        capturedAt: capturedAt instanceof Date ? capturedAt.toISOString() : new Date(capturedAt).toISOString(),
      };
    }
  } catch (error) {
    console.warn('Could not extract EXIF data:', error);
  }

  return { gps_lat: null, gps_lng: null, capturedAt: new Date().toISOString() };
}

export function getBrowserLocation(): Promise<BrowserLocation> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          gps_lat: position.coords.latitude,
          gps_lng: position.coords.longitude,
          gps_accuracy: position.coords.accuracy,
        });
      },
      (error) => reject(error),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  });
}
