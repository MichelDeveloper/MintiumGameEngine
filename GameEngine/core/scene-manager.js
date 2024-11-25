import { globalGameData } from "../../GameEditor/gameEditor.js";
import { engineConstants } from "../engineConstants.js";

export let currentScene = globalGameData.scenes[0];

function findSpriteById(spriteId) {
  return globalGameData.sprites.find((sprite) => sprite.id === spriteId);
}

// Updated Function to generate a texture from sprite data
function generateTexture(sprite) {
  const canvas = document.createElement("canvas");
  const gridSize = sprite.pixels.length; // Assuming square grid for sprite
  canvas.width = gridSize;
  canvas.height = gridSize;
  const ctx = canvas.getContext("2d");

  sprite.pixels.forEach((row, y) => {
    row.forEach((color, x) => {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1); // Fill in each pixel based on 2D array
    });
  });

  return canvas.toDataURL(); // Convert canvas drawing to data URL
}

// Updated function to create a single cube entity
function createCube(x, y, z, spriteId, type) {
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
  const container = document.getElementById("dynamic-content");
  container.appendChild(cubeEl); // Add to the container instead of the scene
}

// Updated function to initialize the scene with tiles based on game data
function loadScene(sceneId) {
  console.log("loadScene");
  // Reference to the A-Frame scene
  const sceneEl = document.querySelector("a-scene");

  const sceneContainer = document.createElement("a-entity"); // Create a new container
  sceneContainer.setAttribute("id", "game-scene");
  sceneEl.appendChild(sceneContainer); // Add the new container to the scene

  const newContainer = document.createElement("a-entity"); // Create a new container
  newContainer.setAttribute("id", "dynamic-content");
  sceneContainer.appendChild(newContainer); // Add the new container to the scene

  // Create essential elements and add them to the scene
  const playerEl = document.createElement("a-entity");
  playerEl.setAttribute("id", "player");
  playerEl.setAttribute("position", "0 1.5 0");
  //playerEl.setAttribute("keyboard-controls", "");

  const cameraEl = document.createElement("a-camera");
  playerEl.appendChild(cameraEl);

  const leftHandEl = document.createElement("a-entity");
  leftHandEl.setAttribute("id", "leftHand");
  leftHandEl.setAttribute("oculus-touch-controls", "hand: left");
  playerEl.appendChild(leftHandEl);

  const rightHandEl = document.createElement("a-entity");
  rightHandEl.setAttribute("id", "rightHand");
  rightHandEl.setAttribute("oculus-touch-controls", "hand: right");
  playerEl.appendChild(rightHandEl);

  const lightEl = document.createElement("a-light");
  lightEl.setAttribute("type", "ambient");
  lightEl.setAttribute("color", "#FFF");

  // Add the player and light back to the scene
  sceneContainer.appendChild(playerEl);
  sceneContainer.appendChild(lightEl);

  const newScene = globalGameData.scenes.find(
    (scene) => scene.sceneId === sceneId
  );
  if (!newScene) return;

  // Set the A-Frame scene's background color
  document
    .querySelector("a-scene")
    .setAttribute("background", `color: ${newScene.backgroundColor}`);

  // Position player based on spawn position
  const spawnPos = newScene.playerSpawnPosition;
  const gridOffset =
    engineConstants.TILE_SIZE * Math.round(engineConstants.TILE_SIZE / 2);
  const playerPosX = spawnPos.x * engineConstants.TILE_SIZE - gridOffset;
  const playerPosZ = spawnPos.z * engineConstants.TILE_SIZE - gridOffset;
  playerEl.setAttribute("position", `${playerPosX} 0 ${playerPosZ}`); // Adjust Y to ensure the player is slightly above the ground

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
  console.log(JSON.parse(JSON.stringify(globalGameData.scenes[0])));
}

function reloadGame() {
  const container = document.getElementById("game-scene");
  container.parentNode.removeChild(container); // Remove the container

  // Load the scene content
  loadScene(globalGameData.scenes[0].sceneId);
}

// Export all functions that other modules might need
export { findSpriteById, generateTexture, createCube, loadScene, reloadGame };
