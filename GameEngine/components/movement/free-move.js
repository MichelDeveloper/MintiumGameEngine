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
    moveBlockedTime: { type: "number", default: 0 },
    slideAlongWalls: { type: "boolean", default: true },
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

    // Add this line to increment the ground check timer
    this.timeSinceLastGroundCheck += delta;

    // Get input direction - either from VR joystick or keyboard
    const inputDir = this.getInputDirection();

    // Skip if no movement input
    if (inputDir.lengthSq() === 0) {
      // Apply gravity even when not moving horizontally
      if (this.data.gravity) {
        this.applyGravity(delta);
      }
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

    // Define a margin offset (to account for player "radius")
    const margin = 1;
    // Offset the potential position by the normalized direction multiplied by margin
    const collisionCheckPos = potentialPosition
      .clone()
      .add(this.direction.clone().normalize().multiplyScalar(margin));

    // Check with the margin offset to avoid the offset issues
    if (!this.checkWallCollision(collisionCheckPos)) {
      // Store current position before moving
      this.lastSafePosition.copy(this.el.object3D.position);

      // Move the player
      this.el.object3D.position.copy(potentialPosition);

      // Check for damage collisions using grid-move if available
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

    // Use Math.round to match grid-move, which fixes the offset issue
    const gridX = Math.round(position.x / gridBlockSize);
    const gridZ = Math.round(position.z / gridBlockSize);

    // Convert grid coordinates to array indices correctly
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
      if (sprite && sprite.changeScene) {
        loadScene(sprite.changeScene);
        return true;
      }
      return sprite && sprite.collision;
    } catch (e) {
      console.error("Error checking collision:", e);
      return true;
    }
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
      this.timeSinceLastGroundCheck < this.data.groundedUpdateInterval
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
          // Instead of reverting X/Z immediately, attempt to smoothly slide
          // This will reduce the feeling of getting "stuck"
          const moveVector = new THREE.Vector3(
            currentPosition.x - this.lastSafePosition.x,
            0,
            currentPosition.z - this.lastSafePosition.z
          );

          // If we're moving into a wall, gradually push back
          if (moveVector.length() > 0) {
            moveVector.normalize().multiplyScalar(-0.05);
            currentPosition.x += moveVector.x;
            currentPosition.z += moveVector.z;
          }

          // Record the block time
          this.moveBlockedTime = Date.now();
          return;
        }
      }

      // Ground snapping with smoothing for small heights
      if (heightAboveGround <= this.data.groundOffset + 0.1) {
        // When very close to the ground, gently adjust to match exactly
        if (heightAboveGround < this.data.groundOffset) {
          // Smooth the transition when close to ground
          const adjustment = (this.data.groundOffset - heightAboveGround) * 0.5;
          currentPosition.y += Math.min(adjustment, 0.5); // Cap maximum adjustment
        }
        this.isGrounded = true;
        this.previousGroundHeight = groundHeight;
      } else {
        // Apply gravity when above ground
        let fallAmount = this.data.fallSpeed * (delta / 16.67);

        // Only reduce fall speed when very close to landing
        if (heightAboveGround < this.data.groundOffset * 1.5) {
          fallAmount *= 0.7;
        }

        currentPosition.y -= fallAmount;
        this.isGrounded = false;

        // Check if we fell below ground after applying gravity
        if (currentPosition.y < groundHeight + this.data.groundOffset) {
          currentPosition.y = groundHeight + this.data.groundOffset;
          this.isGrounded = true;
          this.previousGroundHeight = groundHeight;
        }
      }
    } else {
      // No ground detected, continue falling
      currentPosition.y -= this.data.fallSpeed * (delta / 16.67);
      this.isGrounded = false;
    }

    // Update safe position regularly when grounded, or after timeout
    if (this.isGrounded || Date.now() - this.moveBlockedTime > 800) {
      // Reduced to 800ms
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

  // Simplify the tryMove function
  tryMove: function (xChange, zChange, delta) {
    const currentPosition = this.el.object3D.position;

    // First try moving in both directions
    const targetX = currentPosition.x + xChange;
    const targetZ = currentPosition.z + zChange;

    // Check if full movement would cause collision
    const fullTargetPos = new THREE.Vector3(
      targetX,
      currentPosition.y,
      targetZ
    );
    if (!this.checkWallCollision(fullTargetPos)) {
      // Movement is clear, go ahead
      currentPosition.x = targetX;
      currentPosition.z = targetZ;
      return true;
    }

    // If full movement fails, try X-axis only
    const xOnlyPos = new THREE.Vector3(
      targetX,
      currentPosition.y,
      currentPosition.z
    );
    if (!this.checkWallCollision(xOnlyPos)) {
      currentPosition.x = targetX;
      return true;
    }

    // If X fails, try Z-axis only
    const zOnlyPos = new THREE.Vector3(
      currentPosition.x,
      currentPosition.y,
      targetZ
    );
    if (!this.checkWallCollision(zOnlyPos)) {
      currentPosition.z = targetZ;
      return true;
    }

    // Both individual movements failed
    return false;
  },
});
