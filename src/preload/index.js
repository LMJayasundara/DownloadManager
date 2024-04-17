// import { contextBridge } from 'electron'
// import { electronAPI } from '@electron-toolkit/preload'

// // Custom APIs for renderer
// const api = {}

// // Use `contextBridge` APIs to expose Electron APIs to
// // renderer only if context isolation is enabled, otherwise
// // just add to the DOM global.
// if (process.contextIsolated) {
//   try {
//     contextBridge.exposeInMainWorld('electron', electronAPI)
//     contextBridge.exposeInMainWorld('api', api)
//   } catch (error) {
//     console.error(error)
//   }
// } else {
//   window.electron = electronAPI
//   window.api = api
// }

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