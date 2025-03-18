import { globalGameData } from "./gameEditor.js";
import { loadSpriteList } from "./mapEditor.js";
import {
  reloadGame,
  getCurrentScene,
} from "../GameEngine/core/scene-manager.js";
import { ComponentRegistry } from "../GameEngine/core/component-registry.js";

// Define just the components we want to make dynamic
const dynamicComponents = [
  {
    id: "whenNearShowText",
    type: "textarea",
    label: "Show Text When Near",
    inputId: "whenNearShowText",
    placeholder: "Text to show when player is near this sprite",
    description: "This text will appear when the player approaches the sprite",
    aframeComponent: "show-text-near",
  },
  {
    id: "hudText",
    type: "textarea",
    label: "HUD Text",
    inputId: "hudText",
    placeholder: "Text to show on player HUD",
    description: "This text will appear on the player's heads-up display",
    aframeComponent: "show-hud-text",
  },
];

// This function will generate just these two components dynamically
function renderComponentsFromRegistry() {
  const container = document.getElementById("dynamic-sprite-components");
  if (!container) return;

  // Clear existing content
  container.innerHTML = "";

  // Render each component from the registry
  ComponentRegistry.availableComponents.forEach((component) => {
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

    // Create input elements for each property in the schema
    Object.entries(component.schema).forEach(([propName, propSchema]) => {
      const propContainer = document.createElement("div");
      propContainer.className = "component-property";

      // Add label for the property
      const propLabel = document.createElement("label");
      propLabel.textContent = propSchema.label || propName;
      propContainer.appendChild(propLabel);

      // Create appropriate input based on property type
      let inputElement;

      switch (propSchema.type) {
        case "string":
          if (propName === "text") {
            inputElement = document.createElement("textarea");
            inputElement.rows = 3;
          } else {
            inputElement = document.createElement("input");
            inputElement.type = "text";
          }
          break;

        case "number":
          inputElement = document.createElement("input");
          inputElement.type = "number";
          inputElement.step = "any";
          if (propSchema.min !== undefined) inputElement.min = propSchema.min;
          if (propSchema.max !== undefined) inputElement.max = propSchema.max;
          break;

        case "boolean":
          const checkboxContainer = document.createElement("div");
          checkboxContainer.className = "form-check";

          inputElement = document.createElement("input");
          inputElement.type = "checkbox";
          inputElement.className = "form-check-input";

          checkboxContainer.appendChild(inputElement);
          propContainer.appendChild(checkboxContainer);
          break;

        default:
          inputElement = document.createElement("input");
          inputElement.type = "text";
      }

      // Set common attributes
      if (propSchema.type !== "boolean") {
        inputElement.className = "form-control";
        inputElement.placeholder = `Enter ${propSchema.label || propName}...`;
        propContainer.appendChild(inputElement);
      }

      // Set unique ID for accessing this input later
      inputElement.id = `${component.name}-${propName}`;

      componentCard.appendChild(propContainer);
    });

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
    `;
    document.head.appendChild(style);
  }
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
  const whenNearShowTextArea = document.getElementById("whenNearShowText");
  const textureTypeSelector = document.getElementById("textureTypeSelector");
  const textureUpload = document.getElementById("textureUpload");
  const attackTextureUpload = document.getElementById("attackTextureUpload");
  const attackTextureContainer = document.getElementById(
    "attackTextureContainer"
  );
  const hudTextArea = document.getElementById("hudText");
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
    const spriteId = spriteIdInput.value.trim();

    if (!spriteId) {
      alert("Please enter a valid Sprite ID!");
      return;
    }

    // Create new sprite data
    const newSpriteData = {
      id: spriteId,
      type: spriteTypeSelector.value,
      collision: spriteCollisionCheckbox.checked,
      changeScene: changeSceneSelector.value.trim() || "",
      size:
        spriteSizeSelector.value === "custom"
          ? undefined
          : spriteSizeSelector.value,
      lifePoints:
        parseInt(document.getElementById("spriteLifePoints").value) || 0,
    };

    // Add custom size if selected
    if (spriteSizeSelector.value === "custom") {
      newSpriteData.customSize = parseFloat(customSizeInput.value) || 10;
    }

    // Handle gaussian splatting specific data
    if (spriteTypeSelector.value === "gaussian") {
      newSpriteData.gaussianPath = gaussianPathInput.value.trim();
    } else if (spriteTypeSelector.value === "mesh") {
      newSpriteData.meshPath = meshPathInput.value.trim();
      newSpriteData.meshYOffset = parseFloat(meshYOffsetInput.value) || 0;
    } else {
      // Handle texture type specific data
      newSpriteData.textureType = textureTypeSelector.value;

      if (textureTypeSelector.value === "texture") {
        newSpriteData.texturePath = textureFileName;
        newSpriteData.attackImage = attackTextureFileName;
      } else {
        newSpriteData.pixels = collectPixelData();
      }
    }

    // Collect data from legacy fields for backward compatibility
    newSpriteData.whenNearShowText = whenNearShowTextArea.value.trim();
    newSpriteData.hudText = hudTextArea.value.trim();

    // Also collect data from component inputs if they exist
    const textNearTextInput = document.getElementById("show-text-near-text");
    const textNearDistanceInput = document.getElementById(
      "show-text-near-distance"
    );

    if (textNearTextInput && textNearTextInput.value.trim()) {
      // Update both the legacy field and the component data
      newSpriteData.whenNearShowText = textNearTextInput.value.trim();

      // Only add component data if we have text
      if (newSpriteData.whenNearShowText) {
        newSpriteData["show-text-near"] = {
          text: newSpriteData.whenNearShowText,
          distance: textNearDistanceInput
            ? parseFloat(textNearDistanceInput.value) || 2
            : 2,
        };
      }
    }

    const hudTextInput = document.getElementById("show-hud-text-text");
    const hudDistanceInput = document.getElementById("show-hud-text-distance");
    const viewAngleInput = document.getElementById("show-hud-text-viewAngle");

    if (hudTextInput && hudTextInput.value.trim()) {
      // Update both the legacy field and the component data
      newSpriteData.hudText = hudTextInput.value.trim();

      // Only add component data if we have text
      if (newSpriteData.hudText) {
        newSpriteData["show-hud-text"] = {
          text: newSpriteData.hudText,
          distance: hudDistanceInput
            ? parseFloat(hudDistanceInput.value) || 2
            : 2,
          viewAngle: viewAngleInput ? viewAngleInput.checked : true,
        };
      }
    }

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

    // Update the legacy text fields for backward compatibility
    whenNearShowTextArea.value = selectedSprite.whenNearShowText || "";
    hudTextArea.value = selectedSprite.hudText || "";

    // Update component inputs from the registry
    // First set the show-text-near component (using legacy field for compatibility)
    const textNearTextInput = document.getElementById("show-text-near-text");
    if (textNearTextInput) {
      textNearTextInput.value = selectedSprite.whenNearShowText || "";
    }

    const textNearDistanceInput = document.getElementById(
      "show-text-near-distance"
    );
    if (textNearDistanceInput) {
      textNearDistanceInput.value =
        selectedSprite["show-text-near"]?.distance || 2;
    }

    // Then set the show-hud-text component
    const hudTextInput = document.getElementById("show-hud-text-text");
    if (hudTextInput) {
      hudTextInput.value = selectedSprite.hudText || "";
    }

    const hudDistanceInput = document.getElementById("show-hud-text-distance");
    if (hudDistanceInput) {
      hudDistanceInput.value = selectedSprite["show-hud-text"]?.distance || 2;
    }

    const viewAngleInput = document.getElementById("show-hud-text-viewAngle");
    if (viewAngleInput) {
      viewAngleInput.checked =
        selectedSprite["show-hud-text"]?.viewAngle !== false; // Default to true
    }

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
