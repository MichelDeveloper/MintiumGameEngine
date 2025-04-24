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

      if (
        component.schema.hasOwnProperty("enabled") &&
        sprite[componentName].hasOwnProperty("enabled") &&
        sprite[componentName].enabled === false
      ) {
        console.log(
          `Skipping ${componentName} for ${sprite.id} - explicitly disabled`
        );
        return;
      }

      // Skip life-system if maxLife is 0 or less - TREAT AS DISABLED
      if (
        componentName === "life-system" &&
        (!sprite[componentName].maxLife || sprite[componentName].maxLife <= 0)
      ) {
        console.log(
          `Skipping ${componentName} for ${sprite.id} - disabled with maxLife=${sprite[componentName].maxLife}`
        );
        return;
      }

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

  // Add all movement components (they'll be enabled/disabled based on scene settings)
  playerEl.setAttribute("grid-move", "");
  playerEl.setAttribute("free-move", "");
  playerEl.setAttribute("ar-move", "enabled: false"); // Disabled by default

  // Add other player components
  playerEl.setAttribute("custom-keyboard-controls", "");
  playerEl.setAttribute("movement-toggle", "");

  // Add player health system with 100 health
  playerEl.setAttribute("player-health", "maxHealth: 100; currentHealth: 100");

  // Create camera in a way that's compatible with A-Frame 1.7.1 WebXR
  const cameraEl = document.createElement("a-entity");
  cameraEl.setAttribute("id", "camera");

  // Set camera component with appropriate properties
  cameraEl.setAttribute("camera", "");

  // Set camera height to approximate eye level (1.6m is standard for A-Frame)
  cameraEl.setAttribute("position", "0 1.6 0");

  // By default, disable look-controls (will be enabled for AR mode)
  cameraEl.setAttribute(
    "look-controls",
    "enabled: false; reverseMouseDrag: false"
  );

  // Add a way for the ar-move component to access the camera's intended height
  cameraEl.setAttribute("data-eye-height", "1.6");

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

  // FIX: In A-Frame 1.7.1, VR mode initialization can hang when camera is
  // deeply nested in the scene. Attach HUD to camera, but don't attach camera
  // to player until after scene is loaded to prevent WebXR initialization issues
  cameraEl.appendChild(hudEl);

  // Add event listener to attach camera after scene is loaded
  const scene = document.querySelector("a-scene");
  if (scene) {
    if (scene.hasLoaded) {
      setTimeout(() => {
        playerEl.appendChild(cameraEl);
        console.log("Camera attached to player (scene already loaded)");
      }, 100);
    } else {
      scene.addEventListener(
        "loaded",
        () => {
          setTimeout(() => {
            playerEl.appendChild(cameraEl);
            console.log("Camera attached to player (after scene loaded)");
          }, 100);
        },
        { once: true }
      );
    }
  }

  const leftHandEl = document.createElement("a-entity");
  leftHandEl.setAttribute("id", "leftHand");
  leftHandEl.setAttribute("oculus-touch-controls", "hand: left");
  // Add raycaster for detecting grabbable objects
  leftHandEl.setAttribute("raycaster", {
    showLine: true,
    far: 5,
    interval: 100,
    objects: ".grabbable",
    lineColor: "white",
    lineOpacity: 0.2,
  });
  playerEl.appendChild(leftHandEl);

  const rightHandEl = document.createElement("a-entity");
  rightHandEl.setAttribute("id", "rightHand");
  rightHandEl.setAttribute("oculus-touch-controls", "hand: right");
  // Add raycaster for detecting grabbable objects
  rightHandEl.setAttribute("raycaster", {
    showLine: true,
    far: 5,
    interval: 100,
    objects: ".grabbable",
    lineColor: "white",
    lineOpacity: 0.2,
  });
  playerEl.appendChild(rightHandEl);

  return playerEl;
}

export function createSceneContainer() {
  console.log("Creating scene container");

  // Check if the container already exists
  let container = document.getElementById("game-scene");
  if (container) {
    console.log("Game scene container already exists, reusing it");

    // Check if dynamic-content exists
    let dynamicContent = document.getElementById("dynamic-content");
    if (!dynamicContent) {
      console.log("Dynamic content container missing, creating it");
      dynamicContent = document.createElement("a-entity");
      dynamicContent.setAttribute("id", "dynamic-content");
      container.appendChild(dynamicContent);
    }

    return container;
  }

  // Create new container if it doesn't exist
  container = document.createElement("a-entity");
  container.setAttribute("id", "game-scene");

  // Create dynamic content container
  const dynamicContent = document.createElement("a-entity");
  dynamicContent.setAttribute("id", "dynamic-content");
  container.appendChild(dynamicContent);

  console.log("Created new scene containers");
  return container;
}

export function makeGrabbable(entity, options = {}) {
  // Add the grabbable class for raycaster detection
  entity.classList.add("grabbable");

  // Set default options if not provided
  const grabbableOptions = {
    enabled: options.enabled !== undefined ? options.enabled : true,
    highlight: options.highlight !== undefined ? options.highlight : true,
    highlightColor: options.highlightColor || "#FFFF00",
    grabDistance: options.grabDistance || 0.3,
    preserveRotation:
      options.preserveRotation !== undefined ? options.preserveRotation : true,
    snapToHand: options.snapToHand !== undefined ? options.snapToHand : true,
    rotationFactor: options.rotationFactor || 1.0,
  };

  // Add vr-grabbable component with options
  entity.setAttribute("vr-grabbable", grabbableOptions);

  return entity;
}
