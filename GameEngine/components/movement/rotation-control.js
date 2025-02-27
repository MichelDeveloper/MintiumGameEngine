AFRAME.registerComponent("rotation-control", {
  schema: {
    rotationAngle: { type: "number", default: 90 }, // Degrees per rotation
  },

  init: function () {
    this.el.addEventListener("axismove", this.onAxisMove.bind(this));
    this.canExecuteEvent = true;
  },

  onAxisMove: function (evt) {
    // First check the global lock
    if (window.playerMovementLocked) return;

    // Then check the component lock
    if (!this.canExecuteEvent) return;

    var playerAux = document.getElementById("player");
    if (!playerAux) {
      console.error("Player entity not found");
      return;
    }

    const axis = evt.detail.axis;
    const x = axis[2]; // X-axis of the right thumbstick

    // Only rotate if thumbstick is moved significantly
    if (Math.abs(x) > 0.7) {
      // Higher threshold for snap rotation
      const currentRotation = playerAux.getAttribute("rotation");
      const rotationAmount =
        x < 0 ? this.data.rotationAngle : -this.data.rotationAngle;

      playerAux.setAttribute("rotation", {
        x: currentRotation.x,
        y: currentRotation.y + rotationAmount,
        z: currentRotation.z,
      });

      // Add cooldown like in the grid-move component
      this.canExecuteEvent = false;
      setTimeout(() => (this.canExecuteEvent = true), 500);
    }
  },
});

export default {};
