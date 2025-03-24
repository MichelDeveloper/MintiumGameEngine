AFRAME.registerComponent("raycast-collider", {
  schema: {
    enabled: { type: "boolean", default: true },
    debug: { type: "boolean", default: false },
  },

  init: function () {
    // Only register with system if enabled in schema
    if (this.data.enabled) {
      this.registerWithSystem();
      console.log(
        `Raycast collider initialized and registered on ${
          this.el.id || "entity"
        }`
      );
    } else {
      console.log(
        `Raycast collider initialized but NOT registered (disabled) on ${
          this.el.id || "entity"
        }`
      );
    }

    if (this.data.debug) {
      this.addDebugVisual();
    }
  },

  update: function (oldData) {
    // Update registration status if enabled changed
    if (oldData.enabled !== this.data.enabled) {
      if (this.data.enabled) {
        this.registerWithSystem();
      } else {
        this.unregisterFromSystem();
      }
    }

    // Update debug visualization
    if (oldData.debug !== this.data.debug) {
      if (this.data.debug) {
        this.addDebugVisual();
      } else if (this.debugHelper) {
        this.removeDebugVisual();
      }
    }
  },

  registerWithSystem: function () {
    // Create global registry if it doesn't exist
    if (!window.raycastColliders) {
      window.raycastColliders = [];
    }

    // Only add if not already registered and enabled
    if (this.data.enabled && !window.raycastColliders.includes(this.el)) {
      console.log(`Adding ${this.el.id || "entity"} to raycast colliders`);
      window.raycastColliders.push(this.el);
    }
  },

  unregisterFromSystem: function () {
    if (window.raycastColliders) {
      const index = window.raycastColliders.indexOf(this.el);
      if (index !== -1) {
        window.raycastColliders.splice(index, 1);
      }
    }
  },

  addDebugVisual: function () {
    // Remove existing debug visual
    this.removeDebugVisual();

    // Add a semi-transparent overlay to indicate this is a raycast collider
    const mesh = this.el.getObject3D("mesh");
    if (mesh) {
      // Create a simple wireframe overlay
      const bbox = new THREE.Box3().setFromObject(mesh);
      const size = new THREE.Vector3();
      bbox.getSize(size);

      this.debugHelper = new THREE.BoxHelper(mesh, 0x00ff00);
      this.el.object3D.add(this.debugHelper);
    }
  },

  removeDebugVisual: function () {
    if (this.debugHelper && this.debugHelper.parent) {
      this.debugHelper.parent.remove(this.debugHelper);
      this.debugHelper = null;
    }
  },

  remove: function () {
    this.unregisterFromSystem();
    this.removeDebugVisual();
  },
});
