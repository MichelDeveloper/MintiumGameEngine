const fs = require("fs-extra");
const { execSync } = require("child_process");
const path = require("path");
const { downloadAll } = require("./download-libs");

// Configuration
const config = {
  sourceFiles: [
    "index.html",
    "editor.html",
    "styles.css",
    "editorStyles.css",
    "gameData.json",
    "gameData.js",
    "icon.png",
    "mintium_logo.png",
    "mintium_logo_alpha.png",
    "mintium_cover.png",
  ],
  sourceDirs: [
    "GameEngine",
    "GameEditor",
    "GameRuntime",
    "Resources",
    "libs",
    "icons",
  ],
  wwwDir: "www",
  androidStudioPath: "/Applications/Android Studio.app", // Update this path if needed
};

async function build() {
  try {
    // Ensure www directory exists
    if (!fs.existsSync(config.wwwDir)) {
      fs.mkdirSync(config.wwwDir);
      console.log(`Created ${config.wwwDir} directory`);
    }

    // Download libraries if needed
    console.log("Checking and downloading libraries...");
    const downloadSuccess = await downloadAll();
    if (!downloadSuccess) {
      console.warn(
        "Some libraries failed to download, but continuing with the build process..."
      );
    }

    // Copy files to www directory
    console.log("Copying files to www directory...");

    // Copy individual files
    config.sourceFiles.forEach((file) => {
      const sourcePath = file;
      const destPath = path.join(config.wwwDir, file);

      try {
        if (fs.existsSync(sourcePath)) {
          fs.copyFileSync(sourcePath, destPath);
          console.log(`Copied ${sourcePath} to ${destPath}`);
        } else {
          console.warn(`Warning: ${sourcePath} does not exist`);
        }
      } catch (err) {
        console.error(`Error copying ${sourcePath}:`, err);
      }
    });

    // Copy directories
    config.sourceDirs.forEach((dir) => {
      const sourcePath = dir;
      const destPath = path.join(config.wwwDir, dir);

      try {
        if (fs.existsSync(sourcePath)) {
          fs.copySync(sourcePath, destPath, { overwrite: true });
          console.log(`Copied directory ${sourcePath} to ${destPath}`);
        } else {
          console.warn(`Warning: Directory ${sourcePath} does not exist`);
        }
      } catch (err) {
        console.error(`Error copying directory ${sourcePath}:`, err);
      }
    });

    // Update capacitor.config.ts
    console.log("Updating Capacitor configuration...");
    const capacitorConfigPath = "capacitor.config.ts";
    const capacitorConfig = `import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aframe.game',
  appName: 'AFrame Game',
  webDir: 'www',
  android: {
    path: 'android'
  }
};

export default config;`;

    fs.writeFileSync(capacitorConfigPath, capacitorConfig);
    console.log("Updated capacitor.config.ts");

    // Run Capacitor sync
    console.log("Syncing with Android...");
    execSync("npx cap sync android", { stdio: "inherit" });
    console.log("Capacitor sync completed successfully");

    // Open Android Studio
    console.log("Opening Android Studio...");
    if (fs.existsSync(config.androidStudioPath)) {
      execSync(`open "${config.androidStudioPath}"`, { stdio: "inherit" });
      console.log("Android Studio opened successfully");
    } else {
      console.warn(
        "Android Studio not found at the specified path. Please open it manually."
      );
    }

    console.log("Build process completed!");
  } catch (err) {
    console.error("Build process failed:", err);
    process.exit(1);
  }
}

// Run the build process
build();
