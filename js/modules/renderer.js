export class CanvasRenderer {
  static render(canvas, gridData, cols, rows, options) {
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.globalAlpha = 1;
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, width, height);

    const cellWidth = width / cols;
    const cellHeight = height / rows;

    if (options.mode === 'emoji') {
      this._renderEmojis(ctx, gridData, cellWidth, cellHeight, options.paletteManager);
    } else if (options.mode === 'texture') {
      this._renderTextures(ctx, gridData, cellWidth, cellHeight, options.textureData, options.textureType);
    }
  }

  static _renderEmojis(ctx, gridData, cellW, cellH, paletteManager) {
    if (!paletteManager) return;

    const fontSize = Math.floor(Math.min(cellW, cellH) * 0.9);
    ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const halfW = cellW / 2;
    const halfH = cellH / 2;

    for (let i = 0; i < gridData.length; i++) {
      const cell = gridData[i];
      const emoji = paletteManager.getEmojiForLuminosity(cell.luminosity);
      ctx.fillText(emoji, cell.col * cellW + halfW, cell.row * cellH + halfH);
    }
  }

  static _renderTextures(ctx, gridData, cellW, cellH, textureData, textureType) {
    if (!textureData) return;
    const total = gridData.length;

    if (textureType === 'single' && textureData instanceof ImageBitmap) {
      for (let i = 0; i < total; i++) {
        const cell = gridData[i];
        ctx.globalAlpha = cell.luminosity / 255;
        ctx.drawImage(textureData, cell.col * cellW, cell.row * cellH, cellW, cellH);
      }
      ctx.globalAlpha = 1;
    } else if (textureType === 'multi' && Array.isArray(textureData)) {
      for (let i = 0; i < total; i++) {
        const cell = gridData[i];
        let bitmap = null;

        if (cell.luminosity <= 85) {
          bitmap = textureData[0];
        } else if (cell.luminosity <= 170) {
          bitmap = textureData[1] || textureData[0];
        } else {
          bitmap = textureData[2] || textureData[1] || textureData[0];
        }

        if (bitmap) {
          ctx.drawImage(bitmap, cell.col * cellW, cell.row * cellH, cellW, cellH);
        }
      }
    }
  }
}
