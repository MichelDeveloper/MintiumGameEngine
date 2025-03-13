AFRAME.registerComponent("mesh-rendering", {
  schema: {
    src: { type: "string", default: "default.glb" },
    animation: { type: "string", default: "" }, // Optional animation to play
    scale: { type: "vec3", default: { x: 1, y: 1, z: 1 } },
    position: { type: "vec3", default: { x: 0, y: 0, z: 0 } },
    rotation: { type: "vec3", default: { x: 0, y: 0, z: 0 } },
    castShadow: { type: "boolean", default: true },
    receiveShadow: { type: "boolean", default: true },
    yOffset: { type: "number", default: 0 }, // New Y-axis offset
  },

  init: function () {
    // Store the source path
    this.modelPath = this.data.src;
    console.log("Initializing mesh rendering with source:", this.modelPath);

    // Create model entity
    this.modelEl = document.createElement("a-entity");
    this.el.appendChild(this.modelEl);

    // Set up the model
    this.setupMesh();

    // Setup scene change listener
    this.el.sceneEl.addEventListener(
      "scene-changed",
      this.handleSceneChange.bind(this)
    );
  },

  setupMesh: function () {
    console.log("Setting up mesh model from:", this.modelPath);
    try {
      // Configure the GLTF model component
      this.modelEl.setAttribute("gltf-model", this.modelPath);

      // Apply transformations from schema
      // Combine position with yOffset
      const position = {
        x: this.data.position.x,
        y: this.data.position.y + this.data.yOffset,
        z: this.data.position.z,
      };
      this.modelEl.setAttribute("position", position);
      this.modelEl.setAttribute("rotation", this.data.rotation);

      // Apply shadow settings
      this.modelEl.setAttribute("shadow", {
        cast: this.data.castShadow,
        receive: this.data.receiveShadow,
      });

      // Add event listener for model loaded
      this.modelEl.addEventListener(
        "model-loaded",
        this.onModelLoaded.bind(this)
      );
    } catch (error) {
      console.error("Error setting up mesh model:", error);
      setTimeout(() => this.setupMesh(), 500);
    }
  },

  onModelLoaded: function (evt) {
    console.log("Model loaded successfully");

    // Get the model object
    const model = evt.detail.model;

    // Apply any post-loading modifications
    model.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = this.data.castShadow;
        node.receiveShadow = this.data.receiveShadow;

        // Optionally improve material settings
        if (node.material) {
          // Enable pixel-perfect rendering if using standard materials
          if (node.material.map) {
            node.material.map.generateMipmaps = false;
            node.material.map.minFilter = THREE.NearestFilter;
            node.material.map.magFilter = THREE.NearestFilter;
          }
        }
      }
    });

    // Play animation if specified
    if (
      this.data.animation &&
      model.animations &&
      model.animations.length > 0
    ) {
      // Find the animation mixer
      const mixer = this.modelEl.getObject3D("mesh").animations;
      if (mixer) {
        // Find the specified animation
        const clip = model.animations.find(
          (anim) => anim.name === this.data.animation
        );
        if (clip) {
          const action = mixer.clipAction(clip);
          action.play();
        } else {
          console.warn(`Animation '${this.data.animation}' not found in model`);
        }
      }
    }
  },

  handleSceneChange: function () {
    console.log("Scene changed, reloading mesh model");
    setTimeout(() => {
      // Reinitialize the model
      if (this.modelEl) {
        this.el.removeChild(this.modelEl);
      }
      this.modelEl = document.createElement("a-entity");
      this.el.appendChild(this.modelEl);
      this.setupMesh();
    }, 300);
  },

  update: function (oldData) {
    // Handle updates to component properties
    if (oldData.src !== this.data.src) {
      this.modelPath = this.data.src;
      console.log("Model source changed, reloading:", this.modelPath);

      // Remove old model and create new one
      if (this.modelEl) {
        this.el.removeChild(this.modelEl);
      }
      this.modelEl = document.createElement("a-entity");
      this.el.appendChild(this.modelEl);
      this.setupMesh();
    }

    // Check if position or yOffset has changed
    if (
      this.modelEl &&
      ((oldData.position &&
        (this.data.position.x !== oldData.position.x ||
          this.data.position.y !== oldData.position.y ||
          this.data.position.z !== oldData.position.z)) ||
        this.data.yOffset !== oldData.yOffset)
    ) {
      // Apply the new position with yOffset
      const position = {
        x: this.data.position.x,
        y: this.data.position.y + this.data.yOffset,
        z: this.data.position.z,
      };
      this.modelEl.setAttribute("position", position);
    }

    // Update rotation or scale if they changed
    if (this.modelEl) {
      if (
        oldData.rotation &&
        (this.data.rotation.x !== oldData.rotation.x ||
          this.data.rotation.y !== oldData.rotation.y ||
          this.data.rotation.z !== oldData.rotation.z)
      ) {
        this.modelEl.setAttribute("rotation", this.data.rotation);
      }

      if (
        oldData.scale &&
        (this.data.scale.x !== oldData.scale.x ||
          this.data.scale.y !== oldData.scale.y ||
          this.data.scale.z !== oldData.scale.z)
      ) {
        this.modelEl.setAttribute("scale", this.data.scale);
      }
    }
  },

  remove: function () {
    // Clean up when the component is removed
    if (this.modelEl) {
      this.el.removeChild(this.modelEl);
    }
  },
});
