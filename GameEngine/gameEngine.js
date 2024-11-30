import {
  loadScene,
  initializeGameState,
  setCurrentScene,
  getCurrentScene,
} from "./core/scene-manager.js";
import { engineConstants } from "./engineConstants.js";
import { globalGameData } from "../GameEditor/gameEditor.js";

// Import components
import "./components/visual/pixelated.js";
import "./components/visual/face-camera-2d.js";
import "./components/visual/face-camera-3d.js";
import "./components/movement/grid-move.js";
import "./components/movement/custom-keyboard-controls.js";
import "./components/movement/rotation-control.js";

document.addEventListener("DOMContentLoaded", () => {
  console.log("--- Game Start ---");

  // Load saved game data if it exists
  const savedData = localStorage.getItem("gameData");
  if (savedData) {
    Object.assign(globalGameData, JSON.parse(savedData));
    initializeGameState(globalGameData);
  } else {
    initializeGameState(globalGameData);
  }

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
