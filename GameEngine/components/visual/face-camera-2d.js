AFRAME.registerComponent("face-camera-2d", {
  init: function () {
    // Wait for scene to be ready
    if (!this.el.sceneEl.hasLoaded) {
      this.el.sceneEl.addEventListener("loaded", this.initCamera.bind(this));
    } else {
      this.initCamera();
    }
  },

  initCamera: function () {
    this.camera = document.querySelector("#camera");
  },

  tick: function () {
    if (!this.camera) return;
    var cameraRotation = new THREE.Euler().setFromQuaternion(
      this.camera.object3D.quaternion,
      "YXZ"
    );
    this.el.object3D.rotation.y = cameraRotation.y;
  },
});

export default {};
