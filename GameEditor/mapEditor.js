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

  let isSettingSpawn = false;

  setPlayerSpawnBtn.addEventListener("click", function () {
    isSettingSpawn = !isSettingSpawn;
    this.classList.toggle("active");
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
    loadMapEditorScene(); // Load map data when a new scene is selected
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
            const currentScene = globalGameData.scenes.find(
              (scene) => scene.sceneId === currentSceneId
            );
            if (currentScene) {
              currentScene.playerSpawnPosition = { x, z };
            }

            isSettingSpawn = false;
            setPlayerSpawnBtn.classList.remove("active");
          } else {
            const selectedSpriteId = spriteSelector.value;
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
    } else if (!selectedScene.playerSpawnPosition) {
      // Set default spawn position if none exists
      selectedScene.playerSpawnPosition = { x: 5, z: 5 };
    }

    // Save to localStorage
    localStorage.setItem("gameData", JSON.stringify(globalGameData));

    reloadGame(selectedScene.sceneId);
    alert("Map saved successfully!");
  });

  // Export Project
  exportProjectBtn.addEventListener("click", () => exportGlobalGameData());
});
