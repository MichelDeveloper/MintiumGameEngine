AFRAME.registerComponent("show-hud-text", {
  schema: {
    text: { type: "string", default: "" },
    distance: { type: "number", default: 2 },
  },

  init: function () {
    this.hudText = document.querySelector("#hud-text");
    this.originalHudText = this.hudText.getAttribute("value");

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

  tick: function () {
    if (!this.camera || !this.data.text || !this.hudText) return;

    // Calculate distance
    const worldPos = new THREE.Vector3();
    this.camera.object3D.getWorldPosition(worldPos);
    const distance = Math.round(
      this.el.object3D.position.distanceTo(worldPos) / 10
    );
    const isNear = distance < this.data.distance;

    // Update HUD text when near
    if (isNear) {
      this.hudText.setAttribute("value", this.data.text);
    } else if (this.hudText.getAttribute("value") === this.data.text) {
      // Only reset if we were the ones who changed it
      this.hudText.setAttribute("value", this.originalHudText);
    }
  },

  remove: function () {
    if (this.hudText) {
      this.hudText.setAttribute("value", this.originalHudText);
    }
  },
});
