import { APP_CONFIG } from '../config.js';

export class ImageLoader {
  static async loadFromFile(file) {
    if (!file) throw new Error("No se seleccionó ningún archivo.");

    if (!file.type.match(/^image\/(png|jpeg|webp)$/)) {
      throw new Error(`Tipo de archivo (${file.type || 'desconocido'}) no admitido. Se requiere PNG, JPEG o WebP.`);
    }

    if (file.size > APP_CONFIG.MAX_FILE_SIZE_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      throw new Error(`El archivo supera el límite permitido (${sizeMB}MB > 15MB).`);
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Fallo en la decodificación de la imagen."));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error("Error al leer el archivo."));
      reader.readAsDataURL(file);
    });
  }

  static createOptimizedWorkingCanvas(img) {
    let width = img.naturalWidth;
    let height = img.naturalHeight;
    const maxDim = APP_CONFIG.MAX_ANALYSIS_DIMENSION;

    if (width > maxDim || height > maxDim) {
      if (width > height) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error("No se pudo obtener el contexto 2D del canvas de análisis.");

    ctx.drawImage(img, 0, 0, width, height);
    return { canvas, ctx, width, height };
  }

  static async loadTextureAsBitmap(file) {
    if (!file) throw new Error("Archivo de textura inválido.");
    try {
      return await createImageBitmap(file);
    } catch (err) {
      throw new Error("El navegador no pudo procesar la textura.");
    }
  }
}
