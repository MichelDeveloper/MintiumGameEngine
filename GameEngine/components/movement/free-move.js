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

    // Calculate grid coordinates from world position
    const gridX = Math.floor(position.x / gridBlockSize + sceneSize / 2);
    const gridZ = Math.floor(position.z / gridBlockSize + sceneSize / 2);

    // Check for world boundaries
    if (
      gridX < 0 ||
      gridX >= sceneSize ||
      gridZ < 0 ||
      gridZ >= sceneSize ||
      position.x < -((sceneSize / 2) * gridBlockSize) ||
      position.z < -((sceneSize / 2) * gridBlockSize)
    ) {
      return true; // Collision with world boundary
    }

    // Check if there's a wall at this position
    try {
      const cellSpriteId = baseLayer.layerData[gridZ][gridX];
      if (cellSpriteId === "0" || cellSpriteId === "void") {
        return false; // No wall here
      }

      // Find the sprite for this cell
      const sprite = findSpriteById(cellSpriteId);

      // Check for collision property
      return sprite && sprite.collision;
    } catch (e) {
      console.error("Error checking collision:", e);
      return true; // Default to collision on error
    }
  },

  tick: function (time, delta) {
    // Skip if not enabled or movement is locked
    if (!window.freeMoveEnabled || window.playerMovementLocked) {
      return;
    }

    // Calculate direction from key input
    this.direction.set(0, 0, 0);

    // Get keyboard input
    const keys = this.getKeysState();

    // Handle WASD and arrow keys
    if (keys["w"] || keys["arrowup"]) this.direction.z -= 1;
    if (keys["s"] || keys["arrowdown"]) this.direction.z += 1;
    if (keys["a"] || keys["arrowleft"]) this.direction.x -= 1;
    if (keys["d"] || keys["arrowright"]) this.direction.x += 1;

    // If we have joystick input, override keyboard input
    if (this.joystickDirection && this.joystickDirection.length() > 0) {
      this.direction.copy(this.joystickDirection);
    }

    // Skip if no movement
    if (this.direction.length() === 0) {
      return;
    }

    // Normalize the direction vector for consistent speed
    if (this.direction.length() > 1) {
      this.direction.normalize();
    }

    // Calculate movement speed based on delta time
    const speed = this.data.speed * (delta / 16.667); // normalized for 60fps

    // Get the camera's rotation
    const rotation = this.el.object3D.rotation.y;

    // Apply camera rotation to movement direction
    this.direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation);

    // Calculate velocity
    this.velocity.copy(this.direction).multiplyScalar(speed);

    // Store last safe position
    this.lastSafePosition.copy(this.el.object3D.position);

    // Update position
    this.el.object3D.position.add(this.velocity);

    // Check for collisions with walls
    if (this.checkWallCollision(this.el.object3D.position)) {
      // Revert to last safe position if collision
      this.el.object3D.position.copy(this.lastSafePosition);
    } else {
      // Check for damage collisions using the grid-move component's method
      const gridMove = this.el.components["grid-move"];
      if (gridMove) {
        gridMove.checkDamageCollision(
          this.lastSafePosition,
          this.el.object3D.position
        );
      }
    }
  },
});
