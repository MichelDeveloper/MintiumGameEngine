AFRAME.registerComponent("pixelated", {
  init: function () {
    this.el.addEventListener("materialtextureloaded", (e) => {
      const texture = e.detail.texture;
      texture.minFilter = THREE.NearestFilter;
      texture.magFilter = THREE.NearestFilter;
      texture.generateMipmaps = false;
      texture.needsUpdate = true;
    });
  },
});

export default {}; // Empty export to make it a module
