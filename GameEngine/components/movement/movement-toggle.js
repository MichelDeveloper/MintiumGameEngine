AFRAME.registerComponent("movement-toggle", {
  init: function () {
    console.log("Movement toggle initialized");

    // Skip the keyboard listener - we'll use scene settings instead
    // this.el.sceneEl.addEventListener("keydown", this.onKeyDown.bind(this));

    // Apply initial movement mode based on scene settings
    this.applyMovementMode();

    // Listen for scene changes
    this.el.sceneEl.addEventListener(
      "scene-changed",
      this.applyMovementMode.bind(this)
    );
  },

  applyMovementMode: function () {
    // Get current scene
    const currentScene = window.getCurrentScene
      ? window.getCurrentScene()
      : null;
    if (!currentScene) return;

    // Get the movement mode from scene settings
    const movementMode = currentScene.movementMode || "grid";
    console.log(`Applying movement mode: ${movementMode}`);

    // Reset all movement modes first
    window.gridMoveEnabled = false;
    window.freeMoveEnabled = false;

    // Get player entity
    const playerEl = document.getElementById("player");
    if (!playerEl) return;

    // Get camera entity
    const cameraEl = document.getElementById("camera");
    if (!cameraEl) return;

    // Disable all movement components first
    if (playerEl.hasAttribute("ar-move")) {
      playerEl.setAttribute("ar-move", "enabled", false);
    }

    // Apply the selected movement mode
    switch (movementMode) {
      case "grid":
        window.gridMoveEnabled = true;
        window.freeMoveEnabled = false;

        // Disable camera look controls
        if (cameraEl) {
          cameraEl.setAttribute("look-controls", "enabled", false);
        }
        break;

      case "free":
        window.gridMoveEnabled = false;
        window.freeMoveEnabled = true;

        // Disable camera look controls
        if (cameraEl) {
          cameraEl.setAttribute("look-controls", "enabled", false);
        }
        break;

      case "ar":
        window.gridMoveEnabled = false;
        window.freeMoveEnabled = false;

        // Get the AR player scale from scene settings or use default
        const arPlayerScale = currentScene.arPlayerScale || 5.0;

        // Enable AR movement with free camera control and custom player scale
        if (!playerEl.hasAttribute("ar-move")) {
          playerEl.setAttribute("ar-move", "");
        }
        playerEl.setAttribute("ar-move", {
          enabled: true,
          playerScale: arPlayerScale,
        });

        // Enable camera look controls for AR movement
        if (cameraEl) {
          cameraEl.setAttribute("look-controls", "enabled", true);
        }
        break;
    }

    console.log(
      `Movement mode set: Grid=${window.gridMoveEnabled}, Free=${
        window.freeMoveEnabled
      }, AR=${movementMode === "ar"}`
    );
  },

  // Keep the original keydown handler for debugging/development but comment out its usage
  onKeyDown: function (event) {
    // For debugging only - allow keyboard toggle during development
    if (event.key.toLowerCase() === "v" && event.target.tagName !== "INPUT") {
      console.log("Manual movement toggle via keyboard (for debugging)");
      this.toggleMovementMode();
    }
  },

  toggleMovementMode: function () {
    // Debugging helper - cycle through modes
    // This is just for development, not used in production
    const playerEl = document.getElementById("player");
    if (!playerEl) return;

    if (window.gridMoveEnabled) {
      window.gridMoveEnabled = false;
      window.freeMoveEnabled = true;
      playerEl.setAttribute("ar-move", "enabled", false);
      console.log("Switched to Free Movement (manual)");
    } else if (window.freeMoveEnabled) {
      window.gridMoveEnabled = false;
      window.freeMoveEnabled = false;
      playerEl.setAttribute("ar-move", "enabled", true);
      console.log("Switched to AR Movement (manual)");
    } else {
      window.gridMoveEnabled = true;
      window.freeMoveEnabled = false;
      playerEl.setAttribute("ar-move", "enabled", false);
      console.log("Switched to Grid Movement (manual)");
    }
  },

  remove: function () {
    // Remove UI
    const hudElement = document.getElementById("movement-toggle-hud");
    if (hudElement) {
      document.body.removeChild(hudElement);
    }
  },
});
