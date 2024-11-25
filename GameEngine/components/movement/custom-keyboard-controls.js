import { currentScene } from "../../core/scene-manager.js";
import { loadScene } from "../../core/scene-manager.js";
import { globalGameData } from "../../../GameEditor/gameEditor.js";

AFRAME.registerComponent("custom-keyboard-controls", {
  init: function () {
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.keys = {};
    this.canExecuteEvent = true;

    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
  },

  remove: function () {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
  },

  onKeyDown: function (event) {
    this.keys[event.key.toLowerCase()] = true;
  },

  onKeyUp: function (event) {
    this.keys[event.key.toLowerCase()] = false;
  },

  tick: function () {
    if (!this.canExecuteEvent) return;

    const player = document.getElementById("player");
    if (!player) return;

    // Handle movement (WASD and Arrow keys)
    let directionVector = new THREE.Vector3(0, 0, 0);

    if (this.keys["w"] || this.keys["arrowup"]) directionVector.z = -1;
    if (this.keys["s"] || this.keys["arrowdown"]) directionVector.z = 1;
    if (this.keys["a"] || this.keys["arrowleft"]) directionVector.x = -1;
    if (this.keys["d"] || this.keys["arrowright"]) directionVector.x = 1;

    // Handle rotation (Q and E keys)
    if (this.keys["q"]) {
      const currentRotation = player.getAttribute("rotation");
      player.setAttribute("rotation", {
        x: currentRotation.x,
        y: currentRotation.y + 90,
        z: currentRotation.z,
      });
      this.addCooldown();
    }
    if (this.keys["e"]) {
      const currentRotation = player.getAttribute("rotation");
      player.setAttribute("rotation", {
        x: currentRotation.x,
        y: currentRotation.y - 90,
        z: currentRotation.z,
      });
      this.addCooldown();
    }

    // Handle movement if direction is set
    if (directionVector.length() > 0) {
      // Copy grid movement logic from grid-move component
      const gridBlockSize = 10;
      directionVector.multiplyScalar(gridBlockSize);

      const currentPosition = new THREE.Vector3().copy(
        player.object3D.position
      );
      const potentialPosition = currentPosition.add(directionVector);

      // Use the same collision detection logic as in grid-move
      // Reference the grid-move component's collision detection:
      startLine: 68;
      endLine: 117;

      this.addCooldown();
    }
  },

  addCooldown: function () {
    this.canExecuteEvent = false;
    setTimeout(() => (this.canExecuteEvent = true), 500);
  },
});

export default {};
