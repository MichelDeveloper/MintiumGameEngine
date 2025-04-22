import { globalGameData } from "./gameEditor.js";
import { loadSpriteList } from "./mapEditor.js";
import {
  reloadGame,
  getCurrentScene,
} from "../GameEngine/core/scene-manager.js";
import { ComponentRegistry } from "../GameEngine/core/component-registry.js";

// This function will generate just these two components dynamically
function renderComponentsFromRegistry() {
  const container = document.getElementById("dynamic-sprite-components");
  if (!container) return;

  // Clear existing content
  container.innerHTML = "";

  // Render each component from the registry
  ComponentRegistry.availableComponents.forEach((component) => {
    // Skip disabled components
    if (component.enabled === false) return;

    // Create a card-like container for the component
    const componentCard = document.createElement("div");
    componentCard.className = "component-card";

    // Add a header with the component name
    const header = document.createElement("div");
    header.className = "component-header";

    // Add an icon based on the component type
    const icon = document.createElement("i");
    icon.className = component.icon || "bi-gear";
    header.appendChild(icon);

    // Add the label
    const label = document.createElement("span");
    label.textContent = component.label;
    header.appendChild(label);

    componentCard.appendChild(header);

    // Add the description
    const description = document.createElement("div");
    description.className = "component-description";
    description.textContent = component.description;
    componentCard.appendChild(description);

    // Create inputs for each property in the schema
    const propertiesContainer = document.createElement("div");
    propertiesContainer.className = "component-properties";

    Object.entries(component.schema).forEach(([propName, schema]) => {
      const propertyDiv = document.createElement("div");
      propertyDiv.className = "component-property";

      // Add label
      const propertyLabel = document.createElement("label");
      propertyLabel.textContent = schema.label || propName;
      propertyDiv.appendChild(propertyLabel);

      // Create appropriate input based on type
      let inputElement;

      if (schema.type === "boolean") {
        inputElement = document.createElement("input");
        inputElement.type = "checkbox";
        inputElement.checked = schema.default;
      } else if (schema.input === "select" && Array.isArray(schema.options)) {
        inputElement = document.createElement("select");
        // Add options to select
        schema.options.forEach((option) => {
          const optionEl = document.createElement("option");
          optionEl.value = option.value;
          optionEl.textContent = option.label;
          if (option.value === schema.default) {
            optionEl.selected = true;
          }
          inputElement.appendChild(optionEl);
        });
      } else if (schema.type === "number") {
        inputElement = document.createElement("input");
        inputElement.type = "number";
        inputElement.value = schema.default;
        if (schema.min !== undefined) inputElement.min = schema.min;
        if (schema.max !== undefined) inputElement.max = schema.max;
      } else {
        // Default to text input
        inputElement = document.createElement("input");
        inputElement.type = "text";
        inputElement.value = schema.default;
        inputElement.placeholder =
          schema.placeholder || `Enter ${schema.label || propName}`;
      }

      // Important: Set a consistent ID pattern for finding these inputs later
      inputElement.id = ComponentRegistry.getInputId(component.name, propName);
      propertyDiv.appendChild(inputElement);

      propertiesContainer.appendChild(propertyDiv);
    });

    componentCard.appendChild(propertiesContainer);
    container.appendChild(componentCard);
  });

  // Add styling
  if (!document.getElementById("dynamic-component-styles")) {
    const style = document.createElement("style");
    style.id = "dynamic-component-styles";
    style.textContent = `
      .component-container {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        margin-top: 1rem;
      }
      .component-card {
        border: 1px solid var(--border-color, #dee2e6);
        border-radius: 0.5rem;
        padding: 1rem;
        background-color: var(--section-bg, #2a2a2a);
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        transition: box-shadow 0.3s ease;
      }
      .component-card:hover {
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
      }
      .component-header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
        font-weight: bold;
        color: var(--bs-primary, #0d6efd);
      }
      .component-description {
        margin-bottom: 0.75rem;
        font-size: 0.875rem;
        opacity: 0.8;
      }
      .component-property {
        margin-bottom: 0.75rem;
      }
      .component-property label {
        display: block;
        margin-bottom: 0.25rem;
        font-size: 0.9rem;
      }
      .component-property select {
        width: 100%;
        padding: 0.375rem 0.75rem;
        font-size: 0.9rem;
        line-height: 1.5;
        color: var(--bs-body-color);
        background-color: var(--bs-body-bg);
        border: 1px solid var(--border-color, #dee2e6);
        border-radius: 0.25rem;
        cursor: pointer;
      }
      .component-property select:focus {
        border-color: var(--bs-primary);
        outline: 0;
        box-shadow: 0 0 0 0.2rem rgba(13, 110, 253, 0.25);
      }
    `;
    document.head.appendChild(style);
  }
}

