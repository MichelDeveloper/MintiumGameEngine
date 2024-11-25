AFRAME.registerComponent("face-camera-3d", {
  tick: function () {
    var cameraEl = document.querySelector("[camera]");
    var cameraPos = new THREE.Vector3();
    cameraEl.object3D.getWorldPosition(cameraPos);
    this.el.object3D.lookAt(cameraPos);
  },
});

export default {};
