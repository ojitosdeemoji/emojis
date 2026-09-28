import { APP_CONFIG } from '../config.js';

export class PaletteManager {
  constructor() {
    this.palettes = JSON.parse(JSON.stringify(APP_CONFIG.PALETTES));
    this.currentPaletteKey = 'lunar';
    this.activeRanges = JSON.parse(JSON.stringify(this.palettes.lunar.ranges));
  }

  getAvailablePalettes() {
    return Object.keys(this.palettes).map((key) => ({ key, name: this.palettes[key].name }));
  }

  setPalette(key) {
    if (!this.palettes[key]) throw new Error(`Paleta ${key} no registrada.`);
    this.currentPaletteKey = key;
    this.activeRanges = JSON.parse(JSON.stringify(this.palettes[key].ranges));
  }

  updateEmojiForRange(index, emoji) {
    if (this.activeRanges[index] && emoji) {
      this.activeRanges[index].emoji = emoji;
    }
  }

  getEmojiForLuminosity(luminosity) {
    for (let i = 0; i < this.activeRanges.length; i++) {
      const range = this.activeRanges[i];
      if (luminosity >= range.min && luminosity <= range.max) return range.emoji;
    }
    return this.activeRanges[this.activeRanges.length - 1].emoji;
  }

  getActiveRanges() {
    return this.activeRanges;
  }
}
