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
    const selectedSceneIndex = sceneSelector.value;
    const selectedScene = globalGameData.scenes[selectedSceneIndex];
    const skyColorPicker = document.getElementById("skyColorPicker");
    if (selectedScene && selectedScene.backgroundColor) {
      skyColorPicker.value = selectedScene.backgroundColor;
    } else {
      skyColorPicker.value = "#aabbcc"; // Default color
    }
  });

  // Updated async function to load the map grid based on the current scene/layer data
  async function loadMapEditorScene() {
    mapGrid.innerHTML = "";
    const selectedSceneIndex = sceneSelector.value;
    const selectedLayerIndex = layerSelector.selectedIndex;
    const selectedScene = globalGameData.scenes[selectedSceneIndex];
    const selectedLayer = selectedScene.data[selectedLayerIndex];

    // Populate the map grid using async/await for texture loading
    for (const row of selectedLayer.layerData) {
      for (const spriteId of row) {
        const cell = document.createElement("div");
        cell.classList.add("mapCell");
        cell.dataset.spriteId = spriteId;

        // If a sprite texture is expected, load and set it asynchronously
        if (spriteId !== "0" && spriteId !== "void") {
          const spritePreview = await createSpritePreview(spriteId);
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
            cell.dataset.spriteId = selectedSpriteId;
            if (selectedSpriteId !== "0" && selectedSpriteId !== "void") {
              const spritePreview = await createSpritePreview(selectedSpriteId);
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
                spriteMapping[selectedSpriteId] || spriteMapping["0"];
            }
            cell.textContent = "";
          }
        });
        mapGrid.appendChild(cell);
      }
    }

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

    if (sprite.textureType === "texture" && sprite.texturePath) {
      try {
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = `/Resources/Textures/${sprite.texturePath}`;
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

    if (globalGameData.scenes.some((scene) => scene.sceneId === sceneId)) {
      alert("A scene with this ID already exists!");
      return;
    }

    const newScene = {
      sceneId: sceneId,
      backgroundColor: "#87CEEB", // Default sky blue
      playerSpawnPosition: { x: 0, z: 0 },
      data: [
        {
          layer: -1, // Background layer
          layerData: Array(10)
            .fill()
            .map(() => Array(10).fill("0")),
        },
        {
          layer: 0, // Main layer
          layerData: Array(10)
            .fill()
            .map(() => Array(10).fill("0")),
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

  // Updated flood fill function to work asynchronously
  async function floodFill(startCell, newSpriteId) {
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
        await updateCellSprite(cell, newSpriteId);
        visited.add(index);

        const x = index % 10;
        const y = Math.floor(index / 10);
        const adjacentIndices = [
          y > 0 ? index - 10 : -1,
          x < 9 ? index + 1 : -1,
          y < 9 ? index + 10 : -1,
          x > 0 ? index - 1 : -1,
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

  document.querySelectorAll(".section-header").forEach((header) => {
    header.addEventListener("click", () => {
      const content = header.nextElementSibling;
      content.classList.toggle("hidden");
    });
  });
});
