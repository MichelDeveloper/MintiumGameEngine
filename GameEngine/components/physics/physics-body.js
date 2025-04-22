AFRAME.registerComponent("physics-body", {
  schema: {
    enabled: { type: "boolean", default: false },
    type: { type: "string", default: "dynamic", oneOf: ["static", "dynamic"] },
    mass: { type: "number", default: 1.0 },
    linearDamping: { type: "number", default: 0.01 },
    angularDamping: { type: "number", default: 0.01 },
    shape: {
      type: "string",
      default: "auto",
      oneOf: ["auto", "box", "sphere"],
    },
  },

  init: function () {
    this.initPhysics();
  },

  initPhysics: function () {
    const data = this.data;

    // Remove any existing body components
    if (this.el.getAttribute("static-body")) {
      this.el.removeAttribute("static-body");
    }
    if (this.el.getAttribute("dynamic-body")) {
      this.el.removeAttribute("dynamic-body");
    }

    // Only add physics if enabled
    if (!data.enabled) return;

    // Add the appropriate physics body
    if (data.type === "static") {
      this.el.setAttribute("static-body", "");
    } else {
      this.el.setAttribute("dynamic-body", {
        mass: data.mass,
        linearDamping: data.linearDamping,
        angularDamping: data.angularDamping,
        shape: data.shape,
      });
    }
  },

  update: function (oldData) {
    // If enabled state changed
    if (!oldData || oldData.enabled !== this.data.enabled) {
      this.initPhysics();
      return;
    }

    // Only reinitialize if type changed and component is enabled
    if (this.data.enabled && (!oldData || oldData.type !== this.data.type)) {
      this.initPhysics();
    } else if (this.data.enabled && this.data.type === "dynamic") {
      // Update dynamic body properties
      this.el.setAttribute("dynamic-body", {
        mass: this.data.mass,
        linearDamping: this.data.linearDamping,
        angularDamping: this.data.angularDamping,
        shape: this.data.shape,
      });
    }
  },

  remove: function () {
    // Clean up physics components
    if (this.el.getAttribute("static-body")) {
      this.el.removeAttribute("static-body");
    }
    if (this.el.getAttribute("dynamic-body")) {
      this.el.removeAttribute("dynamic-body");
    }
  },
});
