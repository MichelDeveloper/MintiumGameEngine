// Import game data
import { gameData } from "../gameData.js";
import { engineConstants } from "./engineConstants.js";
const sceneEl = document.querySelector("a-scene"); // Make sure this is accessible in the scope

// Initial declarations
var currentScene = gameData.scenes[0]; // Assuming the first scene for now
var player = document.getElementById("player");

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
    const currentPosition = new THREE.Vector3().copy(player.object3D.position);
    const potentialPosition = currentPosition.add(directionVector);

    const baseLayer = currentScene.data.find((sceneLayer) => sceneLayer.layer === 0)

    if(!baseLayer){
      return;
    }

    // Check for collision at the potential new position
    const gridX =
      Math.round(potentialPosition.x / gridBlockSize) +
      Math.floor(baseLayer.layerData[0].length / 2);
    const gridZ =
      Math.round(potentialPosition.z / gridBlockSize) +
      Math.floor(baseLayer.layerData.length / 2);

    const tileType = baseLayer.layerData[gridZ].charAt(gridX);
    const tileData = gameData.sprites[tileType];

    // Prevent moving outside the grid bounds
    if (
      gridX < 0 ||
      gridX >= baseLayer.layerData[0].length ||
      gridZ < 0 ||
      gridZ >= baseLayer.layerData.length
    ) {
      shouldUpdatePlayerPosition = false;
    }

    // If the tile has collision, prevent movement
    if (tileData && tileData.collision) {
      shouldUpdatePlayerPosition = false;
    }

    if (tileData?.changeScene) {
      loadScene(tileData.changeScene);
    }

    if (shouldUpdatePlayerPosition) {
      // Update player position if there's no collision
      player.object3D.position.copy(potentialPosition);
    }

    // Implement a cooldown mechanism
    this.canExecuteEvent = false;
    setTimeout(() => (this.canExecuteEvent = true), 500); // Delay for executing the events associated with the joystic movement
  },
});

AFRAME.registerComponent('face-camera-3d', {
  tick: function () {
    var cameraEl = document.querySelector('[camera]'); // Get the camera entity
    var cameraPos = new THREE.Vector3();
    cameraEl.object3D.getWorldPosition(cameraPos); // Get world position of the camera

    this.el.object3D.lookAt(cameraPos); // Make the entity face the camera
  }
});

AFRAME.registerComponent('face-camera-2d', {
  tick: function () {
    var cameraEl = this.el.sceneEl.camera.el;

    // Get the world rotation of the camera
    var cameraRotation = new THREE.Euler().setFromQuaternion(cameraEl.object3D.quaternion, 'YXZ');

    // Set the Y rotation of the billboard to match the camera's Y rotation
    this.el.object3D.rotation.y = cameraRotation.y;
  }
});


// Function to generate a texture from sprite data
function generateTexture(sprite) {
  const canvas = document.createElement("canvas");
  canvas.width = 8;
  canvas.height = 8;
  const ctx = canvas.getContext("2d");

  sprite.pixels.forEach((color, index) => {
    const x = index % 8;
    const y = Math.floor(index / 8);

    ctx.fillStyle = color;
    ctx.fillRect(x, y, 1, 1);
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
//   const newScene = gameData.scenes.find((scene) => scene.sceneId === sceneId);
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
//         const sprite = gameData.sprites[cell];
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

// Function to create a single cube entity, now with an added 'y' parameter for height
function createCube(x, y, z, sprite, type) {
  const texture = generateTexture(sprite);
  let cubeEl;

  if (type === "block") {
    // Create a box for block type
    cubeEl = document.createElement("a-box");
    cubeEl.setAttribute("depth", "10");
    cubeEl.setAttribute("height", "10");
    cubeEl.setAttribute("width", "10");
  } else if (type === "billboard") {
    // Create a plane for billboard type
    cubeEl = document.createElement("a-plane");
    cubeEl.setAttribute("height", "10");
    cubeEl.setAttribute("width", "10");
    // Ensure billboard always faces the camera
    cubeEl.setAttribute("face-camera-2d", ""); // Attach the custom face-camera component
  }

  // Common attributes for both types
  cubeEl.setAttribute("position", `${x * 10} ${y * 10} ${z * 10}`);
  cubeEl.setAttribute("material", `src: url(${texture}) transparent: true; alphaTest: 0.5`);

  // Apply pixelated texture for both types
  cubeEl.setAttribute("pixelated", "");
  sceneEl.appendChild(cubeEl);
}


// Updated initScene function to handle layers
function loadScene(sceneId) {
  const newScene = gameData.scenes.find((scene) => scene.sceneId === sceneId);
  if (newScene) {
    currentScene = newScene;

    // Set the A-Frame scene's background color
    document.querySelector('a-scene').setAttribute('background', `color: ${newScene.backgroundColor}`);

    // Position player based on spawn position
    const playerEl = document.getElementById("player");
    const spawnPos = newScene.playerSpawnPosition;
    const gridOffset =
      engineConstants.TILE_SIZE * Math.round(engineConstants.TILE_SIZE / 2);
    const playerPosX = spawnPos.x * engineConstants.TILE_SIZE - gridOffset;
    const playerPosZ = spawnPos.z * engineConstants.TILE_SIZE - gridOffset;
    playerEl.setAttribute("position", `${playerPosX} 0 ${playerPosZ}`); // Adjust Y to ensure the player is slightly above the ground

    newScene.data.forEach((sceneLayer) => {
      sceneLayer.layerData.forEach((row, rowIndex) => {
        row.split("").forEach((cell, cellIndex) => {
          if (cell === "0") return; // Skip void spaces
          const sprite = gameData.sprites[cell];
          if (sprite) {
            createCube(
              cellIndex - sceneLayer.layerData[0].length / 2,
              sceneLayer.layer,
              rowIndex - sceneLayer.layerData.length / 2,
              sprite,
              sprite.type
            );
          }
        });
      });
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("--- Game Start ---");
  const leftHand = document.getElementById("leftHand");
  leftHand.setAttribute("grid-move", "");
  loadScene(currentScene.sceneId);
});
