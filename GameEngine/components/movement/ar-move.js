AFRAME.registerComponent("ar-move", {
  schema: {
    enabled: { type: "boolean", default: false },
    playerScale: { type: "number", default: 5.0 }, // Scale factor for the player
  },

  init: function () {
    console.log("AR Movement initialized");

    // Initialize state
    this.arMovementEnabled = this.data.enabled;
    this.playerScale = this.data.playerScale;
    this.originalScale = new THREE.Vector3(1, 1, 1);

    // Store initial position for reference
    this.initialPosition = new THREE.Vector3();
    this.initialHeadsetPosition = new THREE.Vector3();
    this.headsetOffset = new THREE.Vector3();

    // Store original scale
    if (this.el.object3D) {
      this.originalScale.copy(this.el.object3D.scale);
    }

    // Setup XR session listeners
    this.el.sceneEl.addEventListener(
      "enter-vr",
      this.onXRSessionStart.bind(this)
    );
    this.el.sceneEl.addEventListener("exit-vr", this.onXRSessionEnd.bind(this));
    this.el.sceneEl.addEventListener(
      "enter-ar",
      this.onXRSessionStart.bind(this)
    );
    this.el.sceneEl.addEventListener("exit-ar", this.onXRSessionEnd.bind(this));

    // Initial setup based on enabled state
    this.updateCameraControls();
    this.updatePlayerScale();
  },

  updateCameraControls: function () {
    // Find the camera
    const cameraEl = document.querySelector("#camera");
    if (!cameraEl) return;

    // Enable or disable look-controls based on AR movement mode
    if (this.arMovementEnabled) {
      console.log("Enabling camera look-controls for AR movement");
      cameraEl.setAttribute("look-controls", "enabled", true);
    } else {
      console.log("Disabling camera look-controls for standard movement");
      cameraEl.setAttribute("look-controls", "enabled", false);
    }
  },

  updatePlayerScale: function () {
    if (!this.el.object3D) return;

    if (this.arMovementEnabled) {
      // Scale up the player in AR mode
      console.log(`Scaling player to ${this.playerScale}x for AR mode`);
      this.el.object3D.scale.set(
        this.originalScale.x * this.playerScale,
        this.originalScale.y * this.playerScale,
        this.originalScale.z * this.playerScale
      );
    } else {
      // Restore original scale
      console.log("Restoring player to original scale");
      this.el.object3D.scale.copy(this.originalScale);
    }
  },

  onXRSessionStart: function () {
    if (!this.arMovementEnabled) return;

    // Apply the AR scale when entering XR
    this.updatePlayerScale();

    // Store initial positions when XR session starts
    this.initialPosition.copy(this.el.object3D.position);

    // Get the camera/headset position
    const camera = this.el.sceneEl.camera;
    if (camera) {
      this.initialHeadsetPosition.set(
        camera.position.x,
        0, // Ignore Y to keep player on ground
        camera.position.z
      );

      // Calculate initial offset
      this.headsetOffset
        .copy(this.initialPosition)
        .sub(this.initialHeadsetPosition);
    }

    console.log("XR session started, tracking real-world movement");
  },

  onXRSessionEnd: function () {
    // Reset scale when exiting XR
    if (this.arMovementEnabled) {
      this.el.object3D.scale.copy(this.originalScale);
    }
    console.log("XR session ended");
  },

  tick: function () {
    // Only apply in AR mode and when enabled
    if (
      !this.arMovementEnabled ||
      !(this.el.sceneEl.is("ar-mode") || this.el.sceneEl.is("vr-mode"))
    ) {
      return;
    }

    // Get current camera/headset position
    const camera = this.el.sceneEl.camera;
    if (!camera) return;

    // Calculate movement in world space
    const currentHeadsetPos = new THREE.Vector3(
      camera.position.x,
      0, // Ignore Y to keep player on ground
      camera.position.z
    );

    // Apply headset movement to player position (with initial offset)
    const newPosition = currentHeadsetPos.clone().add(this.headsetOffset);

    // Apply boundary limits if needed
    const currentScene = window.getCurrentScene
      ? window.getCurrentScene()
      : null;
    if (currentScene && currentScene.enableMapBorders) {
      const sceneSize = parseInt(currentScene.size || 10);
      const gridBlockSize = 10;
      const halfSize = (sceneSize * gridBlockSize) / 2;

      // Clamp position within scene boundaries
      newPosition.x = Math.max(-halfSize, Math.min(halfSize, newPosition.x));
      newPosition.z = Math.max(-halfSize, Math.min(halfSize, newPosition.z));
    }

    // Update player position, keeping original Y value
    this.el.object3D.position.x = newPosition.x;
    this.el.object3D.position.z = newPosition.z;
  },

  update: function (oldData) {
    // Update component properties
    this.arMovementEnabled = this.data.enabled;
    this.playerScale = this.data.playerScale;
    console.log(
      `AR Movement ${
        this.arMovementEnabled ? "enabled" : "disabled"
      } with player scale ${this.playerScale}x`
    );

    // Update camera controls and player scale
    this.updateCameraControls();
    this.updatePlayerScale();
  },

  remove: function () {
    // Restore original scale when component is removed
    if (this.el.object3D) {
      this.el.object3D.scale.copy(this.originalScale);
    }

    // Remove event listeners
    this.el.sceneEl.removeEventListener("enter-vr", this.onXRSessionStart);
    this.el.sceneEl.removeEventListener("exit-vr", this.onXRSessionEnd);
    this.el.sceneEl.removeEventListener("enter-ar", this.onXRSessionStart);
    this.el.sceneEl.removeEventListener("exit-ar", this.onXRSessionEnd);
  },
});
