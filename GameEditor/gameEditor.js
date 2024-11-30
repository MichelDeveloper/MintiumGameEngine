import { gameData } from "../gameData.js";

// Deep copy to avoid mutating the original base data
export let globalGameData =
  JSON.parse(localStorage.getItem("gameData")) ||
  JSON.parse(JSON.stringify(gameData));

// // Function to update a specific part of globalGameData
// export function updateGlobalGameData(key, newData) {
//   if (key in globalGameData) {
//     globalGameData[key] = newData;
//   } else {
//     console.error(`Key '${key}' not found in globalGameData.`);
//   }
// }

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
    // Add game data as JSON in root
    runtimeFolder.file(
      "gameData.json",
      JSON.stringify(globalGameData, null, 2)
    );

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

      // Styles
      ["/styles.css", "styles.css"],
    ];

    for (const [sourcePath, targetPath] of engineFiles) {
      const response = await fetch(sourcePath);
      let content = await response.text();

      // Replace gameEditor imports with gameData.json imports
      content = content.replace(
        /import \{ globalGameData \} from ["']\.\.\/GameEditor\/gameEditor\.js["'];?/g,
        'import gameData from "../../gameData.json" assert { type: "json" };'
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
