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
    this.healthBar.setAttribute("width", 1.9 * healthPercent);

    if (this.currentLife <= 0) {
      this.el.parentNode.removeChild(this.el);
    }
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
