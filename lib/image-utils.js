/**
 * Utility for client-side image processing: Compression and Watermarking.
 */

/**
 * Compresses an image and applies a watermark.
 * @param {File} file - The original image file.
 * @param {Object} options - Options for processing.
 * @returns {Promise<Blob>} - The processed image as a Blob.
 */
export const compressAndWatermark = async (file, options = {}) => {
  const { 
    maxWidth = 1280, 
    maxHeight = 1280, 
    quality = 0.7, 
    watermarkText = 'DOWA IT SYSTEM' 
  } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        // Calculate new dimensions
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Draw image
        ctx.drawImage(img, 0, 0, width, height);

        // Add Watermark
        const timestamp = new Date().toLocaleString('th-TH', { 
          year: 'numeric', month: 'short', day: '2-digit', 
          hour: '2-digit', minute: '2-digit', second: '2-digit' 
        });
        
        const fullWatermark = `${watermarkText} | ${timestamp}`;
        
        // Watermark styling
        const fontSize = Math.max(14, Math.floor(width / 40));
        ctx.font = `bold ${fontSize}px sans-serif`;
        
        // Shadow for readability
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        
        // Draw at bottom right
        ctx.fillText(fullWatermark, width - 20, height - 20);

        // Convert to Blob
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Canvas to Blob conversion failed'));
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};
