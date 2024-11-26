import { globalGameData } from "../../GameEditor/gameEditor.js";
import { generateTexture } from "../utils/texture-utils.js";

export function findSpriteById(spriteId) {
  return globalGameData.sprites.find((sprite) => sprite.id === spriteId);
}

export { generateTexture };
