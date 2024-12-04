import { globalGameData, exportGlobalGameData } from "./gameEditor.js";
import { reloadGame } from "../GameEngine/core/scene-manager.js";

export function loadSpriteList() {
  const spriteSelector = document.getElementById("spriteSelector"); // Make sure this ID matches your HTML
  spriteSelector.innerHTML = ""; // Clear existing options

  const optionAux = document.createElement("option");
  optionAux.value = "void";
  optionAux.textContent = "void";
  spriteSelector.appendChild(optionAux);

  // Assuming gameData.sprites is available and populated
  globalGameData.sprites.forEach((sprite) => {
    const option = document.createElement("option");
    option.value = sprite.id;
    option.textContent = `Sprite: ${sprite.id.toUpperCase()}`; // Customize this text as needed
    spriteSelector.appendChild(option);
  });
}

document.addEventListener("gameDataLoaded", function () {
  const mapGrid = document.querySelector(".mapGrid");
  const generateMapCodeBtn = document.getElementById("generateMapCode");
  const resetMapGridBtn = document.getElementById("resetMapGrid");
  const mapCodeArea = document.getElementById("mapCode");
  const spriteSelector = document.getElementById("spriteSelector");
  const layerSelector = document.getElementById("layerSelector");
  const saveMapBtn = document.getElementById("saveMap");
  const exportProjectBtn = document.getElementById("exportProjectBtn");
  const loadMapBtn = document.getElementById("loadMap");
  const sceneSelector = document.getElementById("sceneSelector");
  const setPlayerSpawnBtn = document.getElementById("setPlayerSpawnBtn");
  const createSceneBtn = document.getElementById("createSceneBtn");
  const newSceneIdInput = document.getElementById("newSceneId");

  let isSettingSpawn = false;

  setPlayerSpawnBtn.addEventListener("click", function () {
    isSettingSpawn = !isSettingSpawn;
    this.classList.toggle("active");
    if (!isSettingSpawn) {
      this.blur();
    }
  });

  // Function to load scenes into the scene selector
  function loadSceneSelector() {
    globalGameData.scenes.forEach((scene, index) => {
      const option = document.createElement("option");
      option.value = index;
      option.textContent = scene.sceneId;
      sceneSelector.appendChild(option);
    });
  }

  loadSceneSelector();

  sceneSelector.addEventListener("change", () => {
    loadMapEditorScene();
    const selectedSceneIndex = sceneSelector.value;
    const selectedScene = globalGameData.scenes[selectedSceneIndex];
    const skyColorPicker = document.getElementById("skyColorPicker");
    if (selectedScene && selectedScene.backgroundColor) {
      skyColorPicker.value = selectedScene.backgroundColor;
    } else {
      skyColorPicker.value = "#aabbcc"; // Default color
    }
  });

  function loadMapEditorScene() {
    mapGrid.innerHTML = "";

    const selectedSceneIndex = sceneSelector.value;
    const selectedLayerIndex = layerSelector.selectedIndex;
    const selectedScene = globalGameData.scenes[selectedSceneIndex];
    const selectedLayer = selectedScene.data[selectedLayerIndex];

    // Populate the map grid with the selected layer's map data
    selectedLayer.layerData.forEach((row) => {
      row.forEach((spriteId) => {
        const cell = document.createElement("div");
        cell.classList.add("mapCell");
        cell.dataset.spriteId = spriteId;

        // Set sprite preview if it exists
        if (spriteId !== "0" && spriteId !== "void") {
          const spritePreview = createSpritePreview(spriteId);
          if (spritePreview) {
            cell.style.backgroundImage = `url(${spritePreview})`;
            cell.style.backgroundSize = "contain";
            cell.style.backgroundRepeat = "no-repeat";
            cell.style.backgroundPosition = "center";
          }
        } else {
          cell.style.backgroundColor =
            spriteMapping[spriteId] || spriteMapping["0"];
        }
        cell.addEventListener("click", function () {
          if (isSettingSpawn) {
            // Remove previous spawn marker
            const previousSpawn = document.querySelector(
              ".mapCell.spawn-position"
            );
            if (previousSpawn) {
              previousSpawn.classList.remove("spawn-position");
            }

            // Set new spawn position
            cell.classList.add("spawn-position");

            // Calculate grid position
            const index = Array.from(mapGrid.children).indexOf(cell);
            const x = index % 10;
            const z = Math.floor(index / 10);

            // Update scene data
            const selectedSceneIndex = sceneSelector.value;
            const selectedScene = globalGameData.scenes[selectedSceneIndex];

            if (selectedScene) {
              selectedScene.playerSpawnPosition = { x, z };
            }

            // Deselect the spawn button and reset state
            isSettingSpawn = false;
            const spawnButton = document.getElementById("setPlayerSpawnBtn");
            spawnButton.classList.remove("active");
            spawnButton.blur();
          } else {
            const selectedSpriteId = spriteSelector.value;

            switch (currentTool) {
              case "pen":
                updateCellSprite(cell, selectedSpriteId);
                break;
              case "eraser":
                updateCellSprite(cell, "void");
                break;
              case "fill":
                floodFill(cell, selectedSpriteId);
                break;
            }
          }
        });
        mapGrid.appendChild(cell);
      });
    });

    // Set spawn position marker if it exists
    if (selectedScene.playerSpawnPosition) {
      const { x, z } = selectedScene.playerSpawnPosition;
      const index = z * 10 + x;
      const cell = mapGrid.children[index];
      if (cell) {
        cell.classList.add("spawn-position");
      }
    }
  }

  loadMapBtn.addEventListener("click", function () {
    loadMapEditorScene();
  });

  // Function to update a map layer in globalGameData
  function updateMapLayer(sceneId, layerIndex, newLayerData) {
    const scene = globalGameData.scenes.find(
      (scene) => scene.sceneId === sceneId
    );
    if (scene && scene.data[layerIndex]) {
      scene.data[layerIndex].layerData = newLayerData.map((id) => id); // Converting to a 2D array format
    } else {
      console.error("Layer or scene not found");
    }
  }

  loadSpriteList();

  // Populate layer selector
  globalGameData.scenes[0].data.forEach((layer, index) => {
    const option = document.createElement("option");
    option.value = index;
    option.textContent = `Layer ${index}`;
    layerSelector.appendChild(option);
  });

  // Generate sprite mapping based on game data
  const spriteMapping = globalGameData.sprites.reduce(
    (mapping, sprite, index) => {
      mapping[sprite.id] = `rgba(0, 100, 100, 1)`;
      return mapping;
    },
    {}
  );

  function createSpritePreview(spriteId) {
    const sprite = globalGameData.sprites.find((s) => s.id === spriteId);
    if (!sprite || !sprite.pixels) return null;

    const canvas = document.createElement("canvas");
    canvas.width = 40;
    canvas.height = 40;
    const ctx = canvas.getContext("2d");

    // Scale the 8x8 sprite to fit the 40x40 cell
    const scale = 5; // 40/8 = 5

    sprite.pixels.forEach((row, y) => {
      row.forEach((color, x) => {
        if (color !== "rgba(0,0,0,0)") {
          ctx.fillStyle = color;
          ctx.fillRect(x * scale, y * scale, scale, scale);
        }
      });
    });

    return canvas.toDataURL();
  }

  for (let i = 0; i < 100; i++) {
    // 10x10 grid
    const cell = document.createElement("div");
    cell.classList.add("mapCell");
    cell.dataset.spriteId = "0"; // Initialize all cells as void
    cell.style.backgroundColor = spriteMapping["0"];
    cell.addEventListener("click", function () {
      const selectedSpriteId = spriteSelector.value; // Get the selected sprite ID from the dropdown
      cell.dataset.spriteId = selectedSpriteId;
      if (selectedSpriteId !== "0" && selectedSpriteId !== "void") {
        const spritePreview = createSpritePreview(selectedSpriteId);
        if (spritePreview) {
          cell.style.backgroundImage = `url(${spritePreview})`;
          cell.style.backgroundSize = "contain";
          cell.style.backgroundRepeat = "no-repeat";
          cell.style.backgroundPosition = "center";
        }
      } else {
        cell.style.backgroundImage = "";
        cell.style.backgroundColor =
          spriteMapping[selectedSpriteId] || spriteMapping["0"];
      }
      cell.textContent = selectedSpriteId; // Display sprite ID for visual feedback
    });
    mapGrid.appendChild(cell);
  }

  generateMapCodeBtn.addEventListener("click", function () {
    let mapCode = "layerData: [\n";
    const rows = [...mapGrid.children];
    for (let i = 0; i < rows.length; i += 10) {
      let rowCode = "  [";
      for (let j = 0; j < 10; j++) {
        const spriteId = rows[i + j].dataset.spriteId.trim();
        rowCode += `"${spriteId}"`;
        if (j < 9) rowCode += ", ";
      }
      rowCode += "]";
      if (i < 90) rowCode += ",\n";
      mapCode += rowCode;
    }
    mapCode += "\n],";
    mapCodeArea.value = mapCode;
  });

  resetMapGridBtn.addEventListener("click", function () {
    const cells = mapGrid.children;
    for (let cell of cells) {
      cell.style.backgroundColor = spriteMapping["0"];
      cell.dataset.spriteId = "0"; // Reset cell to void
      cell.textContent = ""; // Clear sprite ID text
    }
  });

  // Save Map
  saveMapBtn.addEventListener("click", () => {
    const selectedLayerIndex = layerSelector.value;
    const selectedSceneIndex = sceneSelector.value;
    const selectedScene = globalGameData.scenes[selectedSceneIndex];
    const cells = Array.from(mapGrid.children);
    const newLayerData = [];

    // Collect data row by row
    for (let i = 0; i < cells.length; i += 10) {
      const row = cells.slice(i, i + 10).map((cell) => cell.dataset.spriteId);
      newLayerData.push(row);
    }

    // Update the selected layer in the global game data
    updateMapLayer(
      selectedScene.sceneId,
      parseInt(selectedLayerIndex, 10),
      newLayerData
    );

    // Save spawn position if it exists
    const spawnCell = document.querySelector(".mapCell.spawn-position");
    if (spawnCell) {
      const index = Array.from(mapGrid.children).indexOf(spawnCell);
      const x = index % 10;
      const z = Math.floor(index / 10);
      selectedScene.playerSpawnPosition = { x, z };
    }

    // Save sky color
    const skyColorPicker = document.getElementById("skyColorPicker");
    selectedScene.backgroundColor = skyColorPicker.value;

    // Save to localStorage
    localStorage.setItem("gameData", JSON.stringify(globalGameData));

    reloadGame(selectedScene.sceneId);
    alert("Map saved successfully!");
  });

  // Export Project
  exportProjectBtn.addEventListener("click", () => exportGlobalGameData());

  function initializeSkyColorPicker() {
    const skyColorPicker = document.getElementById("skyColorPicker");

    // Set initial color from current scene
    const selectedSceneIndex = sceneSelector.value;
    const selectedScene = globalGameData.scenes[selectedSceneIndex];
    skyColorPicker.value = selectedScene.backgroundColor || "#aabbcc";
  }

  initializeSkyColorPicker();
  loadMapEditorScene();

  createSceneBtn.addEventListener("click", function () {
    const sceneId = newSceneIdInput.value.trim();

    if (!sceneId) {
      alert("Please enter a scene ID!");
      return;
    }

    // Check if scene ID already exists
    if (globalGameData.scenes.some((scene) => scene.sceneId === sceneId)) {
      alert("A scene with this ID already exists!");
      return;
    }

    // Create new scene with 2 standard layers
    const newScene = {
      sceneId: sceneId,
      backgroundColor: "#aabbcc",
      playerSpawnPosition: { x: 0, z: 0 },
      data: [
        {
          layerData: Array(10)
            .fill()
            .map(() => Array(10).fill("0")),
        },
        {
          layerData: Array(10)
            .fill()
            .map(() => Array(10).fill("0")),
        },
      ],
    };

    // Add new scene to globalGameData
    globalGameData.scenes.push(newScene);

    // Add new scene to scene selector
    const option = document.createElement("option");
    option.value = globalGameData.scenes.length - 1;
    option.textContent = sceneId;
    sceneSelector.appendChild(option);

    // Select the new scene
    sceneSelector.value = globalGameData.scenes.length - 1;
    loadMapEditorScene();

    // Clear input
    newSceneIdInput.value = "";

    // Save to localStorage
    localStorage.setItem("gameData", JSON.stringify(globalGameData));

    alert("Scene created successfully!");
  });

  // Add after element selections
  const penBtn = document.getElementById("penBtn");
  const eraserBtn = document.getElementById("eraserBtn");
  const fillBtn = document.getElementById("fillBtn");

  let currentTool = "pen";

  // Add tool click handlers
  penBtn.addEventListener("click", function () {
    currentTool = "pen";
    penBtn.classList.add("tool-active");
    eraserBtn.classList.remove("tool-active");
    fillBtn.classList.remove("tool-active");
  });

  eraserBtn.addEventListener("click", function () {
    currentTool = "eraser";
    eraserBtn.classList.add("tool-active");
    penBtn.classList.remove("tool-active");
    fillBtn.classList.remove("tool-active");
  });

  fillBtn.addEventListener("click", function () {
    currentTool = "fill";
    fillBtn.classList.add("tool-active");
    penBtn.classList.remove("tool-active");
    eraserBtn.classList.remove("tool-active");
  });

  // Add flood fill function
  function floodFill(startCell, newSpriteId) {
    const targetSpriteId = startCell.dataset.spriteId;
    if (targetSpriteId === newSpriteId) return;

    const cells = Array.from(mapGrid.children);
    const visited = new Set();
    const stack = [startCell];

    while (stack.length > 0) {
      const cell = stack.pop();
      const index = cells.indexOf(cell);
      if (visited.has(index)) continue;

      if (cell.dataset.spriteId === targetSpriteId) {
        // Update cell with new sprite
        updateCellSprite(cell, newSpriteId);
        visited.add(index);

        // Add adjacent cells
        const x = index % 10;
        const y = Math.floor(index / 10);

        // Check adjacent cells (up, right, down, left)
        const adjacentIndices = [
          y > 0 ? index - 10 : -1, // up
          x < 9 ? index + 1 : -1, // right
          y < 9 ? index + 10 : -1, // down
          x > 0 ? index - 1 : -1, // left
        ];

        adjacentIndices.forEach((adjIndex) => {
          if (
            adjIndex !== -1 &&
            cells[adjIndex]?.dataset.spriteId === targetSpriteId
          ) {
            stack.push(cells[adjIndex]);
          }
        });
      }
    }
  }

  // Modify the cell click handler in loadMapEditorScene
  function updateCellSprite(cell, spriteId) {
    cell.dataset.spriteId = spriteId;
    if (spriteId !== "0" && spriteId !== "void") {
      const spritePreview = createSpritePreview(spriteId);
      if (spritePreview) {
        cell.style.backgroundImage = `url(${spritePreview})`;
        cell.style.backgroundSize = "contain";
        cell.style.backgroundRepeat = "no-repeat";
        cell.style.backgroundPosition = "center";
      }
    } else {
      cell.style.backgroundImage = "";
      cell.style.backgroundColor =
        spriteMapping[spriteId] || spriteMapping["0"];
    }
  }
});
