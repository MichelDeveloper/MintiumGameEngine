AFRAME.registerComponent("face-camera-2d", {
  tick: function () {
    var cameraEl = this.el.sceneEl.camera.el;
    var cameraRotation = new THREE.Euler().setFromQuaternion(
      cameraEl.object3D.quaternion,
      "YXZ"
    );
    this.el.object3D.rotation.y = cameraRotation.y;
  },
});

export default {};
