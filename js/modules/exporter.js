import { CanvasRenderer } from './renderer.js';

export class ArtExporter {
  static async exportHighRes(gridData, cols, rows, baseWidth, baseHeight, renderOptions, scaleFactor = 2, mimeType = 'image/png') {
    return new Promise((resolve, reject) => {
      try {
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = Math.round(baseWidth * scaleFactor);
        exportCanvas.height = Math.round(baseHeight * scaleFactor);

        CanvasRenderer.render(exportCanvas, gridData, cols, rows, {
          ...renderOptions,
          scale: scaleFactor
        });

        exportCanvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("No se pudo generar el archivo para la exportación."));
              return;
            }

            const url = URL.createObjectURL(blob);
            const extension = mimeType === 'image/jpeg' ? 'jpg' : 'png';
            const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');

            const link = document.createElement('a');
            link.href = url;
            link.download = `mosaic-artwork-${timestamp}.${extension}`;
            document.body.appendChild(link);
            link.click();

            setTimeout(() => {
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
              exportCanvas.width = 0;
              exportCanvas.height = 0;
              resolve();
            }, 150);
          },
          mimeType,
          0.95
        );
      } catch (err) {
        reject(err);
      }
    });
  }
}
