self.onmessage = function (e) {
  const { buffer, imgWidth, imgHeight, cols, rows } = e.data;

  if (!buffer || imgWidth <= 0 || imgHeight <= 0) {
    self.postMessage({ error: "Datos de imagen no válidos en el Worker" });
    return;
  }

  const pixels = new Uint8ClampedArray(buffer);
  const cellWidth = imgWidth / cols;
  const cellHeight = imgHeight / rows;
  const analysisResults = new Array(cols * rows);
  let cellIndex = 0;

  for (let r = 0; r < rows; r++) {
    const yStart = Math.floor(r * cellHeight);
    const yEnd = Math.min(Math.max(Math.floor((r + 1) * cellHeight), yStart + 1), imgHeight);

    for (let c = 0; c < cols; c++) {
      const xStart = Math.floor(c * cellWidth);
      const xEnd = Math.min(Math.max(Math.floor((c + 1) * cellWidth), xStart + 1), imgWidth);

      let sumR = 0, sumG = 0, sumB = 0, count = 0;

      for (let y = yStart; y < yEnd; y++) {
        const rowOffset = y * imgWidth * 4;
        for (let x = xStart; x < xEnd; x++) {
          const idx = rowOffset + x * 4;
          sumR += pixels[idx];
          sumG += pixels[idx + 1];
          sumB += pixels[idx + 2];
          count++;
        }
      }

      const avgR = count > 0 ? Math.round(sumR / count) : 0;
      const avgG = count > 0 ? Math.round(sumG / count) : 0;
      const avgB = count > 0 ? Math.round(sumB / count) : 0;
      const luminosity = Math.round(0.2126 * avgR + 0.7152 * avgG + 0.0722 * avgB);

      analysisResults[cellIndex++] = {
        col: c,
        row: r,
        avgColor: { r: avgR, g: avgG, b: avgB },
        luminosity: Math.max(0, Math.min(255, luminosity))
      };
    }
  }

  self.postMessage({ success: true, gridData: analysisResults, cols, rows });
};
