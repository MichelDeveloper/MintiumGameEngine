import { loadScene, currentScene } from "./core/scene-manager.js";
import { engineConstants } from "./engineConstants.js";

// Import components
import "./components/visual/pixelated.js";
import "./components/visual/face-camera-2d.js";
import "./components/visual/face-camera-3d.js";
import "./components/movement/grid-move.js";
import "./components/movement/custom-keyboard-controls.js";
import "./components/movement/rotation-control.js";

document.addEventListener("DOMContentLoaded", () => {
  console.log("--- Game Start ---");
  loadScene(currentScene.sceneId);

  const leftHand = document.getElementById("leftHand");
  const rightHand = document.getElementById("rightHand");

  if (leftHand && rightHand) {
    leftHand.setAttribute("grid-move", "");
    rightHand.setAttribute("rotation-control", "");
  } else {
    console.warn("VR controllers not found");
  }
});
