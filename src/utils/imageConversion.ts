import heic2any from 'heic2any';

export interface ConversionResult {
  file: File;
  wasConverted: boolean;
  originalFormat?: string;
}

function isHeicOrHeif(file: File): boolean {
  const extension = file.name.toLowerCase().split('.').pop();
  const mimeType = file.type.toLowerCase();

  return (
    extension === 'heic' ||
    extension === 'heif' ||
    mimeType === 'image/heic' ||
    mimeType === 'image/heif'
  );
}

export async function convertImageIfNeeded(file: File): Promise<ConversionResult> {
  if (!isHeicOrHeif(file)) {
    return {
      file,
      wasConverted: false,
    };
  }

  try {
    const convertedBlob = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.95,
    });

    const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;

    const originalName = file.name.replace(/\.(heic|heif)$/i, '');
    const convertedFile = new File([blob], `${originalName}.jpg`, {
      type: 'image/jpeg',
      lastModified: file.lastModified,
    });

    return {
      file: convertedFile,
      wasConverted: true,
      originalFormat: file.name.split('.').pop()?.toUpperCase(),
    };
  } catch (error) {
    console.error('Failed to convert HEIC/HEIF image:', error);
    throw new Error(`Failed to convert ${file.name}. Please try a different image format.`);
  }
}

export async function convertMultipleImages(
  files: File[],
  onProgress?: (current: number, total: number, fileName: string) => void
): Promise<ConversionResult[]> {
  const results: ConversionResult[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    if (onProgress && isHeicOrHeif(file)) {
      onProgress(i + 1, files.length, file.name);
    }

    try {
      const result = await convertImageIfNeeded(file);
      results.push(result);
    } catch (error) {
      throw error;
    }
  }

  return results;
}
