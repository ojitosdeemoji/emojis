export class BrightnessAnalyzer {
  constructor() {
    this.worker = new Worker(new URL('./worker.analysis.js', import.meta.url));
    this.pendingPromise = null;

    this.worker.onmessage = (e) => {
      if (this.pendingPromise) {
        if (e.data.error) {
          this.pendingPromise.reject(new Error(e.data.error));
        } else {
          this.pendingPromise.resolve(e.data);
        }
        this.pendingPromise = null;
      }
    };

    this.worker.onerror = (err) => {
      if (this.pendingPromise) {
        this.pendingPromise.reject(new Error(`Fallo crítico en Worker: ${err.message}`));
        this.pendingPromise = null;
      }
    };
  }

  analyze(ctx, width, height, cols) {
    return new Promise((resolve, reject) => {
      if (this.pendingPromise) {
        this.pendingPromise.reject(new Error("Operación de análisis sustituida por nueva solicitud"));
      }
      this.pendingPromise = { resolve, reject };

      try {
        const rows = Math.max(1, Math.round(cols * (height / width)));
        const imageData = ctx.getImageData(0, 0, width, height);
        const bufferCopy = imageData.data.buffer.slice(0);

        this.worker.postMessage(
          { buffer: bufferCopy, imgWidth: width, imgHeight: height, cols, rows },
          [bufferCopy]
        );
      } catch (error) {
        this.pendingPromise = null;
        reject(error);
      }
    });
  }

  destroy() {
    if (this.worker) this.worker.terminate();
  }
}
