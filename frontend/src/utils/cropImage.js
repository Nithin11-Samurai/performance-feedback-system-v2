/**
 * Crops an image to the given pixel area (as reported by react-easy-crop's
 * onCropComplete) and returns a Blob, using an offscreen canvas.
 */
export function getCroppedImageBlob(imageSrc, cropPixels, outputSize = 512) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = outputSize;
      canvas.height = outputSize;
      const ctx = canvas.getContext('2d');

      ctx.drawImage(
        image,
        cropPixels.x,
        cropPixels.y,
        cropPixels.width,
        cropPixels.height,
        0,
        0,
        outputSize,
        outputSize
      );

      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error('Failed to crop image'));
          resolve(blob);
        },
        'image/jpeg',
        0.92
      );
    };
    image.onerror = reject;
    image.src = imageSrc;
  });
}
