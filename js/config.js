export const APP_CONFIG = {
  MAX_ANALYSIS_DIMENSION: 1200,
  MAX_FILE_SIZE_BYTES: 15 * 1024 * 1024,

  GRID: {
    MIN_RESOLUTION: 15,
    MAX_RESOLUTION: 160,
    DEFAULT_RESOLUTION: 60
  },

  PALETTES: {
    lunar: {
      name: "Escala Lunar (Monocromático)",
      ranges: [
        { min: 0, max: 42, emoji: "⬛" },
        { min: 43, max: 85, emoji: "🌑" },
        { min: 86, max: 128, emoji: "🌘" },
        { min: 129, max: 171, emoji: "🌗" },
        { min: 172, max: 213, emoji: "🌖" },
        { min: 214, max: 255, emoji: "🌕" }
      ]
    },
    fruits: {
      name: "Bodegón de Frutas",
      ranges: [
        { min: 0, max: 50, emoji: "🫐" },
        { min: 51, max: 100, emoji: "🍇" },
        { min: 101, max: 150, emoji: "🍒" },
        { min: 151, max: 200, emoji: "🍊" },
        { min: 201, max: 235, emoji: "🍋" },
        { min: 236, max: 255, emoji: "🍌" }
      ]
    },
    expressive: {
      name: "Arquetipos y Expresiones",
      ranges: [
        { min: 0, max: 51, emoji: "🖤" },
        { min: 52, max: 102, emoji: "🕶️" },
        { min: 103, max: 153, emoji: "🤖" },
        { min: 154, max: 204, emoji: "😀" },
        { min: 205, max: 255, emoji: "✨" }
      ]
    },
    cyberpunk: {
      name: "Distopía Neón",
      ranges: [
        { min: 0, max: 63, emoji: "🟣" },
        { min: 64, max: 127, emoji: "🧿" },
        { min: 128, max: 191, emoji: "🟢" },
        { min: 192, max: 255, emoji: "⚡" }
      ]
    }
  }
};
