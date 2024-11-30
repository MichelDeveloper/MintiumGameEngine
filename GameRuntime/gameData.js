let gameData = {};

fetch("./gameData.json")
  .then((response) => response.json())
  .then((data) => {
    Object.assign(gameData, data);
  })
  .catch((error) => console.error("Error loading game data:", error));

export { gameData };
