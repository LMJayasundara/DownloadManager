const { contextBridge, ipcRenderer } = require('electron');

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', {
      ipcRenderer: {
        send: ipcRenderer.send,
        sendSync: ipcRenderer.sendSync,
        on: (channel, func) => {
          ipcRenderer.on(channel, (event, ...args) => func(...args));
        },
        once: (channel, func) => {
          ipcRenderer.once(channel, (event, ...args) => func(...args));
        },
        removeListener: (channel, listener) => {
          ipcRenderer.removeListener(channel, listener);
        },
        removeAllListeners: (channel) => {
          ipcRenderer.removeAllListeners(channel);
        }
      }
    });
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = api
}