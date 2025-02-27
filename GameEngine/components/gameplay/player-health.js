AFRAME.registerComponent("player-health", {
  schema: {
    maxHealth: { type: "number", default: 100 },
    currentHealth: { type: "number", default: 100 },
  },

  init: function () {
    this.currentHealth = this.data.maxHealth;
    this.createHealthUI();
  },

  createHealthUI: function () {
    // Create health bar container for the HUD
    const hudEl = document.createElement("a-entity");
    hudEl.setAttribute("id", "health-hud");
    hudEl.setAttribute("position", "0 -0.4 -1");
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

  heal: function (amount) {
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
