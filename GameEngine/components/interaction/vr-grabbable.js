/**
 * vr-grabbable component
 *
 * Allows objects to be grabbed and manipulated by VR controllers
 *
 * Usage:
 * <a-entity vr-grabbable="enabled: true"></a-entity>
 */
AFRAME.registerComponent("vr-grabbable", {
  schema: {
    enabled: { type: "boolean", default: true }, // Whether grabbing is enabled
    highlight: { type: "boolean", default: true }, // Show highlight when hovering
    highlightColor: { type: "color", default: "#FFFF00" }, // Color for highlighting
    rotationFactor: { type: "number", default: 1.0 }, // How fast it rotates with controller
    grabDistance: { type: "number", default: 0.3 }, // Maximum distance to grab
    preserveRotation: { type: "boolean", default: true }, // Keep object's rotation when grabbed
    snapToHand: { type: "boolean", default: true }, // Snap to hand or keep original distance
  },

  init: function () {
    this.originalMaterial = null;
    this.hoverMaterial = null;
    this.isGrabbed = false;
    this.grabber = null;

    // Original properties to restore after release
    this.originalParent = null;
    this.originalPosition = new THREE.Vector3();
    this.originalRotation = new THREE.Euler();
    this.originalScale = new THREE.Vector3();

    this.offset = new THREE.Vector3();
    this.initialGrabberRotation = new THREE.Quaternion();
    this.initialObjectRotation = new THREE.Quaternion();

    // Add event listeners for VR controller interaction
    this.onGripDown = this.onGripDown.bind(this);
    this.onGripUp = this.onGripUp.bind(this);
    this.onTriggerDown = this.onTriggerDown.bind(this);
    this.onTriggerUp = this.onTriggerUp.bind(this);
    this.onThumbstickMove = this.onThumbstickMove.bind(this);
    this.onControllerHover = this.onControllerHover.bind(this);
    this.onControllerLeave = this.onControllerLeave.bind(this);

    // Set up controller event listeners
    this.addEventListeners();

    // Create highlight material for hover effect
    if (this.data.highlight) {
      this.setupHighlightMaterial();
    }
  },

  addEventListeners: function () {
    // Find VR controllers
    this.leftHand = document.getElementById("leftHand");
    this.rightHand = document.getElementById("rightHand");

    if (this.leftHand) {
      this.leftHand.addEventListener("gripdown", this.onGripDown);
      this.leftHand.addEventListener("gripup", this.onGripUp);
      this.leftHand.addEventListener("triggerdown", this.onTriggerDown);
      this.leftHand.addEventListener("triggerup", this.onTriggerUp);
      this.leftHand.addEventListener("axismove", this.onThumbstickMove);
    }

    if (this.rightHand) {
      this.rightHand.addEventListener("gripdown", this.onGripDown);
      this.rightHand.addEventListener("gripup", this.onGripUp);
      this.rightHand.addEventListener("triggerdown", this.onTriggerDown);
      this.rightHand.addEventListener("triggerup", this.onTriggerUp);
      this.rightHand.addEventListener("axismove", this.onThumbstickMove);
    }

    // Raycaster for hover detection
    this.el.addEventListener("raycaster-intersected", this.onControllerHover);
    this.el.addEventListener(
      "raycaster-intersected-cleared",
      this.onControllerLeave
    );
  },

  removeEventListeners: function () {
    if (this.leftHand) {
      this.leftHand.removeEventListener("gripdown", this.onGripDown);
      this.leftHand.removeEventListener("gripup", this.onGripUp);
      this.leftHand.removeEventListener("triggerdown", this.onTriggerDown);
      this.leftHand.removeEventListener("triggerup", this.onTriggerUp);
      this.leftHand.removeEventListener("axismove", this.onThumbstickMove);
    }

    if (this.rightHand) {
      this.rightHand.removeEventListener("gripdown", this.onGripDown);
      this.rightHand.removeEventListener("gripup", this.onGripUp);
      this.rightHand.removeEventListener("triggerdown", this.onTriggerDown);
      this.rightHand.removeEventListener("triggerup", this.onTriggerUp);
      this.rightHand.removeEventListener("axismove", this.onThumbstickMove);
    }

    this.el.removeEventListener(
      "raycaster-intersected",
      this.onControllerHover
    );
    this.el.removeEventListener(
      "raycaster-intersected-cleared",
      this.onControllerLeave
    );
  },

  setupHighlightMaterial: function () {
    if (this.el.getObject3D("mesh")) {
      const mesh = this.el.getObject3D("mesh");
      if (mesh && mesh.material) {
        // Store original material
        this.originalMaterial = mesh.material;

        // Create highlight material by cloning original and modifying
        this.hoverMaterial = this.originalMaterial.clone();
        this.hoverMaterial.emissive = new THREE.Color(this.data.highlightColor);
        this.hoverMaterial.emissiveIntensity = 0.5;
        this.hoverMaterial.needsUpdate = true;
      }
    } else {
      // If mesh isn't loaded yet, try again when object3dset is triggered
      this.el.addEventListener("object3dset", (e) => {
        if (e.detail.type === "mesh") {
          this.setupHighlightMaterial();
        }
      });
    }
  },

  onControllerHover: function (e) {
    if (!this.data.enabled || this.isGrabbed) return;

    // Apply highlight material
    if (this.data.highlight && this.hoverMaterial) {
      const mesh = this.el.getObject3D("mesh");
      if (mesh && mesh.material) {
        mesh.material = this.hoverMaterial;
      }
    }
  },

  onControllerLeave: function (e) {
    if (!this.data.enabled || this.isGrabbed) return;

    // Restore original material
    if (this.data.highlight && this.originalMaterial) {
      const mesh = this.el.getObject3D("mesh");
      if (mesh && mesh.material) {
        mesh.material = this.originalMaterial;
      }
    }
  },

  onGripDown: function (e) {
    if (!this.data.enabled || this.isGrabbed) return;

    // Check if the controller is close enough to grab
    const controller = e.target;
    const controllerPos = new THREE.Vector3();
    const objectPos = new THREE.Vector3();

    controller.object3D.getWorldPosition(controllerPos);
    this.el.object3D.getWorldPosition(objectPos);

    const distance = controllerPos.distanceTo(objectPos);

    // Only grab if within grabDistance
    if (distance <= this.data.grabDistance) {
      this.grab(controller);
    }
  },

  onGripUp: function (e) {
    if (this.isGrabbed && this.grabber === e.target) {
      this.release();
    }
  },

  onTriggerDown: function (e) {
    // Alternative grab method using trigger
    if (!this.data.enabled || this.isGrabbed) return;

    // Check if the controller is close enough to grab
    const controller = e.target;
    const controllerPos = new THREE.Vector3();
    const objectPos = new THREE.Vector3();

    controller.object3D.getWorldPosition(controllerPos);
    this.el.object3D.getWorldPosition(objectPos);

    const distance = controllerPos.distanceTo(objectPos);

    // Only grab if within grabDistance
    if (distance <= this.data.grabDistance) {
      this.grab(controller);
    }
  },

  onTriggerUp: function (e) {
    // Trigger release when using trigger to grab
    if (this.isGrabbed && this.grabber === e.target) {
      this.release();
    }
  },

  onThumbstickMove: function (e) {
    // Only handle if object is grabbed and this controller is the grabber
    if (!this.isGrabbed || this.grabber !== e.target) return;

    // Get thumbstick input
    const axes = e.detail.axis;
    if (axes.length < 2) return;

    // Rotate object based on thumbstick if preserveRotation is false
    if (!this.data.preserveRotation) {
      const rotX = axes[1] * 0.05 * this.data.rotationFactor; // Up/down
      const rotY = axes[0] * 0.05 * this.data.rotationFactor; // Left/right

      // Apply rotation relative to controller
      this.el.object3D.rotateX(rotX);
      this.el.object3D.rotateY(rotY);
    }
  },

  grab: function (controller) {
    if (!this.data.enabled || this.isGrabbed) return;

    this.isGrabbed = true;
    this.grabber = controller;

    // Store original object properties
    this.originalParent = this.el.object3D.parent;
    this.originalPosition.copy(this.el.object3D.position);
    this.originalRotation.copy(this.el.object3D.rotation);
    this.originalScale.copy(this.el.object3D.scale);

    // Calculate offset between controller and object
    const controllerPos = new THREE.Vector3();
    const objectPos = new THREE.Vector3();

    controller.object3D.getWorldPosition(controllerPos);
    this.el.object3D.getWorldPosition(objectPos);

    // Save the offset from controller to object
    this.offset.copy(objectPos).sub(controllerPos);

    // Store initial rotations
    this.initialGrabberRotation.copy(controller.object3D.quaternion);
    this.initialObjectRotation.copy(this.el.object3D.quaternion);

    if (this.data.snapToHand) {
      // Make the object a child of the controller
      this.el.object3D.position.set(0, 0, 0);
      controller.object3D.add(this.el.object3D);
    }

    // Emit grab event
    this.el.emit("grabbed", { grabber: controller });
  },

  release: function () {
    if (!this.isGrabbed) return;

    // Restore object to its original parent
    if (this.data.snapToHand) {
      const worldPosition = new THREE.Vector3();
      const worldQuaternion = new THREE.Quaternion();
      const worldScale = new THREE.Vector3();

      // Get current world position, rotation, scale
      this.el.object3D.getWorldPosition(worldPosition);
      this.el.object3D.getWorldQuaternion(worldQuaternion);
      this.el.object3D.getWorldScale(worldScale);

      // Restore original parent
      this.originalParent.add(this.el.object3D);

      // Apply world transforms
      this.el.object3D.position.copy(worldPosition);
      this.el.object3D.quaternion.copy(worldQuaternion);
      this.el.object3D.scale.copy(worldScale);
    }

    // Reset state
    this.isGrabbed = false;
    this.grabber = null;

    // Restore original material
    if (this.data.highlight && this.originalMaterial) {
      const mesh = this.el.getObject3D("mesh");
      if (mesh && mesh.material) {
        mesh.material = this.originalMaterial;
      }
    }

    // Emit release event
    this.el.emit("released");
  },

  tick: function () {
    if (!this.isGrabbed || !this.grabber) return;

    // If not snapping to hand, update position to follow controller with offset
    if (!this.data.snapToHand) {
      const controllerPos = new THREE.Vector3();
      this.grabber.object3D.getWorldPosition(controllerPos);

      // Apply offset to maintain relative position
      this.el.object3D.position.copy(controllerPos).add(this.offset);

      // If we're preserving rotation and not snapping, handle rotations
      if (this.data.preserveRotation) {
        const grabberQuaternion = new THREE.Quaternion();
        this.grabber.object3D.getWorldQuaternion(grabberQuaternion);

        // Calculate rotation difference from initial grab
        const rotationDiff = new THREE.Quaternion()
          .copy(grabberQuaternion)
          .multiply(this.initialGrabberRotation.clone().invert());

        // Apply rotation difference to object's initial rotation
        this.el.object3D.quaternion
          .copy(rotationDiff)
          .multiply(this.initialObjectRotation);
      }
    }
  },

  update: function (oldData) {
    // Handle changes to component data
    if (
      oldData.enabled !== undefined &&
      oldData.enabled !== this.data.enabled
    ) {
      if (!this.data.enabled && this.isGrabbed) {
        this.release();
      }
    }

    if (
      oldData.highlightColor !== undefined &&
      oldData.highlightColor !== this.data.highlightColor
    ) {
      if (this.hoverMaterial) {
        this.hoverMaterial.emissive = new THREE.Color(this.data.highlightColor);
        this.hoverMaterial.needsUpdate = true;
      }
    }
  },

  remove: function () {
    // Clean up
    if (this.isGrabbed) {
      this.release();
    }

    this.removeEventListeners();
  },
});
