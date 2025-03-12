import { findSpriteById, generateTexture } from "./sprite-manager.js";
import { engineConstants } from "../engineConstants.js";

// Entity Creation
export async function createCube(x, y, z, spriteId, type) {
  const sprite = findSpriteById(spriteId);
  if (!sprite) return; // Skip if sprite is not found

  let size = "10";
  let yOffset = 0;
  if (sprite.size === "big") {
    size = "20";
    yOffset = 5;
  } else if (sprite.size === "small") {
    size = "5";
    yOffset = -2.5;
  }
  let cubeEl;
  if (type === "block") {
    cubeEl = document.createElement("a-box");
    cubeEl.setAttribute("depth", size);
    cubeEl.setAttribute("height", size);
    cubeEl.setAttribute("width", size);
  } else if (type === "billboard") {
    cubeEl = document.createElement("a-plane");
    cubeEl.setAttribute("height", size);
    cubeEl.setAttribute("width", size);
    cubeEl.setAttribute("face-camera-2d", "");
  } else if (type === "gaussian") {
    console.log("Creating gaussian splat entity for sprite:", spriteId);
    console.log("Sprite data:", sprite);

    cubeEl = document.createElement("a-entity");
    cubeEl.setAttribute("gaussian-splatting", {
      src: sprite.gaussianPath
        ? `Resources/GaussianSplatting/${sprite.gaussianPath}`
        : "train.splat",
    });

    // Make sure to also set the scale for the gaussian entity
    cubeEl.setAttribute("scale", `${size} ${size} ${size}`);
  }

  cubeEl.setAttribute("position", `${x * 10} ${y * 10 + yOffset} ${z * 10}`);

  // Store the sprite ID on the entity for reference
  cubeEl.setAttribute("data-entity-id", spriteId);

  // Only apply texture for non-gaussian types
  if (type !== "gaussian") {
    try {
      const texture = await generateTexture(sprite);
      // Set material properties separately
      cubeEl.setAttribute("material", {
        src: texture,
        transparent: true,
        alphaTest: 0.5,
        shader: "standard",
      });
    } catch (error) {
      console.error("Failed to generate texture:", error);
      cubeEl.setAttribute("material", {
        color: "red",
        shader: "standard",
      });
    }
  }

  if (sprite.lifePoints > 0) {
    console.log(
      "Adding life system to sprite:",
      sprite.id,
      "with life:",
      sprite.lifePoints
    );
    cubeEl.setAttribute("life-system", {
      maxLife: sprite.lifePoints,
      currentLife: sprite.lifePoints,
    });
  }

  // Only add pixelated component to non-gaussian types
  if (type !== "gaussian") {
    cubeEl.setAttribute("pixelated", "");
  }

  if (sprite.whenNearShowText && sprite.collision) {
    cubeEl.setAttribute("show-text-near", {
      text: sprite.whenNearShowText,
      distance: 2,
    });
  }

  if (sprite.hudText && sprite.collision) {
    cubeEl.setAttribute("show-hud-text", {
      text: sprite.hudText,
      distance: 2,
      viewAngle: true,
    });
  }

  const container = document.getElementById("dynamic-content");
  container.appendChild(cubeEl);

  return cubeEl;
}

export function createPlayer() {
  const playerEl = document.createElement("a-entity");
  playerEl.setAttribute("id", "player");
  playerEl.setAttribute("position", "0 1.5 0");
  // Add player health system with 100 health
  playerEl.setAttribute("player-health", "maxHealth: 100; currentHealth: 100");

  const cameraEl = document.createElement("a-camera");
  cameraEl.setAttribute("id", "camera");

  // Create HUD container
  const hudEl = document.createElement("a-entity");
  hudEl.setAttribute("id", "hud");
  hudEl.setAttribute("position", "0 0 -1");

  // Add HUD text
  const hudText = document.createElement("a-text");
  hudText.setAttribute("id", "hud-text");
  hudText.setAttribute("value", "");
  hudText.setAttribute("color", "#FFFFFF");
  hudText.setAttribute("align", "center");
  hudText.setAttribute("width", "1");
  hudText.setAttribute("position", "0 0 0");
  hudText.setAttribute("overlay", "true");

  hudEl.appendChild(hudText);
  cameraEl.appendChild(hudEl);
  playerEl.appendChild(cameraEl);

  const leftHandEl = document.createElement("a-entity");
  leftHandEl.setAttribute("id", "leftHand");
  leftHandEl.setAttribute("oculus-touch-controls", "hand: left");
  playerEl.appendChild(leftHandEl);

  const rightHandEl = document.createElement("a-entity");
  rightHandEl.setAttribute("id", "rightHand");
  rightHandEl.setAttribute("oculus-touch-controls", "hand: right");
  playerEl.appendChild(rightHandEl);

  return playerEl;
}

export function createSceneContainer() {
  const sceneContainer = document.createElement("a-entity");
  sceneContainer.setAttribute("id", "game-scene");

  const dynamicContent = document.createElement("a-entity");
  dynamicContent.setAttribute("id", "dynamic-content");
  sceneContainer.appendChild(dynamicContent);

  return sceneContainer;
}
