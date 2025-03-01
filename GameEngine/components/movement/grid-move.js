import { getCurrentScene, loadScene } from "../../core/scene-manager.js";
import { globalGameData } from "../../../GameEditor/gameEditor.js";
import {
  findSpriteById,
  updateEntityTexture,
} from "../../core/sprite-manager.js";

AFRAME.registerComponent("grid-move", {
  schema: {
    speed: { type: "number", default: 1 }, // Units per movement
  },

  init: function () {
    this.el.addEventListener("axismove", this.onAxisMove.bind(this));
    this.canExecuteEvent = true;
  },

  checkDamageCollision: function (currentPosition, potentialPosition) {
    const damageSprites = Array.from(
      document.querySelectorAll("[life-system]")
    );

    damageSprites.forEach((sprite) => {
      if (!sprite.components["life-system"]) return;

      const spritePos = sprite.object3D.position;
      const distance = Math.round(spritePos.distanceTo(currentPosition) / 10);

      if (distance < 2) {
        // Calculate movement direction vector
        const moveDirection = new THREE.Vector3()
          .subVectors(potentialPosition, currentPosition)
          .normalize();

        // Calculate vector pointing to sprite
        const toSprite = new THREE.Vector3()
          .subVectors(spritePos, currentPosition)
          .normalize();

        // Calculate angle between movement direction and direction to sprite
        const angle = moveDirection.angleTo(toSprite);

        // Convert angle to degrees (it's in radians by default)
        const degrees = THREE.MathUtils.radToDeg(angle);

        // Only damage if moving towards sprite (angle less than 45 degrees)
        if (degrees < 45) {
          const now = Date.now();
          const lastDamageTime =
            sprite.components["life-system"].lastDamageTime || 0;

          if (now - lastDamageTime > 1000) {
            // Apply damage
            sprite.components["life-system"].takeDamage(10);
            sprite.components["life-system"].lastDamageTime = now;
          }
        }
      }
    });
  },

  checkWallCollision: function (potentialPosition) {
    const baseLayer = getCurrentScene().data.find(
      (sceneLayer) => sceneLayer.layer === 0
    );

    if (!baseLayer) return true;

    const gridBlockSize = 10;
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
      return true;
    }

    const tileType = baseLayer.layerData[gridZ][gridX];
    if (!tileType) return true;

    const tileData = globalGameData.sprites.find(
      (sprite) => sprite.id === tileType
    );

    // Check if this is a scene change tile
    if (tileData && tileData.changeScene) {
      loadScene(tileData.changeScene);
      return true;
    }

    return tileData && tileData.collision;
  },

  onAxisMove: function (evt) {
    // First check the global lock
    if (window.playerMovementLocked) return;

    // Then check the component lock
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
    const potentialPosition = currentPosition.clone().add(directionVector);

    if (this.checkWallCollision(potentialPosition)) {
      shouldUpdatePlayerPosition = false;
    }

    this.checkDamageCollision(currentPosition, potentialPosition);

    if (shouldUpdatePlayerPosition) {
      playerAux.object3D.position.copy(potentialPosition);
    }

    // Implement a cooldown mechanism
    this.canExecuteEvent = false;
    setTimeout(() => (this.canExecuteEvent = true), 250);
  },
});

export default {};
