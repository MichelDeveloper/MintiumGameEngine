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

  multiple: false, // Only allow one instance per entity

  init: function () {
    this.physicsInitialized = false;
    this.modelLoaded = false;
    this.onModelLoaded = this.onModelLoaded.bind(this);

    // Check if this has a mesh-rendering component which uses a model
    this.hasMeshRendering = !!this.el.getAttribute("mesh-rendering");

    if (this.hasMeshRendering) {
      console.log(
        `Physics-body on mesh model: ${
          this.el.id || "unnamed"
        }. Waiting for model load.`
      );
      this.el.addEventListener("model-loaded", this.onModelLoaded);
    }

    // Also initialize immediately if we don't need to wait for a model
    // or if the element already has a mesh
    if (
      this.data.enabled &&
      (!this.hasMeshRendering || this.el.getObject3D("mesh"))
    ) {
      // Use setTimeout to allow the element to fully initialize
      setTimeout(() => this.initPhysics(), 100);
    }
  },

  onModelLoaded: function (event) {
    console.log(`Model loaded for physics body: ${this.el.id || "unnamed"}`);
    this.modelLoaded = true;

    if (this.data.enabled && !this.physicsInitialized) {
      // Use setTimeout to ensure the model is fully processed
      setTimeout(() => this.initPhysics(), 200);
    }
  },

  initPhysics: function () {
    if (this.physicsInitialized) {
      console.log("Physics already initialized, skipping");
      return;
    }

    const data = this.data;

    // If this is a model and it hasn't loaded yet, wait for it
    if (this.hasMeshRendering && !this.modelLoaded) {
      console.log("Waiting for model to load before initializing physics");
      return;
    }

    // Remove any existing body components first
    this.removePhysics();

    // Only add physics if enabled
    if (!data.enabled) return;

    // For Quest compatibility, ensure mesh visibility is maintained
    // by adding a reference to the original object before physics is applied
    if (this.hasMeshRendering) {
      // Store a reference to the original model
      const originalModel = this.el.object3D.clone();
      this.el.originalModel = originalModel;

      // Ensure the mesh is visible on Quest
      this.el.addEventListener("body-loaded", () => {
        console.log("Physics body loaded, ensuring mesh visibility");

        // Force a redraw of the mesh after physics is applied
        const mesh = this.el.getObject3D("mesh");
        if (mesh) {
          // Make mesh visible
          mesh.visible = true;

          // Ensure all child meshes are visible
          mesh.traverse((node) => {
            if (node.isMesh) {
              node.visible = true;
              if (node.material) {
                // Refresh material to ensure it renders on Quest
                node.material.needsUpdate = true;
              }
            }
          });
        }
      });
    }

    // Detect shape based on element type and available geometry
    const mesh = this.el.getObject3D("mesh");
    let shape = data.shape;

    // If shape is auto, determine the best shape based on geometry
    if (shape === "auto") {
      if (!mesh) {
        // No mesh available, default to box
        shape = "box";
        console.log("No mesh found, defaulting to box shape");
      } else {
        // Try to determine shape based on entity type
        const tagName = this.el.tagName.toLowerCase();
        if (tagName === "a-sphere") {
          shape = "sphere";
        } else if (tagName === "a-box") {
          shape = "box";
        } else {
          // Default for other entities including mesh models
          shape = "box";
        }
        console.log(`Auto-detected physics shape: ${shape} for ${tagName}`);
      }
    }

    // Add the appropriate physics body
    console.log(
      `Adding ${data.type} physics body with shape ${shape} to ${
        this.el.id || "unnamed entity"
      }`
    );

    try {
      if (data.type === "static") {
        this.el.setAttribute("static-body", {
          shape: shape,
        });
      } else {
        this.el.setAttribute("dynamic-body", {
          mass: data.mass,
          linearDamping: data.linearDamping,
          angularDamping: data.angularDamping,
          shape: shape,
        });
      }

      // Mark as initialized
      this.physicsInitialized = true;

      // Log the initialization for debugging
      console.log(
        `Physics initialized for ${this.el.id || "unnamed entity"}:`,
        {
          type: data.type,
          shape: shape,
          enabled: data.enabled,
        }
      );
    } catch (error) {
      console.error("Error initializing physics:", error);
    }
  },

  removePhysics: function () {
    // Remove existing physics components
    if (this.el.getAttribute("static-body")) {
      this.el.removeAttribute("static-body");
    }
    if (this.el.getAttribute("dynamic-body")) {
      this.el.removeAttribute("dynamic-body");
    }
    this.physicsInitialized = false;
  },

  update: function (oldData) {
    // If enabled state changed
    if (!oldData || oldData.enabled !== this.data.enabled) {
      if (this.data.enabled) {
        this.initPhysics();
      } else {
        this.removePhysics();
      }
      return;
    }

    // Only reinitialize if important properties changed and component is enabled
    if (
      this.data.enabled &&
      (!oldData ||
        oldData.type !== this.data.type ||
        oldData.shape !== this.data.shape)
    ) {
      this.removePhysics();
      this.initPhysics();
    }
    // Update dynamic body properties without reinitialization
    else if (
      this.data.enabled &&
      this.data.type === "dynamic" &&
      this.physicsInitialized
    ) {
      this.el.setAttribute("dynamic-body", {
        mass: this.data.mass,
        linearDamping: this.data.linearDamping,
        angularDamping: this.data.angularDamping,
        shape:
          this.data.shape !== "auto"
            ? this.data.shape
            : this.el.getAttribute("dynamic-body").shape || "box",
      });
    }
  },

  remove: function () {
    // Clean up physics components and event listeners
    this.removePhysics();

    if (this.hasMeshRendering) {
      this.el.removeEventListener("model-loaded", this.onModelLoaded);
    }
  },
});
