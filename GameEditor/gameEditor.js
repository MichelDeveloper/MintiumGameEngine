// Default structure if no data exists
const defaultGameData = {
  scenes: [
    {
      sceneId: "default",
      data: [
        {
          layerData: Array(10)
            .fill()
            .map(() => Array(10).fill("void")),
        },
      ],
    },
  ],
  sprites: [
    {
      id: "default",
      type: "block",
      textureType: "pixels",
      collision: false,
      pixels: Array(8)
        .fill()
        .map(() => Array(8).fill("rgba(0,0,0,0)")),
    },
  ],
};

export let globalGameData = null;
export const gameDataLoaded = new Event("gameDataLoaded");
let initializationPromise = null;

export async function getGlobalGameData() {
  if (!initializationPromise) {
    initializationPromise = initializeGameData();
  }
  await initializationPromise;
  return globalGameData;
}

async function initializeGameData() {
  try {
    const storedData = localStorage.getItem("gameData");
    if (storedData) {
      globalGameData = JSON.parse(storedData);
    } else {
      const response = await fetch("./gameData.json");
      const jsonData = await response.json();
      globalGameData = jsonData;
      localStorage.setItem("gameData", JSON.stringify(globalGameData));
    }

    // Wait for DOM and dispatch event
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        console.log("--- Dispatching event (after DOM load) ---");
        setTimeout(() => {
          document.dispatchEvent(gameDataLoaded);
          console.log("--- Event dispatched ---");
        }, 0);
      });
    } else {
      console.log("--- Dispatching event (DOM ready) ---");
      setTimeout(() => {
        document.dispatchEvent(gameDataLoaded);
        console.log("--- Event dispatched ---");
      }, 0);
    }
  } catch (error) {
    console.warn("Error initializing game data, using default:", error);
    globalGameData = JSON.parse(JSON.stringify(defaultGameData));
    localStorage.setItem("gameData", JSON.stringify(globalGameData));

    // Same event dispatch pattern for error case
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        setTimeout(() => document.dispatchEvent(gameDataLoaded), 0);
      });
    } else {
      setTimeout(() => document.dispatchEvent(gameDataLoaded), 0);
    }
  }
  return globalGameData;
}

// Initialize immediately
getGlobalGameData();

// Function to update a specific part of globalGameData
export function updateGlobalGameData(key, newData) {
  if (key in globalGameData) {
    globalGameData[key] = newData;
  } else {
    console.error(`Key '${key}' not found in globalGameData.`);
  }
}

// Function to export globalGameData as a file
export function exportGlobalGameData() {
  const dataStr = JSON.stringify(globalGameData, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const downloadAnchorNode = document.createElement("a");
  downloadAnchorNode.setAttribute("href", url);
  downloadAnchorNode.setAttribute("download", "gameData.json");
  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
  URL.revokeObjectURL(url);
}

export function importGameData(file) {
  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const importedData = JSON.parse(e.target.result);
      Object.assign(globalGameData, importedData);

      // Save to localStorage
      localStorage.setItem("gameData", JSON.stringify(globalGameData));

      // Reload the editor
      window.location.reload();
    } catch (error) {
      console.error("Error importing game data:", error);
      alert("Error importing game data. Please check the file format.");
    }
  };
  reader.readAsText(file);
}

// Add event listeners for import functionality
document.addEventListener("DOMContentLoaded", () => {
  // Only add event listeners if we're on the editor page
  if (window.location.pathname.includes("editor.html")) {
    const importBtn = document.getElementById("importProjectBtn");
    const importInput = document.getElementById("importGameData");
    const exportGameBtn = document.getElementById("exportGameBtn");

    if (importBtn && importInput) {
      importBtn.addEventListener("click", () => {
        importInput.click();
      });

      importInput.addEventListener("change", (e) => {
        if (e.target.files.length > 0) {
          importGameData(e.target.files[0]);
        }
      });

      // Update the file input to only accept our specific file types
      if (importInput) {
        importInput.setAttribute("accept", ".js,.json");
      }
    }

    if (exportGameBtn) {
      exportGameBtn.addEventListener("click", exportGame);
    }
  }
});

