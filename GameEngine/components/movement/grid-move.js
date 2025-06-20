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
    // Initialize global flag if not exists
    if (typeof window.gridMoveEnabled === "undefined") {
      window.gridMoveEnabled = false;
    }

    this.el.addEventListener("axismove", this.onAxisMove.bind(this));
    this.canExecuteEvent = true;

    console.log("Grid-move component initialized");
  },

  checkDamageCollision: function (currentPosition, potentialPosition) {
    try {
      const damageSprites = Array.from(
        document.querySelectorAll("[life-system]")
      );

      damageSprites.forEach((sprite) => {
        // Skip if sprite is the player or if it's not connected to the scene
        if (sprite.id === "player" || !sprite.isConnected) return;

        // Skip if life-system component is not available
        if (!sprite.components || !sprite.components["life-system"]) {
          console.warn(
            "Entity has life-system attribute but component is not loaded"
          );
          return;
        }

        try {
          const spritePos = sprite.object3D.position;
          const distance = Math.round(
            spritePos.distanceTo(currentPosition) / 10
          );

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
                console.log(
                  "Applying damage to entity:",
                  sprite.getAttribute("data-entity-id")
                );
                // Apply damage
                sprite.components["life-system"].takeDamage(10);
                sprite.components["life-system"].lastDamageTime = now;
              }
            }
          }
        } catch (error) {
          console.error(
            "Error processing entity in checkDamageCollision:",
            error
          );
        }
      });
    } catch (error) {
      console.error("Error in checkDamageCollision:", error);
    }
  },

  checkWallCollision: function (potentialPosition) {
    const baseLayer = getCurrentScene().data.find(
      (sceneLayer) => sceneLayer.layer === 0
    );
    if (!baseLayer) return true;

    const currentScene = getCurrentScene();
    const sceneSize =
      currentScene && currentScene.size ? parseInt(currentScene.size) : 10;
    const gridBlockSize = 10;

    // Calculate grid coordinates from world position using floor
    const gridX = Math.floor(
      potentialPosition.x / gridBlockSize + sceneSize / 2
    );
    const gridZ = Math.floor(
      potentialPosition.z / gridBlockSize + sceneSize / 2
    );

    // Enforce world boundaries when enabled
    if (currentScene.enableMapBorders) {
      if (gridX < 0 || gridX >= sceneSize || gridZ < 0 || gridZ >= sceneSize) {
        return true; // Collision with world boundary
      }
    }

    // Additional check: ensure grid indices are within the baseLayer data array.
    if (
      gridZ < 0 ||
      gridZ >= baseLayer.layerData.length ||
      gridX < 0 ||
      gridX >= baseLayer.layerData[0].length
    ) {
      return currentScene.enableMapBorders ? true : false;
    }

    // Check if there's a wall at this position
    try {
      const cellSpriteId = baseLayer.layerData[gridZ][gridX];
      if (cellSpriteId === "0" || cellSpriteId === "void") {
        return false; // No wall here.
      }

      // Find the sprite for this cell
      const sprite = findSpriteById(cellSpriteId);

      // Check for scene change trigger
      if (sprite && sprite.changeScene) {
        loadScene(sprite.changeScene);
        return true; // Prevent further movement.
      }

      // Check for collision with a wall
      if (sprite && sprite.collision) {
        return true;
      }

      return false; // Default to no collision.
    } catch (e) {
      console.error("Error checking collision:", e);
      return true;
    }
  },

  onAxisMove: function (evt) {
    // First check the global enable flag
    if (!window.gridMoveEnabled) return;

    // Then check the global lock
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

    // Only act if the thumbstick is tilted enough.
    if (Math.abs(x) < 0.5 && Math.abs(y) < 0.5) return;

    const gridBlockSize = 10; // Your grid cell size
    const currentPosition = new THREE.Vector3().copy(
      playerAux.object3D.position
    );

    // Determine the player's current grid cell based on world position.
    // Assuming the grid is aligned with world axes.
    const currentGridX = Math.round(currentPosition.x / gridBlockSize);
    const currentGridZ = Math.round(currentPosition.z / gridBlockSize);

    // Determine input offset from thumbstick.
    // We use a discrete value based on which axis is stronger.
    let inputDir = new THREE.Vector3(0, 0, 0);
    if (Math.abs(x) > Math.abs(y)) {
      inputDir.x = Math.sign(x);
    } else {
      inputDir.z = Math.sign(y);
    }

    // Rotate the input direction by the player's current Y rotation.
    const playerRotationY = playerAux.object3D.rotation.y;
    inputDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), playerRotationY);

    // Round the rotated direction to get a cardinal offset.
    let offsetX = Math.abs(inputDir.x) >= 0.5 ? Math.sign(inputDir.x) : 0;
    let offsetZ = Math.abs(inputDir.z) >= 0.5 ? Math.sign(inputDir.z) : 0;

    // Calculate the new grid cell.
    const newGridX = currentGridX + offsetX;
    const newGridZ = currentGridZ + offsetZ;

    // Convert back to world coordinates (using the grid cell centers).
    const potentialPosition = new THREE.Vector3(
      newGridX * gridBlockSize,
      currentPosition.y,
      newGridZ * gridBlockSize
    );

    let shouldUpdatePlayerPosition = true;
    if (this.checkWallCollision(potentialPosition)) {
      shouldUpdatePlayerPosition = false;
    }

    this.checkDamageCollision(currentPosition, potentialPosition);

    if (shouldUpdatePlayerPosition) {
      playerAux.object3D.position.copy(potentialPosition);
    }

    // Implement a cooldown mechanism.
    this.canExecuteEvent = false;
    setTimeout(() => (this.canExecuteEvent = true), 250);
  },
});

export default {};
