import { getCurrentScene } from "../../core/scene-manager.js";
import {
  findSpriteById,
  updateEntityTexture,
} from "../../core/sprite-manager.js";

AFRAME.registerComponent("life-system", {
  schema: {
    maxLife: { type: "number", default: 0 },
    currentLife: { type: "number", default: 0 },
  },

  init: function () {
    if (this.data.maxLife <= 0) return;

    this.currentLife = this.data.maxLife;
    this.lastDamageTime = 0;
    this.createLifeBar();

    // Wait for scene to be ready
    if (!this.el.sceneEl.hasLoaded) {
      this.el.sceneEl.addEventListener("loaded", this.initCamera.bind(this));
    } else {
      this.initCamera();
    }

    // Listen for scene changes to reinitialize
    this.el.sceneEl.addEventListener(
      "scene-changed",
      this.handleSceneChanged.bind(this)
    );
  },

  initCamera: function () {
    this.camera = document.querySelector("#camera");
  },

  takeDamage: function (amount) {
    // Safety check - if health bar doesn't exist, try to recreate it
    if (!this.healthBar || !this.healthBar.isConnected) {
      console.log("Health bar missing, attempting to recreate");
      this.createLifeBar();

      // If still not available after recreating, exit
      if (!this.healthBar) {
        console.error("Cannot apply damage - health bar couldn't be created");
        return;
      }
    }

    // Update health value
    this.currentLife = Math.max(0, this.currentLife - amount);
    const healthPercent = this.currentLife / this.data.maxLife;
    const newWidth = 1.9 * healthPercent;

    try {
      // Update the width of the health bar
      this.healthBar.setAttribute("width", newWidth);

      // Calculate the new center position so the left edge stays fixed
      const baseLeft = -1.9 / 2; // For full health, left edge is at -0.95
      const newCenter = baseLeft + newWidth / 2;
      this.healthBar.setAttribute("position", `${newCenter} 0 0.01`);

      // Apply damage flash effect
      this.applyDamageFlash();

      // Show damage number effect immediately
      this.showDamageNumberEffect(amount);

      // Lock player movement during combat sequence
      this.lockPlayerMovement();

      // Check if enemy is still alive immediately
      if (this.currentLife <= 0) {
        // If enemy is dead, show death animation with delay then remove
        setTimeout(() => {
          this.removeFromScene();
          this.unlockPlayerMovement();
        }, 1000);
      } else {
        // Only counter-attack if the enemy is still alive
        setTimeout(() => {
          this.counterAttack();
        }, 1000); // 1000ms delay before counter-attack
      }
    } catch (error) {
      console.error("Error in takeDamage:", error);
      // Make sure player movement isn't locked if something fails
      this.unlockPlayerMovement();
    }
  },

  lockPlayerMovement: function () {
    // Find the player
    const player = document.querySelector("#player");
    if (!player) return;

    // Create a global lock flag
    window.playerMovementLocked = true;

    // Store original values to restore later
    this.originalMovementState = {
      gridMove: player.components["grid-move"]?.canExecuteEvent,
      keyboardControls:
        player.components["custom-keyboard-controls"]?.canExecuteEvent,
      rotationControl: player.components["rotation-control"]?.canExecuteEvent,
    };

    // Disable all movement components
    if (player.components["grid-move"]) {
      player.components["grid-move"].canExecuteEvent = false;
    }

    if (player.components["custom-keyboard-controls"]) {
      player.components["custom-keyboard-controls"].canExecuteEvent = false;
    }

    if (player.components["rotation-control"]) {
      player.components["rotation-control"].canExecuteEvent = false;
    }

    // Add a visual indicator that movement is locked
    this.addMovementLockedIndicator(player);
  },

  unlockPlayerMovement: function () {
    // Clear global lock flag
    window.playerMovementLocked = false;

    const player = document.querySelector("#player");
    if (!player || !this.originalMovementState) return;

    // Restore original movement state
    if (player.components["grid-move"]) {
      player.components["grid-move"].canExecuteEvent =
        this.originalMovementState.gridMove !== undefined
          ? this.originalMovementState.gridMove
          : true;
    }

    if (player.components["custom-keyboard-controls"]) {
      player.components["custom-keyboard-controls"].canExecuteEvent =
        this.originalMovementState.keyboardControls !== undefined
          ? this.originalMovementState.keyboardControls
          : true;
    }

    if (player.components["rotation-control"]) {
      player.components["rotation-control"].canExecuteEvent =
        this.originalMovementState.rotationControl !== undefined
          ? this.originalMovementState.rotationControl
          : true;
    }

    // Remove the movement locked indicator
    this.removeMovementLockedIndicator(player);
  },

  addMovementLockedIndicator: function (player) {
    const camera = document.querySelector("#camera");
    if (!camera) return;

    // Create a small indicator in the corner of the screen
    const lockIndicator = document.createElement("a-entity");
    lockIndicator.setAttribute("id", "movement-lock-indicator");
    lockIndicator.setAttribute("position", "0 -0.3 -1");
    lockIndicator.setAttribute("text", {
      value: "", //combat in progress message
      color: "#FF4444",
      align: "center",
      width: 1,
      wrapCount: 20,
    });

    camera.appendChild(lockIndicator);
  },

  removeMovementLockedIndicator: function (player) {
    const indicator = document.querySelector("#movement-lock-indicator");
    if (indicator && indicator.parentNode) {
      indicator.parentNode.removeChild(indicator);
    }
  },

  counterAttack: function () {
    // Find the player
    const player = document.querySelector("#player");
    if (!player) {
      this.unlockPlayerMovement();
      return;
    }

    // Check if player has health component
    const playerHealth = player.components["player-health"];
    if (!playerHealth) {
      this.unlockPlayerMovement();
      return;
    }

    // Calculate distance to player
    const distance = Math.round(
      this.el.object3D.position.distanceTo(player.object3D.position) / 10
    );

    // Only counter-attack if close enough
    if (distance < 3) {
      // Get entity's sprite data
      const entityId = this.el.getAttribute("data-entity-id");
      const sprite = entityId ? findSpriteById(entityId) : null;

      // Show attack animation if sprite has an attack image
      if (sprite && sprite.attackImage) {
        // Change to attack image
        updateEntityTexture(this.el, sprite, true);

        // Schedule change back to normal image
        setTimeout(() => {
          updateEntityTexture(this.el, sprite, false);
        }, 800); // Show attack image for 800ms
      }

      // Counter-attack damage can be based on enemy type or stats
      // For now we'll use a random damage between 5-15
      const damage = 5 + Math.floor(Math.random() * 11);

      // Apply damage to player
      playerHealth.takeDamage(damage);

      // Show visual feedback with damage amount
      this.showCounterAttackEffect(player, damage);

      // Unlock player movement after a delay
      setTimeout(() => {
        this.unlockPlayerMovement();
      }, 1000); // 1 second after counter-attack
    } else {
      // If not close enough, unlock immediately
      this.unlockPlayerMovement();
    }
  },

  showCounterAttackEffect: function (player, damage) {
    // Get the camera for better positioning
    const camera = document.querySelector("#camera");
    if (!camera) return;

    // Create a visible attack effect that appears in front of the player
    const attackEffect = document.createElement("a-entity");

    // Position it in the center of the view
    attackEffect.setAttribute("position", "0 0 -2");

    // Make text larger and more visible with damage amount
    attackEffect.setAttribute("text", {
      value: `-${damage} HP!`,
      align: "center",
      color: "#FF0000",
      wrapCount: 20,
      width: 3,
      baseline: "center",
      font: "mozillavr",
    });

    // Add animation for emphasis
    attackEffect.setAttribute("animation__scale", {
      property: "scale",
      from: "0.5 0.5 0.5",
      to: "1.5 1.5 1.5",
      dur: 300,
      easing: "easeOutBack",
    });

    attackEffect.setAttribute("animation__color", {
      property: "text.color",
      from: "#FFFFFF",
      to: "#FF0000",
      dur: 300,
      easing: "easeInOutSine",
      loop: 3,
    });

    // Attach to camera for visibility
    camera.appendChild(attackEffect);

    // Apply a shake effect to the camera
    camera.setAttribute("animation", {
      property: "position",
      from: "0 1.6 0",
      to: "0 1.6 0",
      dur: 200,
      easing: "easeInOutSine",
      dir: "alternate",
      loop: 3,
      startEvents: "shake",
    });
    camera.emit("shake");

    // Player health bar
    const playerHealth = player.components["player-health"];
    if (playerHealth && playerHealth.healthBar) {
      playerHealth.healthBar.setAttribute("animation", {
        property: "material.color",
        from: "#FF0000",
        to: playerHealth.healthBar.getAttribute("color"),
        dur: 500,
        easing: "easeOutQuad",
      });
    }

    // Remove effects after animation completes
    setTimeout(() => {
      if (attackEffect && attackEffect.parentNode) {
        attackEffect.parentNode.removeChild(attackEffect);
      }
    }, 1500);
  },

  showDamageNumberEffect: function (amount) {
    // Create a damage number that floats up from the enemy
    const damageText = document.createElement("a-entity");
    damageText.setAttribute("position", "0 4 0");

    // Set text properties
    damageText.setAttribute("text", {
      value: `-${amount}`,
      align: "center",
      color: "#ff0000", // Red for player damage
      width: 5,
      wrapCount: 10,
      baseline: "center",
      font: "mozillavr",
    });

    // Make sure text faces the camera
    damageText.setAttribute("face-camera-2d", "");

    // Add floating animation
    damageText.setAttribute("animation__position", {
      property: "position.y",
      from: 4,
      to: 5,
      dur: 1000,
      easing: "easeOutQuad",
    });

    // Add fade-out animation
    damageText.setAttribute("animation__opacity", {
      property: "text.opacity",
      from: 1.0,
      to: 0,
      dur: 1000,
      easing: "easeInQuad",
    });

    // Add a small random offset so multiple hits don't overlap exactly
    const randomX = (Math.random() - 0.5) * 1.5;
    damageText.setAttribute("position", `${randomX} 2 0`);

    // Add to the enemy entity
    this.el.appendChild(damageText);

    // Remove after animation completes
    setTimeout(() => {
      if (damageText.parentNode) {
        damageText.parentNode.removeChild(damageText);
      }
    }, 1000);
  },

  createLifeBar: function () {
    try {
      // Clean up any existing life bar elements
      if (this.lifeBarContainer && this.lifeBarContainer.parentNode) {
        this.lifeBarContainer.parentNode.removeChild(this.lifeBarContainer);
      }

      // Create a container for the health UI
      this.lifeBarContainer = document.createElement("a-entity");
      this.lifeBarContainer.setAttribute("position", "0 3 0");

      // Create a background plane for the health bar
      this.backgroundBar = document.createElement("a-plane");
      this.backgroundBar.setAttribute("color", "#333");
      this.backgroundBar.setAttribute("height", "0.3");
      this.backgroundBar.setAttribute("width", "2");
      this.backgroundBar.setAttribute("material", {
        shader: "standard",
        transparent: true,
        opacity: 0.8,
      });

      // Create the actual health bar
      this.healthBar = document.createElement("a-plane");
      this.healthBar.setAttribute("color", "#ff0000");
      this.healthBar.setAttribute("height", "0.25");
      this.healthBar.setAttribute("width", "1.9");
      this.healthBar.setAttribute("position", "0 0 0.01");
      this.healthBar.setAttribute("material", {
        shader: "standard",
        transparent: true,
        opacity: 0.9,
      });

      // Add elements to container
      this.lifeBarContainer.appendChild(this.backgroundBar);
      this.lifeBarContainer.appendChild(this.healthBar);

      // Add container to entity
      this.el.appendChild(this.lifeBarContainer);

      console.log(
        "Life bar created for entity",
        this.el.getAttribute("data-entity-id")
      );
    } catch (error) {
      console.error("Error creating life bar:", error);
    }
  },

  tick: function () {
    if (!this.camera || !this.lifeBarContainer) return;

    // Make life bar face camera
    const worldPos = new THREE.Vector3();
    this.camera.object3D.getWorldPosition(worldPos);
    this.lifeBarContainer.object3D.lookAt(worldPos);

    // Adjust opacity based on distance
    const distance = this.el.object3D.position.distanceTo(worldPos) / 10;
    const opacity = Math.min(1, Math.max(0.4, 1 - distance / 5));

    this.backgroundBar.setAttribute("material", "opacity", opacity * 0.8);
    this.healthBar.setAttribute("material", "opacity", opacity * 0.9);
  },

  removeFromScene: function () {
    // Logic to remove the sprite from the scene
    const baseLayer = getCurrentScene().data.find(
      (sceneLayer) => sceneLayer.layer === 0
    );

    if (baseLayer) {
      const gridBlockSize = 10;
      const gridX = Math.round(
        this.el.object3D.position.x / gridBlockSize +
          baseLayer.layerData[0].length / 2
      );
      const gridZ = Math.round(
        this.el.object3D.position.z / gridBlockSize +
          baseLayer.layerData.length / 2
      );

      if (
        gridZ >= 0 &&
        gridZ < baseLayer.layerData.length &&
        gridX >= 0 &&
        gridX < baseLayer.layerData[0].length
      ) {
        baseLayer.layerData[gridZ][gridX] = "0";
      }
    }

    // Unlock player movement before removing
    this.unlockPlayerMovement();

    if (this.el.parentNode) {
      this.el.parentNode.removeChild(this.el);
    }
  },

  // Add this new method to create damage flash effect
  applyDamageFlash: function () {
    try {
      // Get current material
      const currentMaterial = this.el.getAttribute("material");
      if (!currentMaterial) return;

      // Store original emissive color if not already stored
      if (!this.originalEmissive) {
        this.originalEmissive = currentMaterial.emissive || "#000000";
      }

      // Apply red emissive glow
      this.el.setAttribute("material", "emissive", "#ff0000");
      this.el.setAttribute("material", "emissiveIntensity", 0.25);

      // Flash 3 times
      let flashCount = 0;
      const flashInterval = setInterval(() => {
        // Check if entity still exists
        if (!this.el || !this.el.isConnected) {
          clearInterval(flashInterval);
          return;
        }

        // Toggle emissive between red and off
        if (flashCount % 2 === 0) {
          // Turn off red
          this.el.setAttribute("material", "emissive", this.originalEmissive);
          this.el.setAttribute("material", "emissiveIntensity", 0);
        } else {
          // Turn on red
          this.el.setAttribute("material", "emissive", "#ff0000");
          this.el.setAttribute("material", "emissiveIntensity", 0.25);
        }

        flashCount++;
        if (flashCount >= 6) {
          // 3 complete flashes (on-off cycles)
          clearInterval(flashInterval);
          // Ensure we end with the original state
          if (this.el && this.el.isConnected) {
            this.el.setAttribute("material", "emissive", this.originalEmissive);
            this.el.setAttribute("material", "emissiveIntensity", 0);
          }
        }
      }, 100); // 100ms per state change
    } catch (error) {
      console.error("Error in applyDamageFlash:", error);
    }
  },

  handleSceneChanged: function () {
    console.log("Scene changed, reinitializing life system");
    // Recreate health bar
    setTimeout(() => {
      if (this.el && this.el.isConnected) {
        this.createLifeBar();
      }
    }, 100); // Small delay to ensure DOM is ready
  },
});