// Add this function after renderComponentsFromRegistry
function loadComponentValues(sprite) {
  // For each component in the registry
  ComponentRegistry.getEnabledComponents().forEach((component) => {
    // For each property in the component schema
    Object.entries(component.schema).forEach(([propName, schema]) => {
      // Get the input element by its ID
      const inputId = ComponentRegistry.getInputId(component.name, propName);
      const inputElement = document.getElementById(inputId);

      if (inputElement) {
        // If the sprite has this component data, use it; otherwise use default
        if (
          sprite[component.name] &&
          sprite[component.name][propName] !== undefined
        ) {
          // Handle different input types
          if (schema.type === "boolean" && inputElement.type === "checkbox") {
            inputElement.checked = sprite[component.name][propName];
          } else {
            inputElement.value = sprite[component.name][propName];
          }
        } else {
          // Use default value from schema
          if (schema.type === "boolean" && inputElement.type === "checkbox") {
            inputElement.checked = schema.default;
          } else {
            inputElement.value = schema.default;
          }
        }
      }
    });
  });
}

// Add this function to collect component data during sprite saving
function collectComponentData(spriteData) {
  ComponentRegistry.getEnabledComponents().forEach((component) => {
    // Initialize empty component data
    const componentData = {};
    let hasData = false;

    // For each property in the schema
    Object.entries(component.schema).forEach(([propName, schema]) => {
      const inputId = ComponentRegistry.getInputId(component.name, propName);
      const inputElement = document.getElementById(inputId);

      if (inputElement) {
        let value;

        // Handle different input types
        if (schema.type === "boolean" && inputElement.type === "checkbox") {
          value = inputElement.checked;
        } else if (schema.type === "number") {
          value = parseFloat(inputElement.value) || schema.default;
        } else {
          value = inputElement.value.trim();
        }

        // Check if this is a non-empty value (for text fields)
        if (schema.type === "string") {
          if (value) {
            hasData = true;
          }
        } else {
          hasData = true;
        }

        componentData[propName] = value;
      }
    });

    // Only add component data if it has meaningful values
    if (hasData) {
      spriteData[component.name] = componentData;
    }
  });

  return spriteData;
}

