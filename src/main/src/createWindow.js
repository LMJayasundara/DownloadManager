const { BrowserWindow, shell, Menu, MenuItem } = require('electron');
import { is } from '@electron-toolkit/utils';
import { getIcon} from './setIcons';

let mainWindow = null;

export async function createWindow() {

  const icon = await getIcon();

  // Create the browser window.
  let mainWindow = new BrowserWindow({
    width: 1200,
    height: 670,
    minWidth: 1200,
    minHeight: 670,
    show: false,
    autoHideMenuBar: true,
    icon: icon,
    center: true,
    title: "Play Downloader",
    webPreferences: {
      preload: join(__dirname, '../../preload/index.js'),
      sandbox: true,
      contextIsolation: true
    }
  })

  // mainWindow.webContents.openDevTools();
  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  mainWindow.webContents.on("context-menu", (_, props) => {
    const menu = new Menu();
    if (props.isEditable) {
      menu.append(new MenuItem({ type: "separator" }));
      menu.append(new MenuItem({ label: "Cut", role: "cut" }));
      menu.append(new MenuItem({ label: "Copy", role: "copy" }));
      menu.append(new MenuItem({ label: "Paste", role: "paste" }));
      menu.append(new MenuItem({ type: "separator" }));
      menu.append(new MenuItem({ label: "Select All", role: "selectAll" }));
      menu.append(new MenuItem({ label: "Undo", role: "undo" }));
      menu.append(new MenuItem({ label: "Redo", role: "redo" }));
      menu.popup();
    }
  });

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../../renderer/index.html'))
  }
}

export const getMainWindow = () => {
  return mainWindow
}