import { globalGameData } from "../../GameEditor/gameEditor.js";
// THREE is already available through A-Frame
// No need to import it separately

// Cache for generated textures
const textureCache = new Map();

export function findSpriteById(spriteId) {
  return globalGameData.sprites.find((sprite) => sprite.id === spriteId);
}

/**
 * Finds all entities in the scene within a specified distance from a position
 * @param {THREE.Vector3} position - The position to measure distance from
 * @param {number} maxDistance - Maximum distance to search within (in world units)
 * @param {string} [attribute] - Optional attribute filter (only return entities with this attribute)
 * @returns {Array} Array of entities sorted by distance (closest first)
 */
export function findSpritesByDistance(position, maxDistance, attribute = null) {
  const sprites = [];
  const sceneEl = document.querySelector("a-scene");

  if (!sceneEl) return sprites;

  const entities = sceneEl.children;
  for (let i = 0; i < entities.length; i++) {
    const entity = entities[i];
    if (!entity.object3D) continue;

    // Skip if we're filtering by attribute and entity doesn't have it
    if (
      attribute &&
      (!entity.hasAttribute || !entity.hasAttribute(attribute))
    ) {
      continue;
    }

    const entityPos = new THREE.Vector3();
    entity.object3D.getWorldPosition(entityPos);

    const distance = position.distanceTo(entityPos);
    if (distance <= maxDistance) {
      sprites.push({ entity, distance });
    }
  }

  // Sort by distance (closest first)
  sprites.sort((a, b) => a.distance - b.distance);
  return sprites.map((sprite) => sprite.entity);
}

export async function generateTexture(sprite, isAttacking = false) {
  // Create cache key that includes whether this is an attack texture
  const cacheKey = `${sprite.id}_${isAttacking ? "attack" : "normal"}`;

  // Return cached texture if available
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey);
  }

  // Handle texture-based sprites
  if (sprite.textureType === "texture") {
    // Determine which image path to use (attack or normal)
    let imagePath;
    if (isAttacking && sprite.attackImage) {
      imagePath = sprite.attackImage;
    } else if (sprite.texturePath) {
      imagePath = sprite.texturePath;
    } else {
      // No valid texture path for texture-type sprite
      return generateFallbackTexture(sprite.color || "#ff0000");
    }

    try {
      // Create proper path to the texture
      const fullPath = `Resources/Textures/${imagePath}`;

      // Cache the result before returning
      textureCache.set(cacheKey, fullPath);
      return fullPath;
    } catch (error) {
      console.error("Error generating texture:", error);
      return generateFallbackTexture();
    }
  }
  // Handle pixel-based sprites
  else if (sprite.textureType === "pixels" && sprite.pixels) {
    try {
      const texture = generatePixelTexture(sprite.pixels);
      textureCache.set(cacheKey, texture);
      return texture;
    } catch (error) {
      console.error("Error generating pixel texture:", error);
      return generateFallbackTexture();
    }
  }
  // Fallback for any other case
  else {
    const texture = generateFallbackTexture(sprite.color || "#ff0000");
    textureCache.set(cacheKey, texture);
    return texture;
  }
}

function generatePixelTexture(pixels) {
  const canvas = document.createElement("canvas");
  const gridSize = pixels.length;
  canvas.width = gridSize;
  canvas.height = gridSize;
  const ctx = canvas.getContext("2d");

  // Draw each pixel onto the canvas
  pixels.forEach((row, y) => {
    row.forEach((color, x) => {
      ctx.fillStyle = color || "rgba(0,0,0,0)";
      ctx.fillRect(x, y, 1, 1);
    });
  });

  return canvas.toDataURL();
}

function generateFallbackTexture(color = "#ff0000") {
  const canvas = document.createElement("canvas");
  canvas.width = 8;
  canvas.height = 8;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 8, 8);
  return canvas.toDataURL();
}

// Function to update entity texture
export async function updateEntityTexture(entity, sprite, isAttacking = false) {
  try {
    const texture = await generateTexture(sprite, isAttacking);
    entity.setAttribute("material", {
      src: texture,
      transparent: true,
      alphaTest: 0.5,
      shader: "standard",
    });
  } catch (error) {
    console.error("Failed to update texture:", error);
  }
}
