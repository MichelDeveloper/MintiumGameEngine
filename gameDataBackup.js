const gameData = {
  music: {
    theme:
      "A4-300,R-100,E4-300,R-100,A4-300,R-100,C5-200,R-100,D5-200,R-100,E5-300,R-150,F5-200,R-100,E5-200,D5-300,R-100,C5-300,R-100,A4-200,R-100,E4-300,R-100,A4-600,R-200," +
      "E4-250,R-150,G4-250,R-150,A4-500,R-100,E4-250,R-150,A4-250,R-150,C5-500,R-100,D5-250,R-150,E5-250,R-150,F5-250,R-150,E5-250,R-150,D5-250,R-150,C5-500,R-200," +
      "A4-300,R-100,E4-300,R-100,A4-300,R-100,C5-200,R-100,D5-200,R-100,E5-300,R-150,F5-200,R-100,E5-200,D5-300,R-100,C5-300,R-100,A4-200,R-100,E4-300,R-100,A4-600",
    victory: "G4-200,E4-200,G4-200,E4-200,C4-400",
  },
  player: {
    position: { x: 1, y: 1 },
    sprite: {
      // A new sprite representing the strange cat
      pixels: [
        "00111100", // Helmet
        "01100110", // Visor
        "11111111", // Suit upper
        "11100111", // Suit lower
        "01111110", // Arms
        "00100100", // Legs
        "01111110", // Feet
        "00100100", // Shadow
      ],
      collision: false,
    },
  },
  scenes: [
    {
      sceneId: "crashSite",
      playerSpawnPosition: { x: 5, y: 8 },
      data: [
        "aaaaagaaaa",
        "abbbbbbbba",
        "abcccccbba",
        "abbcbbcbbb",
        "abbccbccba",
        "abcbcbcbba",
        "abbbbbbbba",
        "aaddaaddaa",
        "a00000000a",
        "aaaaaaaaaa",
      ],
    },
    {
      sceneId: "SecretRoom",
      playerSpawnPosition: { x: 8, y: 1 },
      data: [
        "aaaaagaaaa",
        "abbbbbbbba",
        "abcccccbba",
        "abbcbbcbbb",
        "abbccbccba",
        "aaaaaaaaaa",
        "aaaaaaaaaa",
        "aaaaaaaaaa",
        "aaaaaaaaaa",
        "aaaaaaaaaa",
      ],
    },
  ],
  sprites: {
    a: {
      pixels: [
        "11111111",
        "10000001",
        "10000001",
        "10000001",
        "10000001",
        "10000001",
        "10000001",
        "11111111",
      ],
      collision: true, // Stone walls blocking the way
    },
    b: {
      pixels: [
        "00000000",
        "00000000",
        "00000000",
        "00000000",
        "00000000",
        "00000000",
        "01001000",
        "01011000",
      ],
      collision: false, // Grass tiles representing the ground
    },
    c: {
      pixels: [
        "00000000",
        "00111100",
        "01111110",
        "11111111",
        "11111111",
        "01111110",
        "00011000",
        "00011000",
      ],
      collision: false, // Trees that the player can walk through
    },
    d: {
      pixels: [
        "00111100",
        "01100110",
        "11000011",
        "11011011",
        "11000011",
        "01100110",
        "00111100",
        "00000000",
      ],
      collision: false,
      message:
        "This portal seems to lead to another dimension. Dare to jump in?",
      interactionSound: "G4-200,E4-200,G4-200,E4-200,C4-400", // Portal interaction sound
    },
    e: {
      pixels: [
        "00000000",
        "00000000",
        "00000000",
        "00000000",
        "00000000",
        "00111000",
        "00111000",
        "00010000",
      ],
      collision: false, // Flowers the player can walk through
    },
    f: {
      pixels: [
        "11111111",
        "11111111",
        "11111111",
        "11000011",
        "10000001",
        "10011001",
        "10000001",
        "11111111",
      ],
      collision: false, // Locked treasure
      message: "You need the golden key to unlock the treasure.",
    },
    g: {
      pixels: [
        "00000000",
        "00011000",
        "00111100",
        "01111110",
        "01111110",
        "01111110",
        "01111110",
        "00000000",
      ],
      collision: true,
      message:
        "The wise owl speaks: 'Beware of the shadow that lurks in the light.'",
      changeScene: "SecretRoom",
    },
    h: {
      pixels: [
        "00000000",
        "00111100",
        "01111110",
        "11100111",
        "11100111",
        "01111110",
        "00111100",
        "00000000",
      ],
      collision: false,
      message: "You found the golden key! Now find the locked door.",
      interactionSound: "C5-100",
    },
  },
};

export { gameData };
