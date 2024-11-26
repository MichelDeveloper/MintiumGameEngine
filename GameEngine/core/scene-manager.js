import { globalGameData } from "../../GameEditor/gameEditor.js";
import { engineConstants } from "../engineConstants.js";
import {
  createCube,
  createPlayer,
  createSceneContainer,
} from "./entity-factory.js";
import { findSpriteById } from "./sprite-manager.js";

export let currentScene = globalGameData.scenes[0];

export function loadScene(sceneId) {
  console.log("loadScene");
  const sceneEl = document.querySelector("a-scene");

  // Create and setup containers
  const sceneContainer = createSceneContainer();
  sceneEl.appendChild(sceneContainer);

  // Add player and lighting
  const playerEl = createPlayer();
  const lightEl = document.createElement("a-light");
  lightEl.setAttribute("type", "ambient");
  lightEl.setAttribute("color", "#FFF");

  sceneContainer.appendChild(playerEl);
  sceneContainer.appendChild(lightEl);

  // Load scene data
  const newScene = globalGameData.scenes.find(
    (scene) => scene.sceneId === sceneId
  );
  if (!newScene) return;

  // Set scene properties
  document
    .querySelector("a-scene")
    .setAttribute("background", `color: ${newScene.backgroundColor}`);

  // Position player
  const spawnPos = newScene.playerSpawnPosition;
  const gridOffset =
    engineConstants.TILE_SIZE * Math.round(engineConstants.TILE_SIZE / 2);
  playerEl.setAttribute(
    "position",
    `${spawnPos.x * engineConstants.TILE_SIZE - gridOffset} 0 ${
      spawnPos.z * engineConstants.TILE_SIZE - gridOffset
    }`
  );

  // Create scene objects
  newScene.data.forEach((sceneLayer) => {
    sceneLayer.layerData.forEach((row, rowIndex) => {
      row.forEach((cell, cellIndex) => {
        if (cell !== "0") {
          // Check for non-void spaces
          const sprite = findSpriteById(cell);
          if (sprite) {
            createCube(
              cellIndex - Math.floor(sceneLayer.layerData[0].length / 2),
              sceneLayer.layer,
              rowIndex - Math.floor(sceneLayer.layerData.length / 2),
              sprite.id,
              sprite.type
            );
          }
        }
      });
    });
  });
}

export function reloadGame() {
  const container = document.getElementById("game-scene");
  container.parentNode.removeChild(container); // Remove the container

  // Load the scene content
  loadScene(globalGameData.scenes[0].sceneId);
}
