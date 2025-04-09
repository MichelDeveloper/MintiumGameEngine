AFRAME.registerComponent("mesh-rendering", {
  schema: {
    src: { type: "string", default: "default.glb" },
    animation: { type: "string", default: "" }, // Optional animation to play
    autoPlayAnimation: { type: "boolean", default: true }, // Auto-play first animation
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

    // Setup animation clock
    this.animationClock = new THREE.Clock();

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

    // Get the full loaded model instead of just the mesh
    const model = evt.detail.model;

    // Apply post-loading modifications
    model.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = this.data.castShadow;
        node.receiveShadow = this.data.receiveShadow;
        if (node.material && node.material.map) {
          node.material.map.generateMipmaps = true;
          // To give the model a more pixelated look
          // node.material.map.minFilter = THREE.NearestFilter;
          // node.material.map.magFilter = THREE.NearestFilter;
          node.material.map.minFilter = THREE.LinearMipmapLinearFilter;
          node.material.map.magFilter = THREE.LinearFilter;
          // For materials with alpha textures
          node.material.transparent = true;
          node.material.alphaTest = 0.5; // Adjust threshold as needed (0.01-0.99)
        }
      }
    });

    // Check if model has animations
    if (model.animations && model.animations.length > 0) {
      console.log(
        `Model has ${model.animations.length} animations:`,
        model.animations.map((a) => a.name).join(", ")
      );

      // Create animation mixer on the full model
      if (!this.mixer) {
        this.mixer = new THREE.AnimationMixer(model);
        this.animationClock.start();
        this.tick = AFRAME.utils.throttleTick(this.tickAnimation, 16, this);
      }

      // Play specific animation if provided
      if (this.data.animation) {
        const clip = model.animations.find(
          (anim) => anim.name === this.data.animation
        );
        if (clip) {
          const action = this.mixer.clipAction(clip);
          action.reset().play();
          console.log(`Playing specified animation: ${this.data.animation}`);
        } else {
          console.warn(`Animation '${this.data.animation}' not found in model`);
          if (this.data.autoPlayAnimation) {
            this.playFirstAnimation(model.animations);
          }
        }
      }
      // Otherwise, auto-play the first animation if enabled
      else if (this.data.autoPlayAnimation) {
        this.playFirstAnimation(model.animations);
      }
    }
  },

  tickAnimation: function (time, timeDelta) {
    // Update animation mixer on every frame
    if (this.mixer) {
      const delta = this.animationClock.getDelta();
      this.mixer.update(delta);
    }
  },

  tick: function (time, timeDelta) {
    if (this.mixer) {
      // Convert timeDelta from milliseconds to seconds.
      const delta = timeDelta / 1000;
      this.mixer.update(delta);
    }
  },

  playFirstAnimation: function (animations) {
    if (animations && animations.length > 0) {
      const action = this.mixer.clipAction(animations[0]);
      // Make sure animation loops and plays correctly
      action.reset();
      action.setLoop(THREE.LoopRepeat);
      action.clampWhenFinished = false;
      action.timeScale = 1.0;
      action.enabled = true;
      action.play();
      console.log(`Auto-playing first animation: ${animations[0].name}`);
    }
  },

  handleSceneChange: function () {
    console.log("Scene changed, reloading mesh model");
    setTimeout(() => {
      // Clean up any existing animation mixer
      if (this.mixer) {
        this.mixer.stopAllAction();
        this.mixer = null;
      }

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

      // Clean up any existing animation mixer
      if (this.mixer) {
        this.mixer.stopAllAction();
        this.mixer = null;
      }

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
    if (this.mixer) {
      this.mixer.stopAllAction();
      this.mixer = null;
    }

    if (this.modelEl) {
      this.el.removeChild(this.modelEl);
    }

    // Remove the tick function
    this.tick = null;
  },
});
