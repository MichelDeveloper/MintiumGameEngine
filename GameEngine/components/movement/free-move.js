import { getCurrentScene } from "../../core/scene-manager.js";
import { findSpriteById } from "../../core/sprite-manager.js";

AFRAME.registerComponent("free-move", {
  schema: {
    speed: { type: "number", default: 0.15 },
  },

  init: function () {
    // Initialize global flag if not exists
    if (typeof window.freeMoveEnabled === "undefined") {
      window.freeMoveEnabled = true;
    }

    console.log("Free-move component initialized");

    // Setup movement variables
    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();
    this.lastPosition = new THREE.Vector3();
    this.joystickDirection = new THREE.Vector3(0, 0, 0);

    // Set up VR controller input
    this.setupVRInput();

    // Use player's existing keyboard control system
    this.keyboardControls =
      document.getElementById("player").components["custom-keyboard-controls"];

    if (!this.keyboardControls) {
      console.error(
        "Cannot find custom-keyboard-controls component, falling back to direct key handling"
      );
      this.keys = {};
      // Bind methods
      this.onKeyDown = this.onKeyDown.bind(this);
      this.onKeyUp = this.onKeyUp.bind(this);

      // Add event listeners
      window.addEventListener("keydown", this.onKeyDown);
      window.addEventListener("keyup", this.onKeyUp);
    }

    // Store initial position for collision revert
    this.lastSafePosition = new THREE.Vector3();
    this.lastSafePosition.copy(this.el.object3D.position);
  },

  setupVRInput: function () {
    // CRITICAL FIX: In this system, leftHand has the grid-move component
    // We need to get input from the entity that has the actual controller input
    this.leftHand = document.getElementById("leftHand");
    if (this.leftHand) {
      // Bind the method to maintain 'this' context
      this.boundAxisMove = this.onAxisMove.bind(this);

      // Add event listener for joystick movement
      this.leftHand.addEventListener("axismove", this.boundAxisMove);
      console.log("VR controller input set up for free movement on leftHand");
    } else {
      console.warn("Left hand controller not found for free movement");
    }
  },

  onAxisMove: function (evt) {
    // Skip if free move is not enabled or player movement is locked
    if (!window.freeMoveEnabled || window.playerMovementLocked) {
      return;
    }

    const axis = evt.detail.axis;

    // CRITICAL FIX: Use the same axes as grid-move component (2 and 3)
    // This is for consistency with how the VR controllers are set up in this project
    const x = axis[2]; // Left thumbstick X-axis
    const y = axis[3]; // Left thumbstick Y-axis

    console.log("Free Move - Axis values:", axis);

    // Only process if thumbstick is moved significantly
    if (Math.abs(x) < 0.2 && Math.abs(y) < 0.2) {
      this.joystickDirection.set(0, 0, 0);
      return;
    }

    // Create a direction vector from the joystick input (matching grid-move's logic)
    // Important: In VR, the axes might be reversed compared to what you'd expect
    this.joystickDirection.set(x, 0, y);

    console.log("Free Move - Joystick direction:", this.joystickDirection);
  },

  onKeyDown: function (event) {
    // Only used as fallback if custom-keyboard-controls isn't found
    this.keys[event.key.toLowerCase()] = true;
  },

  onKeyUp: function (event) {
    // Only used as fallback if custom-keyboard-controls isn't found
    this.keys[event.key.toLowerCase()] = false;
  },

  remove: function () {
    // Only remove listeners if we added them
    if (!this.keyboardControls) {
      window.removeEventListener("keydown", this.onKeyDown);
      window.removeEventListener("keyup", this.onKeyUp);
    }

    // Remove VR controller listener
    if (this.leftHand && this.boundAxisMove) {
      this.leftHand.removeEventListener("axismove", this.boundAxisMove);
    }
  },

  getKeysState: function () {
    // Get key states either from custom-keyboard-controls or our local keys object
    if (this.keyboardControls) {
      return this.keyboardControls.keys;
    }
    return this.keys || {};
  },

  checkWallCollision: function (position) {
    const baseLayer = getCurrentScene().data.find(
      (sceneLayer) => sceneLayer.layer === 0
    );
    if (!baseLayer) return false;

    const currentScene = getCurrentScene();
    const sceneSize =
      currentScene && currentScene.size ? parseInt(currentScene.size) : 10;
    const gridBlockSize = 10;

    // Use Math.round to match grid-move
    const gridX = Math.round(position.x / gridBlockSize);
    const gridZ = Math.round(position.z / gridBlockSize);

    // If your grid array is zero-indexed and centered,
    // convert grid coordinates to array indices.
    // Assuming grid cell (0, 0) is at the center:
    const halfScene = Math.floor(sceneSize / 2);
    const indexX = gridX + halfScene;
    const indexZ = gridZ + halfScene;

    // Check boundaries based on array indices
    if (
      indexX < 0 ||
      indexX >= sceneSize ||
      indexZ < 0 ||
      indexZ >= sceneSize
    ) {
      return true; // Outside the grid boundaries
    }

    // Check for a wall in the base layer
    try {
      const cellSpriteId = baseLayer.layerData[indexZ][indexX];
      if (cellSpriteId === "0" || cellSpriteId === "void") {
        return false;
      }
      const sprite = findSpriteById(cellSpriteId);
      return sprite && sprite.collision;
    } catch (e) {
      console.error("Error checking collision:", e);
      return true;
    }
  },

  tick: function (time, delta) {
    if (!window.freeMoveEnabled || window.playerMovementLocked) {
      return;
    }

    // Reset and determine movement direction from keyboard input
    this.direction.set(0, 0, 0);
    const keys = this.getKeysState();
    if (keys["w"] || keys["arrowup"]) this.direction.z -= 1;
    if (keys["s"] || keys["arrowdown"]) this.direction.z += 1;
    if (keys["a"] || keys["arrowleft"]) this.direction.x -= 1;
    if (keys["d"] || keys["arrowright"]) this.direction.x += 1;

    // Override with joystick input if available
    if (this.joystickDirection && this.joystickDirection.length() > 0) {
      this.direction.copy(this.joystickDirection);
    }

    // No movement? Bail.
    if (this.direction.length() === 0) {
      return;
    }

    // Normalize direction and calculate movement velocity based on delta time
    if (this.direction.length() > 1) {
      this.direction.normalize();
    }
    const speed = this.data.speed * (delta / 16.667);
    const rotation = this.el.object3D.rotation.y;
    this.direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation);
    this.velocity.copy(this.direction).multiplyScalar(speed);

    // Calculate the new (potential) position
    const potentialPosition = this.el.object3D.position
      .clone()
      .add(this.velocity);

    // Define a margin offset (e.g., the collider radius)
    const margin = 1;
    // Offset the potential position by the normalized direction multiplied by margin
    const collisionCheckPos = potentialPosition
      .clone()
      .add(this.direction.clone().normalize().multiplyScalar(margin));

    // Only update if the collision check (with margin) passes
    if (!this.checkWallCollision(collisionCheckPos)) {
      this.lastSafePosition.copy(this.el.object3D.position);
      this.el.object3D.position.copy(potentialPosition);

      // Optionally check for damage collisions using grid-move's method
      const gridMove = this.el.components["grid-move"];
      if (gridMove) {
        gridMove.checkDamageCollision(
          this.lastSafePosition,
          this.el.object3D.position
        );
      }
    } else {
      // Optionally, log or handle the collision response here
    }
  },
});
