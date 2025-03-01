import { globalGameData } from "./gameEditor.js";
import { loadSpriteList } from "./mapEditor.js";
import {
  reloadGame,
  getCurrentScene,
} from "../GameEngine/core/scene-manager.js";

document.addEventListener("gameDataLoaded", function () {
  const grid = document.querySelector(".grid");
  const generateCodeBtn = document.getElementById("generateCode");
  const resetGridBtn = document.getElementById("resetGrid");
  const spriteCodeArea = document.getElementById("spriteCode");
  const penBtn = document.getElementById("pen");
  const eraserBtn = document.getElementById("eraser");
  const colorPicker = document.getElementById("colorPicker");
  const saveSpriteBtn = document.getElementById("saveSprite");
  const spriteIdInput = document.getElementById("spriteIdInput");
  const loadSpriteBtn = document.getElementById("loadSprite");
  const spriteSelector = document.getElementById("spriteEditorSelector");
  const spriteTypeSelector = document.getElementById("spriteTypeSelector");
  const spriteCollisionCheckbox = document.getElementById(
    "spriteCollisionCheckbox"
  );
  const changeSceneSelector = document.getElementById("changeSceneSelector");
  const whenNearShowTextArea = document.getElementById("whenNearShowText");
  const textureTypeSelector = document.getElementById("textureTypeSelector");
  const textureUpload = document.getElementById("textureUpload");
  const attackTextureUpload = document.getElementById("attackTextureUpload");
  const attackTextureContainer = document.getElementById(
    "attackTextureContainer"
  );
  const hudTextArea = document.getElementById("hudText");
  const spriteSizeSelector = document.getElementById("spriteSizeSelector");

  let mode = "draw";
  let selectedColor = colorPicker.value;
  let textureFileName = null;
  let attackTextureFileName = null;

  // Populate the changeSceneSelector with available scenes
  function populateSceneSelector() {
    changeSceneSelector.innerHTML = '<option value="">None</option>'; // Default option for no scene change
    globalGameData.scenes.forEach((scene) => {
      const option = document.createElement("option");
      option.value = scene.sceneId;
      option.textContent = scene.sceneId; // Use scene ID as the text content
      changeSceneSelector.appendChild(option);
    });
  }

  populateSceneSelector();

  // Populate sprite selector with sprites from globalGameData
  globalGameData.sprites.forEach((sprite) => {
    addSpriteToList(sprite.id);
  });

  // Initialize with the first sprite if available
  if (globalGameData.sprites.length > 0) {
    const firstSprite = globalGameData.sprites[0];

    // First populate the selector
    globalGameData.sprites.forEach((sprite) => {
      addSpriteToList(sprite.id);
    });

    // Then set values
    spriteSelector.value = firstSprite.id;
    spriteIdInput.value = firstSprite.id;
    spriteTypeSelector.value = firstSprite.type || "block";
    textureTypeSelector.value = firstSprite.textureType || "pixels";
    spriteCollisionCheckbox.checked = firstSprite.collision || false;
    changeSceneSelector.value = firstSprite.changeScene || "";
    whenNearShowTextArea.value = firstSprite.whenNearShowText || "";
    hudTextArea.value = firstSprite.hudText || "";
    spriteSizeSelector.value = firstSprite.size || "normal";
    document.getElementById("spriteLifePoints").value =
      firstSprite.lifePoints || 0;

    if (firstSprite.textureType === "texture") {
      textureFileName = firstSprite.texturePath;
      attackTextureFileName = firstSprite.attackImage || "";
      textureUpload.type = "text";
      textureUpload.value = firstSprite.texturePath || "";
      textureUpload.style.display = "block";
      attackTextureContainer.style.display = "block";
      attackTextureUpload.value = firstSprite.attackImage || "";
      grid.style.display = "none";
    } else {
      grid.style.display = "grid";
      textureUpload.style.display = "none";
      attackTextureContainer.style.display = "none";
      textureUpload.value = "";
      attackTextureUpload.value = "";
      populateGrid(firstSprite.pixels);
    }
  } else {
    // Initialize with empty state if no sprites exist
    spriteIdInput.value = "";
    spriteTypeSelector.value = "block";
    spriteCollisionCheckbox.checked = false;
    changeSceneSelector.value = "";
    whenNearShowTextArea.value = "";
    populateGrid(Array(64).fill("rgba(0,0,0,0)"));
  }

  penBtn.classList.add("tool-active");

  function addSpriteToList(spriteId) {
    const option = document.createElement("option");
    option.value = spriteId;
    option.textContent = spriteId; // Use any property of sprite you want to show
    spriteSelector.appendChild(option);
  }

  function createGridCell() {
    const cell = document.createElement("div");
    cell.addEventListener("click", function () {
      switch (mode) {
        case "draw":
          this.style.backgroundColor = selectedColor;
          break;
        case "erase":
          this.style.backgroundColor = "rgba(0,0,0,0)"; // Set to transparent
          break;
        case "fill":
          floodFill(this, selectedColor);
          break;
        default:
          console.log("No tool selected");
      }
    });
    return cell;
  }

  function populateGrid(pixels) {
    grid.innerHTML = ""; // Clear the grid

    // Ensure pixels is a 2D array
    const safePixels = Array.isArray(pixels)
      ? pixels
      : Array(8)
          .fill()
          .map(() => Array(8).fill("rgba(0,0,0,0)"));

    safePixels.forEach((pixelRow) => {
      // Ensure pixelRow is an array
      const safeRow = Array.isArray(pixelRow)
        ? pixelRow
        : Array(8).fill("rgba(0,0,0,0)");
      safeRow.forEach((color) => {
        const cell = createGridCell();
        cell.style.backgroundColor = color || "rgba(0,0,0,0)";
        grid.appendChild(cell);
      });
    });
  }

  // Initial population of the grid with transparent cells
  //populateGrid(new Array(8).fill(new Array(8).fill('rgba(0,0,0,0)')));

  loadSpriteBtn.addEventListener("click", function () {
    const spriteId = spriteIdInput.value;
    const spriteData = globalGameData.sprites.find(
      (sprite) => sprite.id === spriteId
    );

    if (spriteData) {
      populateGrid(spriteData.pixels);
    } else {
      alert("Sprite not found!");
    }
  });

  const fillBtn = document.getElementById("fill");

  // Flood fill function
  function floodFill(startCell, fillColor) {
    const targetColor = startCell.style.backgroundColor;
    if (targetColor === fillColor) return;

    function fill(cell) {
      if (cell.style.backgroundColor === targetColor) {
        cell.style.backgroundColor = fillColor;
        const index = Array.from(grid.children).indexOf(cell);
        const width = Math.sqrt(grid.children.length); // Assuming a square grid
        const neighbors = [];
        if (index % width !== 0) neighbors.push(grid.children[index - 1]); // left
        if ((index + 1) % width !== 0) neighbors.push(grid.children[index + 1]); // right
        if (index >= width) neighbors.push(grid.children[index - width]); // above
        if (index < grid.children.length - width)
          neighbors.push(grid.children[index + width]); // below

        neighbors.forEach(fill);
      }
    }

    fill(startCell);
  }

  for (let i = 0; i < 64; i++) {
    const cell = document.createElement("div");
    cell.addEventListener("click", function () {
      switch (mode) {
        case "draw":
          this.style.backgroundColor = selectedColor;
          break;
        case "erase":
          this.style.backgroundColor = "rgba(0,0,0,0)"; // Set to transparent
          break;
        case "fill":
          floodFill(this, selectedColor);
          break;
        default:
          console.log("No tool selected");
      }
    });
    grid.appendChild(cell);
  }

  if (globalGameData.sprites.length > 0) {
    populateGrid(globalGameData.sprites[0].pixels);
  }

  generateCodeBtn.addEventListener("click", function () {
    let spriteCode = "pixels: [\n";
    const rows = [...grid.children];
    for (let i = 0; i < rows.length; i += 8) {
      let rowCode = "";
      for (let j = 0; j < 8; j++) {
        const cellColor = rows[i + j].style.backgroundColor;
        rowCode += cellColor ? `"${cellColor}"` : '"rgba(0,0,0,0)"';
        if (j < 7) rowCode += ", ";
      }
      rowCode += "";
      if (i < 56) rowCode += ",\n";
      spriteCode += rowCode;
    }
    spriteCode += "\n],";
    spriteCodeArea.value = spriteCode;
  });

  resetGridBtn.addEventListener("click", function () {
    const cells = grid.children;
    for (let cell of cells) {
      cell.style.backgroundColor = "";
    }
  });

  penBtn.addEventListener("click", function () {
    mode = "draw";
    penBtn.classList.add("tool-active");
    eraserBtn.classList.remove("tool-active");
  });

  eraserBtn.addEventListener("click", function () {
    mode = "erase";
    eraserBtn.classList.add("tool-active");
    penBtn.classList.remove("tool-active");
  });

  fillBtn.addEventListener("click", function () {
    mode = "fill";
    fillBtn.classList.add("tool-active");
    penBtn.classList.remove("tool-active");
    eraserBtn.classList.remove("tool-active");
  });

  colorPicker.addEventListener("change", function () {
    selectedColor = this.value;
  });

  saveSpriteBtn.addEventListener("click", function () {
    const spriteId = spriteIdInput.value;
    if (!spriteId.trim()) {
      alert("Please enter a sprite ID!");
      return;
    }

    const pixels = Array.from(grid.children).map(
      (cell) => cell.style.backgroundColor || "rgba(0,0,0,0)"
    );

    // Convert flat pixel array to 2D array
    const pixelRows = [];
    for (let i = 0; i < pixels.length; i += 8) {
      pixelRows.push(pixels.slice(i, i + 8));
    }

    // Create new sprite data
    const newSpriteData = {
      id: spriteId,
      type: spriteTypeSelector.value,
      textureType: textureTypeSelector.value,
      texturePath:
        textureTypeSelector.value === "texture" ? textureFileName : null,
      attackImage:
        textureTypeSelector.value === "texture" ? attackTextureFileName : null,
      collision: spriteCollisionCheckbox.checked,
      changeScene: changeSceneSelector.value.trim() || "",
      whenNearShowText: whenNearShowTextArea.value.trim() || "",
      hudText: hudTextArea.value.trim() || "",
      pixels: textureTypeSelector.value === "pixels" ? pixelRows : null,
      size: document.getElementById("spriteSizeSelector").value || "normal",
      lifePoints:
        parseInt(document.getElementById("spriteLifePoints").value) || 0,
    };

    // Update or add the sprite
    const existingIndex = globalGameData.sprites.findIndex(
      (sprite) => sprite.id === spriteId
    );

    if (existingIndex !== -1) {
      globalGameData.sprites[existingIndex] = newSpriteData;
    } else {
      globalGameData.sprites.push(newSpriteData);
      addSpriteToList(spriteId);
    }

    // Save and reload
    localStorage.setItem("gameData", JSON.stringify(globalGameData));
    loadSpriteList();

    // Reload current scene
    const currentScene = getCurrentScene();
    reloadGame(
      currentScene ? currentScene.sceneId : globalGameData.scenes[0].sceneId
    );

    alert("Sprite saved!");
  });

  textureTypeSelector.addEventListener("change", function () {
    if (this.value === "texture") {
      // Show a text input instead of file upload
      textureUpload.type = "text";
      textureUpload.placeholder = "Enter texture filename (e.g. grass.png)";
      textureUpload.style.display = "block";
      attackTextureContainer.style.display = "block"; // Show attack texture field
      grid.style.display = "none";
    } else {
      textureUpload.type = "file";
      textureUpload.style.display = "none";
      attackTextureContainer.style.display = "none"; // Hide attack texture field
      grid.style.display = "grid";
      textureFileName = null;
      attackTextureFileName = null;
      textureUpload.value = "";
      attackTextureUpload.value = "";
    }
  });

  // Add event listener for attack texture upload
  attackTextureUpload.addEventListener("change", function () {
    attackTextureFileName = this.value;
  });

  spriteSelector.addEventListener("change", function () {
    const selectedSpriteId = this.value;
    const selectedSprite = globalGameData.sprites.find(
      (sprite) => sprite.id === selectedSpriteId
    );

    if (selectedSprite) {
      spriteIdInput.value = selectedSpriteId;
      spriteTypeSelector.value = selectedSprite.type || "block";
      textureTypeSelector.value = selectedSprite.textureType || "pixels";
      spriteCollisionCheckbox.checked = selectedSprite.collision || false;
      changeSceneSelector.value = selectedSprite.changeScene || "";
      whenNearShowTextArea.value = selectedSprite.whenNearShowText || "";
      hudTextArea.value = selectedSprite.hudText || "";
      spriteSizeSelector.value = selectedSprite.size || "normal";
      document.getElementById("spriteLifePoints").value =
        selectedSprite.lifePoints || 0;

      if (selectedSprite.textureType === "texture") {
        textureFileName = selectedSprite.texturePath;
        attackTextureFileName = selectedSprite.attackImage || "";

        textureUpload.type = "text";
        textureUpload.value = selectedSprite.texturePath || "";
        textureUpload.style.display = "block";

        attackTextureContainer.style.display = "block";
        attackTextureUpload.value = selectedSprite.attackImage || "";

        grid.style.display = "none";
      } else {
        grid.style.display = "grid";
        textureUpload.style.display = "none";
        attackTextureContainer.style.display = "none";
        textureUpload.value = "";
        attackTextureUpload.value = "";
        populateGrid(selectedSprite.pixels);
      }
    }
  });
});
