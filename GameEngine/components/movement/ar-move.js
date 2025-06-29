import { getCurrentScene, loadScene } from "../../core/scene-manager.js";
import { findSpritesByDistance } from "../../core/sprite-manager.js";

/**
 * ar-move (v2)
 * --------------------------------------------------
 * ✓ Physical walking moves the player naturally ‑ we no longer translate the
 *   rig itself in X/Z (that double‑counted the headset movement and caused
 *   the runaway "world zoom" you saw).
 * ✓ Damage + scene‑change checks now use the camera's *world* position.
 * ✓ Y‑only floor alignment is still handled so the player stays at the right
 *   height in the virtual scene.
 */
AFRAME.registerComponent("ar-move", {
  schema: {
    enabled: { type: "boolean", default: false },
    damageThreshold: { type: "number", default: 10 }, // meters
    sceneThreshold: { type: "number", default: 4 }, // meters
    damageCooldown: { type: "number", default: 2500 }, // ms
  },

  init() {
    // Basic state -----------------------------------------------------------
    this.enabled = this.data.enabled;
    this.originalScale = this.el.object3D.scale.clone();
    this.originalPosition = this.el.object3D.position.clone();

    // Head tracking ---------------------------------------------------------
    this.headWorldPos = new THREE.Vector3(); // scratch
    this.prevHeadPos = new THREE.Vector3(); // for movement dir
    this.movementDir = new THREE.Vector3();
    this.toSpriteDir = new THREE.Vector3();

    // Damage state ----------------------------------------------------------
    this.lastDamageMap = new Map();

    // Floor handling --------------------------------------------------------
    this.floorAligned = false;
    this.defaultFloorOffset = -3.5; // hard‑coded values from your original
    this.fineAdjustOffset = 0;

    // Scale factor in AR mode
    this.playerScale = 5.0;

    // Camera reference
    this.cameraEl = document.querySelector("#camera");

    // XR session listeners (bind early so we can remove later)
    this.onXRSessionStart = this.onXRSessionStart.bind(this);
    this.onXRSessionEnd = this.onXRSessionEnd.bind(this);
    this.el.sceneEl.addEventListener("enter-vr", this.onXRSessionStart);
    this.el.sceneEl.addEventListener("exit-vr", this.onXRSessionEnd);
    this.el.sceneEl.addEventListener("enter-ar", this.onXRSessionStart);
    this.el.sceneEl.addEventListener("exit-ar", this.onXRSessionEnd);

    // One‑time setup
    this.updateCameraControls();
    this.updatePlayerScale();
  },

  /* ----------------------------------------------------------------------- */
  /*  Helpers                                                                */
  /* ----------------------------------------------------------------------- */
  updateCameraControls() {
    if (!this.cameraEl) this.cameraEl = document.querySelector("#camera");
    if (!this.cameraEl) return;
    this.cameraEl.setAttribute("look-controls", "enabled", this.enabled);
  },

  updatePlayerScale() {
    if (!this.el.object3D) return;
    if (this.enabled) {
      this.el.object3D.scale
        .copy(this.originalScale)
        .multiplyScalar(this.playerScale);
    } else {
      this.el.object3D.scale.copy(this.originalScale);
    }
  },

  forceCameraHeight() {
    // Only manipulates Y so X/Z stay untouched.
    const finalY = this.defaultFloorOffset + this.fineAdjustOffset;
    this.el.object3D.position.y = finalY;
    this.floorAligned = true;
  },

  // ------------------------------------------------------------------------
  // XR session hooks
  // ------------------------------------------------------------------------
  onXRSessionStart() {
    if (!this.enabled) return;
    this.updatePlayerScale();
    this.floorAligned = false;

    // Initialise prevHeadPos so first frame delta = 0
    const headPos = this.getHeadWorldPos();
    if (headPos) this.prevHeadPos.copy(headPos);

    // Ensure correct Y after the headset is fully initialised
    setTimeout(() => this.forceCameraHeight(), 500);
  },

  onXRSessionEnd() {
    if (!this.enabled) return;
    // Restore defaults
    this.el.object3D.scale.copy(this.originalScale);
    this.el.object3D.position.copy(this.originalPosition);
  },

  // ------------------------------------------------------------------------
  // Core per‑frame logic
  // ------------------------------------------------------------------------
  getHeadWorldPos() {
    const cam = this.cameraEl || document.querySelector("#camera");
    if (!cam || !cam.object3D) return null;
    cam.object3D.getWorldPosition(this.headWorldPos);
    // Use ground‑projected point for distance checks (ignore head height)
    this.headWorldPos.y = 0;
    return this.headWorldPos;
  },

  checkDamageCollision(playerPosition) {
    // Use findSpritesByDistance to get sprites within range
    const damageSprites = findSpritesByDistance(
      playerPosition,
      this.data.damageThreshold,
      "life-system"
    );

    // Process each sprite
    damageSprites.forEach((sprite) => {
      // Skip player entity
      if (
        sprite.id === "player" ||
        (sprite.aFrameComponent && sprite.aFrameComponent.id === "player")
      ) {
        return;
      }

      // Get A-Frame component reference
      const entityElement = sprite.aFrameComponent;
      if (!entityElement) {
        return;
      }

      try {
        // Check if the A-Frame entity has the life-system component
        if (
          !entityElement.components ||
          !entityElement.components["life-system"]
        ) {
          return;
        }

        const lifeSystem = entityElement.components["life-system"];

        // Get current time for cooldown check
        const now = Date.now();

        // Ensure lastDamageTime exists
        if (typeof lifeSystem.lastDamageTime === "undefined") {
          lifeSystem.lastDamageTime = 0;
        }

        const timeSinceLastDamage = now - lifeSystem.lastDamageTime;

        // Apply damage only if cooldown has elapsed
        if (timeSinceLastDamage >= this.data.damageCooldown) {
          console.log(
            `Applying damage to entity: ${entityElement.id || sprite.id}`
          );
          lifeSystem.takeDamage(10);
          lifeSystem.lastDamageTime = now;
        } else {
          console.log(
            `Damage on cooldown: ${
              this.data.damageCooldown - timeSinceLastDamage
            }ms remaining`
          );
        }
      } catch (error) {
        console.error("Error applying damage:", error);
      }
    });
  },

  checkSceneChange(headPos) {
    // Use the new findSpritesByDistance function to find nearby scene change triggers
    const sceneChangeEntities = findSpritesByDistance(
      headPos,
      this.data.sceneThreshold,
      "changeScene"
    );
    // Process each nearby scene change entity
    sceneChangeEntities.forEach((entity) => {
      const targetScene = entity.changeScene;
      if (targetScene) loadScene(targetScene);
    });
  },

  tick() {
    if (
      !this.enabled ||
      !(this.el.sceneEl.is("ar-mode") || this.el.sceneEl.is("vr-mode"))
    )
      return;

    // Keep Y aligned once at the start
    if (!this.floorAligned) this.forceCameraHeight();

    // Current camera world position (flattened)
    const headPos = this.getHeadWorldPos();
    if (!headPos) return;

    // Movement vector for angle checks
    this.movementDir.copy(headPos).sub(this.prevHeadPos);
    if (this.movementDir.lengthSq() > 0) this.movementDir.normalize();

    // Damage + scene triggers
    this.checkDamageCollision(headPos);
    this.checkSceneChange(headPos);

    // Store for next frame
    this.prevHeadPos.copy(headPos);
  },

  // ------------------------------------------------------------------------
  update(oldData) {
    this.enabled = this.data.enabled;
    this.updateCameraControls();
    this.updatePlayerScale();
    this.floorAligned = false; // re‑align if we toggle enabled
  },

  remove() {
    // Clean‑up listeners & restore transform
    this.el.sceneEl.removeEventListener("enter-vr", this.onXRSessionStart);
    this.el.sceneEl.removeEventListener("exit-vr", this.onXRSessionEnd);
    this.el.sceneEl.removeEventListener("enter-ar", this.onXRSessionStart);
    this.el.sceneEl.removeEventListener("exit-ar", this.onXRSessionEnd);

    this.el.object3D.scale.copy(this.originalScale);
    this.el.object3D.position.copy(this.originalPosition);
  },
});
