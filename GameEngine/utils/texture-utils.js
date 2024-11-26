export function generateTexture(sprite) {
  const canvas = document.createElement("canvas");
  const gridSize = sprite.pixels.length;
  canvas.width = gridSize;
  canvas.height = gridSize;
  const ctx = canvas.getContext("2d");

  sprite.pixels.forEach((row, y) => {
    row.forEach((color, x) => {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    });
  });

  return canvas.toDataURL();
}
