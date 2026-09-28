import { APP_CONFIG } from './config.js';
import { ImageLoader } from './modules/imageLoader.js';
import { BrightnessAnalyzer } from './modules/brightnessAnalyzer.js';
import { PaletteManager } from './modules/paletteManager.js';
import { CanvasRenderer } from './modules/renderer.js';
import { ArtExporter } from './modules/exporter.js';

class MosaicApp {
  constructor() {
    this.analyzer = new BrightnessAnalyzer();
    this.paletteManager = new PaletteManager();
    this.supportsCtxFilter = 'filter' in CanvasRenderingContext2D.prototype;

    this.state = {
      sourceImage: null,
      workingCanvas: null,
      workingCtx: null,
      filteredCanvas: null,
      filteredCtx: null,
      gridAnalysisData: null,
      cols: APP_CONFIG.GRID.DEFAULT_RESOLUTION,
      rows: 0,
      brightness: 0,
      contrast: 0,
      saturation: 100,
      mode: 'emoji',
      textureType: 'single',
      singleTextureBitmap: null,
      multiTextureBitmaps: [null, null, null],
      isProcessing: false,
      renderQueued: false,
      analysisQueued: false,
      pendingReanalysis: false
    };

    this._cacheDOMElements();
    this._initUI();
    this._attachEventListeners();
  }

  _cacheDOMElements() {
    this.dom = {
      dropZone: document.getElementById('drop-zone'),
      fileInput: document.getElementById('file-input'),
      outputCanvas: document.getElementById('output-canvas'),
      placeholderView: document.getElementById('placeholder-view'),
      statusText: document.getElementById('status-text'),
      resolutionInfo: document.getElementById('resolution-info'),
      toastContainer: document.getElementById('toast-container'),

      paletteSelect: document.getElementById('palette-select'),
      paletteRanges: document.getElementById('palette-ranges'),
      resolutionSlider: document.getElementById('resolution-slider'),
      resolutionVal: document.getElementById('resolution-val'),
      brightnessSlider: document.getElementById('brightness-slider'),
      brightnessVal: document.getElementById('brightness-val'),
      contrastSlider: document.getElementById('contrast-slider'),
      contrastVal: document.getElementById('contrast-val'),
      saturationSlider: document.getElementById('saturation-slider'),
      saturationVal: document.getElementById('saturation-val'),

      emojiSettings: document.getElementById('emoji-settings'),
      textureSettings: document.getElementById('texture-settings'),
      modeEmoji: document.getElementById('mode-emoji'),
      modeTexture: document.getElementById('mode-texture'),
      singleTextureInput: document.getElementById('single-texture-input'),
      singleTextureName: document.getElementById('single-texture-name'),
      singleTextureContainer: document.getElementById('single-texture-container'),
      multiTextureContainer: document.getElementById('multi-texture-container'),
      multiTextureInputs: document.querySelectorAll('.multi-texture-input'),

      btnExport: document.getElementById('btn-export'),
      exportScale: document.getElementById('export-scale'),
      exportFormat: document.getElementById('export-format')
    };
  }

  _initUI() {
    const palettes = this.paletteManager.getAvailablePalettes();
    this.dom.paletteSelect.innerHTML = palettes
      .map((p) => `<option value="${p.key}">${p.name}</option>`)
      .join('');
    this._renderPaletteRangeEditor();
  }

  _renderPaletteRangeEditor() {
    const ranges = this.paletteManager.getActiveRanges();
    this.dom.paletteRanges.innerHTML = '';

    ranges.forEach((range, index) => {
      const row = document.createElement('div');
      row.className = 'range-row';
      row.innerHTML = `
        <span>[${String(range.min).padStart(3, '0')} - ${String(range.max).padStart(3, '0')}]</span>
        <input type="text" maxlength="8" class="emoji-input" value="${range.emoji}" data-index="${index}" aria-label="Emoji para rango ${range.min} a ${range.max}">
      `;
      this.dom.paletteRanges.appendChild(row);
    });

    this.dom.paletteRanges.querySelectorAll('.emoji-input').forEach((input) => {
      input.addEventListener('change', (e) => {
        const idx = parseInt(e.target.dataset.index, 10);
        const val = e.target.value.trim();
        if (val) {
          this.paletteManager.updateEmojiForRange(idx, val);
          this.requestRenderOnly();
        }
      });
    });
  }

