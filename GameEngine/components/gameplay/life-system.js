AFRAME.registerComponent("life-system", {
  schema: {
    maxLife: { type: "number", default: 0 },
    currentLife: { type: "number", default: 0 },
  },

  init: function () {
    console.log("Life system init called with data:", this.data);
    if (this.data.maxLife <= 0) return;

    console.log("Initializing life system with:", this.data.maxLife);
    this.currentLife = this.data.maxLife;
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
    this.lastDamageTime = 0;
  },

  tick: function () {
    if (!this.camera || !this.lifeBarContainer) return;

    // Make life bar face camera
    const worldPos = new THREE.Vector3();
    this.camera.object3D.getWorldPosition(worldPos);
    this.lifeBarContainer.object3D.lookAt(worldPos);

    // Calculate distance and check for damage
    const distance = Math.round(
      this.el.object3D.position.distanceTo(worldPos) / 10
    );

    const now = Date.now();
    if (distance < 2 && now - this.lastDamageTime > 1000) {
      // 1 second cooldown
      this.takeDamage(10);
      this.lastDamageTime = now;
    }
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
    // Create container for life bar
    this.lifeBarContainer = document.createElement("a-entity");
    this.lifeBarContainer.setAttribute("position", "0 3 0"); // Higher position

    // Background bar
    this.backgroundBar = document.createElement("a-plane");
    this.backgroundBar.setAttribute("color", "#333");
    this.backgroundBar.setAttribute("height", "0.3"); // Bigger
    this.backgroundBar.setAttribute("width", "2"); // Wider

    // Health bar
    this.healthBar = document.createElement("a-plane");
    this.healthBar.setAttribute("color", "#ff0000");
    this.healthBar.setAttribute("height", "0.25"); // Bigger
    this.healthBar.setAttribute("width", "1.9"); // Wider
    this.healthBar.setAttribute("position", "0 0 0.001");

    this.lifeBarContainer.appendChild(this.backgroundBar);
    this.lifeBarContainer.appendChild(this.healthBar);
    this.el.appendChild(this.lifeBarContainer);

    // Make life bar face camera
    this.lifeBarContainer.setAttribute("look-at", "#camera");
  },
});
