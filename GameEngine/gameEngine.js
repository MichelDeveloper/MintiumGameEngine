// Import game data
import { globalGameData } from "../GameEditor/gameEditor.js";
import { engineConstants } from "./engineConstants.js";
//const sceneEl = document.querySelector("a-scene"); // Make sure this is accessible in the scope

// Initial declarations
var currentScene = globalGameData.scenes[0]; // Assuming the first scene for now
//var player = document.getElementById("player");

// Register the custom components
AFRAME.registerComponent("pixelated", {
  init: function () {
    this.el.addEventListener("materialtextureloaded", (e) => {
      const texture = e.detail.texture;
      texture.minFilter = THREE.NearestFilter;
      texture.magFilter = THREE.NearestFilter;
      texture.generateMipmaps = false;
      texture.needsUpdate = true;
    });
  },
});

AFRAME.registerComponent("grid-move", {
  schema: {
    speed: { type: "number", default: 1 }, // Units per movement
  },

  init: function () {
    this.el.addEventListener("axismove", this.onAxisMove.bind(this));
    this.canExecuteEvent = true;
  },

  onAxisMove: function (evt) {
    if (!this.canExecuteEvent) return;

    var playerAux = document.getElementById("player");
    if (!playerAux) {
      console.error("Player entity not found");
      return;
    }

    const axis = evt.detail.axis;
    const x = axis[2];
    const y = axis[3];
    let shouldUpdatePlayerPosition = true;

    // Determine the primary direction of the movement based on thumbstick tilt
    let directionVector = new THREE.Vector3(0, 0, 0);
    if (Math.abs(x) > Math.abs(y)) {
      directionVector.x = Math.sign(x);
    } else if (Math.abs(y) > 0.5) {
      directionVector.z = Math.sign(y);
    } else {
      // Thumbstick is in the dead zone or not tilted enough
      return;
    }

    // Quantize the movement to grid blocks
    const gridBlockSize = 10; // Assuming each grid block is 10 units
    directionVector.multiplyScalar(gridBlockSize);

    // Calculate potential new position
    const currentPosition = new THREE.Vector3().copy(
      playerAux.object3D.position
    );
    const potentialPosition = currentPosition.add(directionVector);

    const baseLayer = currentScene.data.find(
      (sceneLayer) => sceneLayer.layer === 0
    );

    if (!baseLayer) {
      return;
    }

    // Check for collision at the potential new position
    const gridX = Math.round(
      potentialPosition.x / gridBlockSize + baseLayer.layerData[0].length / 2
    );
    const gridZ = Math.round(
      potentialPosition.z / gridBlockSize + baseLayer.layerData.length / 2
    );

    if (
      gridZ < 0 ||
      gridZ >= baseLayer.layerData.length ||
      gridX < 0 ||
      gridX >= baseLayer.layerData[gridZ].length
    ) {
      console.error("Grid position out of bounds");
      return;
    }

    const tileType = baseLayer.layerData[gridZ][gridX]; // Directly access the tile type using array indexing

    if (!tileType) {
      console.error("Tile type is undefined");
      return;
    }

    const tileData = globalGameData.sprites.find(
      (sprite) => sprite.id === tileType
    );

    // If the tile has collision, prevent movement
    if (tileData && tileData.collision) {
      shouldUpdatePlayerPosition = false;
    }

    if (tileData?.changeScene) {
      loadScene(tileData.changeScene);
    }

    if (shouldUpdatePlayerPosition) {
      // Update player position if there's no collision
      playerAux.object3D.position.copy(potentialPosition);
    }

    // Implement a cooldown mechanism
    this.canExecuteEvent = false;
    setTimeout(() => (this.canExecuteEvent = true), 500); // Delay for executing the events associated with the joystick movement
  },
});

AFRAME.registerComponent("face-camera-3d", {
  tick: function () {
    var cameraEl = document.querySelector("[camera]"); // Get the camera entity
    var cameraPos = new THREE.Vector3();
    cameraEl.object3D.getWorldPosition(cameraPos); // Get world position of the camera

    this.el.object3D.lookAt(cameraPos); // Make the entity face the camera
  },
});

