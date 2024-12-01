AFRAME.registerComponent("show-text-near", {
  schema: {
    text: { type: "string", default: "" },
    distance: { type: "number", default: 2 },
  },

  init: function () {
    this.textEntity = document.createElement("a-entity");
    this.textEntity.setAttribute("text", {
      value: this.data.text,
      align: "center",
      width: 4,
      color: "#FFFFFF",
      opacity: 0,
      wrapCount: 30,
      baseline: "center",
      anchor: "center",
      zOffset: 0.5,
    });
    this.textEntity.setAttribute("position", "0 2 0");
    this.textEntity.setAttribute("scale", "2 2 2");
    this.el.appendChild(this.textEntity);

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
    if (!this.camera || !this.data.text) return;

    // Update text entity to face camera
    const worldPos = new THREE.Vector3();
    this.camera.object3D.getWorldPosition(worldPos);
    this.textEntity.object3D.lookAt(worldPos);

    // Calculate distance
    const distance = Math.round(
      this.el.object3D.position.distanceTo(worldPos) / 10
    );
    const isNear = distance < this.data.distance;

    // Smooth opacity transition
    const targetOpacity = isNear ? 1 : 0;
    const currentOpacity = this.textEntity.getAttribute("text").opacity;
    const newOpacity = THREE.MathUtils.lerp(currentOpacity, targetOpacity, 0.1);

    this.textEntity.setAttribute("text", "opacity", newOpacity);
  },
});
