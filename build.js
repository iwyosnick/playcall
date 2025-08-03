const fs = require('fs');
const path = require('path');

// Create dist directory
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist');
}

// Copy all necessary files
const filesToCopy = [
  'index.html',
  'App.tsx',
  'index.tsx',
  'main.tsx',
  'types.ts',
  'vite.config.ts',
  'playerData.js',
  'gemini-api.js',
  'build.js',
  'metadata.json'
];

filesToCopy.forEach(file => {
  if (fs.existsSync(file)) {
    fs.copyFileSync(file, `dist/${file}`);
  }
});

// Copy directories
const dirsToCopy = ['components', 'services'];
dirsToCopy.forEach(dir => {
  if (fs.existsSync(dir)) {
    // Simple recursive copy
    const copyDir = (src, dest) => {
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
      }
      const items = fs.readdirSync(src);
      items.forEach(item => {
        const srcPath = path.join(src, item);
        const destPath = path.join(dest, item);
        if (fs.statSync(srcPath).isDirectory()) {
          copyDir(srcPath, destPath);
        } else {
          fs.copyFileSync(srcPath, destPath);
        }
      });
    };
    copyDir(dir, `dist/${dir}`);
  }
});

// Copy static assets
if (fs.existsSync('index.css')) {
    fs.copyFileSync('index.css', 'dist/index.css');
}

// Remove console.log for production security
