AFRAME.registerComponent("show-hud-text", {
  schema: {
    text: { type: "string", default: "" },
    distance: { type: "number", default: 2 },
    viewAngle: { type: "boolean", default: true },
    // Optional offset for positioning relative to the camera.
    offset: { type: "vec3", default: { x: 0, y: -0.5, z: -2 } },
  },

  init: function () {
    this.currentOpacity = 0;
    // Create a new HUD text entity.
    this.hudText = document.createElement("a-entity");

    // Attach the overlay component to force it to render on top.
    this.hudText.setAttribute("overlay", "");

    // Set up the text attributes.
    this.hudText.setAttribute("text", {
      value: this.data.text,
      align: "center",
      width: 1.5,
      color: "#FFF",
      opacity: 0,
    });

    // Position the HUD text relative to its parent (camera).
    this.hudText.setAttribute(
      "position",
      `${this.data.offset.x} ${this.data.offset.y} ${this.data.offset.z}`
    );

    // Append the HUD text to the camera so that it stays fixed in view.
    // It's important that your scene has a camera with id="camera".
    const cameraEl = document.querySelector("#camera");
    if (cameraEl) {
      cameraEl.appendChild(this.hudText);
    } else {
      // Fallback: attach to the scene.
      this.el.sceneEl.appendChild(this.hudText);
    }

    // Get a reference to the camera.
    if (!this.el.sceneEl.hasLoaded) {
      this.el.sceneEl.addEventListener("loaded", this.initCamera.bind(this));
    } else {
      this.initCamera();
    }
  },

  initCamera: function () {
    this.camera = document.querySelector("#camera");
    if (!this.camera) {
      console.warn("Camera not found in initCamera");
    }
  },

  tick: function () {
    if (!this.camera || !this.data.text || !this.hudText) return;

    const worldPos = new THREE.Vector3();
    this.camera.object3D.getWorldPosition(worldPos);
    const distance = this.el.object3D.position.distanceTo(worldPos);

    // Get camera direction
    const cameraForward = new THREE.Vector3(0, 0, -1);
    this.camera.object3D.getWorldDirection(cameraForward);

    // Get direction to object
    const directionToObject = this.el.object3D.position
      .clone()
      .sub(worldPos)
      .normalize();

    // Calculate angle between camera direction and direction to object
    const angle = THREE.MathUtils.radToDeg(
      cameraForward.angleTo(directionToObject)
    );

    // Show text when looking at object (small angle means looking directly at it)
    const isNear =
      distance / 10 < this.data.distance &&
      ((angle > 140 && this.data.viewAngle) || this.data.viewAngle === false);

    const targetOpacity = isNear ? 1 : 0;
    this.currentOpacity = THREE.MathUtils.lerp(
      this.currentOpacity,
      targetOpacity,
      0.1
    );
    this.hudText.setAttribute("text", "opacity", this.currentOpacity);

    if (isNear) {
      this.hudText.setAttribute("text", "value", this.data.text);
    } else if (this.currentOpacity < 0.1) {
      this.hudText.setAttribute("text", "value", "");
    }
  },

  remove: function () {
    // Remove this HUD text from its parent when the component is removed.
    if (this.hudText && this.hudText.parentNode) {
      this.hudText.parentNode.removeChild(this.hudText);
    }
  },
});
