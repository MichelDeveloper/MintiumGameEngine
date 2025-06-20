import { globalGameData } from "../../GameEditor/gameEditor.js";
import { engineConstants } from "../engineConstants.js";
import {
  createCube,
  createPlayer,
  createSceneContainer,
} from "./entity-factory.js";
import { findSpriteById } from "./sprite-manager.js";

let currentScene;

export function initializeGameState(initialGameData) {
  currentScene = initialGameData.scenes[0];
}

export function setCurrentScene(scene) {
  currentScene = scene;
}

export function getCurrentScene() {
  return currentScene;
}

export function loadScene(sceneId) {
  console.log("loadScene:", sceneId);

  // Wait for DOM to be ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => initScene(sceneId));
  } else {
    initScene(sceneId);
  }

  // Trigger a scene-changed event after everything is loaded
  setTimeout(() => {
    const sceneEl = document.querySelector("a-scene");
    if (sceneEl) {
      console.log("Dispatching scene-changed event");
      sceneEl.dispatchEvent(new CustomEvent("scene-changed"));
    }
  }, 300);
}

function initScene(sceneId) {
  console.log("Initializing scene:", sceneId);

  const sceneEl = document.querySelector("a-scene");
  if (!sceneEl) {
    console.error("A-Scene not found");
    return;
  }

  // Update current scene
  const newScene = globalGameData.scenes.find(
    (scene) => scene.sceneId === sceneId
  );
  if (!newScene) {
    console.error("Scene not found:", sceneId);
    return;
  }
  currentScene = newScene;
  console.log("Current scene set to:", currentScene.sceneId);

  // Get scene size (default to 10 if not set)
  const sceneSize = parseInt(newScene.size || 10);

  // Remove existing scene container if it exists
  const existingContainer = document.getElementById("game-scene");
  if (existingContainer) {
    console.log("Removing existing scene container");
    existingContainer.parentNode.removeChild(existingContainer);
  }

  // Create and setup containers
  const sceneContainer = createSceneContainer();
  console.log("Adding scene container to A-Frame scene");
  sceneEl.appendChild(sceneContainer);

  // Add player and lighting
  const playerEl = createPlayer();
  const lightEl = document.createElement("a-light");
  lightEl.setAttribute("type", "ambient");
  lightEl.setAttribute("color", "#FFF");

  sceneContainer.appendChild(playerEl);
  sceneContainer.appendChild(lightEl);

  // Set scene properties
  sceneEl.setAttribute("background", `color: ${newScene.backgroundColor}`);

  // Apply fog settings
  if (newScene.fogEnabled) {
    sceneEl.setAttribute("fog", {
      type: "exponential2",
      color: newScene.backgroundColor,
      near: 0,
      far: newScene.fogDistance * 1.5,
    });
  } else {
    // Remove fog if disabled
    sceneEl.removeAttribute("fog");
  }

  // Position player
  const spawnPos = newScene.playerSpawnPosition;
  const halfSize = Math.floor(sceneSize / 2);

  playerEl.setAttribute(
    "position",
    `${(spawnPos.x - halfSize) * engineConstants.TILE_SIZE} 0 ${
      (spawnPos.z - halfSize) * engineConstants.TILE_SIZE
    }`
  );

  // Create scene objects
  console.log("Building scene objects from layers:", newScene.data.length);

  // Double-check we have the dynamic-content container
  const container = document.getElementById("dynamic-content");
  if (!container) {
    console.error(
      "dynamic-content container not found, scene objects won't be created"
    );
    return;
  }

  try {
    let objectsCreated = 0;

    // Process each layer
    newScene.data.forEach((sceneLayer) => {
      // Process each cell in the layer
      sceneLayer.layerData.forEach((row, rowIndex) => {
        row.forEach((cell, cellIndex) => {
          if (cell !== "0") {
            const sprite = findSpriteById(cell);
            if (sprite) {
              createCube(
                cellIndex - halfSize,
                sceneLayer.layer,
                rowIndex - halfSize,
                sprite.id,
                sprite.type
              );
              objectsCreated++;
            } else {
              console.warn(`Sprite not found for ID: ${cell}`);
            }
          }
        });
      });
    });

    console.log(`Created ${objectsCreated} scene objects`);
  } catch (error) {
    console.error("Error creating scene objects:", error);
  }

  // Reattach controls to the new player entity
  const leftHand = document.getElementById("leftHand");
  const rightHand = document.getElementById("rightHand");
  if (leftHand && rightHand) {
    leftHand.setAttribute("grid-move", "");
    rightHand.setAttribute("rotation-control", "");
  }

  // Dispatch an event to indicate scene initialization is complete
  sceneEl.dispatchEvent(
    new CustomEvent("scene-initialized", { detail: { sceneId } })
  );
}

export function reloadGame(sceneId = currentScene.sceneId) {
  // If we're in the editor (no a-scene), just update the data
  const sceneEl = document.querySelector("a-scene");
  if (!sceneEl) {
    // We're in editor, just update currentScene
    const newScene = globalGameData.scenes.find(
      (scene) => scene.sceneId === sceneId
    );
    if (newScene) {
      currentScene = newScene;
    }
    return; // Don't try to reload the scene in editor
  }

  // If we're in the game, proceed with scene reload
  const container = document.getElementById("game-scene");
  if (container && container.parentNode) {
    container.parentNode.removeChild(container);
  }
  loadScene(sceneId);
}

// Add these lines to make functions globally available
window.getCurrentScene = getCurrentScene;
window.loadScene = loadScene;
window.reloadGame = reloadGame;