export async function exportGame() {
  const zip = new JSZip();
  const runtimeFolder = zip.folder("GameRuntime");

  try {
    // Generate gameData.js instead of gameData.json
    const gameDataContent = `// Generated from gameData.json
export const gameData = ${JSON.stringify(globalGameData, null, 2)};`;
    runtimeFolder.file("gameData.js", gameDataContent);

    // Copy existing GameRuntime/index.html
    const indexResponse = await fetch("/GameRuntime/index.html");
    const indexContent = await indexResponse.text();
    runtimeFolder.file("index.html", indexContent);

    // Maintain original folder structure
    const engineFiles = [
      // Core files
      ["/GameEngine/gameEngine.js", "GameEngine/gameEngine.js"],
      ["/GameEngine/engineConstants.js", "GameEngine/engineConstants.js"],

      // Core folder
      ["/GameEngine/core/scene-manager.js", "GameEngine/core/scene-manager.js"],
      [
        "/GameEngine/core/entity-factory.js",
        "GameEngine/core/entity-factory.js",
      ],
      [
        "/GameEngine/core/sprite-manager.js",
        "GameEngine/core/sprite-manager.js",
      ],

      // Components - Visual
      [
        "/GameEngine/components/visual/pixelated.js",
        "GameEngine/components/visual/pixelated.js",
      ],
      [
        "/GameEngine/components/visual/face-camera-2d.js",
        "GameEngine/components/visual/face-camera-2d.js",
      ],
      [
        "/GameEngine/components/visual/face-camera-3d.js",
        "GameEngine/components/visual/face-camera-3d.js",
      ],

      // Components - Movement
      [
        "/GameEngine/components/interaction/show-text-near.js",
        "GameEngine/components/interaction/show-text-near.js",
      ],
      [
        "/GameEngine/components/movement/grid-move.js",
        "GameEngine/components/movement/grid-move.js",
      ],
      [
        "/GameEngine/components/movement/custom-keyboard-controls.js",
        "GameEngine/components/movement/custom-keyboard-controls.js",
      ],
      [
        "/GameEngine/components/movement/rotation-control.js",
        "GameEngine/components/movement/rotation-control.js",
      ],

      // GameEditor files needed for runtime
      ["/GameEditor/gameEditor.js", "GameEditor/gameEditor.js"],

      // Utils
      [
        "/GameEngine/utils/texture-utils.js",
        "GameEngine/utils/texture-utils.js",
      ],

      // Styles
      ["/styles.css", "styles.css"],
    ];

    for (const [sourcePath, targetPath] of engineFiles) {
      const response = await fetch(sourcePath);
      let content = await response.text();

      // Replace JSON imports with JS imports
      content = content.replace(
        /import gameData from ["']\.\.\/\.\.\/gameData\.json["'] assert \{ type: ["']json["'] \};/g,
        'import { gameData } from "../../gameData.js";'
      );

      runtimeFolder.file(targetPath, content);
    }

    // Generate and download zip
    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const downloadAnchorNode = document.createElement("a");
    downloadAnchorNode.setAttribute("href", url);
    downloadAnchorNode.setAttribute("download", "game.zip");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error creating game package:", error);
    alert("Error creating game package. Please check the console for details.");
  }
}

export function clearStorage() {
  if (
    confirm(
      "Are you sure you want to clear all stored data? This cannot be undone."
    )
  ) {
    localStorage.clear(); // Clear all storage instead of just removing gameData
    window.location.reload(); // Force a page reload to reinitialize everything
  }
}

// Add event listener for clear storage
document.addEventListener("DOMContentLoaded", () => {
  const clearStorageBtn = document.getElementById("clearStorageBtn");
  if (clearStorageBtn) {
    clearStorageBtn.addEventListener("click", clearStorage);
  }
});
