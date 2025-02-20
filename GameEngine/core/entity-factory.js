import { findSpriteById, generateTexture } from "./sprite-manager.js";
import { engineConstants } from "../engineConstants.js";

// Entity Creation
export function createCube(x, y, z, spriteId, type) {
  const sprite = findSpriteById(spriteId);
  if (!sprite) return; // Skip if sprite is not found

  const texture = generateTexture(sprite);
  let cubeEl;

  if (type === "block") {
    cubeEl = document.createElement("a-box");
    cubeEl.setAttribute("depth", "10");
    cubeEl.setAttribute("height", "10");
    cubeEl.setAttribute("width", "10");
  } else if (type === "billboard") {
    cubeEl = document.createElement("a-plane");
    cubeEl.setAttribute("height", "10");
    cubeEl.setAttribute("width", "10");
    cubeEl.setAttribute("face-camera-2d", "");
  }

  cubeEl.setAttribute("position", `${x * 10} ${y * 10} ${z * 10}`);
  cubeEl.setAttribute(
    "material",
    `src: url(${texture}) transparent: true; alphaTest: 0.5`
  );
  cubeEl.setAttribute("pixelated", "");
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
    });
  }
  const container = document.getElementById("dynamic-content");
  container.appendChild(cubeEl); // Add to the container instead of the scene
}

export function createPlayer() {
  const playerEl = document.createElement("a-entity");
  playerEl.setAttribute("id", "player");
  playerEl.setAttribute("position", "0 1.5 0");

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