document.addEventListener("gameDataLoaded", function () {
  // Render dynamic components first, before getting element references
  renderComponentsFromRegistry();

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
  const textureTypeSelector = document.getElementById("textureTypeSelector");
  const textureUpload = document.getElementById("textureUpload");
  const attackTextureUpload = document.getElementById("attackTextureUpload");
  const attackTextureContainer = document.getElementById(
    "attackTextureContainer"
  );
  const spriteSizeSelector = document.getElementById("spriteSizeSelector");
  const gaussianPathInput = document.getElementById("gaussianPath");
  const meshPathInput = document.getElementById("meshPath");
  const meshYOffsetInput = document.getElementById("meshYOffset");
  const meshSettings = document.getElementById("meshSettings");
  const customSizeContainer = document.getElementById("customSizeContainer");
  const customSizeInput = document.getElementById("customSizeInput");

  let mode = "draw";
  let selectedColor = colorPicker.value;
  let textureFileName = "";
  let attackTextureFileName = "";

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
    spriteSizeSelector.value = firstSprite.size || "normal";

    // Update to use component-based life system instead of legacy lifePoints
    const lifePointsInput = document.getElementById("spriteLifePoints");
    if (lifePointsInput) {
      lifePointsInput.value = firstSprite["life-system"]?.maxLife || 0;
    }

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

  // Function to collect pixel data from the grid
  function collectPixelData() {
    const cells = document.querySelectorAll(".grid div");
    const pixelData = [];
    const gridSize = 8; // 8x8 grid

    // Create 2D array
    for (let y = 0; y < gridSize; y++) {
      const row = [];
      for (let x = 0; x < gridSize; x++) {
        const index = y * gridSize + x;
        const cell = cells[index];
        row.push(
          cell ? cell.style.backgroundColor || "rgba(0,0,0,0)" : "rgba(0,0,0,0)"
        );
      }
      pixelData.push(row);
    }

    return pixelData;
  }

  // Add event listener for size selector
  spriteSizeSelector.addEventListener("change", function () {
    if (this.value === "custom") {
      customSizeContainer.style.display = "block";
    } else {
      customSizeContainer.style.display = "none";
    }
  });

  // Add event listener for main texture upload
  textureUpload.addEventListener("change", function () {
    textureFileName = this.value;
  });

  saveSpriteBtn.addEventListener("click", function () {
    // Get the sprite ID
    const spriteId = spriteIdInput.value.trim();
    if (!spriteId) {
      alert("Please enter a sprite ID.");
      return;
    }

    // Get other basic properties
    const spriteType = spriteTypeSelector.value;
    const collision = spriteCollisionCheckbox.checked;
    const changeScene = changeSceneSelector.value;

    // Create the new sprite data object
    let newSpriteData = {
      id: spriteId,
      type: spriteType,
      collision: collision,
      changeScene: changeScene,
    };

    // Collect component data dynamically
    newSpriteData = collectComponentData(newSpriteData);

    // Handle type-specific data
    if (spriteType === "gaussian") {
      newSpriteData.gaussianPath = gaussianPathInput.value.trim();
    } else if (spriteType === "mesh") {
      newSpriteData.meshPath = meshPathInput.value.trim();
      newSpriteData.meshYOffset = parseFloat(meshYOffsetInput.value) || 0;
    } else {
      const textureType = textureTypeSelector.value;
      newSpriteData.textureType = textureType;

      if (textureType === "texture") {
        newSpriteData.texturePath = textureFileName;
        newSpriteData.attackImage = attackTextureFileName;
      } else {
        // Get pixel data from grid
        newSpriteData.pixels = collectPixelData();
      }
    }

    // Handle size data
    if (spriteSizeSelector.value === "custom") {
      newSpriteData.customSize = parseFloat(customSizeInput.value);
    } else {
      newSpriteData.size = spriteSizeSelector.value;
    }

    // Check if sprite exists and update or add
    const existingIndex = globalGameData.sprites.findIndex(
      (s) => s.id === spriteId
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
    const selectedType = this.value;

    // Only handle texture vs pixels toggle
    if (selectedType === "texture") {
      textureUpload.style.display = "block";
      attackTextureContainer.style.display = "block";
      grid.style.display = "none";
    } else {
      textureUpload.style.display = "none";
      attackTextureContainer.style.display = "none";
      grid.style.display = "grid";
    }
  });

  // Add event listener for attack texture upload
  attackTextureUpload.addEventListener("change", function () {
    attackTextureFileName = this.value;
  });

  // Add this function to update UI based on sprite type
  function updateSpriteTypeUI(spriteType) {
    // Hide all type-specific inputs first
    gaussianPathInput.style.display = "none";
    meshSettings.style.display = "none";
    textureTypeSelector.style.display = "none";
    textureUpload.style.display = "none";
    attackTextureContainer.style.display = "none";
    grid.style.display = "none";

    // Show only relevant inputs for selected type
    if (spriteType === "gaussian") {
      gaussianPathInput.style.display = "block";
    } else if (spriteType === "mesh") {
      meshSettings.style.display = "block";
    } else {
      textureTypeSelector.style.display = "block";

      if (textureTypeSelector.value === "texture") {
        textureUpload.style.display = "block";
        attackTextureContainer.style.display = "block";
      } else {
        grid.style.display = "grid";
      }
    }
  }

  // Modify the sprite selector event listener
  spriteSelector.addEventListener("change", function () {
    const selectedSpriteId = this.value;
    const selectedSprite = globalGameData.sprites.find(
      (sprite) => sprite.id === selectedSpriteId
    );

    if (!selectedSprite) return;

    // Set basic sprite properties
    spriteIdInput.value = selectedSpriteId;
    spriteTypeSelector.value = selectedSprite.type || "block";
    spriteCollisionCheckbox.checked = selectedSprite.collision || false;
    changeSceneSelector.value = selectedSprite.changeScene || "";

    // Dynamically load component values
    loadComponentValues(selectedSprite);

    // Set type-specific properties
    if (selectedSprite.type === "gaussian") {
      gaussianPathInput.value = selectedSprite.gaussianPath || "";
    } else if (selectedSprite.type === "mesh") {
      meshPathInput.value = selectedSprite.meshPath || "";
      meshYOffsetInput.value = selectedSprite.meshYOffset || 0;
    } else {
      textureTypeSelector.value = selectedSprite.textureType || "pixels";
      if (selectedSprite.textureType === "texture") {
        textureUpload.value = selectedSprite.texturePath || "";
        attackTextureUpload.value = selectedSprite.attackImage || "";

        // Update the filename variables when loading
        textureFileName = selectedSprite.texturePath || "";
        attackTextureFileName = selectedSprite.attackImage || "";
      } else {
        populateGrid(selectedSprite.pixels);
      }
    }

    // Set size properties
    if (selectedSprite.customSize) {
      spriteSizeSelector.value = "custom";
      customSizeContainer.style.display = "block";
      customSizeInput.value = selectedSprite.customSize;
    } else {
      spriteSizeSelector.value = selectedSprite.size || "normal";
      customSizeContainer.style.display = "none";
    }

    // Update the UI based on sprite type
    updateSpriteTypeUI(selectedSprite.type);
  });

  // Update sprite type selector to use the new function
  spriteTypeSelector.addEventListener("change", function () {
    updateSpriteTypeUI(this.value);
  });
});
