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
  const mapSizeSelector = document.getElementById("mapSizeSelector");
  const applyMapSizeBtn = document.getElementById("applyMapSizeBtn");
  const fogToggle = document.getElementById("fogToggle");
  const fogSettings = document.getElementById("fogSettings");
  const fogDistance = document.getElementById("fogDistance");
  const fogDistanceValue = document.getElementById("fogDistanceValue");

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
    sceneSelector.innerHTML = ""; // Clear existing options
    globalGameData.scenes.forEach((scene, index) => {
      const option = document.createElement("option");
      option.value = index;
      option.textContent = scene.sceneId;
      sceneSelector.appendChild(option);
    });
  }

  loadSceneSelector();

  sceneSelector.addEventListener("change", async () => {
    await loadMapEditorScene();
    initMapSizeSelector();

    const selectedSceneIndex = sceneSelector.value;
    const selectedScene = globalGameData.scenes[selectedSceneIndex];
    const skyColorPicker = document.getElementById("skyColorPicker");
    if (selectedScene && selectedScene.backgroundColor) {
      skyColorPicker.value = selectedScene.backgroundColor;
    } else {
      skyColorPicker.value = "#aabbcc"; // Default color
    }

    // Add this line to update fog settings when changing scenes
    initializeSkyColorPicker();
  });

  // Get the current scene
  function getCurrentEditingScene() {
    const selectedSceneIndex = sceneSelector.value;
    return globalGameData.scenes[selectedSceneIndex];
  }

  // Initialize the size selector with current scene size
  function initMapSizeSelector() {
    const currentScene = getCurrentEditingScene();
    if (currentScene && currentScene.size) {
      mapSizeSelector.value = currentScene.size;
    } else {
      // Default to 10x10 if no size is set
      mapSizeSelector.value = "10";
      // Also set the scene size property
      if (currentScene) {
        currentScene.size = 10;
      }
    }
  }

  // Apply size button handler
  applyMapSizeBtn.addEventListener("click", function () {
    const newSize = parseInt(mapSizeSelector.value);
    const currentScene = getCurrentEditingScene();

    // Confirm before changing size if map already has data
    if (
      currentScene &&
      hasMapData(currentScene) &&
      currentScene.size !== newSize
    ) {
      if (
        !confirm(
          "Changing the map size will reset your current map data. Continue?"
        )
      ) {
        return;
      }
    }

    // Set the new size and reset the map
    if (currentScene) {
      currentScene.size = newSize;
      resetMapWithSize(currentScene, newSize);

      // Force a complete reload of the map editor display
      loadMapEditorScene();

      // Save changes to localStorage
      localStorage.setItem("gameData", JSON.stringify(globalGameData));
    }
  });

  function hasMapData(scene) {
    if (!scene.data || scene.data.length === 0) return false;

    for (const layer of scene.data) {
      for (const row of layer.layerData) {
        for (const cell of row) {
          if (cell !== "0") return true;
        }
      }
    }

    return false;
  }

  function resetMapWithSize(scene, size) {
    // Create new empty scene data with the specified size
    const newSceneData = [];

    // Set up layers (keep existing layer numbers but resize them)
    if (scene.data && scene.data.length > 0) {
      scene.data.forEach((existingLayer) => {
        const newLayer = {
          layer: existingLayer.layer,
          layerData: [],
        };

        // Create empty layer data of requested size
        for (let row = 0; row < size; row++) {
          const rowData = [];
          for (let col = 0; col < size; col++) {
            rowData.push("0");
          }
          newLayer.layerData.push(rowData);
        }

        newSceneData.push(newLayer);
      });
    } else {
      // If no existing layers, create default ones
      for (let layerIndex = 0; layerIndex < 3; layerIndex++) {
        const newLayer = {
          layer: layerIndex - 1, // Layer -1, 0, 1
          layerData: [],
        };

        // Create empty layer data of requested size
        for (let row = 0; row < size; row++) {
          const rowData = [];
          for (let col = 0; col < size; col++) {
            rowData.push("0");
          }
          newLayer.layerData.push(rowData);
        }

        newSceneData.push(newLayer);
      }
    }

    // Set the new scene data
    scene.data = newSceneData;

    // Reset player spawn to center of map
    scene.playerSpawnPosition = {
      x: Math.floor(size / 2),
      z: Math.floor(size / 2),
    };
  }

  // Updated async function to load the map grid based on the current scene/layer data
  async function loadMapEditorScene() {
    const currentScene = getCurrentEditingScene();
    if (!currentScene) return;

    // Update the size selector to match current scene's size
    if (currentScene && currentScene.size) {
      mapSizeSelector.value = currentScene.size;
    } else if (currentScene) {
      // Default to 10x10 if not set, and save it
      currentScene.size = 10;
      mapSizeSelector.value = "10";
    }

    const selectedLayerIndex = layerSelector.selectedIndex;

    // Get scene size (default to 10 if not set)
    const sceneSize =
      currentScene && currentScene.size ? parseInt(currentScene.size) : 10;

    // Clear the map grid
    mapGrid.innerHTML = "";

    // Set the grid template based on scene size
    mapGrid.style.gridTemplateColumns = `repeat(${sceneSize}, 40px)`;
    mapGrid.style.gridTemplateRows = `repeat(${sceneSize}, 40px)`;

    // If no scene selected, don't proceed
    if (!currentScene || !currentScene.data || currentScene.data.length === 0)
      return;

    const selectedLayer = currentScene.data[selectedLayerIndex];
    if (!selectedLayer) return;

    // Populate the map grid
    for (let z = 0; z < sceneSize; z++) {
      for (let x = 0; x < sceneSize; x++) {
        const cell = document.createElement("div");
        cell.className = "mapCell";
        cell.dataset.row = z;
        cell.dataset.col = x;

        // Get sprite ID from layer data (if exists)
        let spriteId = "0";
        if (
          selectedLayer.layerData &&
          z < selectedLayer.layerData.length &&
          x < selectedLayer.layerData[z].length
        ) {
          spriteId = selectedLayer.layerData[z][x];
        }

        cell.dataset.spriteId = spriteId;

        // Set cell appearance based on sprite
        if (spriteId !== "0" && spriteId !== "void") {
          const spritePreview = await createSpritePreview(spriteId);
          if (spritePreview) {
            cell.style.backgroundImage = `url(${spritePreview})`;
            cell.style.backgroundSize = "contain";
            cell.style.backgroundRepeat = "no-repeat";
            cell.style.backgroundPosition = "center";
            cell.style.backgroundColor = "transparent";
          }
        } else {
          cell.style.backgroundImage = "";
          cell.style.backgroundColor =
            spriteMapping[spriteId] || spriteMapping["0"];
        }

        cell.addEventListener("click", async function () {
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

            // Update scene data
            const currentScene = getCurrentEditingScene();
            if (currentScene) {
              currentScene.playerSpawnPosition = {
                x: parseInt(cell.dataset.col),
                z: parseInt(cell.dataset.row),
              };
            }

            // Deselect the spawn button and reset state
            isSettingSpawn = false;
            const spawnButton = document.getElementById("setPlayerSpawnBtn");
            spawnButton.classList.remove("active");
            spawnButton.blur();
          } else {
            await updateCellWithTool(this);
          }
        });

        mapGrid.appendChild(cell);
      }
    }

    // Set spawn position marker if it exists
    if (currentScene.playerSpawnPosition) {
      const { x, z } = currentScene.playerSpawnPosition;
      // Find the cell by data attributes instead of index
      const spawnCell = document.querySelector(
        `.mapCell[data-row="${z}"][data-col="${x}"]`
      );
      if (spawnCell) {
        spawnCell.classList.add("spawn-position");
      }
    }

    // Update the enableMapBorders checkbox to match the scene setting
    const enableMapBordersCheckbox =
      document.getElementById("enableMapBorders");
    enableMapBordersCheckbox.checked = currentScene.enableMapBorders ?? true; // Default to true if undefined

    // Update the XR mode selector to match the scene setting
    const xrModeSelector = document.getElementById("xrModeSelector");
    if (currentScene.xrMode) {
      xrModeSelector.value = currentScene.xrMode;
    } else {
      xrModeSelector.value = "vr"; // Default to vr if not set
    }

    // Update the movement mode selector to match the scene setting
    const movementModeSelector = document.getElementById(
      "movementModeSelector"
    );
    if (currentScene.movementMode) {
      movementModeSelector.value = currentScene.movementMode;
    } else {
      movementModeSelector.value = "grid"; // Default to grid if not set
    }
  }

  loadMapBtn.addEventListener("click", async function () {
    await loadMapEditorScene();
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
  layerSelector.innerHTML = "";
  globalGameData.scenes[0].data.forEach((layer, index) => {
    const option = document.createElement("option");
    option.value = index;
    option.textContent = `Layer ${index}`;
    layerSelector.appendChild(option);
  });

  // Generate sprite mapping based on game data
  const spriteMapping = globalGameData.sprites.reduce((mapping, sprite) => {
    mapping[sprite.id] = `rgba(0, 100, 100, 1)`;
    return mapping;
  }, {});

  async function createSpritePreview(spriteId) {
    const sprite = globalGameData.sprites.find((s) => s.id === spriteId);
    if (!sprite) return null;

    const canvas = document.createElement("canvas");
    canvas.width = 40;
    canvas.height = 40;
    const ctx = canvas.getContext("2d");

    // Add special handling for gaussian splatting
    if (sprite.type === "gaussian") {
      ctx.fillStyle = "#4287f5";
      ctx.fillRect(0, 0, 40, 40);
      ctx.fillStyle = "white";
      ctx.font = "bold 24px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("G", 20, 20);

      return canvas.toDataURL();
    } else if (sprite.type === "mesh") {
      ctx.fillStyle = "#00ff55";
      ctx.fillRect(0, 0, 40, 40);

      ctx.fillStyle = "white";
      ctx.font = "bold 24px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("M", 20, 20);

      return canvas.toDataURL();
    } else if (sprite.textureType === "texture" && sprite.texturePath) {
      try {
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = `Resources/Textures/${sprite.texturePath}`;
        });
        ctx.drawImage(img, 0, 0, 40, 40);
        return canvas.toDataURL();
      } catch (error) {
        console.error("Failed to load texture:", error);
        ctx.fillStyle = "red";
        ctx.fillRect(0, 0, 40, 40);
      }
    } else if (sprite.pixels) {
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

    // Draw placeholder for invalid sprites
    ctx.fillStyle = "gray";
    ctx.fillRect(0, 0, 40, 40);
    return canvas.toDataURL();
  }

  // Initialize default 10x10 grid (in case no map is loaded)
  mapGrid.innerHTML = "";
  for (let i = 0; i < 100; i++) {
    const cell = document.createElement("div");
    cell.classList.add("mapCell");
    cell.dataset.spriteId = "0"; // Initialize all cells as void
    cell.style.backgroundColor = spriteMapping["0"];
    cell.addEventListener("click", async function () {
      const selectedSpriteId = spriteSelector.value;
      cell.dataset.spriteId = selectedSpriteId;
      if (selectedSpriteId !== "0" && selectedSpriteId !== "void") {
        const spritePreview = await createSpritePreview(selectedSpriteId);
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
    const rows = Array.from(mapGrid.children);
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
      cell.style.backgroundImage = "";
    }
  });

  // Save Map - Update to handle variable-sized maps
  saveMapBtn.addEventListener("click", () => {
    const selectedLayerIndex = layerSelector.value;
    const currentScene = getCurrentEditingScene();
    const sceneSize =
      currentScene && currentScene.size ? parseInt(currentScene.size) : 10;

    // Create a new empty layer data structure
    const newLayerData = [];
    for (let z = 0; z < sceneSize; z++) {
      const row = [];
      for (let x = 0; x < sceneSize; x++) {
        // Find cell by data attributes
        const cell = document.querySelector(
          `.mapCell[data-row="${z}"][data-col="${x}"]`
        );
        row.push(cell ? cell.dataset.spriteId : "0");
      }
      newLayerData.push(row);
    }

    // Update the selected layer in the global game data
    if (currentScene.data[parseInt(selectedLayerIndex)]) {
      currentScene.data[parseInt(selectedLayerIndex)].layerData = newLayerData;
    }

    // Save spawn position if it exists
    const spawnCell = document.querySelector(".mapCell.spawn-position");
    if (spawnCell) {
      currentScene.playerSpawnPosition = {
        x: parseInt(spawnCell.dataset.col),
        z: parseInt(spawnCell.dataset.row),
      };
    }

    // Save sky color
    const skyColorPicker = document.getElementById("skyColorPicker");
    currentScene.backgroundColor = skyColorPicker.value;

    // Save fog settings
    currentScene.fogEnabled = fogToggle.checked;
    currentScene.fogDistance = parseInt(fogDistance.value);

    // Save XR mode preference
    const xrModeSelector = document.getElementById("xrModeSelector");
    currentScene.xrMode = xrModeSelector.value;

    // Save movement mode preference
    const movementModeSelector = document.getElementById(
      "movementModeSelector"
    );
    currentScene.movementMode = movementModeSelector.value;

    // Save map borders setting
    currentScene.enableMapBorders =
      document.getElementById("enableMapBorders").checked;

    // Save AR player scale if using AR mode
    if (currentScene.movementMode === "ar") {
      const arPlayerScale = parseFloat(
        document.getElementById("ar-player-scale").value
      );
      currentScene.arPlayerScale = arPlayerScale || 5.0;
    }

    // Save to localStorage
    localStorage.setItem("gameData", JSON.stringify(globalGameData));

    reloadGame(currentScene.sceneId);
    alert("Map saved successfully!");
  });

  // Export Project
  exportProjectBtn.addEventListener("click", () => exportGlobalGameData());

  function initializeSkyColorPicker() {
    const skyColorPicker = document.getElementById("skyColorPicker");
    const selectedSceneIndex = sceneSelector.value;
    const selectedScene = globalGameData.scenes[selectedSceneIndex];

    // Set sky color
    skyColorPicker.value = selectedScene.backgroundColor || "#aabbcc";

    // Set fog settings
    fogToggle.checked = selectedScene.fogEnabled || false;
    fogSettings.style.display = fogToggle.checked ? "block" : "none";

    if (selectedScene.fogDistance) {
      fogDistance.value = selectedScene.fogDistance;
      fogDistanceValue.textContent = selectedScene.fogDistance;
    } else {
      fogDistance.value = 50;
      fogDistanceValue.textContent = "50";
    }
  }

  initializeSkyColorPicker();
  loadMapEditorScene();

  createSceneBtn.addEventListener("click", function () {
    const sceneId = newSceneIdInput.value.trim();

    if (!sceneId) {
      alert("Please enter a scene ID!");
      return;
    }

    if (globalGameData.scenes.some((scene) => scene.sceneId === sceneId)) {
      alert("A scene with this ID already exists!");
      return;
    }

    // Get current selected size
    const selectedSize = parseInt(mapSizeSelector.value) || 10;

    const newScene = {
      sceneId: sceneId,
      backgroundColor: "#87CEEB", // Default sky blue
      playerSpawnPosition: {
        x: Math.floor(selectedSize / 2),
        z: Math.floor(selectedSize / 2),
      },
      size: selectedSize,
      fogEnabled: false,
      fogDistance: 50,
      enableMapBorders: true,
      xrMode: "vr", // Default to vr
      movementMode: "grid", // Default to grid movement
      data: [
        {
          layer: -1, // Background layer
          layerData: Array(selectedSize)
            .fill()
            .map(() => Array(selectedSize).fill("0")),
        },
        {
          layer: 0, // Main layer
          layerData: Array(selectedSize)
            .fill()
            .map(() => Array(selectedSize).fill("0")),
        },
      ],
    };

    globalGameData.scenes.push(newScene);

    const option = document.createElement("option");
    option.value = globalGameData.scenes.length - 1;
    option.textContent = sceneId;
    sceneSelector.appendChild(option);
    sceneSelector.value = globalGameData.scenes.length - 1;
    loadMapEditorScene();

    newSceneIdInput.value = "";
    localStorage.setItem("gameData", JSON.stringify(globalGameData));
  });

  const penBtn = document.getElementById("penBtn");
  const eraserBtn = document.getElementById("eraserBtn");
  const fillBtn = document.getElementById("fillBtn");

  let currentTool = "pen";

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

  // Updated cell sprite updater as an async function
  async function updateCellSprite(cell, spriteId) {
    cell.dataset.spriteId = spriteId;
    if (spriteId !== "0" && spriteId !== "void") {
      const spritePreview = await createSpritePreview(spriteId);
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

  // Updated flood fill function to work with variable-sized maps
  async function floodFill(startCell, newSpriteId) {
    const targetSpriteId = startCell.dataset.spriteId;
    if (targetSpriteId === newSpriteId) return;

    const currentScene = getCurrentEditingScene();
    const sceneSize =
      currentScene && currentScene.size ? parseInt(currentScene.size) : 10;

    // Using a queue-based approach for better memory usage
    const queue = [startCell];
    // Track visited cells by their coordinates
    const visited = new Set();
    const startCoord = `${startCell.dataset.row},${startCell.dataset.col}`;
    visited.add(startCoord);

    while (queue.length > 0) {
      const cell = queue.shift();

      // Apply the new sprite to this cell
      await updateCellSprite(cell, newSpriteId);

      // Get cell coordinates
      const row = parseInt(cell.dataset.row);
      const col = parseInt(cell.dataset.col);

      // Check each of the 4 adjacent cells (up, right, down, left)
      const adjacentPositions = [
        [row - 1, col], // up
        [row, col + 1], // right
        [row + 1, col], // down
        [row, col - 1], // left
      ];

      for (const [adjRow, adjCol] of adjacentPositions) {
        // Skip if out of bounds
        if (
          adjRow < 0 ||
          adjRow >= sceneSize ||
          adjCol < 0 ||
          adjCol >= sceneSize
        ) {
          continue;
        }

        // Create key for visited set
        const adjCoord = `${adjRow},${adjCol}`;
        if (visited.has(adjCoord)) continue;

        // Find the adjacent cell in the DOM
        const adjCell = document.querySelector(
          `.mapCell[data-row="${adjRow}"][data-col="${adjCol}"]`
        );
        if (adjCell && adjCell.dataset.spriteId === targetSpriteId) {
          visited.add(adjCoord);
          queue.push(adjCell);
        }
      }
    }
  }

  // Make sure the flood fill tool is correctly attached to cell clicks
  async function updateCellWithTool(cell) {
    const selectedSpriteId = spriteSelector.value;

    if (currentTool === "pen") {
      await updateCellSprite(cell, selectedSpriteId);
    } else if (currentTool === "eraser") {
      await updateCellSprite(cell, "0");
    } else if (currentTool === "fill") {
      await floodFill(cell, selectedSpriteId);
    }
  }

  // Add event listener for fog toggle
  fogToggle.addEventListener("change", function () {
    fogSettings.style.display = this.checked ? "block" : "none";
  });

  // Add event listener for fog distance slider
  fogDistance.addEventListener("input", function () {
    fogDistanceValue.textContent = this.value;
  });

  document.querySelectorAll(".section-header").forEach((header) => {
    header.addEventListener("click", () => {
      const content = header.nextElementSibling;
      content.classList.toggle("hidden");
    });
  });
});
