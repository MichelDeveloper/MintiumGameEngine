import { getCurrentScene, loadScene } from "../../core/scene-manager.js";
import { findSpriteById } from "../../core/sprite-manager.js";

AFRAME.registerComponent("free-move", {
  schema: {
    speed: { type: "number", default: 0.15 },
    gravity: { type: "boolean", default: true },
    fallSpeed: { type: "number", default: 0.15 },
    raycastDistance: { type: "number", default: 100 },
    rayOffsetX: { type: "number", default: 0 },
    rayOffsetZ: { type: "number", default: 0 },
    groundOffset: { type: "number", default: 5 },
    debugRay: { type: "boolean", default: false },
    maxStepHeight: { type: "number", default: 2.5 },
    groundedUpdateInterval: { type: "number", default: 10 },
    useRaycastColliders: { type: "boolean", default: true },
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

    // Set up the raycaster for ground detection
    this.raycaster = new THREE.Raycaster();

    // Track if player is on the ground
    this.isGrounded = false;

    // For ground height tracking
    this.previousGroundHeight = null;
    this._lastGroundHeight = null;
    this._lastRayX = null;
    this._lastRayZ = null;

    // Frame counter for initial forced updates
    this.frameCount = 0;
    this.isFalling = false;
    this.framesSinceLastFullCheck = 0;

    // For ground check timing
    this.timeSinceLastGroundCheck = 0;

    // For simplified ground checks
    this.lastGroundObject = null;
    this.groundObjectPosition = new THREE.Vector3();

    // Reset tracking on scene changes
    this.el.sceneEl.addEventListener("scene-changed", () => {
      this.previousGroundHeight = null;
      this._lastGroundHeight = null;
      this._lastRayX = null;
      this._lastRayZ = null;
      this.frameCount = 0;

      // Force an immediate ground check on scene change
      setTimeout(() => {
        this.lastSafePosition.copy(this.el.object3D.position);
        const groundHeight = this.findGroundHeight(
          this.el.object3D.position.x,
          this.el.object3D.position.z
        );
        if (groundHeight !== null) {
          this.el.object3D.position.y = groundHeight + this.data.groundOffset;
          this.isGrounded = true;
          this.previousGroundHeight = groundHeight;
          this._lastGroundHeight = groundHeight;
        }
      }, 100);
    });
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

    // Only process if thumbstick is moved significantly
    if (Math.abs(x) < 0.2 && Math.abs(y) < 0.2) {
      this.joystickDirection.set(0, 0, 0);
      return;
    }

    // Create a direction vector from the joystick input (matching grid-move's logic)
    // Important: In VR, the axes might be reversed compared to what you'd expect
    this.joystickDirection.set(x, 0, y);
  },

  onKeyDown: function (event) {
    if (event.key) {
      this.keys[event.key.toLowerCase()] = true;
    }
  },

  onKeyUp: function (event) {
    if (event.key) {
      this.keys[event.key.toLowerCase()] = false;
    }
  },

  remove: function () {
    if (this.leftHand && this.boundAxisMove) {
      this.leftHand.removeEventListener("axismove", this.boundAxisMove);
    }

    if (!this.keyboardControls) {
      window.removeEventListener("keydown", this.onKeyDown);
      window.removeEventListener("keyup", this.onKeyUp);
    }

    // Clean up debug visuals
    if (this.debugLine && this.debugLine.parent) {
      this.debugLine.parent.remove(this.debugLine);
    }
  },

  tick: function (time, delta) {
    // Skip if free move is not enabled or if player movement is locked
    if (!window.freeMoveEnabled || window.playerMovementLocked) {
      return;
    }

    // Get input direction - either from VR joystick or keyboard
    const inputDir = this.getInputDirection();

    // Skip if no movement input
    if (inputDir.lengthSq() === 0) {
      return;
    }

    // Calculate speed based on delta time for smooth movement
    const speed = this.data.speed * (delta / 16.67); // Normalize by expected frame time

    // Get player rotation - we need this to move relative to player's facing direction
    const rotation = this.el.object3D.rotation.y;

    // Apply rotation to input direction to get world-space direction
    this.direction.copy(inputDir);
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
    }

    // Apply gravity after horizontal movement is done
    if (this.data.gravity) {
      this.applyGravity(delta);
    }

    // Track time since last ground check
    this.timeSinceLastGroundCheck += delta;
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

    // Check scene boundaries
    if (gridX < 0 || gridX >= sceneSize || gridZ < 0 || gridZ >= sceneSize) {
      return true; // Collision with world boundary
    }

    // Check for wall collision (sprite with collision property)
    try {
      const cellValue = baseLayer.layerData[gridZ][gridX];
      if (cellValue && cellValue !== "0") {
        const sprite = findSpriteById(cellValue);
        if (sprite && sprite.collision) {
          return true; // Collision with a wall sprite
        }
      }
    } catch (error) {
      console.error("Error checking wall collision:", error);
    }

    return false; // No collision
  },

  getInputDirection: function () {
    const direction = new THREE.Vector3();

    // If we have joystick input, use that
    if (this.joystickDirection.lengthSq() > 0) {
      direction.copy(this.joystickDirection);
    }
    // Otherwise, check keyboard input
    else if (this.keyboardControls) {
      // Use the keyboardControls system's key state
      const keys = this.keyboardControls.keys;
      if (keys["w"] || keys["arrowup"]) direction.z -= 1;
      if (keys["s"] || keys["arrowdown"]) direction.z += 1;
      if (keys["a"] || keys["arrowleft"]) direction.x -= 1;
      if (keys["d"] || keys["arrowright"]) direction.x += 1;
    }
    // Fallback to direct key handling
    else if (this.keys) {
      if (this.keys["w"] || this.keys["arrowup"]) direction.z -= 1;
      if (this.keys["s"] || this.keys["arrowdown"]) direction.z += 1;
      if (this.keys["a"] || this.keys["arrowleft"]) direction.x -= 1;
      if (this.keys["d"] || this.keys["arrowright"]) direction.x += 1;
    }

    // Normalize so that diagonal movement isn't faster
    if (direction.lengthSq() > 0) {
      direction.normalize();
    }

    return direction;
  },

  findGroundHeight: function (x, z) {
    // Don't raycast every frame when player isn't moving much and is already grounded
    if (
      this.isGrounded &&
      this.data.groundedUpdateInterval > 0 &&
      this._lastGroundHeight !== null &&
      this._lastRayX !== null &&
      this._lastRayZ !== null &&
      Math.abs(x - this._lastRayX) < 0.5 &&
      Math.abs(z - this._lastRayZ) < 0.5 &&
      this.timeSinceLastGroundCheck < 1000 / this.data.groundedUpdateInterval
    ) {
      return this._lastGroundHeight;
    }

    // Reset timer if we're doing a new check
    this.timeSinceLastGroundCheck = 0;

    // Store values for checking next time
    this._lastRayX = x;
    this._lastRayZ = z;

    // Apply offsets to better match player's center
    x += this.data.rayOffsetX;
    z += this.data.rayOffsetZ;

    // Setup the raycaster to start from high above the given point, pointing down
    const rayStart = new THREE.Vector3(x, 1000, z);
    const rayDirection = new THREE.Vector3(0, -1, 0);
    this.raycaster.set(rayStart, rayDirection);

    // Get objects to test against
    let objectsToTest = [];
    if (
      this.data.useRaycastColliders &&
      window.raycastColliders &&
      window.raycastColliders.length > 0
    ) {
      objectsToTest = window.raycastColliders.map((el) => el.object3D);
    } else {
      objectsToTest = this.el.sceneEl.object3D.children;
    }

    // No objects to test
    if (objectsToTest.length === 0) {
      return null;
    }

    // Cast the ray against all objects in the scene
    const intersections = this.raycaster.intersectObjects(objectsToTest, true);

    // Filter out intersections with the player itself
    const validIntersections = intersections.filter((hit) => {
      // Walk up the parent chain to check if this is part of the player
      let obj = hit.object;
      while (obj) {
        if (obj === this.el.object3D) return false;
        obj = obj.parent;
      }
      return true;
    });

    // Draw the debug ray if enabled
    if (this.data.debugRay) {
      this.drawDebugRay(
        rayStart,
        rayDirection,
        1000,
        validIntersections.length > 0 ? 0x00ff00 : 0xff0000
      );
    }

    // If we found an intersection, return the y position
    if (validIntersections.length > 0) {
      this._lastGroundHeight = validIntersections[0].point.y;
      return validIntersections[0].point.y;
    }

    // No valid ground found
    this._lastGroundHeight = null;
    return null;
  },

  // Update the gravity function to use the ground offset
  applyGravity: function (delta) {
    const currentPosition = this.el.object3D.position;

    // Always force a ground check during initial frames
    if (this.frameCount < 10) {
      this.isGrounded = false;
      this.frameCount++;
    }

    // Find the ground height at current x,z position
    const groundHeight = this.findGroundHeight(
      currentPosition.x,
      currentPosition.z
    );

    // If there is no previous ground height, initialize it
    if (this.previousGroundHeight === null && groundHeight !== null) {
      this.previousGroundHeight = groundHeight;
    }

    if (groundHeight !== null) {
      // Calculate how high above ground we are
      const heightAboveGround = currentPosition.y - groundHeight;

      // Check if this is a step that's too high to climb
      if (
        this.isGrounded &&
        this.previousGroundHeight !== null &&
        groundHeight > this.previousGroundHeight
      ) {
        const stepHeight = groundHeight - this.previousGroundHeight;
        if (stepHeight > this.data.maxStepHeight) {
          // Step is too high to climb, prevent movement
          this.el.object3D.position.copy(this.lastSafePosition);
          return;
        }
      }

      // Handle ground contact
      if (heightAboveGround < this.data.groundOffset * 1.5) {
        // We're on or very close to the ground
        currentPosition.y = groundHeight + this.data.groundOffset; // Keep slightly above ground
        this.isGrounded = true;

        // Store ground info for simplified checks
        this.previousGroundHeight = groundHeight;
      } else {
        // We're above the ground, apply gravity
        currentPosition.y -= this.data.fallSpeed * (delta / 16.67);
        this.isGrounded = false;

        // Check if we fell below ground after applying gravity
        if (currentPosition.y < groundHeight + this.data.groundOffset) {
          currentPosition.y = groundHeight + this.data.groundOffset; // Snap to ground
          this.isGrounded = true;
          this.previousGroundHeight = groundHeight;
        }
      }
    } else {
      // No ground detected, continue falling
      currentPosition.y -= this.data.fallSpeed * (delta / 16.67);
      this.isGrounded = false;
    }

    // If we're on ground, update our last safe position
    if (this.isGrounded) {
      this.lastSafePosition.copy(currentPosition);
    }
  },

  // Debug helper function for visualization
  drawDebugRay: function (start, direction, length, color) {
    // Remove old debug line if it exists
    if (this.debugLine && this.debugLine.parent) {
      this.debugLine.parent.remove(this.debugLine);
      this.debugLine = null;
    }

    if (!this.data.debugRay) return;

    // Calculate end point
    const end = new THREE.Vector3()
      .copy(direction)
      .multiplyScalar(length)
      .add(start);

    // Create line geometry
    const material = new THREE.LineBasicMaterial({ color: color || 0xff0000 });
    const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);

    this.debugLine = new THREE.Line(geometry, material);
    this.el.sceneEl.object3D.add(this.debugLine);
  },
});
