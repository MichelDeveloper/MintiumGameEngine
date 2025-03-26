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
    groundedUpdateInterval: { type: "number", default: 33 },
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
    // CRITICAL FIX: In this system, leftHand has the grid-move component.
    // We need to get input from the entity that has the actual controller input.
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
    const x = axis[2]; // Left thumbstick X-axis
    const y = axis[3]; // Left thumbstick Y-axis

    // Only process if thumbstick is moved significantly
    if (Math.abs(x) < 0.2 && Math.abs(y) < 0.2) {
      this.joystickDirection.set(0, 0, 0);
      return;
    }

    // Create a direction vector from the joystick input (matching grid-move's logic)
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

    // Increment the ground check timer
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

    // Get player rotation to move relative to the player's facing direction
    const rotation = this.el.object3D.rotation.y;

    // Apply rotation to input direction to get world-space direction
    this.direction.copy(inputDir);
    this.direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation);
    this.velocity.copy(this.direction).multiplyScalar(speed);

    // Calculate the new (potential) position
    const potentialPosition = this.el.object3D.position
      .clone()
      .add(this.velocity);

    // Define a margin offset—use a smaller margin here too
    const margin = 0.4;
    // Offset the potential position by the normalized direction
    const collisionCheckPos = potentialPosition
      .clone()
      .add(this.direction.clone().normalize().multiplyScalar(margin));

    // Only update if the collision check passes
    if (!this.checkWallCollision(collisionCheckPos)) {
      this.lastSafePosition.copy(this.el.object3D.position);
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
    // Use sliding logic if a collision is detected and sliding is enabled
    else if (this.data.slideAlongWalls) {
      this.tryMove(this.velocity.x, this.velocity.z, delta);
    }

    // Apply gravity after horizontal movement is done
    if (this.data.gravity) {
      this.applyGravity(delta);
    }
  },

  // Updated collision function with explicit bounds checking.
  checkWallCollision: function (position) {
    const baseLayer = getCurrentScene().data.find(
      (sceneLayer) => sceneLayer.layer === 0
    );
    if (!baseLayer) return false;

    const currentScene = getCurrentScene();
    const sceneSize =
      currentScene && currentScene.size ? parseInt(currentScene.size) : 10;
    const gridBlockSize = 10;

    // Calculate grid cell coordinates.
    // Using Math.round to match your original free-move behavior.
    const gridX = Math.round(position.x / gridBlockSize);
    const gridZ = Math.round(position.z / gridBlockSize);
    const halfScene = Math.floor(sceneSize / 2);
    const indexX = gridX + halfScene;
    const indexZ = gridZ + halfScene;

    // Explicitly check that the calculated indices are within the bounds of your layer data.
    if (
      indexZ < 0 ||
      indexZ >= baseLayer.layerData.length ||
      indexX < 0 ||
      indexX >= baseLayer.layerData[0].length
    ) {
      console.warn("Potential free-move position out of bounds:", {
        indexX,
        indexZ,
      });
      // If map borders are enabled, block movement; otherwise, allow it.
      return currentScene.enableMapBorders ? true : false;
    }

    // Additionally, enforce map borders if enabled.
    if (currentScene.enableMapBorders) {
      if (
        indexX < 0 ||
        indexX >= sceneSize ||
        indexZ < 0 ||
        indexZ >= sceneSize
      ) {
        return true; // Outside grid boundaries
      }
    }

    // Check the cell for a wall or scene trigger.
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

    // If joystick input is available, use that.
    if (this.joystickDirection.lengthSq() > 0) {
      direction.copy(this.joystickDirection);
    }
    // Otherwise, use keyboard input from the keyboardControls system.
    else if (this.keyboardControls) {
      const keys = this.keyboardControls.keys;
      if (keys["w"] || keys["arrowup"]) direction.z -= 1;
      if (keys["s"] || keys["arrowdown"]) direction.z += 1;
      if (keys["a"] || keys["arrowleft"]) direction.x -= 1;
      if (keys["d"] || keys["arrowright"]) direction.x += 1;
    }
    // Fallback to direct key handling.
    else if (this.keys) {
      if (this.keys["w"] || this.keys["arrowup"]) direction.z -= 1;
      if (this.keys["s"] || this.keys["arrowdown"]) direction.z += 1;
      if (this.keys["a"] || this.keys["arrowleft"]) direction.x -= 1;
      if (this.keys["d"] || this.keys["arrowright"]) direction.x += 1;
    }

    // Normalize to ensure diagonal movement isn't faster.
    if (direction.lengthSq() > 0) {
      direction.normalize();
    }

    return direction;
  },

  // Updated findGroundHeight function with collision-data handling.
  findGroundHeight: function (x, z) {
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

    this.timeSinceLastGroundCheck = 0;
    this._lastRayX = x;
    this._lastRayZ = z;
    x += this.data.rayOffsetX;
    z += this.data.rayOffsetZ;

    const rayStart = new THREE.Vector3(x, 1000, z);
    const rayDirection = new THREE.Vector3(0, -1, 0);
    this.raycaster.set(rayStart, rayDirection);

    let objectsToTest = [];
    if (
      this.data.useRaycastColliders &&
      window.raycastColliders &&
      window.raycastColliders.length > 0
    ) {
      objectsToTest = window.raycastColliders
        .filter((el) => {
          return (
            el.components &&
            el.components["raycast-collider"] &&
            el.components["raycast-collider"].data.enabled === true
          );
        })
        .map((el) => {
          const collisionData = el.object3D.getObjectByName("collision-data");
          if (collisionData) {
            collisionData.traverse((child) => {
              child.visible = false;
            });
            return collisionData;
          }
          return el.object3D;
        });

      console.log(
        `Using ${objectsToTest.length} enabled colliders out of ${window.raycastColliders.length} total`
      );
    } else if (!this.data.useRaycastColliders) {
      console.log("Using all scene objects for raycasting (not recommended)");
      objectsToTest = this.el.sceneEl.object3D.children;
    } else {
      console.log(
        "No raycast colliders found, and useRaycastColliders is TRUE"
      );
    }

    if (objectsToTest.length === 0) {
      return null;
    }

    const intersections = this.raycaster.intersectObjects(objectsToTest, true);
    const validIntersections = intersections.filter((hit) => {
      let obj = hit.object;
      while (obj) {
        if (obj === this.el.object3D) return false;
        obj = obj.parent;
      }
      return true;
    });

    if (this.data.debugRay) {
      this.drawDebugRay(
        rayStart,
        rayDirection,
        1000,
        validIntersections.length > 0 ? 0x00ff00 : 0xff0000
      );
    }

    if (validIntersections.length > 0) {
      this._lastGroundHeight = validIntersections[0].point.y;
      return validIntersections[0].point.y;
    }

    this._lastGroundHeight = null;
    return null;
  },

  // Update the gravity function to use the ground offset.
  applyGravity: function (delta) {
    const currentPosition = this.el.object3D.position;
    const groundHeight = this.findGroundHeight(
      currentPosition.x,
      currentPosition.z
    );

    if (this.previousGroundHeight === null && groundHeight !== null) {
      this.previousGroundHeight = groundHeight;
    }

    if (groundHeight !== null) {
      const heightAboveGround = currentPosition.y - groundHeight;

      if (
        this.isGrounded &&
        this.previousGroundHeight !== null &&
        groundHeight > this.previousGroundHeight
      ) {
        const stepHeight = groundHeight - this.previousGroundHeight;
        if (stepHeight > this.data.maxStepHeight) {
          const moveVector = new THREE.Vector3(
            currentPosition.x - this.lastSafePosition.x,
            0,
            currentPosition.z - this.lastSafePosition.z
          );
          if (moveVector.length() > 0) {
            moveVector.normalize().multiplyScalar(-0.05);
            currentPosition.x += moveVector.x;
            currentPosition.z += moveVector.z;
          }
          this.moveBlockedTime = Date.now();
          return;
        }
      }

      if (heightAboveGround <= this.data.groundOffset + 0.1) {
        if (heightAboveGround < this.data.groundOffset) {
          const adjustment = (this.data.groundOffset - heightAboveGround) * 0.5;
          currentPosition.y += Math.min(adjustment, 0.5);
        }
        this.isGrounded = true;
        this.previousGroundHeight = groundHeight;
      } else {
        let fallAmount = this.data.fallSpeed * (delta / 16.67);
        if (heightAboveGround < this.data.groundOffset * 1.5) {
          fallAmount *= 0.7;
        }
        currentPosition.y -= fallAmount;
        this.isGrounded = false;
        if (currentPosition.y < groundHeight + this.data.groundOffset) {
          currentPosition.y = groundHeight + this.data.groundOffset;
          this.isGrounded = true;
          this.previousGroundHeight = groundHeight;
        }
      }
    } else {
      currentPosition.y -= this.data.fallSpeed * (delta / 16.67);
      this.isGrounded = false;
    }

    if (this.isGrounded || Date.now() - this.moveBlockedTime > 800) {
      this.lastSafePosition.copy(currentPosition);
    }
  },

  // Debug helper function for visualization.
  drawDebugRay: function (start, direction, length, color) {
    if (this.debugLine && this.debugLine.parent) {
      this.debugLine.parent.remove(this.debugLine);
      this.debugLine = null;
    }

    if (!this.data.debugRay) return;

    const end = new THREE.Vector3()
      .copy(direction)
      .multiplyScalar(length)
      .add(start);

    const material = new THREE.LineBasicMaterial({ color: color || 0xff0000 });
    const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);

    this.debugLine = new THREE.Line(geometry, material);
    this.el.sceneEl.object3D.add(this.debugLine);
  },

  // Simplified tryMove function.
  tryMove: function (xChange, zChange, delta) {
    const currentPosition = this.el.object3D.position;

    // First try moving in both directions.
    const targetX = currentPosition.x + xChange;
    const targetZ = currentPosition.z + zChange;

    const direction = new THREE.Vector3(xChange, 0, zChange).normalize();
    const margin = 0.4; // Reduced margin.
    const fullTargetPos = new THREE.Vector3(
      targetX,
      currentPosition.y,
      targetZ
    ).add(direction.clone().multiplyScalar(margin));

    if (!this.checkWallCollision(fullTargetPos)) {
      currentPosition.x = targetX;
      currentPosition.z = targetZ;
      return true;
    }

    // Try X-axis only with a smaller margin for sliding.
    const xDir = new THREE.Vector3(Math.sign(xChange), 0, 0);
    const slidingMargin = 0.25;
    const xOnlyPos = new THREE.Vector3(
      targetX,
      currentPosition.y,
      currentPosition.z
    ).add(xDir.multiplyScalar(slidingMargin));

    if (!this.checkWallCollision(xOnlyPos)) {
      currentPosition.x = targetX;
      return true;
    }

    // Try Z-axis only with a smaller margin for sliding.
    const zDir = new THREE.Vector3(0, 0, Math.sign(zChange));
    const zOnlyPos = new THREE.Vector3(
      currentPosition.x,
      currentPosition.y,
      targetZ
    ).add(zDir.multiplyScalar(slidingMargin));

    if (!this.checkWallCollision(zOnlyPos)) {
      currentPosition.z = targetZ;
      return true;
    }

    return false;
  },
});

export default {};
