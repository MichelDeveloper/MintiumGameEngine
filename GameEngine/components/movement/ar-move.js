AFRAME.registerComponent("ar-move", {
  schema: {
    enabled: { type: "boolean", default: false },
  },

  init: function () {
    console.log("AR Movement initialized");

    // Initialize state with hardcoded values
    this.arMovementEnabled = this.data.enabled;
    this.playerScale = 5.0; // Hardcoded scale

    // Manual floor offset - set to 0 initially, will be adjusted based on debug info
    this.manualFloorOffset = 0;

    // Extra floor offset - always applied as an additional adjustment
    this.extraFloorOffset = -3.5; // Extra offset

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

    // Make this component accessible globally for debugging
    window.arMoveComponent = this;

    // Expose adjustment method globally
    window.adjustFloorHeight = (amount) => {
      this.manualFloorOffset = amount; // Directly set the offset
      console.log(
        `Manual floor offset set to: ${this.manualFloorOffset} (plus extra offset: ${this.extraFloorOffset})`
      );
      this.forceCameraHeight();
      return this.manualFloorOffset;
    };

    // Expose a function to get WebXR details
    window.getXRInfo = () => {
      return this.logXRDetails();
    };

    // Start a debug interval to log position details
    this.debugInterval = setInterval(() => {
      if (
        this.arMovementEnabled &&
        (this.el.sceneEl.is("ar-mode") || this.el.sceneEl.is("vr-mode"))
      ) {
        this.logPositionDebug();
      }
    }, 3000);
  },

  logXRDetails: function () {
    // Get detailed info about the XR system
    const xrSession = this.el.sceneEl.xrSession;
    const xrSpace = this.el.sceneEl.xrSpace;
    const xrFrame = this.el.sceneEl.frame;

    console.log("============ XR DETAILS ============");
    console.log("Has XR Session:", !!xrSession);
    console.log("Has XR Space:", !!xrSpace);
    console.log("Has XR Frame:", !!xrFrame);

    if (xrSession) {
      console.log("XR Session Info:");
      console.log("- environmentBlendMode:", xrSession.environmentBlendMode);
      console.log("- visibilityState:", xrSession.visibilityState);
      console.log("- supportedFrameRates:", xrSession.supportedFrameRates);
      console.log("- renderState:", xrSession.renderState);

      // Try to access available reference spaces
      try {
        xrSession
          .requestReferenceSpace("local-floor")
          .then((space) => console.log("local-floor space available"))
          .catch((err) => console.log("local-floor space NOT available:", err));

        xrSession
          .requestReferenceSpace("local")
          .then((space) => console.log("local space available"))
          .catch((err) => console.log("local space NOT available:", err));

        xrSession
          .requestReferenceSpace("viewer")
          .then((space) => console.log("viewer space available"))
          .catch((err) => console.log("viewer space NOT available:", err));
      } catch (err) {
        console.log("Error checking reference spaces:", err);
      }
    }

    if (xrFrame) {
      console.log(
        "XR Frame available (can't detail contents for security reasons)"
      );
    }

    // Log a-scene properties
    const sceneEl = this.el.sceneEl;
    console.log("A-Scene XR Properties:");
    console.log("- is VR mode:", sceneEl.is("vr-mode"));
    console.log("- is AR mode:", sceneEl.is("ar-mode"));
    console.log("- camera:", !!sceneEl.camera);

    if (sceneEl.camera) {
      const camPos = sceneEl.camera.position;
      console.log(
        `- camera position: (${camPos.x.toFixed(3)}, ${camPos.y.toFixed(
          3
        )}, ${camPos.z.toFixed(3)})`
      );

      // This is the key value we need for floor alignment!
      console.log(`CAMERA Y POSITION: ${camPos.y.toFixed(3)}`);
    }

    console.log("====================================");

    return {
      cameraY: sceneEl.camera ? sceneEl.camera.position.y : null,
      isVRMode: sceneEl.is("vr-mode"),
      isARMode: sceneEl.is("ar-mode"),
      hasXRSession: !!xrSession,
    };
  },

  logPositionDebug: function () {
    // Log position data for debugging
    if (!this.cameraEl) {
      this.cameraEl = document.querySelector("#camera");
      if (!this.cameraEl) return;
    }

    // Get camera position data
    const cameraWorldPos = new THREE.Vector3();
    this.cameraEl.object3D.getWorldPosition(cameraWorldPos);

    const cameraLocalPos = this.cameraEl.getAttribute("position");
    const playerWorldPos = new THREE.Vector3();
    this.el.object3D.getWorldPosition(playerWorldPos);

    // Get XR camera position directly
    const xrCameraPos = this.el.sceneEl.camera
      ? this.el.sceneEl.camera.position
      : null;

    console.log("------------- Position Debug -------------");
    console.log(
      `Camera world pos: (${cameraWorldPos.x.toFixed(
        2
      )}, ${cameraWorldPos.y.toFixed(2)}, ${cameraWorldPos.z.toFixed(2)})`
    );
    console.log(
      `Camera local pos: (${cameraLocalPos.x}, ${cameraLocalPos.y}, ${cameraLocalPos.z})`
    );
    console.log(
      `Player world pos: (${playerWorldPos.x.toFixed(
        2
      )}, ${playerWorldPos.y.toFixed(2)}, ${playerWorldPos.z.toFixed(2)})`
    );

    if (xrCameraPos) {
      console.log(
        `XR Camera direct pos: (${xrCameraPos.x.toFixed(
          2
        )}, ${xrCameraPos.y.toFixed(2)}, ${xrCameraPos.z.toFixed(2)})`
      );
      console.log(`>>> XR CAMERA HEIGHT: ${xrCameraPos.y.toFixed(3)} <<<`);
    }

    console.log(`Manual floor offset: ${this.manualFloorOffset}`);
    console.log(`Floor aligned: ${this.floorAligned}`);
    console.log("------------------------------------------");

    return {
      cameraWorldY: cameraWorldPos.y,
      cameraLocalY: cameraLocalPos.y,
      playerWorldY: playerWorldPos.y,
      xrCameraY: xrCameraPos ? xrCameraPos.y : null,
    };
  },

  updateCameraControls: function () {
    if (!this.cameraEl) {
      this.cameraEl = document.querySelector("#camera");
      if (!this.cameraEl) return;
    }

    // Enable or disable look-controls based on AR movement mode
    if (this.arMovementEnabled) {
      console.log("Enabling camera look-controls for AR movement");
      this.cameraEl.setAttribute("look-controls", "enabled", true);
    } else {
      console.log("Disabling camera look-controls for standard movement");
      this.cameraEl.setAttribute("look-controls", "enabled", false);
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

  forceCameraHeight: function () {
    if (!this.cameraEl) {
      this.cameraEl = document.querySelector("#camera");
      if (!this.cameraEl) return;
    }

    // Get the current XR camera height - this is the critical value!
    const xrCameraY = this.el.sceneEl.camera
      ? this.el.sceneEl.camera.position.y
      : 1.6;

    console.log("------- APPLYING FLOOR OFFSET -------");
    console.log(`XR camera height detected: ${xrCameraY.toFixed(3)}`);

    // Local camera height in the player's coordinate system
    const localCameraHeight = this.cameraEl.getAttribute("position").y;
    console.log(`Local camera height: ${localCameraHeight}`);

    // Calculate the floor level: xrCameraY - localCameraHeight
    // This is how far below the camera the floor should be
    const calculatedFloorY = xrCameraY - localCameraHeight;
    console.log(`Calculated floor level: ${calculatedFloorY.toFixed(3)}`);

    // Apply manual offset and extra offset
    const finalPlayerY =
      calculatedFloorY + this.manualFloorOffset + this.extraFloorOffset;
    console.log(
      `Final player Y: ${finalPlayerY.toFixed(3)} (with manual offset ${
        this.manualFloorOffset
      } and extra offset ${this.extraFloorOffset})`
    );

    // Set the player's Y position
    this.el.object3D.position.y = finalPlayerY;

    // Log confirmation
    console.log(`Set player position to Y=${finalPlayerY.toFixed(3)}`);
    console.log("--------------------------------------");

    this.floorAligned = true;
  },

  onXRSessionStart: function () {
    if (!this.arMovementEnabled) return;

    console.log("XR session started");

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

    console.log("Tracking real-world movement");

    // Log XR details right away
    this.logXRDetails();

    // Set timer to align with floor after camera is fully initialized
    setTimeout(() => {
      this.logXRDetails();
      this.forceCameraHeight();
    }, 1000);

    // Try one more time after a longer delay
    setTimeout(() => {
      this.logXRDetails();
      this.forceCameraHeight();
    }, 3000);
  },

  onXRSessionEnd: function () {
    // Reset when exiting XR
    if (this.arMovementEnabled) {
      // Restore original scale
      this.el.object3D.scale.copy(this.originalScale);

      // Restore original Y position
      this.el.object3D.position.y = this.originalPosition.y;
    }

    console.log("XR session ended");
    clearInterval(this.debugInterval);
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

    console.log(
      `AR Movement ${
        this.arMovementEnabled ? "enabled" : "disabled"
      } with player scale ${this.playerScale}x`
    );

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

    // Clear intervals
    clearInterval(this.debugInterval);

    // Remove event listeners
    this.el.sceneEl.removeEventListener("enter-vr", this.onXRSessionStart);
    this.el.sceneEl.removeEventListener("exit-vr", this.onXRSessionEnd);
    this.el.sceneEl.removeEventListener("enter-ar", this.onXRSessionStart);
    this.el.sceneEl.removeEventListener("exit-ar", this.onXRSessionEnd);
  },
});
