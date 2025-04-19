AFRAME.registerComponent("ar-move", {
  schema: {
    enabled: { type: "boolean", default: false },
  },

  init: function () {
    // Initialize state with hardcoded values
    this.arMovementEnabled = this.data.enabled;
    this.playerScale = 5.0;

    // Floor offset values that work for the system
    this.defaultFloorOffset = -3.5;
    this.fineAdjustOffset = -0.0;

    // Initialize all vectors
    this.originalScale = new THREE.Vector3(1, 1, 1);
    this.originalPosition = new THREE.Vector3();
    this.initialPosition = new THREE.Vector3();
    this.initialHeadsetPosition = new THREE.Vector3();
    this.headsetOffset = new THREE.Vector3();

    // Store original scale and position
    if (this.el.object3D) {
      this.originalScale.copy(this.el.object3D.scale);
      this.originalPosition.copy(this.el.object3D.position);
    }

    // Floor tracking
    this.floorAligned = false;

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

    // Direct access to the camera element
    this.cameraEl = document.querySelector("#camera");

    // Initial setup based on enabled state
    this.updateCameraControls();
    this.updatePlayerScale();
  },

  updateCameraControls: function () {
    if (!this.cameraEl) {
      this.cameraEl = document.querySelector("#camera");
      if (!this.cameraEl) return;
    }

    // Enable or disable look-controls based on AR movement mode
    if (this.arMovementEnabled) {
      this.cameraEl.setAttribute("look-controls", "enabled", true);
    } else {
      this.cameraEl.setAttribute("look-controls", "enabled", false);
    }
  },

  updatePlayerScale: function () {
    if (!this.el.object3D) return;

    if (this.arMovementEnabled) {
      // Scale up the player in AR mode
      this.el.object3D.scale.set(
        this.originalScale.x * this.playerScale,
        this.originalScale.y * this.playerScale,
        this.originalScale.z * this.playerScale
      );
    } else {
      // Restore original scale
      this.el.object3D.scale.copy(this.originalScale);
    }
  },

  forceCameraHeight: function () {
    if (!this.cameraEl) {
      this.cameraEl = document.querySelector("#camera");
      if (!this.cameraEl) return;
    }

    // Apply the combined offset directly
    const finalPlayerY = this.defaultFloorOffset + this.fineAdjustOffset;

    // Set the player's Y position
    this.el.object3D.position.y = finalPlayerY;

    this.floorAligned = true;
  },

  onXRSessionStart: function () {
    if (!this.arMovementEnabled) return;

    // Apply the AR scale when entering XR
    this.updatePlayerScale();

    // Reset floor alignment flag
    this.floorAligned = false;

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

    // Set timer to align with floor after camera is fully initialized
    setTimeout(() => {
      this.forceCameraHeight();
    }, 500);
  },

  onXRSessionEnd: function () {
    // Reset when exiting XR
    if (this.arMovementEnabled) {
      // Restore original scale
      this.el.object3D.scale.copy(this.originalScale);

      // Restore original Y position
      this.el.object3D.position.y = this.originalPosition.y;
    }
  },

  tick: function () {
    // Only apply in AR mode and when enabled
    if (
      !this.arMovementEnabled ||
      !(this.el.sceneEl.is("ar-mode") || this.el.sceneEl.is("vr-mode"))
    ) {
      return;
    }

    // Attempt to align with floor if not done yet
    if (!this.floorAligned) {
      this.forceCameraHeight();
    }

    // Get current camera/headset position
    const camera = this.el.sceneEl.camera;
    if (!camera) return;

    // Calculate movement in world space (ignoring Y)
    const currentHeadsetPos = new THREE.Vector3(
      camera.position.x,
      0, // Ignore Y to keep player on ground level
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

    // Update player position, preserving the Y value we set for floor alignment
    this.el.object3D.position.x = newPosition.x;
    this.el.object3D.position.z = newPosition.z;
  },

  update: function (oldData) {
    // Update component properties
    this.arMovementEnabled = this.data.enabled;

    // Update camera controls and player scale
    this.updateCameraControls();
    this.updatePlayerScale();

    // Reset floor alignment flag to trigger realignment if needed
    this.floorAligned = false;
  },

  remove: function () {
    // Restore original scale and position when component is removed
    if (this.el.object3D) {
      this.el.object3D.scale.copy(this.originalScale);
      this.el.object3D.position.y = this.originalPosition.y;
    }

    // Remove event listeners
    this.el.sceneEl.removeEventListener("enter-vr", this.onXRSessionStart);
    this.el.sceneEl.removeEventListener("exit-vr", this.onXRSessionEnd);
    this.el.sceneEl.removeEventListener("enter-ar", this.onXRSessionStart);
    this.el.sceneEl.removeEventListener("exit-ar", this.onXRSessionEnd);
  },
});
