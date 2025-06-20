import {
  loadScene,
  initializeGameState,
  setCurrentScene,
  getCurrentScene,
} from "./core/scene-manager.js";
import { engineConstants } from "./engineConstants.js";

// Import components
import "./components/visual/pixelated.js";
import "./components/visual/face-camera-2d.js";
import "./components/visual/face-camera-3d.js";
import "./components/movement/grid-move.js";
import "./components/movement/custom-keyboard-controls.js";
import "./components/movement/rotation-control.js";
import "./components/interaction/show-text-near.js";
import "./components/interaction/show-hud-text.js";
import "./components/interaction/vr-grabbable.js";
import "./components/gameplay/life-system.js";
import "./components/gameplay/player-health.js";
import "./components/rendering/gaussian-splatting.js";
import "./components/rendering/mesh-rendering.js";
import "./components/movement/movement-toggle.js";
import "./components/movement/free-move.js";
import "./components/collision/raycast-collider.js";
import "./components/movement/ar-move.js";
import "./components/physics/physics-body.js";

let gameData;

async function initGameData() {
  // Check if we're in editor mode (gameEditor.js exists)
  try {
    const { globalGameData } = await import("../GameEditor/gameEditor.js");
    gameData = globalGameData;
  } catch {
    // We're in runtime mode, load from gameData.js
    try {
      const { gameData: defaultGameData } = await import("../gameData.js");
      gameData = defaultGameData;
    } catch (error) {
      console.error("Failed to load gameData.js:", error);
      // Load from gameData.json as fallback
      const response = await fetch("./gameData.json");
      gameData = await response.json();
    }
  }
  return gameData;
}

document.addEventListener("DOMContentLoaded", async () => {
  console.log("--- Game Start ---");

  await initGameData();
  console.log("Game data loaded:", gameData);

  // Check if we have the necessary scene containers
  const gameScene = document.getElementById("game-scene");
  const dynamicContent = document.getElementById("dynamic-content");

  if (!gameScene || !dynamicContent) {
    console.warn("WARNING: Missing scene containers. Creating them now...");

    // Create the containers if they don't exist
    const sceneEl = document.querySelector("a-scene");
    if (sceneEl) {
      // Only create if they don't exist
      if (!gameScene) {
        const newGameScene = document.createElement("a-entity");
        newGameScene.id = "game-scene";
        sceneEl.appendChild(newGameScene);
        console.log("Created missing game-scene container");
      }

      if (!dynamicContent) {
        const newDynamicContent = document.createElement("a-entity");
        newDynamicContent.id = "dynamic-content";
        (gameScene || document.getElementById("game-scene")).appendChild(
          newDynamicContent
        );
        console.log("Created missing dynamic-content container");
      }
    }
  }

  // Initialize game state
  initializeGameState(gameData);

  // Wait a moment for A-Frame to initialize before loading the scene
  setTimeout(() => {
    const currentScene = getCurrentScene();
    if (currentScene) {
      console.log("Loading initial scene:", currentScene.sceneId);
      loadScene(currentScene.sceneId);
    } else {
      console.error("No current scene available to load");
    }
  }, 200);

  const leftHand = document.getElementById("leftHand");
  const rightHand = document.getElementById("rightHand");

  if (leftHand && rightHand) {
    leftHand.setAttribute("grid-move", "");
    rightHand.setAttribute("rotation-control", "");
  } else {
    console.warn("VR controllers not found");
  }
});

// Export gameData for other modules
export { gameData };

// Add this function to handle XR mode changes
function enterCurrentXRMode() {
  const sceneEl = document.querySelector("a-scene");
  if (!sceneEl) return;

  // Get current scene
  const currentScene = getCurrentScene();
  if (!currentScene) return;

  // Get XR mode from current scene
  const xrMode = currentScene.xrMode || "vr";

  console.log(`Entering XR mode: ${xrMode}`);

  // Apply the appropriate mode
  if (xrMode === "vr") {
    if (!sceneEl.is("vr-mode")) {
      sceneEl.enterVR();
    }
  } else if (xrMode === "ar") {
    if (!sceneEl.is("ar-mode")) {
      sceneEl.enterAR();
    }
  }
}

// Make the function globally available
window.enterCurrentXRMode = enterCurrentXRMode;
