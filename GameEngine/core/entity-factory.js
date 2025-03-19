import { findSpriteById, generateTexture } from "./sprite-manager.js";
import { engineConstants } from "../engineConstants.js";
import { ComponentRegistry } from "./component-registry.js";

// Entity Creation
export async function createCube(x, y, z, spriteId, type) {
  const sprite = findSpriteById(spriteId);
  if (!sprite) return; // Skip if sprite is not found

  let size = "10";
  let yOffset = 0;

  // Check for custom size first
  if (sprite.customSize && !isNaN(parseFloat(sprite.customSize))) {
    // Use the custom size if it exists and is a valid number
    size = sprite.customSize.toString();
    // Calculate proportional yOffset for custom sizes
    yOffset = (parseFloat(size) - 10) / 2;
  } else if (sprite.size === "big") {
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
    cubeEl = document.createElement("a-entity");
    cubeEl.setAttribute("gaussian-splatting", {
      src: sprite.gaussianPath
        ? `Resources/GaussianSplatting/${sprite.gaussianPath}`
        : "train.splat",
      pixelRatio: 0.5,
      xrPixelRatio: 0.5,
    });
    cubeEl.setAttribute("scale", `${size} ${size} ${size}`);
  } else if (type === "mesh") {
    cubeEl = document.createElement("a-entity");
    cubeEl.setAttribute("mesh-rendering", {
      src: sprite.meshPath
        ? `Resources/Models/${sprite.meshPath}`
        : "Resources/Models/default.glb",
      yOffset: sprite.meshYOffset || 0,
    });
    cubeEl.setAttribute("scale", `${size} ${size} ${size}`);
  }

  cubeEl.setAttribute("position", `${x * 10} ${y * 10 + yOffset} ${z * 10}`);

  // Store the sprite ID on the entity for reference
  cubeEl.setAttribute("data-entity-id", spriteId);

  // Only apply texture for non-gaussian types
  if (type !== "gaussian" && type !== "mesh") {
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

  // Only add pixelated component to non-gaussian types
  if (type !== "gaussian" && type !== "mesh") {
    cubeEl.setAttribute("pixelated", "");
  }

  // DYNAMIC COMPONENT HANDLING - Add components based on registry
  applyComponentsFromRegistry(cubeEl, sprite);

  const container = document.getElementById("dynamic-content");
  container.appendChild(cubeEl);

  return cubeEl;
}

// Helper function to dynamically apply components from registry
function applyComponentsFromRegistry(entity, sprite) {
  // Get all enabled components from registry
  const enabledComponents = ComponentRegistry.getEnabledComponents();

  // For each component, check if sprite has it and apply if it does
  enabledComponents.forEach((component) => {
    const componentName = component.name;

    // Check if sprite has this component data
    if (sprite[componentName]) {
      // Special case handling for components that require collision
      const requiresCollision = ["show-text-near", "show-hud-text"].includes(
        componentName
      );

      // Skip if requires collision but sprite doesn't have it
      if (requiresCollision && !sprite.collision) return;

      // If we reach here, we should apply the component
      console.log(`Applying ${componentName} to sprite:`, sprite.id);

      // Set the component with its data
      entity.setAttribute(componentName, sprite[componentName]);
    }
  });
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

  playerEl.setAttribute("free-move", { active: true });
  playerEl.setAttribute("grid-move", { active: false });
  playerEl.setAttribute("movement-toggle", "");

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