  _attachEventListeners() {
    this.dom.dropZone.addEventListener('click', () => this.dom.fileInput.click());
    this.dom.fileInput.addEventListener('click', (e) => e.stopPropagation());
    this.dom.dropZone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.dom.fileInput.click();
      }
    });
    this.dom.dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.dom.dropZone.classList.add('dragover');
    });
    this.dom.dropZone.addEventListener('dragleave', () => {
      this.dom.dropZone.classList.remove('dragover');
    });
    this.dom.dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      this.dom.dropZone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        this.handleImageUpload(e.dataTransfer.files[0]);
      }
    });
    this.dom.fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        this.handleImageUpload(e.target.files[0]);
      }
    });

    this.dom.modeEmoji.addEventListener('change', () => this._handleModeChange('emoji'));
    this.dom.modeTexture.addEventListener('change', () => this._handleModeChange('texture'));

    document.querySelectorAll('input[name="texture-type"]').forEach((elem) => {
      elem.addEventListener('change', (e) => {
        this.state.textureType = e.target.value;
        const single = this.state.textureType === 'single';
        this.dom.singleTextureContainer.classList.toggle('hidden', !single);
        this.dom.multiTextureContainer.classList.toggle('hidden', single);
        this.requestRenderOnly();
      });
    });

    this.dom.singleTextureInput.addEventListener('change', async (e) => {
      if (e.target.files && e.target.files[0]) {
        try {
          const file = e.target.files[0];
          this.state.singleTextureBitmap = await ImageLoader.loadTextureAsBitmap(file);
          this.dom.singleTextureName.textContent = file.name;
          this.showToast("Textura cargada", "success");
          this.requestRenderOnly();
        } catch (err) {
          this.showToast(err.message, "error");
        }
      }
    });

    this.dom.multiTextureInputs.forEach((input, index) => {
      input.addEventListener('change', async (e) => {
        if (e.target.files && e.target.files[0]) {
          try {
            const bmp = await ImageLoader.loadTextureAsBitmap(e.target.files[0]);
            this.state.multiTextureBitmaps[index] = bmp;
            this.showToast(`Textura ${index + 1} actualizada`, "info");
            this.requestRenderOnly();
          } catch (err) {
            this.showToast(err.message, "error");
          }
        }
      });
    });

    this.dom.paletteSelect.addEventListener('change', (e) => {
      this.paletteManager.setPalette(e.target.value);
      this._renderPaletteRangeEditor();
      this.requestRenderOnly();
    });

    this.dom.resolutionSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      this.state.cols = val;
      this.dom.resolutionVal.textContent = `${val} cols`;
      this.requestFullAnalysis();
    });

    this.dom.brightnessSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      this.state.brightness = val;
      this.dom.brightnessVal.textContent = `${val}%`;
      this.requestFullAnalysis();
    });

    this.dom.contrastSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      this.state.contrast = val;
      this.dom.contrastVal.textContent = `${val}%`;
      this.requestFullAnalysis();
    });

    this.dom.saturationSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      this.state.saturation = val;
      this.dom.saturationVal.textContent = `${val}%`;
      this.requestFullAnalysis();
    });

    this.dom.btnExport.addEventListener('click', () => this.handleExport());
  }

  _handleModeChange(mode) {
    this.state.mode = mode;
    const isEmoji = mode === 'emoji';
    this.dom.emojiSettings.classList.toggle('hidden', !isEmoji);
    this.dom.textureSettings.classList.toggle('hidden', isEmoji);
    this.requestRenderOnly();
  }

  async handleImageUpload(file) {
    try {
      this._updateStatus("Cargando y decodificando imagen...", true);
      const img = await ImageLoader.loadFromFile(file);

      this.state.sourceImage = img;

      const { canvas, ctx, width, height } = ImageLoader.createOptimizedWorkingCanvas(img);
      this.state.workingCanvas = canvas;
      this.state.workingCtx = ctx;

      this.state.filteredCanvas = document.createElement('canvas');
      this.state.filteredCanvas.width = width;
      this.state.filteredCanvas.height = height;
      this.state.filteredCtx = this.state.filteredCanvas.getContext('2d', { willReadFrequently: true });

      this.dom.outputCanvas.width = width;
      this.dom.outputCanvas.height = height;

      this.dom.placeholderView.classList.add('hidden');
      this.dom.outputCanvas.classList.remove('hidden');
      this.dom.btnExport.disabled = false;

      this.dom.resolutionInfo.textContent = `${img.naturalWidth} × ${img.naturalHeight} px (Original)`;
      this.showToast("Imagen cargada", "success");

      this.requestFullAnalysis();
    } catch (err) {
      this._updateStatus("Error en la carga.", false);
      this.showToast(err.message, "error");
    }
  }

  _applyFiltersToWorkingCanvas() {
    const { workingCanvas, filteredCanvas, filteredCtx, brightness, contrast, saturation } = this.state;
    if (!workingCanvas || !filteredCanvas) return;

    const b = 1 + brightness / 100;
    const c = 1 + contrast / 100;
    const s = saturation / 100;
    const w = filteredCanvas.width;
    const h = filteredCanvas.height;

    filteredCtx.clearRect(0, 0, w, h);

    if (this.supportsCtxFilter) {
      filteredCtx.filter = `brightness(${b}) contrast(${c}) saturate(${s})`;
      filteredCtx.drawImage(workingCanvas, 0, 0);
      filteredCtx.filter = 'none';
      return;
    }

    // Fallback manual (Safari/iOS sin ctx.filter)
    filteredCtx.drawImage(workingCanvas, 0, 0);
    const imageData = filteredCtx.getImageData(0, 0, w, h);
    const d = imageData.data;
    for (let i = 0; i < d.length; i += 4) {
      let r = (d[i] * b - 128) * c + 128;
      let g = (d[i + 1] * b - 128) * c + 128;
      let bl = (d[i + 2] * b - 128) * c + 128;
      const gray = 0.2126 * r + 0.7152 * g + 0.0722 * bl;
      d[i] = gray + (r - gray) * s;
      d[i + 1] = gray + (g - gray) * s;
      d[i + 2] = gray + (bl - gray) * s;
    }
    filteredCtx.putImageData(imageData, 0, 0);
  }

  requestFullAnalysis() {
    if (this.state.analysisQueued || !this.state.sourceImage) return;

    this.state.analysisQueued = true;
    requestAnimationFrame(async () => {
      this.state.analysisQueued = false;
      await this._executeAnalysisPipeline();
    });
  }

  async _executeAnalysisPipeline() {
    if (!this.state.workingCanvas) return;
    if (this.state.isProcessing) {
      this.state.pendingReanalysis = true;
      return;
    }

    try {
      this.state.isProcessing = true;
      this._updateStatus("Analizando matriz lumínica...", true);

      this._applyFiltersToWorkingCanvas();

      const result = await this.analyzer.analyze(
        this.state.filteredCtx,
        this.state.filteredCanvas.width,
        this.state.filteredCanvas.height,
        this.state.cols
      );

      this.state.gridAnalysisData = result.gridData;
      this.state.rows = result.rows;

      this._renderOutput();
      this._updateStatus("Renderizado completado.", false);
    } catch (err) {
      if (!err.message.includes("sustituida")) {
        this.showToast(err.message, "error");
        this._updateStatus("Error en análisis.", false);
      }
    } finally {
      this.state.isProcessing = false;
      if (this.state.pendingReanalysis) {
        this.state.pendingReanalysis = false;
        this.requestFullAnalysis();
      }
    }
  }

  requestRenderOnly() {
    if (this.state.renderQueued || !this.state.gridAnalysisData) return;

    this.state.renderQueued = true;
    requestAnimationFrame(() => {
      this.state.renderQueued = false;
      this._renderOutput();
    });
  }

  _renderOutput() {
    const { gridAnalysisData, cols, rows, mode, textureType, singleTextureBitmap, multiTextureBitmaps } = this.state;
    if (!gridAnalysisData) return;

    const textureData = textureType === 'single' ? singleTextureBitmap : multiTextureBitmaps;

    CanvasRenderer.render(this.dom.outputCanvas, gridAnalysisData, cols, rows, {
      mode,
      paletteManager: this.paletteManager,
      textureData,
      textureType
    });
  }

  async handleExport() {
    if (!this.state.gridAnalysisData) return;

    const scale = parseInt(this.dom.exportScale.value, 10) || 2;
    const format = this.dom.exportFormat.value;
    const btn = this.dom.btnExport;
    const originalHTML = btn.innerHTML;

    try {
      btn.disabled = true;
      btn.innerHTML = `<span>Procesando ${scale}x...</span>`;
      this.showToast(`Generando exportación a ${scale}x...`, "info");

      const textureData = this.state.textureType === 'single'
        ? this.state.singleTextureBitmap
        : this.state.multiTextureBitmaps;

      await new Promise((r) => setTimeout(r, 60));

      await ArtExporter.exportHighRes(
        this.state.gridAnalysisData,
        this.state.cols,
        this.state.rows,
        this.dom.outputCanvas.width,
        this.dom.outputCanvas.height,
        {
          mode: this.state.mode,
          paletteManager: this.paletteManager,
          textureData,
          textureType: this.state.textureType
        },
        scale,
        format
      );

      this.showToast("Composición exportada.", "success");
    } catch (err) {
      this.showToast(`Fallo en la exportación: ${err.message}`, "error");
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalHTML;
    }
  }

  _updateStatus(text, isLoading = false) {
    this.dom.statusText.textContent = text;
    this.dom.statusText.style.opacity = isLoading ? '0.7' : '1';
  }

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    this.dom.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => {
        if (toast.parentElement) this.dom.toastContainer.removeChild(toast);
      }, 300);
    }, 3500);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new MosaicApp();
});