AFRAME.registerComponent("face-camera-2d", {
  tick: function () {
    var cameraEl = this.el.sceneEl.camera.el;

    // Get the world rotation of the camera
    var cameraRotation = new THREE.Euler().setFromQuaternion(
      cameraEl.object3D.quaternion,
      "YXZ"
    );

    // Set the Y rotation of the billboard to match the camera's Y rotation
    this.el.object3D.rotation.y = cameraRotation.y;
  },
});

AFRAME.registerComponent("rotation-control", {
  schema: {
    rotationAngle: { type: "number", default: 90 }, // Degrees per rotation
  },

  init: function () {
    this.el.addEventListener("axismove", this.onAxisMove.bind(this));
    this.canExecuteEvent = true;
  },

  onAxisMove: function (evt) {
    if (!this.canExecuteEvent) return;

    var playerAux = document.getElementById("player");
    if (!playerAux) {
      console.error("Player entity not found");
      return;
    }

    const axis = evt.detail.axis;
    const x = axis[2]; // X-axis of the right thumbstick

    // Only rotate if thumbstick is moved significantly
    if (Math.abs(x) > 0.7) {
      // Higher threshold for snap rotation
      const currentRotation = playerAux.getAttribute("rotation");
      const rotationAmount =
        x > 0 ? this.data.rotationAngle : -this.data.rotationAngle;

      playerAux.setAttribute("rotation", {
        x: currentRotation.x,
        y: currentRotation.y + rotationAmount,
        z: currentRotation.z,
      });

      // Add cooldown like in the grid-move component
      this.canExecuteEvent = false;
      setTimeout(() => (this.canExecuteEvent = true), 500);
    }
  },
});

// Function to find a sprite by its ID
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

// // Function to create a single cube entity
// function createCube(x, z, sprite, type) {
//   const texture = generateTexture(sprite);
//   const cubeEl = document.createElement("a-box");

//   cubeEl.setAttribute(
//     "position",
//     `${x * 10} ${type === "wall" ? 0 : -10} ${z * 10}`
//   );
//   cubeEl.setAttribute("material", `src: url(${texture})`);
//   cubeEl.setAttribute("depth", "10");
//   cubeEl.setAttribute("height", "10");
//   cubeEl.setAttribute("width", "10");

//   // Add the custom pixelated component
//   cubeEl.setAttribute("pixelated", "");

//   // // Set color based on type
//   // if (type === "wall") {
//   //   cubeEl.setAttribute("color", "#ff0000"); // Red for walls
//   // } else {
//   //   cubeEl.setAttribute("color", "#00ff00"); // Green for floors
//   // }

//   sceneEl.appendChild(cubeEl);
// }

// // Initialize the scene with tiles based on game data
// function loadScene(sceneId) {
//   const newScene = globalGameData.scenes.find((scene) => scene.sceneId === sceneId);
//   if (newScene) {
//     currentScene = newScene;
//     // Position player based on spawn position
//     const playerEl = document.getElementById("player");
//     const spawnPos = newScene.playerSpawnPosition;
//     const gridOffset =
//       engineConstants.TILE_SIZE * Math.round(engineConstants.TILE_SIZE / 2);
//     const playerPosX = spawnPos.x * engineConstants.TILE_SIZE - gridOffset;
//     const playerPosZ = spawnPos.z * engineConstants.TILE_SIZE - gridOffset;
//     playerEl.setAttribute("position", `${playerPosX} 0 ${playerPosZ}`); // Adjust Y to ensure the player is slightly above the ground

//     //Create cubes
//     newScene.data.forEach((row, rowIndex) => {
//       row.split("").forEach((cell, cellIndex) => {
//         const sprite = globalGameData.sprites[cell];
//         if (sprite) {
//           createCube(
//             cellIndex - newScene.data.length / 2,
//             rowIndex - row.length / 2,
//             sprite,
//             sprite.type
//           ); // Center the scene
//         }
//       });
//     });
//   }
// }

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

export function reloadGame() {
  const container = document.getElementById("game-scene");
  container.parentNode.removeChild(container); // Remove the container

  // Load the scene content
  loadScene(globalGameData.scenes[0].sceneId);
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("--- Game Start ---");
  loadScene(currentScene.sceneId);
  const leftHand = document.getElementById("leftHand");
  const rightHand = document.getElementById("rightHand");
  leftHand.setAttribute("grid-move", "");
  rightHand.setAttribute("rotation-control", "");
});
