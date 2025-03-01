AFRAME.registerComponent("player-health", {
  schema: {
    maxHealth: { type: "number", default: 100 },
    currentHealth: { type: "number", default: 100 },
  },

  init: function () {
    this.currentHealth = this.data.maxHealth;
    this.createHealthUI();
    this.gameActive = true;

    // Listen for player-death event to handle game over
    this.el.addEventListener("player-death", this.handleGameOver.bind(this));
  },

  createHealthUI: function () {
    // Create health bar container for the HUD
    const hudEl = document.createElement("a-entity");
    hudEl.setAttribute("id", "health-hud");
    hudEl.setAttribute("position", "0 -0.6 -1");
    hudEl.setAttribute("rotation", "0 0 0");
    hudEl.setAttribute("scale", "0.5 0.5 0.5");

    // Health bar background
    this.healthBg = document.createElement("a-plane");
    this.healthBg.setAttribute("color", "#333");
    this.healthBg.setAttribute("height", "0.1");
    this.healthBg.setAttribute("width", "0.5");
    this.healthBg.setAttribute("position", "0 0 0");

    // Health bar
    this.healthBar = document.createElement("a-plane");
    this.healthBar.setAttribute("color", "#0F0");
    this.healthBar.setAttribute("height", "0.08");
    this.healthBar.setAttribute("width", "0.48");
    this.healthBar.setAttribute("position", "0 0 0.001");

    // Add text to show health value
    this.healthText = document.createElement("a-text");
    this.healthText.setAttribute(
      "value",
      `${this.currentHealth}/${this.data.maxHealth}`
    );
    this.healthText.setAttribute("align", "center");
    this.healthText.setAttribute("color", "#FFF");
    this.healthText.setAttribute("position", "0 0 0.002");
    this.healthText.setAttribute("scale", "0.1 0.1 0.1");

    // Attach to scene
    hudEl.appendChild(this.healthBg);
    hudEl.appendChild(this.healthBar);
    hudEl.appendChild(this.healthText);

    // Attach to camera
    const camera = document.querySelector("#camera");
    if (camera) {
      camera.appendChild(hudEl);
    }
  },

  takeDamage: function (amount) {
    if (!this.gameActive) return;

    // Decrease health
    this.currentHealth = Math.max(0, this.currentHealth - amount);

    // Update health bar width
    const healthPercent = this.currentHealth / this.data.maxHealth;
    this.healthBar.setAttribute("width", 0.48 * healthPercent);

    // Update position to align left
    const xOffset = (0.48 - 0.48 * healthPercent) / 2;
    this.healthBar.setAttribute("position", `-${xOffset} 0 0.001`);

    // Update text
    this.healthText.setAttribute(
      "value",
      `${this.currentHealth}/${this.data.maxHealth}`
    );

    // Change color based on health
    if (healthPercent < 0.3) {
      this.healthBar.setAttribute("color", "#F00"); // Red when low
    } else if (healthPercent < 0.6) {
      this.healthBar.setAttribute("color", "#FF0"); // Yellow when medium
    }

    // Handle death
    if (this.currentHealth <= 0) {
      this.el.emit("player-death");
    }
  },

  handleGameOver: function () {
    this.gameActive = false;

    // Lock player movement immediately
    window.playerMovementLocked = true;

    // Hide the health UI immediately
    const healthHUD = document.querySelector("#health-hud");
    if (healthHUD) {
      healthHUD.setAttribute("visible", false);
    }

    // Add a visual death indicator before the game over screen
    this.showDeathIndicator();

    // Delay the game over screen by 2 seconds
    setTimeout(() => {
      this.showGameOverScreen();
    }, 2000); // 2 seconds delay
  },

  showDeathIndicator: function () {
    const camera = document.querySelector("#camera");
    if (!camera) return;

    // Create a red flash effect
    const flashEffect = document.createElement("a-plane");
    flashEffect.setAttribute("id", "death-flash");
    flashEffect.setAttribute("color", "#FF0000");
    flashEffect.setAttribute("opacity", "0.6");
    flashEffect.setAttribute("height", "2");
    flashEffect.setAttribute("width", "2");
    flashEffect.setAttribute("position", "0 0 -0.1");
    flashEffect.setAttribute("material", "shader: flat; transparent: true");

    // Add fade-out animation
    flashEffect.setAttribute("animation", {
      property: "opacity",
      from: "0.6",
      to: "0",
      dur: 2000,
      easing: "easeOutQuad",
    });

    camera.appendChild(flashEffect);

    // Remove the flash effect after animation
    setTimeout(() => {
      if (flashEffect.parentNode) {
        flashEffect.parentNode.removeChild(flashEffect);
      }
    }, 2000);
  },

  showGameOverScreen: function () {
    const camera = document.querySelector("#camera");
    if (!camera) return;

    // Create container for game over UI
    const gameOverContainer = document.createElement("a-entity");
    gameOverContainer.setAttribute("id", "game-over-screen");
    gameOverContainer.setAttribute("position", "0 0 -2");

    // Game over text
    const gameOverText = document.createElement("a-entity");
    gameOverText.setAttribute("text", {
      value: "GAME OVER",
      color: "#FF0000",
      align: "center",
      width: 2,
      wrapCount: 20,
      font: "mozillavr",
    });
    gameOverText.setAttribute("position", "0 0 0");
    gameOverText.setAttribute("scale", "1.5 1.5 1.5");

    // Add animation for emphasis
    gameOverText.setAttribute("animation__scale", {
      property: "scale",
      from: "0.5 0.5 0.5",
      to: "1.5 1.5 1.5",
      dur: 1000,
      easing: "easeOutElastic",
    });

    // Add pulsing animation
    gameOverText.setAttribute("animation__color", {
      property: "text.color",
      from: "#FF0000",
      to: "#880000",
      dur: 1500,
      dir: "alternate",
      loop: true,
      easing: "easeInOutSine",
    });

    // Add elements to container
    gameOverContainer.appendChild(gameOverText);

    // Add container to camera
    camera.appendChild(gameOverContainer);
  },

  heal: function (amount) {
    if (!this.gameActive) return;

    this.currentHealth = Math.min(
      this.data.maxHealth,
      this.currentHealth + amount
    );
    const healthPercent = this.currentHealth / this.data.maxHealth;
    this.healthBar.setAttribute("width", 0.48 * healthPercent);
    this.healthText.setAttribute(
      "value",
      `${this.currentHealth}/${this.data.maxHealth}`
    );

    // Update color
    if (healthPercent >= 0.6) {
      this.healthBar.setAttribute("color", "#0F0");
    } else if (healthPercent >= 0.3) {
      this.healthBar.setAttribute("color", "#FF0");
    }
  },
});
