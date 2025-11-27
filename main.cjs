const { app, BrowserWindow } = require("electron");
const path = require("path");

// Al usar .cjs, 'process' y '__dirname' funcionan nativamente sin hacks
const isDev = !app.isPackaged;

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, 'public', 'logo.ico'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
    },
    // icon: path.join(__dirname, 'public/favicon.ico')
  });

  if (isDev) {
    // Desarrollo: URL de Vite
    win.loadURL("http://localhost:5173");
    win.webContents.openDevTools();
  } else {
    // Producción: Archivo local
    win.loadFile(path.join(__dirname, "dist", "index.html"));
  }
  
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
