//Todo

//EVENT WILL HAVE CONDITION AND RESULT/REACTION EX: CONDITION = ONCOLLISION RESULT = CHANGESCENE
//Maybe onGridEnter - onTryGridEnter/onInteraction - onNearArea - onTimeDelayFromSceneStart for conditions
//
//SELECT CURRENT SCENE TO EDIT
//CUSTOM MAP SIZE

import { gameData } from "../gameData.js";

// Deep copy to avoid mutating the original base data
export let globalGameData = JSON.parse(JSON.stringify(gameData));

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
  const dataStr =
    "data:text/json;charset=utf-8," +
    encodeURIComponent(JSON.stringify(globalGameData));
  const downloadAnchorNode = document.createElement("a");
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", "gameData.json");
  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
}
