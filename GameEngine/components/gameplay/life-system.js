import { getCurrentScene } from "../../core/scene-manager.js";

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
  },

  initCamera: function () {
    this.camera = document.querySelector("#camera");
  },

  takeDamage: function (amount) {
    this.currentLife = Math.max(0, this.currentLife - amount);
    const healthPercent = this.currentLife / this.data.maxLife;
    const newWidth = 1.9 * healthPercent;

    // Update the width of the health bar
    this.healthBar.setAttribute("width", newWidth);

    // Calculate the new center position so the left edge stays fixed
    const baseLeft = -1.9 / 2; // For full health, left edge is at -0.95
    const newCenter = baseLeft + newWidth / 2;
    this.healthBar.setAttribute("position", `${newCenter} 0 0.01`);

    // Counter-attack the player
    this.counterAttack();

    if (this.currentLife <= 0) {
      // Existing logic to remove the sprite from the scene
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

      this.el.parentNode.removeChild(this.el);
    }
  },

  counterAttack: function () {
    // Find the player
    const player = document.querySelector("#player");
    if (!player) return;

    // Check if player has health component
    const playerHealth = player.components["player-health"];
    if (!playerHealth) return;

    // Calculate distance to player
    const distance = Math.round(
      this.el.object3D.position.distanceTo(player.object3D.position) / 10
    );

    // Only counter-attack if close enough
    if (distance < 3) {
      // Counter-attack damage can be based on enemy type or stats
      // For now we'll use a random damage between 5-15
      const damage = 5 + Math.floor(Math.random() * 11);

      // Apply damage to player
      playerHealth.takeDamage(damage);

      // Optional: Add visual feedback
      this.showCounterAttackEffect(player);
    }
  },

  showCounterAttackEffect: function (player) {
    // Get the camera for better positioning
    const camera = document.querySelector("#camera");
    if (!camera) return;

    // Create a visible attack effect that appears in front of the player
    const attackEffect = document.createElement("a-entity");

    // Position it in the center of the view
    attackEffect.setAttribute("position", "0 0 -2");

    // Make text larger and more visible
    attackEffect.setAttribute("text", {
      value: "Enemy Attack!",
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
      dur: 200,
      easing: "easeOutBack",
    });

    attackEffect.setAttribute("animation__color", {
      property: "text.color",
      from: "#FFFFFF",
      to: "#FF0000",
      dur: 200,
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

    // Player health bar flash
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
      if (attackEffect.parentNode) {
        attackEffect.parentNode.removeChild(attackEffect);
      }
      if (flashEffect.parentNode) {
        flashEffect.parentNode.removeChild(flashEffect);
      }
    }, 1500);
  },

  createLifeBar: function () {
    this.lifeBarContainer = document.createElement("a-entity");
    this.lifeBarContainer.setAttribute("position", "0 3 0");

    // Background bar
    this.backgroundBar = document.createElement("a-plane");
    this.backgroundBar.setAttribute("color", "#333");
    this.backgroundBar.setAttribute("height", "0.3");
    this.backgroundBar.setAttribute("width", "2");
    // Add depth and transparency settings
    this.backgroundBar.setAttribute("material", {
      shader: "standard",
      transparent: true,
      opacity: 0.8,
      depthTest: true,
    });

    // Health bar
    this.healthBar = document.createElement("a-plane");
    this.healthBar.setAttribute("color", "#ff0000");
    this.healthBar.setAttribute("height", "0.25");
    this.healthBar.setAttribute("width", "1.9");
    this.healthBar.setAttribute("position", "0 0 0.01"); // Slight offset
    // Add depth and transparency settings
    this.healthBar.setAttribute("material", {
      shader: "standard",
      transparent: true,
      opacity: 0.9,
      depthTest: true,
    });

    this.lifeBarContainer.appendChild(this.backgroundBar);
    this.lifeBarContainer.appendChild(this.healthBar);
    this.el.appendChild(this.lifeBarContainer);
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
});
