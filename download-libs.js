const fs = require("fs-extra");
const path = require("path");
const https = require("https");

const libs = {
  "aframe.min.js": "https://aframe.io/releases/1.7.1/aframe.min.js",
  "aframe-physics-system.min.js":
    "https://cdn.jsdelivr.net/gh/c-frame/aframe-physics-system@v4.2.3/dist/aframe-physics-system.min.js",
  "aframe-extras.min.js":
    "https://cdn.jsdelivr.net/npm/aframe-extras@6.1.1/dist/aframe-extras.min.js",
  "bootstrap.bundle.min.js":
    "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js",
  "bootstrap.min.css":
    "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css",
  "bootstrap-icons.css":
    "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css",
};

const libsDir = "libs";

// Ensure libs directory exists
if (!fs.existsSync(libsDir)) {
  fs.mkdirSync(libsDir);
  console.log(`Created ${libsDir} directory`);
}

// Download function with redirect handling
function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Handle redirect
        const redirectUrl = response.headers.location;
        console.log(`Redirecting to: ${redirectUrl}`);
        downloadFile(redirectUrl, filepath).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
        return;
      }

      const file = fs.createWriteStream(filepath);
      response.pipe(file);

      file.on("finish", () => {
        file.close();
        console.log(`Downloaded ${path.basename(filepath)}`);
        resolve();
      });
    });

    request.on("error", (err) => {
      fs.unlink(filepath, () => {}); // Delete the file if download fails
      reject(err);
    });
  });
}

// Download all libraries
async function downloadAll() {
  console.log("Starting downloads...");
  let success = true;

  for (const [filename, url] of Object.entries(libs)) {
    const filepath = path.join(libsDir, filename);
    try {
      await downloadFile(url, filepath);
    } catch (err) {
      console.error(`Error downloading ${filename}:`, err);
      success = false;
      // Continue with other downloads even if one fails
    }
  }

  console.log("Download process completed!");
  return success;
}

// Export the function for use in build-android.js
module.exports = { downloadAll };

// If run directly, execute the download
if (require.main === module) {
  downloadAll()
    .then((success) => {
      if (!success) {
        console.warn(
          "Some downloads failed, but continuing with the build process..."
        );
      }
      process.exit(0);
    })
    .catch((err) => {
      console.error("Download process failed:", err);
      process.exit(1);
    });
}
