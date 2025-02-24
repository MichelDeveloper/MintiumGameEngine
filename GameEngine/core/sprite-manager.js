import { globalGameData } from "../../GameEditor/gameEditor.js";

export async function generateTexture(sprite) {
  if (sprite.textureType === "texture") {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img.src);
      img.onerror = () =>
        reject(new Error(`Failed to load texture: ${sprite.texturePath}`));
      img.src = `/Resources/Textures/${sprite.texturePath}`;
    });
  } else if (sprite.pixels) {
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
  } else {
    // Return a default texture for invalid sprites
    const canvas = document.createElement("canvas");
    canvas.width = 8;
    canvas.height = 8;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "red";
    ctx.fillRect(0, 0, 8, 8);
    return canvas.toDataURL();
  }
}

export function findSpriteById(spriteId) {
  return globalGameData.sprites.find((sprite) => sprite.id === spriteId);
}
