import { globalGameData } from "./gameEditor.js";
import { loadSpriteList } from "./mapEditor.js";
import {
  reloadGame,
  getCurrentScene,
} from "../GameEngine/core/scene-manager.js";

document.addEventListener("DOMContentLoaded", function () {
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
    spriteSelector.value = firstSprite.id;
    spriteIdInput.value = firstSprite.id;
    spriteTypeSelector.value = firstSprite.type || "block";
    spriteCollisionCheckbox.checked = firstSprite.collision || false;
    changeSceneSelector.value = firstSprite.changeScene || "";
    whenNearShowTextArea.value = firstSprite.whenNearShowText || "";
    populateGrid(firstSprite.pixels);
  } else {
    // Initialize with empty state if no sprites exist
    spriteIdInput.value = "";
    spriteTypeSelector.value = "block";
    spriteCollisionCheckbox.checked = false;
    changeSceneSelector.value = "";
    whenNearShowTextArea.value = "";
    populateGrid(Array(64).fill("rgba(0,0,0,0)"));
  }

  let mode = "draw";
  let selectedColor = colorPicker.value;

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
    pixels.forEach((pixelRow) => {
      pixelRow.forEach((color) => {
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
    const spriteData = globalGameData.sprites.find(
      (sprite) => sprite.id === spriteId
    );
    const pixels = Array.from(grid.children).map(
      (cell) => cell.style.backgroundColor || "rgba(0,0,0,0)"
    );

    // Assuming sprites are 8x8, convert the flat pixel array to a 2D array
    const pixelRows = [];
    for (let i = 0; i < pixels.length; i += 8) {
      pixelRows.push(pixels.slice(i, i + 8));
    }

    const newSpriteData = {
      type: spriteTypeSelector.value,
      collision: spriteCollisionCheckbox.checked,
      changeScene: changeSceneSelector.value.trim() || "",
      whenNearShowText: whenNearShowTextArea.value.trim() || "",
      ...spriteData,
      pixels: pixelRows,
      id: spriteId,
    };

    // Update or add the sprite in globalGameData
    const existingIndex = globalGameData.sprites.findIndex(
      (sprite) => sprite.id === spriteId
    );
    if (existingIndex !== -1) {
      globalGameData.sprites[existingIndex] = newSpriteData;
    } else {
      globalGameData.sprites.push(newSpriteData);
      addSpriteToList(spriteId);
    }

    // Save to localStorage
    localStorage.setItem("gameData", JSON.stringify(globalGameData));

    loadSpriteList(); //reload map tab sprite list

    // Get current scene ID before reloading
    const currentScene = getCurrentScene();
    reloadGame(
      currentScene ? currentScene.sceneId : globalGameData.scenes[0].sceneId
    );

    alert("Sprite saved!");
  });

  function initializeSpriteEditor() {
    const spriteSelector = document.getElementById("spriteEditorSelector");
    const spriteIdInput = document.getElementById("spriteIdInput");

    spriteSelector.addEventListener("change", (e) => {
      const selectedSpriteId = e.target.value;
      spriteIdInput.value = selectedSpriteId;

      // Rest of your existing sprite selection logic
      const selectedSprite = globalGameData.sprites.find(
        (sprite) => sprite.id === selectedSpriteId
      );
      if (selectedSprite) {
        document.getElementById("spriteTypeSelector").value =
          selectedSprite.type;
        document.getElementById("spriteCollisionCheckbox").checked =
          selectedSprite.collision;
        document.getElementById("whenNearShowText").value =
          selectedSprite.whenNearShowText || "";
        document.getElementById("changeSceneSelector").value =
          selectedSprite.changeScene || "";
      }
    });
  }

  initializeSpriteEditor();

  // Load the selected sprite into the grid
  spriteSelector.addEventListener("change", function () {
    const selectedSpriteId = this.value;
    const selectedSprite = globalGameData.sprites.find(
      (sprite) => sprite.id === selectedSpriteId
    );

    if (selectedSprite) {
      spriteIdInput.value = selectedSpriteId;
      spriteTypeSelector.value = selectedSprite.type || "block";
      spriteCollisionCheckbox.checked = selectedSprite.collision || false;
      changeSceneSelector.value = selectedSprite.changeScene || "";
      whenNearShowTextArea.value = selectedSprite.whenNearShowText || "";
      populateGrid(selectedSprite.pixels);
    }
  });
});
