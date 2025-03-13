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
import "./components/gameplay/life-system.js";
import "./components/gameplay/player-health.js";
import "./components/rendering/gaussian-splatting.js";
import "./components/rendering/mesh-rendering.js";

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

  // Initialize game state
  initializeGameState(gameData);
  loadScene(getCurrentScene().sceneId);

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
