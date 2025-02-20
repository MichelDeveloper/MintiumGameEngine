import { getCurrentScene, loadScene } from "../../core/scene-manager.js";
import { globalGameData } from "../../../GameEditor/gameEditor.js";

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

    const playerAux = document.getElementById("player");
    if (!playerAux) {
      console.error("Player entity not found");
      return;
    }

    const axis = evt.detail.axis;
    const x = axis[2];
    const y = axis[3];
    let shouldUpdatePlayerPosition = true;

    // Determine the primary direction of the movement based on thumbstick tilt
    let inputDirection = new THREE.Vector3(0, 0, 0);
    if (Math.abs(x) > Math.abs(y)) {
      inputDirection.x = Math.sign(x);
    } else if (Math.abs(y) > 0.5) {
      inputDirection.z = Math.sign(y);
    } else {
      // Thumbstick is in the dead zone or not tilted enough
      return;
    }

    // Adjust the input direction by the player's current Y rotation
    const playerRotationY = playerAux.object3D.rotation.y;
    let directionVector = inputDirection.applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      playerRotationY
    );

    // Quantize the movement to grid blocks
    const gridBlockSize = 10; // Assuming each grid block is 10 units
    directionVector.multiplyScalar(gridBlockSize);

    // Calculate potential new position
    const currentPosition = new THREE.Vector3().copy(
      playerAux.object3D.position
    );
    const potentialPosition = currentPosition.add(directionVector);

    const baseLayer = getCurrentScene().data.find(
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

    const tileType = baseLayer.layerData[gridZ][gridX];

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
    setTimeout(() => (this.canExecuteEvent = true), 250);
  },
});

export default {};
