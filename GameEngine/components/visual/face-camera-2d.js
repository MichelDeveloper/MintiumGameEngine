AFRAME.registerComponent("face-camera-2d", {
  tick: function () {
    var cameraEl = this.el.sceneEl.camera.el;
    var playerEl = document.getElementById("player");

    if (!cameraEl || !playerEl) return;

    // Get the world quaternion of the camera
    var worldQuat = new THREE.Quaternion();
    cameraEl.object3D.getWorldQuaternion(worldQuat);

    var cameraRotation = new THREE.Euler().setFromQuaternion(worldQuat, "YXZ");
    this.el.object3D.rotation.y = cameraRotation.y;
  },
});

export default {};
