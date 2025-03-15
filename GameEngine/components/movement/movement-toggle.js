AFRAME.registerComponent("movement-toggle", {
  init: function () {
    // Initialize with free movement as default
    this.currentMode = "free";

    // Add keyboard listener for toggle
    this.onKeyDown = this.onKeyDown.bind(this);
    window.addEventListener("keydown", this.onKeyDown);

    // Create UI for toggle
    this.createToggleUI();

    // Apply initial mode
    this.applyMovementMode();

    console.log(
      "Movement toggle component initialized with mode:",
      this.currentMode
    );
  },

  createToggleUI: function () {
    // Create a HUD element for displaying current movement mode
    const hudContainer = document.createElement("div");
    hudContainer.id = "movement-toggle-hud";
    hudContainer.style.position = "fixed";
    hudContainer.style.bottom = "10px";
    hudContainer.style.right = "10px";
    hudContainer.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
    hudContainer.style.color = "white";
    hudContainer.style.padding = "5px 10px";
    hudContainer.style.borderRadius = "5px";
    hudContainer.style.fontFamily = "Arial, sans-serif";
    hudContainer.style.zIndex = "999";

    this.modeText = document.createElement("div");
    this.modeText.textContent = "Movement: Free (Press V to toggle)";

    hudContainer.appendChild(this.modeText);
    document.body.appendChild(hudContainer);
  },

  updateUI: function () {
    if (this.modeText) {
      this.modeText.textContent = `Movement: ${
        this.currentMode === "grid" ? "Grid" : "Free"
      } (Press V to toggle)`;
    }
  },

  onKeyDown: function (event) {
    // Toggle movement mode when V is pressed
    if (event.key.toLowerCase() === "v") {
      this.toggleMovementMode();
    }
  },

  toggleMovementMode: function () {
    // Toggle between grid and free movement
    this.currentMode = this.currentMode === "grid" ? "free" : "grid";
    console.log(`Switching to ${this.currentMode} movement mode`);

    // Apply the new mode
    this.applyMovementMode();

    // Update UI
    this.updateUI();
  },

  applyMovementMode: function () {
    // Direct DOM manipulation to ensure reliable updating
    if (this.currentMode === "grid") {
      // Enable grid movement
      window.gridMoveEnabled = true;
      window.freeMoveEnabled = false;
    } else {
      // Enable free movement
      window.gridMoveEnabled = false;
      window.freeMoveEnabled = true;
    }

    console.log("Updated global movement flags:", {
      grid: window.gridMoveEnabled,
      free: window.freeMoveEnabled,
    });
  },

  remove: function () {
    window.removeEventListener("keydown", this.onKeyDown);

    // Remove UI
    const hudElement = document.getElementById("movement-toggle-hud");
    if (hudElement) {
      document.body.removeChild(hudElement);
    }
  },
});
