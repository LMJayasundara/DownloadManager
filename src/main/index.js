const path = require('path');
import { app, shell, BrowserWindow, ipcMain, Menu, MenuItem, Tray, protocol, dialog, powerSaveBlocker } from 'electron';
import { join } from 'path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import cp from 'child_process';
import fs from 'fs';
// import ytdl from 'ytdl-core';
import ytdl from '@distube/ytdl-core';
import ffmpegPath from 'ffmpeg-static';
import stream from 'stream';
import util from 'util';
import { autoUpdater, AppUpdater } from "electron-updater";
import ProgressBar from 'electron-progressbar';
// const { v1 } = require("tiklydown-sanzy");
const { v1 } = require("node-tiklydown");
const { DownloaderHelper } = require('node-downloader-helper');
import axios from 'axios';
import ffmpeg from 'fluent-ffmpeg';
// const ffmpeg = require('fluent-ffmpeg');
// import Handbrake from 'handbrake-js';

import ffprobePath from 'ffprobe-static'

import { addMetadata, getMetadata } from './src/metadata';
import { YoutubeVideoDetails, TikTokVideoDetails, GenericVideoDetails, PlaylistVideoDetails } from './src/getVideoInfo';
import { videoList, playList, appInfo, setStoreAsync, getStoreAsync } from './src/localdb';
import { getIcon, getTrayIcon, loadDefaultThumbnail, loadDefaultAuthor } from './src/setIcons';
import { login, logoutApi, checkLicense, userMediaUpdate } from './src/apiHandler';
const packageJson = require('../../package.json');
import AutoLaunch from 'auto-launch';

import { first, all } from "macaddress-local-machine";
// // Get the first MAC address
const macAddress = first();

let playlistCheckTimer = null;
let mainWindow = null, progressBar = null;
let downloadProgress = {};
let defaultThumbnail = null, defaultAuthor = null;
let logoutTimer = null;
let loginStatus = false;
// let useId = null;
const express = require('express');
const net = require('net');
// const expressapp = express();
// const expressport = 8000;

let expressApp;
const expressPort = 8000;

import io from 'socket.io-client';
const URL = 'https://playdownloader.com';

let socket = io(URL, {
  path: '/socket/socket.io'  // Adjust the path based on server configuration
});

socket.on('connect', async () => {
  console.log('connected to server');
  const userId = await getStoreAsync(appInfo, 'userId');
  socket.emit('status', { id: userId, login: loginStatus });
});

socket.on('clientres', (data) => {
  console.log(data);
});

socket.on('disconnect', () => {
  console.log('disconnected from server');
});


// expressapp.use(express.json()); // Middleware to parse JSON bodies

// expressapp.post('/url', (req, res) => {
//   const url = req.body.url;
//   console.log('URL received:', url);
//   // Handle the URL as needed in your Electron app

//   res.send({ status: 'URL received' });
// });

// expressapp.listen(expressport, () => {
//   console.log(`Server listening at http://localhost:${expressport}`);
// });

function startExpressServer(port) {
  expressApp = express();
  expressApp.use(express.json());

  expressApp.post('/url', async (req, res) => {
    const url = req.body.url;
    console.log('URL received:', url);
    // Handle the URL as needed in your Electron app

    res.send({ status: 'URL received' });
    mainWindow.webContents.send('downloadUrlExtention', { url: url, quality: "720p" });
  });

  expressApp.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
  });
}

function checkPort(port) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(true);
      } else {
        reject(err);
      }
    });

    server.once('listening', () => {
      server.close();
      resolve(false);
    });

    server.listen(port);
  });
}

ipcMain.on('shutdown', () => {
  app.quit();
});

let appAutoLauncher = new AutoLaunch({
  isHidden: true,
  name: 'Play Downloader',
  path: app.getPath('exe')
});

const id = powerSaveBlocker.start('prevent-display-sleep')
console.log(`powerSaveBlocker start: ${powerSaveBlocker.isStarted(id)}`)

///////////////////////////////////////////////////// start app update code /////////////////////////////////////////////////////
//Basic flags
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

autoUpdater.on('update-available', (event, releaseNotes, releaseName) => {
  const dialogOpts = {
    type: 'info',
    buttons: ['Update', 'Later'],
    noLink: true,
    title: 'Application Update',
    message: 'A new version of the application is available.',
    detail: 'The app will be restarted to install the update.'
  };

  dialog.showMessageBox(dialogOpts).then((returnValue) => {
    if (returnValue.response === 0) autoUpdater.downloadUpdate();
  });
});

autoUpdater.on('download-progress', (progress) => {
  if (!progressBar) {
    progressBar = new ProgressBar({
      title: 'Downloading update',
      text: 'Downloading update...',
      browserWindow: {
        parent: mainWindow,
        modal: true,
        resizable: false,
        minimizable: false,
        maximizable: false
      }
    });
  } else {
    progressBar.detail = `Downloading complete ${(progress.percent).toFixed()}%`;
    progressBar.value = (progress.percent).toFixed() / 100;
  }
});

autoUpdater.on('update-downloaded', (event, releaseNotes, releaseName) => {
  const dialogOpts = {
    type: 'info',
    buttons: ['Restart', 'Later'],
    noLink: true,
    title: 'Application Update',
    message: process.platform === 'win32' ? releaseNotes : releaseName,
    detail: 'A new version has been downloaded. Restart the application to apply the updates.'
  };

  dialog.showMessageBox(dialogOpts).then((returnValue) => {
    if (returnValue.response === 0) autoUpdater.quitAndInstall();
  });
});

autoUpdater.on('error', (error) => {
  dialog.showErrorBox('Error', error.message);
});

///////////////////////////////////////////////////// end app update code /////////////////////////////////////////////////////

function confirmDeletion(mainWindow) {
  return new Promise((resolve) => {
    const options = {
      type: 'question',
      buttons: ['Yes', 'No'],
      defaultId: 1,
      title: 'Confirm Deletion',
      message: 'Do you really want to delete?',
      detail: 'This action cannot be undone.',
    };

    dialog.showMessageBox(mainWindow, options).then(result => {
      resolve(result.response === 0); // Resolve to true if 'Yes' (button index 0) was clicked
    });
  });
}

function confirmLogout(mainWindow) {
  return new Promise((resolve) => {
    const options = {
      type: 'question',
      buttons: ['Yes', 'No'],
      defaultId: 1,
      title: 'Confirm Logout',
      message: 'Do you really want to logout?',
    };

    dialog.showMessageBox(mainWindow, options).then(result => {
      resolve(result.response === 0); // Resolve to true if 'Yes' (button index 0) was clicked
    });
  });
}

function errorDialog(mainWindow, error) {
  return new Promise((resolve) => {
    const options = {
      type: 'error',
      title: 'Error!',
      message: `${error}`
    };

    dialog.showMessageBox(mainWindow, options).then(result => {
      resolve(result.response === 0); // Resolve to true if 'Yes' (button index 0) was clicked
    });
  });
}

async function createWindow() {
  // Dynamically get the icon
  const icon = await getIcon();
  defaultThumbnail = await loadDefaultThumbnail();
  defaultAuthor = await loadDefaultAuthor();

  // Create the browser window.
  mainWindow = new BrowserWindow({
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
      preload: join(__dirname, '../preload/index.js'),
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

  // // Send version to renderer process
  // mainWindow.webContents.on('did-finish-load', () => {
  //   mainWindow.webContents.send('aboutApp', {
  //     currentVersion: packageJson.version,
  //     licenseKey: "XYZ-123-ABC-789"
  //   });
  // });

  mainWindow.on('close', function (event) {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
    return false;
  });

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // Get the path to the extension folder
  // const extensionPath = path.join(app.getAppPath(), 'resources', 'extension');
  // const extensionPath = path.join(process.resourcesPath, '../extension');

  let extensionPath;
  if (is.dev) {
    extensionPath = path.join(app.getAppPath(), 'extension');
  } else {
    extensionPath = path.join(process.resourcesPath, '../extension');
  }
  console.log("Extension folder path:", extensionPath);

  // IPC listener to open the extension folder
  ipcMain.on('openExtensionFolder', (event) => {
    shell.openPath(extensionPath)
      .then(result => {
        if (result) {
          console.error('Error opening folder:', result);
        } else {
          console.log('open-extension-folder-result success');
        }
      })
      .catch(error => {
        console.error('Error opening folder:', error);
      });
  });
}

// app.setLoginItemSettings({
//   // openAtLogin: true,
//   // openAsHidden: true
//   openAtLogin: true,
//   openAsHidden: true,
//   path: app.getPath("exe")
// });

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.playdownloader')

  appAutoLauncher.isEnabled().then((isEnabled) => {
    if (!isEnabled) appAutoLauncher.enable();
  }).catch((err) => {
    console.error('Auto-launch error:', err);
  });

  const userDataPath = app.getPath("userData");
  const directoryPath = `${userDataPath}/DownloadVideos`;

  protocol.registerFileProtocol('media-loader', (request, callback) => {
    let url = request.url.replace('media-loader://', ''); // Remove custom protocol
    url = decodeURIComponent(url); // Decode URL components

    // Optional: Further validation of the path for security
    // Ensure the path is within a certain directory, for example

    try {
      // Assuming the base path to be replaced is known and consistent
      const filePath = url.replace(directoryPath, ''); // Remove base path
      const finalPath = path.join(directoryPath, filePath); // Construct the absolute path

      console.log("finalPath: ", finalPath);
      return callback(finalPath);
    } catch (error) {
      console.error('Error loading media:', error);
      callback({ error: error });
    }
  });

  const cookiefilePath = path.join(userDataPath, 'data.json');

  // Optionally, initialize the file with default data or check if it exists
  if (!fs.existsSync(cookiefilePath)) {
    // fs.writeFileSync(cookiefilePath, JSON.stringify({}));
    fs.writeFileSync(cookiefilePath, "[]");
  }

  // Check if the directory exists
  if (!fs.existsSync(directoryPath)) {
    try {
      // Create the directory
      fs.mkdirSync(directoryPath, { recursive: true }); // { recursive: true } allows creating parent directories if they don't exist
      console.log("Directory created successfully.");
    } catch (error) {
      console.error("An error occurred while creating the directory:", error);
    }
  } else {
    console.log("Directory already exists.");
  }

  // Check if the directory exists
  if (!fs.existsSync(path.join(directoryPath, 'Audio'))) {
    try {
      // Create the directory
      fs.mkdirSync(path.join(directoryPath, 'Audio'), { recursive: true }); // { recursive: true } allows creating parent directories if they don't exist
      console.log("Directory created successfully.");
    } catch (error) {
      console.error("An error occurred while creating the directory:", error);
    }
  } else {
    console.log("Audio Directory already exists.");
  }

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  async function checkPlaylistUpdates() {
    console.log("Checking Playlist Updates...");
    try {
      const playlists = await getStoreAsync(playList, 'playlists') || {};

      for (let [key, playlistData] of Object.entries(playlists)) {
        const currentInfo = await PlaylistVideoDetails(playlistData.url);
        const currentItemCount = currentInfo.items.length;
        const storedItemCount = playlistData.items ? playlistData.items.length : 0;

        if (currentItemCount !== storedItemCount) {
          console.log(`Update found for playlist ${currentInfo.title}`);
          playlistData.items = currentInfo.items;  // Update the stored items

          await setStoreAsync(playList, 'playlists', { ...playlists, [key]: playlistData });
          await getStoreAsync(playList, 'playlists').then((response) => {
            if (response) {
              mainWindow.webContents.send('palylistVideos', response);
            } else {
              mainWindow.webContents.send('palylistVideos', {});
            }
          }).catch(error => {
            console.error(`Error reading video:`, error);
          });
        }
      }
    } catch (error) {
      console.error('Error monitoring playlists:', error);
    }
  }

  ///////////////////////////////////////////////////////////////////////////////////// Download Start

  // Define the PausablePassThrough class
  util.inherits(PausablePassThrough, stream.Transform);
  function PausablePassThrough(options) {
    stream.Transform.call(this, options);
    this.paused = false;
    this.queuedCallbacks = [];
  }

  PausablePassThrough.prototype.togglePause = function (paused) {
    this.paused = paused;
    if (!this.paused) {
      while (this.queuedCallbacks.length) {
        this.queuedCallbacks.shift()();
      }
    }
  };

  PausablePassThrough.prototype._transform = function (chunk, encoding, cb) {
    this.push(chunk);
    if (this.paused) {
      this.queuedCallbacks.push(cb);
    } else {
      cb();
    }
  };

  function selectFormat(formats, desiredQuality) {
    const availableItags = formats
      .map((format) => format.itag)
      .sort((a, b) => a - b);

    let selectedItagVideo = 134; // Default video quality
    let selectedItagAudio = 139; // Default audio quality

    // Select video itag based on desired quality
    if (desiredQuality === "1080p") {
      selectedItagVideo = availableItags.includes(399) ? 399 :
        availableItags.includes(137) ? 137 :
          availableItags.includes(248) ? 248 :
            availableItags.includes(136) ? 136 :
              availableItags.includes(135) ? 135 : 134;
    } else if (desiredQuality === "720p") {
      selectedItagVideo = availableItags.includes(247) ? 247 :
        availableItags.includes(136) ? 136 :
          availableItags.includes(135) ? 135 : 134;
    } else if (desiredQuality === "360p") {
      selectedItagVideo = availableItags.includes(134) ? 134 :
        availableItags.includes(133) ? 133 :
          availableItags.includes(167) ? 167 : 168;
    }

    // Select audio itag based on availability
    selectedItagAudio = availableItags.includes(140) ? 140 :
      availableItags.includes(141) ? 141 :
        availableItags.includes(139) ? 139 :
          availableItags.includes(250) ? 250 : 251;

    return { selectedItagVideo, selectedItagAudio };
  }

  async function validTikTokUrl(url) {
    try {
      const data = await v1(url);
      console.log("yyyyyyyyyyyyyyyy:", data);
      if (data.video && data.video.noWatermark) {
        return true;
      } else {
        console.log("TikTok URL is valid but no watermark-free version available.");
        return false;
      }
    } catch (error) {
      return false;
    }
  };

  class VideoDownloader {
    constructor(url, videoId, format, quality, videoDetails) {
      this.url = url;
      this.videoId = videoId;
      this.format = format;
      this.quality = quality;
      this.videoDetails = videoDetails;  // Store video details for reference
      this.isDownloading = false;
      this.directoryPath = directoryPath;
      this.progress = 0;
    }
  }

  class YouTubeDownloader extends VideoDownloader {
    constructor(url, videoId, format, quality, videoDetails, managerCallback) {
      super(url, videoId, format, quality, videoDetails); // Correctly call the superclass constructor
      this.outputFilePath = null;
      this.tempFilePath = null;
      this.managerCallback = managerCallback;

      this.info = null;
      this.data = null;
      this.videoprogress = 0;
      this.audioprogress = 0;
      this.videoPausable = new PausablePassThrough();
      this.audioPausable = new PausablePassThrough();
      this.ffmpegProcess = null;
      this.videoDownloadStream = null;
      this.audioDownloadStream = null;
      const filePath = path.join(userDataPath, 'data.json');
      this.agent = ytdl.createAgent(JSON.parse(fs.readFileSync(filePath)));

      this.start();
    }

    // async start() {
    //   this.data = { ...appInfo.store };
    //   this.info = await ytdl.getInfo(this.url, { requestOptions: { headers: { "Cookie": this.data.cookie } } });

    //   if (this.isDownloading) {
    //     console.log(`Download for video ID ${this.videoId} is already in progress.`);
    //     return;
    //   }
    //   if (this.format === "mp4") {
    //     this.outputFilePath = path.join(this.directoryPath, `${this.videoId}.mp4`);
    //     this.isDownloading = true;
    //     console.log(`Starting download for: ${this.videoId} - Format: ${this.format}`);
    //     this.initializeDownloadMP4();
    //   }
    //   if (this.format === "mp3") {
    //     this.outputFilePath = path.join(this.directoryPath, `Audio/${this.videoId}.mp3`);
    //     this.isDownloading = true;
    //     console.log(`Starting download for: ${this.videoId} - Format: ${this.format}`);
    //     this.initializeDownloadMP3();
    //   }
    //   else {
    //     return
    //   }
    // }

    async start() {
      this.data = { ...appInfo.store };
      // this.info = await ytdl.getInfo(this.url, { requestOptions: { headers: { "Cookie": this.data.cookie } } });
      this.info = await ytdl.getInfo(this.url, { agent: this.agent });

      if (this.isDownloading) {
        console.log(`Download for video ID ${this.videoId} is already in progress.`);
        return;
      }

      // Determine output file path based on format
      if (this.format === "mp4") {
        this.outputFilePath = path.join(this.directoryPath, `${this.videoId}.mp4`);
        this.tempFilePath = path.join(this.directoryPath, `${this.videoId}.temp.${this.format}`);
      } else if (this.format === "mp3") {
        this.outputFilePath = path.join(this.directoryPath, `Audio/${this.videoId}.mp3`);
        this.tempFilePath = path.join(this.directoryPath, `${this.videoId}.temp.${this.format}`);
      } else {
        return;  // If format is neither mp4 nor mp3, do not proceed
      }

      // Delete the existing file if it exists
      try {
        [this.outputFilePath, this.tempFilePath].forEach(file => {
          if (fs.existsSync(file)) {
            fs.unlinkSync(file);
            console.log(`Deleted existing file: ${file}`);
          }
        });
      } catch (error) {
        console.error('Error deleting existing files:', error);
        return;  // Stop download if cleanup fails
      }

      // Proceed to download initialization
      this.isDownloading = true;
      console.log(`Starting download for: ${this.videoId} - Format: ${this.format}`);
      if (this.format === "mp4") {
        this.initializeDownloadMP4();
      } else if (this.format === "mp3") {
        this.initializeDownloadMP3();
      }
    }

    initializeDownloadMP4() {
      const { selectedItagVideo, selectedItagAudio } = selectFormat(this.info.formats, this.quality);
      const videoFormat = ytdl.chooseFormat(this.info.formats, { quality: selectedItagVideo, agent: this.agent });
      const audioFormat = ytdl.chooseFormat(this.info.formats, { quality: selectedItagAudio, agent: this.agent });

      this.videoDownloadStream = ytdl.downloadFromInfo(this.info, { format: videoFormat, agent: this.agent });
      this.audioDownloadStream = ytdl.downloadFromInfo(this.info, { format: audioFormat, agent: this.agent });
      this.ffmpegProcess = cp.spawn(ffmpegPath.replace("app.asar", "app.asar.unpacked"), [
        '-y', '-loglevel', 'error', '-hide_banner',
        '-i', 'pipe:3', '-i', 'pipe:4',
        '-map', '0:v', '-map', '1:a',
        '-c', 'copy',
        '-movflags', 'use_metadata_tags',
        `-metadata`, `videoId=${this.videoId}`,
        `-metadata`, `type=youtube`,
        `-metadata`, `format=mp4`,
        `-metadata`, `status=START`,
        `-metadata`, `url=${this.url}`,
        `${this.outputFilePath}`
      ], {
        windowsHide: true,
        stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe']
      });


      this.videoDownloadStream.pipe(this.videoPausable).pipe(this.ffmpegProcess.stdio[3]);
      this.audioDownloadStream.pipe(this.audioPausable).pipe(this.ffmpegProcess.stdio[4]);

      this.ffmpegProcess.on('spawn', async () => {
        console.log("FFmpeg processing has started");

        mainWindow.webContents.send('downloadComplete', { videoId: this.videoId, status: false });
        const existingVideos = await getStoreAsync(videoList, 'videos') || {};
        const updatedVideos = { [this.videoId]: this.videoDetails, ...existingVideos };
        await setStoreAsync(videoList, 'videos', updatedVideos);
        await syncHome();
      });

      this.ffmpegProcess.on('error', error => {
        console.error('FFmpeg process error:', error);
        this.isDownloading = false;
        this.managerCallback(this.videoId, 'delete');
      });

      this.ffmpegProcess.on('close', (code) => {
        console.log(`FFmpeg closed with code ${code}`);
        this.isDownloading = false;
        this.managerCallback(this.videoId, 'delete');
      });

      this.ffmpegProcess.on('exit', async (code, signal) => {
        console.log('Video stream exit:', code);
        this.ffmpegProcess.stdio[3].end();
        this.ffmpegProcess.stdio[4].end();
        this.isDownloading = false;
        this.managerCallback(this.videoId, 'delete');

        if (code === 0) {
          const fileSize = fs.statSync(this.outputFilePath).size; // Get file size in bytes
          const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2); // Convert bytes to megabytes

          await addMetadata(this.outputFilePath, this.videoId, "youtube", 'mp4', "COMPLETE", this.url, fileSizeMB);
          mainWindow.webContents.send('downloadComplete', { videoId: this.videoId, status: true });

          const existingVideos = await getStoreAsync(videoList, 'videos') || {};
          const updatedVideos = { [this.videoId]: this.videoDetails, ...existingVideos };
          await setStoreAsync(videoList, 'videos', updatedVideos);
          await syncMedia();
          await syncHome();
        } else {
          console.log(`FFmpeg exited with code ${code} and signal ${signal}`);
        }
      });

      this.videoDownloadStream.on('progress', (_, downloaded, total) => {
        this.videoprogress = ((downloaded / total) * 100).toFixed(2);
        this.updateProgress();
      });

      this.audioDownloadStream.on('progress', (_, downloaded, total) => {
        this.audioprogress = ((downloaded / total) * 100).toFixed(2);
        this.updateProgress();
      });

      // this.videoDownloadStream.on('response', () => {
      //   console.log("Video download has started");
      //   addMetadata(this.outputFilePath, this.videoId, "mp4", 'youtube', "START", this.url);
      // });
      // this.audioDownloadStream.on('response', () => console.log("Audio download has started"));

      this.videoDownloadStream.on('error', error => {
        console.log('Video stream error:', error);
        this.isDownloading = false;
        this.managerCallback(this.videoId, 'delete');
      });

      this.audioDownloadStream.on('error', error => {
        console.log('Audio stream error:', error);
        this.isDownloading = false;
        this.managerCallback(this.videoId, 'delete');
      });
    }

    initializeDownloadMP3() {
      const { selectedItagAudio } = selectFormat(this.info.formats, this.quality);
      const audioFormat = ytdl.chooseFormat(this.info.formats, { quality: selectedItagAudio, agent: this.agent });

      this.audioDownloadStream = ytdl.downloadFromInfo(this.info, { format: audioFormat, agent: this.agent });
      this.ffmpegProcess = cp.spawn(ffmpegPath.replace("app.asar", "app.asar.unpacked"), [
        '-y', '-loglevel', 'error', '-hide_banner',
        '-i', 'pipe:0',  // Input from the first pipe
        '-vn',  // No video
        '-ar', '44100',  // Set audio sample rate to 44.1 kHz
        '-ac', '2',  // Set audio channels to 2 (stereo)
        '-b:a', '192k',  // Bitrate for audio
        '-f', 'mp3',  // MP3 format
        '-movflags', 'use_metadata_tags',
        `-metadata`, `videoId=${this.videoId}`,
        `-metadata`, `type=youtube`,
        `-metadata`, `format=mp3`,
        `-metadata`, `status=START`,
        `-metadata`, `url=${this.url}`,
        `${this.outputFilePath}`
      ], {
        windowsHide: true,
        stdio: ['pipe', 'ignore', 'ignore', 'ignore']
      });

      this.audioDownloadStream.pipe(this.audioPausable).pipe(this.ffmpegProcess.stdio[0]);

      this.ffmpegProcess.on('spawn', async () => {
        console.log("FFmpeg processing has started");

        mainWindow.webContents.send('downloadComplete', { videoId: this.videoId, status: false });
        const existingVideos = await getStoreAsync(videoList, 'videos') || {};
        const updatedVideos = { [this.videoId]: this.videoDetails, ...existingVideos };
        await setStoreAsync(videoList, 'videos', updatedVideos);
        await syncHome();
      });

      this.ffmpegProcess.on('error', error => {
        console.error('FFmpeg process error:', error);
        this.isDownloading = false;
        this.managerCallback(this.videoId, 'delete');
      });

      this.ffmpegProcess.on('close', (code) => {
        console.log(`FFmpeg closed with code ${code}`);
        this.isDownloading = false;
        this.managerCallback(this.videoId, 'delete');
      });

      this.ffmpegProcess.on('exit', async (code, signal) => {
        console.log('Video stream exit:', code);
        this.ffmpegProcess.stdio[0].end();
        this.isDownloading = false;
        this.managerCallback(this.videoId, 'delete');

        if (code === 0) {
          const fileSize = fs.statSync(this.outputFilePath).size; // Get file size in bytes
          const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2); // Convert bytes to megabytes

          await addMetadata(this.outputFilePath, this.videoId, 'youtube', "mp3", "COMPLETE", this.url, fileSizeMB);
          mainWindow.webContents.send('downloadComplete', { videoId: this.videoId, status: true });

          const existingVideos = await getStoreAsync(videoList, 'videos') || {};
          const updatedVideos = { [this.videoId]: this.videoDetails, ...existingVideos };
          await setStoreAsync(videoList, 'videos', updatedVideos);
          await syncMedia();
          await syncHome();
        } else {
          console.log(`FFmpeg exited with code ${code} and signal ${signal}`);
        }
      });

      this.audioDownloadStream.on('progress', (_, downloaded, total) => {
        this.audioprogress = ((downloaded / total) * 100).toFixed(2);
        // console.log("Progress: ", this.audioprogress);
        mainWindow.webContents.send('downloadProgress', { videoId: this.videoId, progress: this.audioprogress });
      });

      this.audioDownloadStream.on('error', error => {
        console.log('Audio stream error:', error);
        this.isDownloading = false;
        this.managerCallback(this.videoId, 'delete');
      });
    }

    updateProgress() {
      const minProgress = Math.min(this.videoprogress, this.audioprogress);
      // console.log("Progress: ", minProgress);
      mainWindow.webContents.send('downloadProgress', { videoId: this.videoId, progress: minProgress });
    }

    pause() {
      if (!this.isDownloading) {
        console.log(`Download for video ID ${this.videoId} is not active.`);
        return;
      }
      console.log(`Pausing download for: ${this.videoId}`);
      this.isDownloading = false; // Pause the download
      this.videoPausable.togglePause(true);
      this.audioPausable.togglePause(true);
    }

    resume() {
      if (this.isDownloading) {
        console.log(`Download for video ID ${this.videoId} is already active.`);
        return;
      }
      console.log(`Resuming download for: ${this.videoId}`);
      this.isDownloading = true; // Resume the download
      this.videoPausable.togglePause(false);
      this.audioPausable.togglePause(false);
    }

    async stop() {
      // if (!this.isDownloading) {
      //   console.log(`No active download to stop for video ID ${this.videoId}.`);
      //   return;
      // }
      try {
        console.log(`Stopping download for: ${this.videoId}`);
        this.isDownloading = false;
        // Clean up resources here
        this.ffmpegProcess.stdio[3].end();
        this.ffmpegProcess.stdio[4].end();
        this.videoPausable.destroy();
        this.audioPausable.destroy();
        this.managerCallback(this.videoId, 'delete');

        setTimeout(() => {
          if (fs.existsSync(this.outputFilePath)) {
            fs.unlinkSync(this.outputFilePath);
            console.log('File successfully deleted post-stop');
          }
        }, 3000);

        // Update the video list in the store
        mainWindow.webContents.send('downloadComplete', { videoId: this.videoId, status: false });
        const existingVideos = await getStoreAsync(videoList, 'videos') || {};
        if (existingVideos.hasOwnProperty(this.videoId)) {
          delete existingVideos[this.videoId];
          await setStoreAsync(videoList, 'videos', existingVideos);
          await syncHome();
        };
      } catch (error) {
        console.log("Error Stop: ", error);
      }
    }
  }

  class TikTokDownloader extends VideoDownloader {
    constructor(url, videoId, format, quality, videoDetails, managerCallback) {
      super(url, videoId, format, quality, videoDetails); // Correctly call the superclass constructor
      this.outputFilePath = null;
      this.tempFilePath = null;
      this.options = null;
      this.dataurl = null;
      this.dl = null;
      this.managerCallback = managerCallback;
      this.start();
    }

    async start() {
      const data = await v1(this.url);
      console.log("xxxxxxxxxxxxx", data);
      if (this.isDownloading) {
        console.log(`Download for video ID ${this.videoId} is already in progress.`);
        return;
      }
      if (this.format === "mp4") {
        this.dataurl = data.video.noWatermark;
        this.outputFilePath = path.join(this.directoryPath, `${this.videoId}.${this.format}`);
        this.tempFilePath = path.join(this.directoryPath, `${this.videoId}.temp.${this.format}`);
      }
      if (this.format === "mp3") {
        this.dataurl = data.music.play_url;
        this.outputFilePath = path.join(this.directoryPath, `Audio/${this.videoId}.${this.format}`);
        this.tempFilePath = path.join(this.directoryPath, `${this.videoId}.temp.${this.format}`);
      } else {
        return;  // Exit if the format is neither mp4 nor mp3
      }

      // Delete the existing file if it exists
      try {
        [this.outputFilePath, this.tempFilePath].forEach(file => {
          if (fs.existsSync(file)) {
            fs.unlinkSync(file);
            console.log(`Deleted existing file: ${file}`);
          }
        });
      } catch (error) {
        console.error('Error deleting existing files:', error);
        return;  // Stop download if cleanup fails
      }

      this.isDownloading = true;
      console.log(`Starting download for: ${this.videoId} - Format: ${this.format}`);
      this.initializeDownload();
    }

    initializeDownload() {
      this.options = { method: 'GET', fileName: `${this.videoId}.${this.format}`, override: true };
      this.dl = new DownloaderHelper(this.dataurl, path.dirname(this.outputFilePath), this.options);

      this.dl
        .on('download', async () => {
          console.log('Download started')

          mainWindow.webContents.send('downloadComplete', { videoId: this.videoId, status: false });
          const existingVideos = await getStoreAsync(videoList, 'videos') || {};
          const updatedVideos = { [this.videoId]: this.videoDetails, ...existingVideos };
          await setStoreAsync(videoList, 'videos', updatedVideos);
          await syncHome();
        })
        .on('pause', () => console.log('Download paused'))
        .on('resume', () => console.log('Download resumed'))
        .on('stop', () => {
          console.log('Download stopped');
          this.isDownloading = false;
          this.managerCallback(this.videoId, 'delete');
          mainWindow.webContents.send('downloadComplete', { videoId: this.videoId, status: false });
        })
        .on('end', async () => {
          console.log('Download completed');
          this.isDownloading = false;
          this.managerCallback(this.videoId, 'delete');

          const fileSize = fs.statSync(this.outputFilePath).size; // Get file size in bytes
          const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2); // Convert bytes to megabytes

          await addMetadata(this.outputFilePath, this.videoId, 'tiktok', this.format, "COMPLETE", this.dataurl, fileSizeMB);
          mainWindow.webContents.send('downloadComplete', { videoId: this.videoId, status: true });

          const existingVideos = await getStoreAsync(videoList, 'videos') || {};
          const updatedVideos = { [this.videoId]: this.videoDetails, ...existingVideos };
          await setStoreAsync(videoList, 'videos', updatedVideos);
          await syncMedia();
          await syncHome();
        })
        .on('error', (err) => {
          console.error(`Download failed: ${err.message}`);
          this.isDownloading = false;
          this.managerCallback(this.videoId, 'delete');
          mainWindow.webContents.send('downloadComplete', { videoId: this.videoId, status: false });
        })
        .on('progress', (stats) => {
          const percent = stats.progress.toFixed(2);
          // console.log(`Progress: ${percent}%`);
          mainWindow.webContents.send('downloadProgress', { videoId: this.videoId, progress: percent });
        });

      this.dl.start().catch(err => {
        console.error(`Download error for ${this.videoId}: ${err.message}`);
        this.isDownloading = false;
        this.managerCallback(this.videoId, 'delete');
        mainWindow.webContents.send('downloadComplete', { videoId: this.videoId, status: false });
      });
    }

    pause() {
      if (!this.isDownloading) {
        console.log(`Download for video ID ${this.videoId} is not active.`);
        return;
      }
      console.log(`Pausing download for: ${this.videoId}`);
      this.dl.pause();
      this.isDownloading = false;
    }

    resume() {
      if (this.isDownloading) {
        console.log(`Download for video ID ${this.videoId} is already active.`);
        return;
      }
      console.log(`Resuming download for: ${this.videoId}`);
      this.dl.resume();
      this.isDownloading = true;
    }

    async stop() {
      // if (!this.isDownloading) {
      //   console.log(`No active download to stop for video ID ${this.videoId}.`);
      //   return;
      // }
      try {
        console.log(`Stopping download for: ${this.videoId}`);
        this.dl.stop();
        this.isDownloading = false;

        // Update the video list in the store
        mainWindow.webContents.send('downloadComplete', { videoId: this.videoId, status: false });
        const existingVideos = await getStoreAsync(videoList, 'videos') || {};
        if (existingVideos.hasOwnProperty(this.videoId)) {
          delete existingVideos[this.videoId];
          await setStoreAsync(videoList, 'videos', existingVideos);
          await syncHome();
        };
      } catch (error) {
        console.log("Error Stop: ", error);
      }
    }
  }

  class GenericDownloader extends VideoDownloader {
    constructor(url, videoId, format, quality, videoDetails, managerCallback) {
      super(url, videoId, format, quality, videoDetails); // Correctly call the superclass constructor
      this.outputFilePath = null;
      this.tempFilePath = null;
      this.options = null;
      this.dl = null;
      this.managerCallback = managerCallback;
      this.format = this.videoDetails.format;
      this.start();
    }

    // // Add a method to convert videos to MP4
    // async convertToMp4(inputPath, outputPath) {
    //   console.log(`Converting ${inputPath} to MP4 format.`);
    //   return new Promise((resolve, reject) => {
    //     Handbrake.spawn({
    //       input: inputPath,
    //       output: outputPath,
    //       format: 'mp4'
    //     })
    //       .on('error', err => {
    //         console.error('Error during conversion:', err);
    //         reject(err);
    //       })
    //       .on('progress', progress => {
    //         console.log(`Conversion progress: ${progress.percentComplete}%`);
    //       })
    //       .on('end', () => {
    //         console.log('Conversion completed successfully');
    //         try {
    //           if (fs.existsSync(inputPath)) {
    //             fs.unlinkSync(inputPath);
    //             console.log(`Deleted existing file: ${inputPath}`);
    //           }
    //           resolve();
    //         } catch (error) {
    //           console.log(error.message);
    //           resolve();
    //         }

    //         // resolve();
    //       });
    //   });
    // }

    async convertToMp4(inputPath, outputPath) {
      console.log(`Converting ${inputPath} to MP4 format.`);
      return new Promise((resolve, reject) => {
        // Set the paths to the ffmpeg and ffprobe binaries
        ffmpeg.setFfmpegPath(ffmpegPath.replace('app.asar', 'app.asar.unpacked'));
        ffmpeg.setFfprobePath(ffprobePath.path.replace('app.asar', 'app.asar.unpacked'));

        ffmpeg(inputPath)
          .output(outputPath)
          .toFormat('mp4')
          .on('error', (err) => {
            console.error('Error during conversion:', err);
            reject(err);
          })
          .on('progress', (progress) => {
            console.log(`Conversion progress: ${Math.round(progress.percent)}% done`);
          })
          .on('end', () => {
            console.log('Conversion completed successfully');
            try {
              if (fs.existsSync(inputPath)) {
                fs.unlinkSync(inputPath);
                console.log(`Deleted existing file: ${inputPath}`);
              }
            } catch (error) {
              console.error('Error removing the original file:', error.message);
            }
            resolve();
          })
          .run();
      });
    }

    start() {
      if (this.isDownloading) {
        console.log(`Download for video ID ${this.videoId} is already in progress.`);
        return;
      }
      console.log("xxxxxxxxxxxxxxxxxxx: ", this.format);
      if (this.format === "mp4" || this.format === "flv" || this.format === "mkv" || this.format === "3gp") {
        this.outputFilePath = path.join(this.directoryPath, `${this.videoId}.${this.format}`);
        this.tempFilePath = path.join(this.directoryPath, `${this.videoId}.temp.${this.format}`);
      } else {
        console.log("Unsupported format: " + this.format);
        this.managerCallback(this.videoId, 'delete');
        return new Promise((resolve) => {
          const options = {
            type: 'error',
            title: 'Unsupported Format',
            message: `${this.format} Format is Unsupported`
          };

          dialog.showMessageBox(mainWindow, options).then(result => {
            resolve(result.response === 0); // Resolve to true if 'Yes' (button index 0) was clicked
          });
        });
      }

      // Delete the existing file if it exists
      try {
        [this.outputFilePath, this.tempFilePath].forEach(file => {
          if (fs.existsSync(file)) {
            fs.unlinkSync(file);
            console.log(`Deleted existing file: ${file}`);
          }
        });
      } catch (error) {
        console.error('Error deleting existing files:', error);
        return;  // Stop download if cleanup fails
      }

      this.isDownloading = true;
      console.log(`Starting download for: ${this.videoId} - Format: ${this.format}`);
      this.initializeDownload();
    }

    initializeDownload() {
      this.outputFilePath = path.join(this.directoryPath, `${this.videoId}.${this.format}`);
      this.options = { method: 'GET', fileName: `${this.videoId}.${this.format}`, override: true };
      this.dl = new DownloaderHelper(this.url, path.dirname(this.outputFilePath), this.options);

      this.dl
        .on('download', async () => {
          console.log('Download started');

          mainWindow.webContents.send('downloadComplete', { videoId: this.videoId, status: false });
          const existingVideos = await getStoreAsync(videoList, 'videos') || {};
          const updatedVideos = { [this.videoId]: this.videoDetails, ...existingVideos };
          await setStoreAsync(videoList, 'videos', updatedVideos);
          await syncHome();
        })
        .on('pause', () => console.log('Download paused'))
        .on('resume', () => console.log('Download resumed'))
        .on('stop', () => {
          console.log('Download stopped');
          this.isDownloading = false;
          this.managerCallback(this.videoId, 'delete');
          mainWindow.webContents.send('downloadComplete', { videoId: this.videoId, status: false });
        })
        .on('end', async () => {
          console.log('Download completed');
          this.isDownloading = false;
          this.managerCallback(this.videoId, 'delete');

          // if (this.format !== 'mp4') {
          //   await this.convertToMp4(this.outputFilePath, path.join(this.directoryPath, `${this.videoId}.mp4`));
          // }

          // Convert to MP4 if the original format isn't MP4
          if (this.format !== 'mp4') {
            const mp4OutputPath = path.join(this.directoryPath, `${this.videoId}.mp4`);
            await this.convertToMp4(this.outputFilePath, mp4OutputPath);
            this.outputFilePath = mp4OutputPath; // Update output path to the new MP4 file
            this.format = "mp4";
          }

          const fileSize = fs.statSync(this.outputFilePath).size; // Get file size in bytes
          const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2); // Convert bytes to megabytes

          await addMetadata(this.outputFilePath, this.videoId, 'generic', this.format, "COMPLETE", this.url, fileSizeMB);
          mainWindow.webContents.send('downloadComplete', { videoId: this.videoId, status: true });

          const existingVideos = await getStoreAsync(videoList, 'videos') || {};
          const updatedVideos = { [this.videoId]: this.videoDetails, ...existingVideos };
          await setStoreAsync(videoList, 'videos', updatedVideos);
          await syncMedia();
          await syncHome();
        })
        .on('error', (err) => {
          console.error(`Download failed: ${err.message}`);
          this.isDownloading = false;
          this.managerCallback(this.videoId, 'delete');
          mainWindow.webContents.send('downloadComplete', { videoId: this.videoId, status: false });
        })
        .on('progress', (stats) => {
          const percent = stats.progress.toFixed(2);
          // console.log(`Progress: ${percent}%`);
          mainWindow.webContents.send('downloadProgress', { videoId: this.videoId, progress: percent });
        });

      this.dl.start().catch(err => {
        console.error(`Download error for ${this.videoId}: ${err.message}`);
        this.isDownloading = false;
        this.isDownloading = false;
        this.managerCallback(this.videoId, 'delete');
        mainWindow.webContents.send('downloadComplete', { videoId: this.videoId, status: false });
      });
    }

    pause() {
      if (!this.isDownloading) {
        console.log(`Download for video ID ${this.videoId} is not active.`);
        return;
      }
      console.log(`Pausing download for: ${this.videoId}`);
      this.dl.pause();
      this.isDownloading = false;
    }

    resume() {
      if (this.isDownloading) {
        console.log(`Download for video ID ${this.videoId} is already active.`);
        return;
      }
      console.log(`Resuming download for: ${this.videoId}`);
      this.dl.resume();
      this.isDownloading = true;
    }

    async stop() {
      // if (!this.isDownloading) {
      //   console.log(`No active download to stop for video ID ${this.videoId}.`);
      //   return;
      // }
      try {
        console.log(`Stopping download for: ${this.videoId}`);
        this.dl.stop();
        this.isDownloading = false;

        // Update the video list in the store
        mainWindow.webContents.send('downloadComplete', { videoId: this.videoId, status: false });
        const existingVideos = await getStoreAsync(videoList, 'videos') || {};
        if (existingVideos.hasOwnProperty(this.videoId)) {
          delete existingVideos[this.videoId];
          await setStoreAsync(videoList, 'videos', existingVideos);
          await syncHome();
        };
      } catch (error) {
        console.log("Error Stop: ", error);
      }
    }
  }

  class DownloadManager {
    constructor() {
      this.downloaders = {};
      this.videoDetails = null;
      this.videoId = null;
    }

    manageDownloader(videoId, action) {
      if (action === 'delete') {
        delete this.downloaders[videoId];
        console.log(`Downloader for video ID ${videoId} has been removed.`);
      }
    }

    async createDownloader(url, format, quality) {
      if (ytdl.validateURL(url)) {

        try {
          const filePath = path.join(userDataPath, 'data.json');
          this.videoDetails = await YoutubeVideoDetails(url, format, quality, filePath);
          this.videoId = this.videoDetails.id;
        } catch (error) {
          errorDialog(mainWindow, error.message)
        }

        if (!this.videoDetails) {
          console.error('Failed to fetch video details');
          return;
        }

        if (this.downloaders[this.videoId]) {
          console.log(`A downloader for video ID ${this.videoId} already exists.`);
          return this.downloaders[this.videoId];
        }

        this.downloaders[this.videoId] = new YouTubeDownloader(url, this.videoId, format, quality, this.videoDetails, this.manageDownloader.bind(this));
      } else if (await validTikTokUrl(url)) {
        this.videoDetails = await TikTokVideoDetails(url, format, quality, defaultAuthor, defaultThumbnail);
        this.videoId = this.videoDetails.id;

        if (!this.videoDetails) {
          console.error('Failed to fetch video details');
          return;
        }

        if (this.downloaders[this.videoId]) {
          console.log(`A downloader for video ID ${this.videoId} already exists.`);
          return this.downloaders[this.videoId];
        }

        this.downloaders[this.videoId] = new TikTokDownloader(url, this.videoId, format, quality, this.videoDetails, this.manageDownloader.bind(this));
      } else {
        this.videoDetails = GenericVideoDetails(url, format, quality, defaultAuthor, defaultThumbnail);
        this.videoId = this.videoDetails.id;

        if (!this.videoDetails) {
          console.error('Failed to fetch video details');
          return;
        }

        if (this.downloaders[this.videoId]) {
          console.log(`A downloader for video ID ${this.videoId} already exists.`);
          return this.downloaders[this.videoId];
        }

        this.downloaders[this.videoId] = new GenericDownloader(url, this.videoId, format, quality, this.videoDetails, this.manageDownloader.bind(this));
      }

      console.log(`Created new downloader for video ID ${this.videoId} - Title: ${this.videoDetails.title}`);
      return this.downloaders[this.videoId];
    }

    startDownload(videoId) {
      if (this.downloaders[videoId]) {
        this.downloaders[videoId].start();
      } else {
        console.error("No downloader available for video ID:", videoId);
      }
    }

    pauseDownload(videoId) {
      if (this.downloaders[videoId] && this.downloaders[videoId].pause) {
        this.downloaders[videoId].pause();
      } else {
        console.error("No downloader available for video ID:", videoId);
      }
    }

    resumeDownload(videoId) {
      if (this.downloaders[videoId] && this.downloaders[videoId].resume) {
        this.downloaders[videoId].resume();
      } else {
        console.error("No downloader available for video ID:", videoId);
      }
    }

    stopDownload(videoId) {
      if (this.downloaders[videoId] && this.downloaders[videoId].stop) {
        this.downloaders[videoId].stop();
        delete this.downloaders[videoId];
      } else {
        console.error("No downloader available for video ID:", videoId);
      }
    }
  }

  const manager = new DownloadManager();

  ipcMain.on('downloadVideo', async (event, { url, quality, format }) => {
    console.log(url);
    await manager.createDownloader(url, format, quality);
  });

  ipcMain.on('pauseVideo', (event, { videoId }) => {
    manager.pauseDownload(videoId);
  });

  ipcMain.on('resumeVideo', (event, { videoId }) => {
    manager.resumeDownload(videoId);
  });

  ipcMain.on('stopVideo', async (event, { videoId }) => {
    // Show confirmation dialog before proceeding
    const confirm = await confirmDeletion(mainWindow);
    if (!confirm) {
      console.log('Deletion cancelled by the user.');
      return; // Exit if the user cancels
    }

    manager.stopDownload(videoId);
  });

  ///////////////////////////////////////////////////////////////////////////////////// Download Stop

  async function syncHome() {
    await getStoreAsync(videoList, 'videos').then(async (response) => {
      if (response) {
        // Iterate through each video in response and check file existence
        for (const [videoId, videoDetails] of Object.entries(response)) {
          const filePath = videoDetails.format !== "mp3" ? path.join(directoryPath, `${videoDetails.id}.mp4`) : path.join(directoryPath, `Audio/${videoDetails.id}.mp3`);  // Assume .mp4, modify if necessary

          delete downloadProgress[videoId];
          if (fs.existsSync(filePath)) {
            try {
              const metadata = await getMetadata(filePath);
              // console.log("metadata: ", filePath, metadata); // { format: 'mp4', videoId: 'M93w3TjzVUE', type: 'youtube' }
              if (metadata && (metadata.format.tags.status === "COMPLETE" || metadata.format.tags.STATUS === "COMPLETE")) {
                videoDetails.fileExist = true;
                videoDetails.fileSizeMB = metadata.format.tags.size || metadata.format.tags.SIZE
              } else {
                videoDetails.fileExist = false;
              }
            } catch (error) {
              console.error(`Error fetching metadata for video ${videoId}:`, error.message);
              videoDetails.fileExist = false;
            }
          } else {
            videoDetails.fileExist = false;
          }
        }

        mainWindow.webContents.send('homeVideos', response);
        // console.log("response: ", response);
        const data = { ...appInfo.store };
        mainWindow.webContents.send('appInfo', data);
      } else {
        mainWindow.webContents.send('homeVideos', {});
      }
    }).catch(error => {
      console.error(`Error reading video:`, error);
    });
    // await syncPlaylist();
  }

  async function syncPlaylist() {
    try {
      const playlists = await getStoreAsync(playList, 'playlists');
      if (playlists) {
        for (const [playlistId, playlistDetails] of Object.entries(playlists)) {
          if (playlistDetails.items) {
            for (const [videoId, videoDetails] of Object.entries(playlistDetails.items)) {
              // const fileExtension = videoDetails.format === "mp4" ? "mp4" : "mp3";
              const filePath = path.join(directoryPath, `${videoDetails.format !== "mp3" ? "" : "Audio/"}`, `${videoDetails.id}.${videoDetails.format}`);

              delete downloadProgress[videoId];
              try {
                if (fs.existsSync(filePath)) {
                  const metadata = await getMetadata(filePath);
                  videoDetails.fileExist = metadata && metadata.format.tags.status === "COMPLETE";
                  videoDetails.fileSizeMB = metadata ? parseFloat(metadata.format.tags.size) : null;
                } else {
                  videoDetails.fileExist = false;
                }
              } catch (error) {
                console.error(`Error fetching metadata for video ${videoId}:`, error.message);
                videoDetails.fileExist = false;
              }
            }
          }
        }
        mainWindow.webContents.send('palylistVideos', playlists);
        const data = { ...appInfo.store };
        mainWindow.webContents.send('appInfo', data);
      } else {
        mainWindow.webContents.send('palylistVideos', {});
      }
    } catch (error) {
      console.error("Error reading playlists: ", error);
      mainWindow.webContents.send('palylistVideos', {});
    }
    // await syncHome();
  }

  async function fetchFirstVideoId(playlistId) {
    try {
      const response = await axios.get(`https://www.youtube.com/playlist?list=${playlistId}`);
      const match = response.data.match(/"videoId":"(\w+)"/);
      if (!match) {
        throw new Error('No video ID found in playlist');
      }
      return match[1];
    } catch (error) {
      console.error('Failed to fetch or parse playlist page:', error);
      throw new Error('Failed to fetch or parse playlist page');
    }
  };

  ipcMain.on('downloadPlaylist', async (event, obj) => {
    console.log("Playlist URL: ", obj.url);

    let ytplURL = obj.url;
    if (ytplURL.includes('/playlist?list=')) {
      const playlistId = ytplURL.split('=')[1];
      const firstVideoId = await fetchFirstVideoId(playlistId);
      ytplURL = `https://www.youtube.com/watch?v=${firstVideoId}&list=${playlistId}`;
    }

    if (ytdl.validateURL(ytplURL)) {
      let info = await PlaylistVideoDetails(ytplURL);
      if (info && info.items) {
        // Retrieve existing videos object
        try {
          const existingPlaylists = await getStoreAsync(playList, 'playlists') || {};

          // Create a new object with the latest video info as the first entry
          const updatedPlaylists = {
            [info.id]: info, // Add the latest video info
            ...existingPlaylists // Spread the existing videos after the new one
          };

          // Start downloading videos in the playlist
          for (const video of info.items) {
            await new Promise((resolve) => setTimeout(resolve, 1000)); // ensure delay between downloads
            mainWindow.webContents.send('downloadVideoPlaylist', { url: video.url, quality: obj.quality });
          }

          await setStoreAsync(playList, 'playlists', updatedPlaylists);
          await getStoreAsync(playList, 'playlists').then((response) => {
            if (response) {
              mainWindow.webContents.send('palylistVideos', response);
            } else {
              mainWindow.webContents.send('palylistVideos', {});
            }
          }).catch(error => {
            console.error(`Error reading video:`, error);
          });

        } catch (error) {
          console.error(`Error updating video list:`, error);
        }
      }
      await syncHome();
    } else {
      console.log("Invalide Playlist Url");
    }
  });

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  ipcMain.on('page', async (event, obj) => {
    switch (obj.page) {
      case 'Check':
        try {
          const rememberMe = await getStoreAsync(appInfo, 'rememberMe');
          if (rememberMe) {
            const username = await getStoreAsync(appInfo, 'username');
            const password = await getStoreAsync(appInfo, 'password');
            mainWindow.webContents.send('checkRes', { username: username, password: password, rememberMe: rememberMe });

            let respond = await login(username, password, macAddress.macAddr); // Ensure device_id is passed
            if (respond.status === "success") {
              mainWindow.webContents.send('status', { status: "success" });
              loginStatus = true;
              await setStoreAsync(appInfo, 'userId', respond.userId);
              socket.emit('status', { id: respond.userId, login: loginStatus });

              if (respond.mediaData !== null) {
                bckMedia(respond.mediaData);
              }
              // else {
              //   syncMedia();
              // }

              clearTimeout(logoutTimer);
              // setTimeout(logout, 3600000); // 3600000 milliseconds = 1 hour
              // Set up the interval to call checkLicenseStatus every 60 minutes
              logoutTimer = setInterval(async () => {
                await checkLicenseStatus();
              }, 1 * 1000 * 60 * 60);

            } else {
              const options = {
                type: 'error',
                buttons: ['OK'],
                defaultId: 0,
                cancelId: 0,
                title: 'Auth Error!',
                message: 'Login Error!',
                detail: respond.message || 'An unexpected error occurred.', // Use the message from the login function
                alwaysOnTop: true
              };
              await setStoreAsync(appInfo, 'username', '');
              await setStoreAsync(appInfo, 'password', '');
              await setStoreAsync(appInfo, 'rememberMe', false);
              await setStoreAsync(appInfo, 'license', '');
              await setStoreAsync(appInfo, 'userId', '');

              dialog.showMessageBox(mainWindow, options).then(result => {
                if (result.response === 0) { // User clicked 'OK'
                  mainWindow.webContents.send('status', { status: "error" });
                }
              });
            }
          } else {
            mainWindow.webContents.send('checkRes', { username: '', password: '', rememberMe: false });
          }
        } catch (error) {
          const options = {
            type: 'error',
            buttons: ['OK'],
            defaultId: 0,
            cancelId: 0,
            title: 'Auth Error!',
            message: 'Login Error!',
            detail: respond.message || 'An unexpected error occurred.', // Use the message from the login function
            alwaysOnTop: true
          };
          await setStoreAsync(appInfo, 'username', '');
          await setStoreAsync(appInfo, 'password', '');
          await setStoreAsync(appInfo, 'rememberMe', false);
          await setStoreAsync(appInfo, 'license', '');
          await setStoreAsync(appInfo, 'userId', '');

          dialog.showMessageBox(mainWindow, options).then(result => {
            if (result.response === 0) { // User clicked 'OK'
              mainWindow.webContents.send('status', { status: "error" });
            }
          });
        }
        break;

      case 'Login':
        try {
          let respond = await login(obj.email, obj.password, macAddress.macAddr); // Ensure device_id is passed
          if (respond.status === "success") {
            mainWindow.webContents.send('status', { status: "success" });
            if (obj.rememberMe) {
              await setStoreAsync(appInfo, 'username', obj.email);
              await setStoreAsync(appInfo, 'password', obj.password);
              await setStoreAsync(appInfo, 'rememberMe', true);
              await setStoreAsync(appInfo, 'license', respond.license);

              await setStoreAsync(appInfo, 'userId', respond.userId);
              loginStatus = true;
              socket.emit('status', { id: respond.userId, login: loginStatus });

              if (respond.mediaData !== null) {
                bckMedia(respond.mediaData);
              }
              // else {
              //   syncMedia();
              // }

              clearTimeout(logoutTimer);
              // setTimeout(logout, 3600000); // 3600000 milliseconds = 1 hour
              // Set up the interval to call checkLicenseStatus every 60 minutes
              logoutTimer = setInterval(async () => {
                await checkLicenseStatus();
              }, 1 * 1000 * 60 * 60);

            } else {
              await setStoreAsync(appInfo, 'username', '');
              await setStoreAsync(appInfo, 'password', '');
              await setStoreAsync(appInfo, 'rememberMe', false);
              await setStoreAsync(appInfo, 'license', '');
              await setStoreAsync(appInfo, 'userId', '');
            }
          } else {
            const options = {
              type: 'error',
              buttons: ['OK'],
              defaultId: 0,
              cancelId: 0,
              title: 'Auth Error!',
              message: 'Login Error!',
              detail: respond.message || 'An unexpected error occurred.', // Use the message from the login function
              alwaysOnTop: true
            };

            await setStoreAsync(appInfo, 'username', '');
            await setStoreAsync(appInfo, 'password', '');
            await setStoreAsync(appInfo, 'rememberMe', false);
            await setStoreAsync(appInfo, 'license', '');

            dialog.showMessageBox(mainWindow, options).then(result => {
              if (result.response === 0) { // User clicked 'OK'
                mainWindow.webContents.send('status', { status: "error" });
              }
            });
          }
        } catch (error) {
          const options = {
            type: 'error',
            buttons: ['OK'],
            defaultId: 0,
            cancelId: 0,
            title: 'Auth Error!',
            message: 'Login Error!',
            detail: respond.message || 'An unexpected error occurred.', // Use the message from the login function
            alwaysOnTop: true
          };

          await setStoreAsync(appInfo, 'username', '');
          await setStoreAsync(appInfo, 'password', '');
          await setStoreAsync(appInfo, 'rememberMe', false);
          await setStoreAsync(appInfo, 'license', '');

          dialog.showMessageBox(mainWindow, options).then(result => {
            if (result.response === 0) { // User clicked 'OK'
              mainWindow.webContents.send('status', { status: "error" });
            }
          });
        }

        break;

      case 'Home':
        await syncHome();
        break;

      case 'PlayList':
        await syncPlaylist()
        break;

      case 'Search':
        await syncHome();
        break;

      case 'Settings':
        const data = { ...appInfo.store };
        mainWindow.webContents.send('appInfo', data);
        break;

      case 'About':
        const licenseKey = appInfo.get('license');
        mainWindow.webContents.send('aboutApp', {
          currentVersion: packageJson.version,
          licenseKey: licenseKey
        });
        break;

      default:
        break;
    }
  });

  async function syncMedia() {
    // Ensuring that videoList and playList stores are properly accessed
    let syncvideoList = videoList.store ? { ...videoList.store } : { videos: [] };
    let syncplayList = playList.store ? { ...playList.store } : { playlists: [] };

    // Check if 'videos' and 'playlists' properties exist, and initialize if they do not
    if (!syncvideoList.videos) syncvideoList.videos = [];
    if (!syncplayList.playlists) syncplayList.playlists = [];

    // Process video URLs
    // const videoUrlList = Object.values(syncvideoList.videos).map(video => video.url);
    const videoDetailsList = Object.values(syncvideoList.videos).map(video => ({
      url: video.url,
      type: video.type,  // Add this line to include the video type
      format: video.format,  // Add this line to include the video format
      quality: video.quality
    }));
    const playListDetailsList = Object.values(syncplayList.playlists).map(playlist => playlist.url);

    // Call userMediaUpdate with fetched URLs
    const userId = await getStoreAsync(appInfo, 'userId');
    try {
      const result = await userMediaUpdate(userId, videoDetailsList, playListDetailsList);
      console.log(result);
    } catch (error) {
      console.error('Failed to update user media:', error);
    }
  };

  async function bckMedia(data) {
    if (!Array.isArray(data) || data.length === 0) return;

    const entry = data[0]; // Assuming you're sending one entry at a time
    const videoUrls = JSON.parse(entry.videos);
    const playlistUrls = JSON.parse(entry.playlists);

    // Process video URLs
    for (const video of videoUrls) {
      try {
        const filePath = path.join(userDataPath, 'data.json');
        let videoDetails;

        // Check video type and call appropriate function
        switch (video.type) {
          case 'youtube':
            videoDetails = await YoutubeVideoDetails(video.url, video.format, video.quality, filePath);
            break;
          case 'tiktok':
            videoDetails = await TikTokVideoDetails(video.url, video.format, video.quality, defaultAuthor, defaultThumbnail);
            break;
          case 'generic':
            videoDetails = await GenericVideoDetails(video.url, video.format, video.quality, defaultAuthor, defaultThumbnail);
            break;
          default:
            console.log(`Unknown video type for ${video.url}`);
            continue; // Skip processing this video
        }

        const existingVideos = await getStoreAsync(videoList, 'videos') || {};
        const updatedVideos = { [videoDetails.id]: videoDetails, ...existingVideos };
        await setStoreAsync(videoList, 'videos', updatedVideos);
        console.log(`Saved video details for ${video.url}`);

        mainWindow.webContents.send('downloadUrlVideo', { url: video.url, quality: video.quality, format: video.format });
      } catch (error) {
        console.error(`Failed to fetch or save video details for ${video.url}: ${error}`);
      }
    }
    await syncHome();

    // Process playlist URLs
    for (const playlistUrl of playlistUrls) {
      try {
        const playlistDetails = await PlaylistVideoDetails(playlistUrl);
        const existingPlaylists = await getStoreAsync(playList, 'playlists') || {};
        const updatedPlaylists = {
          [playlistDetails.id]: playlistDetails, // Add the latest video info
          ...existingPlaylists // Spread the existing videos after the new one
        };
        await setStoreAsync(playList, 'playlists', updatedPlaylists);
        console.log(`Saved playlist details for ${playlistUrl}`);

        mainWindow.webContents.send('downloadVideoPlaylist', { url: playlistUrl, quality: "720p" });
      } catch (error) {
        console.error(`Failed to fetch or save playlist details for ${playlistUrl}: ${error}`);
      }
    }
    await syncPlaylist();
  }

  async function deleteVideo(videoId) {
    try {
      // Retrieve the existing videos list from the store
      const existingVideos = await getStoreAsync(videoList, 'videos') || {};
      // Check if the video exists in the list
      if (existingVideos.hasOwnProperty(videoId)) {
        // Determine the format and set the appropriate file path
        let videoFilePath;
        const format = existingVideos[videoId].format;
        if (format !== 'mp3') {
          videoFilePath = path.join(directoryPath, `${videoId}.${format}`);
        } else {
          videoFilePath = path.join(directoryPath, `Audio/${videoId}.mp3`);
        }

        // Delete the video from the list
        delete existingVideos[videoId];

        // Update the store with the new videos list
        await setStoreAsync(videoList, 'videos', existingVideos);
        mainWindow.webContents.send('homeVideos', existingVideos);

        // Delay to ensure all streams are closed and ffmpeg has terminated
        setTimeout(async () => {
          try {
            if (fs.existsSync(videoFilePath)) {
              fs.unlinkSync(videoFilePath);
              console.log('File successfully deleted');
            }
            mainWindow.webContents.send('downloadStopped', { videoId });
          } catch (error) {
            console.error('Error deleting video file:', error);
            mainWindow.webContents.send('downloadError', { videoId, error: 'Failed to delete file' });
          }
        }, 1000);

        console.log('Download stopped and video file removed for:', videoId);
      }
    } catch (error) {
      console.error('Error handling stop video:', error);
      mainWindow.webContents.send('downloadError', { videoId, error: 'Failed to update video list and delete file' });
    }
  };

  ipcMain.on('deleteVideo', async (event, obj) => {
    // Show confirmation dialog before proceeding
    const confirm = await confirmDeletion(mainWindow);
    if (!confirm) {
      console.log('Deletion cancelled by the user.');
      return; // Exit if the user cancels
    }

    const videoId = obj.videoId;
    await deleteVideo(videoId);
  });

  ipcMain.on('deletePlaylistVideo', async (event, obj) => {
    // Show confirmation dialog before proceeding
    const confirm = await confirmDeletion(mainWindow);
    if (!confirm) {
      console.log('Deletion cancelled by the user.');
      return; // Exit if the user cancels
    }

    const { videoId, playlistId } = obj;

    try {
      // Fetch the current state of playlists
      const playlists = await getStoreAsync(playList, 'playlists');
      if (!playlists || !playlists[playlistId]) {
        console.log(`Playlist not found: ${playlistId}`);
        return;
      }

      const playlist = playlists[playlistId];
      const videoIndex = playlist.items.findIndex(item => item.id === videoId);
      if (videoIndex === -1) {
        console.log(`Video not found in playlist: ${videoId}`);
        return;
      }

      // Remove the video file from the file system
      const filePath = path.join(directoryPath, `${videoId}.mp4`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`File successfully deleted: ${filePath}`);
        videoList.delete(`videos.${videoId}`); // Assuming videoList is some kind of state store for videos
      } else {
        console.log(`File not found, cannot delete: ${filePath}`);
      }

      // Remove the video from the playlist object
      playlist.items.splice(videoIndex, 1);

      // Update the playlist in the store
      await setStoreAsync(playList, 'playlists', playlists);

      // Send updated playlist back to renderer
      mainWindow.webContents.send('palylistVideos', playlists);
      mainWindow.webContents.send('palylistAlbumVideos', playlists[playlistId]);
    } catch (error) {
      console.error(`Error when deleting video ${videoId} from playlist ${playlistId}:`, error);
      mainWindow.webContents.send('errorDeletingVideo', { error: error.message });
    }
  });

  ipcMain.on('deleteAllVideos', async () => {
    try {
      // Show confirmation dialog before proceeding
      const confirm = await confirmDeletion(mainWindow);
      if (!confirm) {
        console.log('Deletion cancelled by the user.');
        return; // Exit if the user cancels
      }

      const videos = await getStoreAsync(videoList, 'videos'); // Assuming 'videos' is the correct key
      if (videos) {
        for (let [videoId, details] of Object.entries(videos)) {
          if (details.format !== 'mp3' && details.type !== 'playlist') {
            const filePath = path.join(directoryPath, `${videoId}.mp4`);
            setTimeout(() => {
              try {
                if (fs.existsSync(filePath)) {
                  fs.unlinkSync(filePath);
                  console.log('File successfully deleted post-stop');
                }
                console.log(`Deleted: ${filePath}`);
                videoList.delete(`videos.${videoId}`)
              } catch (error) {
                console.log(`File not found, cannot delete: ${filePath}: ${error}`);
              }
            }, 300);  // Ensure FFmpeg has released the file
          }
        }
      }
      console.log('All videos deleted and store cleared.');
      mainWindow.webContents.send('allVideosDeleted'); // Notify renderer process if needed
    } catch (error) {
      console.error('Error deleting all videos:', error);
      mainWindow.webContents.send('errorDeletingVideos', { error: error.message }); // Send error to renderer if needed
    }
  });

  ipcMain.on('deleteAllAudios', async () => {
    try {
      // Show confirmation dialog before proceeding
      const confirm = await confirmDeletion(mainWindow);
      if (!confirm) {
        console.log('Deletion cancelled by the user.');
        return; // Exit if the user cancels
      }

      const videos = await getStoreAsync(videoList, 'videos'); // Assuming 'videos' is the correct key
      if (videos) {
        for (let [videoId, details] of Object.entries(videos)) {
          if (details.format === 'mp3') {
            const filePath = path.join(directoryPath, `Audio/${videoId}.mp3`);
            setTimeout(() => {
              try {
                if (fs.existsSync(filePath)) {
                  fs.unlinkSync(filePath);
                  console.log('File successfully deleted post-stop');
                }
                console.log(`Deleted: ${filePath}`);
                videoList.delete(`videos.${videoId}`)
              } catch (error) {
                console.log(`File not found, cannot delete: ${filePath}: ${error}`);
              }
            }, 300);  // Ensure FFmpeg has released the file
          }
        }
      }
      console.log('All videos deleted and store cleared.');
      mainWindow.webContents.send('allVideosDeleted'); // Notify renderer process if needed
    } catch (error) {
      console.error('Error deleting all videos:', error);
      mainWindow.webContents.send('errorDeletingVideos', { error: error.message }); // Send error to renderer if needed
    }
  });

  ipcMain.on('deletePlaylist', async (event, obj) => {
    // Show confirmation dialog before proceeding
    const confirm = await confirmDeletion(mainWindow);
    if (!confirm) {
      console.log('Deletion cancelled by the user.');
      return; // Exit if the user cancels
    }

    let playlistId = obj.playlistId; // Make sure the object property matches with sender
    try {
      const playlists = await getStoreAsync(playList, 'playlists');
      if (playlists && playlists[playlistId]) {
        const playlist = playlists[playlistId];
        for (let item of playlist.items) {
          const filePath = path.join(directoryPath, `${item.id}.mp4`);
          try {
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
              console.log(`File successfully deleted: ${filePath}`);
              videoList.delete(`videos.${item.id}`)
            } else {
              console.log(`File not found, cannot delete: ${filePath}`);
            }
          } catch (error) {
            console.log(`Error deleting file ${filePath}: ${error}`);
          }
        }
        // Delete playlist metadata from the store
        playList.delete(`playlists.${playlistId}`);
        console.log(`Playlist ${playlistId} and associated files have been deleted.`);

        try {
          const updatedPlaylists = await getStoreAsync(playList, 'playlists') || {};
          await setStoreAsync(playList, 'playlists', updatedPlaylists);
          await getStoreAsync(playList, 'playlists').then((response) => {
            if (response) {
              mainWindow.webContents.send('palylistVideos', response);
            } else {
              mainWindow.webContents.send('palylistVideos', {});
            }
          }).catch(error => {
            console.error(`Error reading video:`, error);
          });
        } catch (error) {
          console.error(`Error updating video list:`, error);
        }

      } else {
        console.log(`Playlist not found: ${playlistId}`);
      }
    } catch (error) {
      console.error(`Error when deleting playlist ${playlistId}:`, error);
    }
  });

  ipcMain.on('deleteAllPlaylists', async () => {
    // Show confirmation dialog before proceeding
    const confirm = await confirmDeletion(mainWindow);
    if (!confirm) {
      console.log('Deletion cancelled by the user.');
      return; // Exit if the user cancels
    }

    try {
      const playlists = await getStoreAsync(playList, 'playlists');
      if (playlists) {
        for (let playlistId of Object.keys(playlists)) {
          const playlist = playlists[playlistId];
          for (let item of playlist.items) {
            const filePath = path.join(directoryPath, `${item.id}.mp4`);
            try {
              if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`File successfully deleted: ${filePath}`);
                videoList.delete(`videos.${item.id}`)
              } else {
                console.log(`File not found, cannot delete: ${filePath}`);
              }
            } catch (error) {
              console.log(`Error deleting file ${filePath}: ${error}`);
            }
          }
          // Optionally delete playlist metadata if required
          // playlistStore.delete(playlistId);
        }
        // Clear all playlists from the store after files deletion
        playList.clear();
        console.log('All videos and playlists cleared from the store.');
        mainWindow.webContents.send('allVideosDeleted'); // Notify renderer process if needed
      } else {
        console.log('No playlists found to delete.');
      }
    } catch (error) {
      console.error('Error deleting all playlists:', error);
      mainWindow.webContents.send('errorDeletingVideos', { error: error.message }); // Send error to renderer if needed
    }
  });

  async function logout() {
    await setStoreAsync(appInfo, 'username', '');
    await setStoreAsync(appInfo, 'password', '');
    await setStoreAsync(appInfo, 'rememberMe', false);
    await setStoreAsync(appInfo, 'license', '');
    mainWindow.webContents.send('confirmLogout');
    loginStatus = false;
    await syncMedia();
    const userId = await getStoreAsync(appInfo, 'userId');
    socket.emit('status', { id: userId, login: loginStatus });
    await logoutApi(userId);
  };

  async function checkLicenseStatus() {
    const userId = await getStoreAsync(appInfo, 'userId');
    // Check the license validity for the user
    const licenseCheckResult = await checkLicense(userId);
    // If the license is not valid, proceed with the logout
    if (licenseCheckResult.status !== "success") {
      await logout();
    }
  };

  ipcMain.on('logout', async (event, obj) => {
    // Show confirmation dialog before proceeding
    const confirm = await confirmLogout(mainWindow);
    if (!confirm) {
      console.log('Deletion cancelled by the user.');
      return; // Exit if the user cancels
    }

    logout();
  });

  // ipcMain.on('setCookie', async (event, { cookie }) => {
  //   try {
  //     // Check if the cookie is an empty string and adjust accordingly
  //     if (cookie.trim() === "") {
  //       cookie = "[]";
  //     } else {
  //       // Validate the cookie format
  //       const isValidFormat = /^\[\s*\{.+\}\s*(,\s*\{.+\}\s*)*\]$/.test(cookie);
  //       if (!isValidFormat) {
  //         return new Promise((resolve) => {
  //           const options = {
  //             type: 'error',
  //             title: 'Invalid cookie format',
  //             message: `The correct format should be like [{ "key": "value" }, { "key": "value" }]`
  //           };

  //           dialog.showMessageBox(mainWindow, options).then(result => {
  //             resolve(result.response === 0); // Resolve to true if 'Yes' (button index 0) was clicked
  //           });
  //         });
  //       }
  //     }

  //     // Parse cookie if it's a string that needs to be an array
  //     if (typeof cookie === 'string') {
  //       cookie = JSON.parse(cookie);
  //     }

  //     // Save the cookie to your store
  //     await setStoreAsync(appInfo, 'cookie', cookie);
  //     console.log('Cookie updated:', cookie);

  //     // Assuming `appInfo.store` contains the data you want to write to a JSON file
  //     const data = { ...appInfo.store };

  //     // Specify the path and filename for the JSON file
  //     const filePath = path.join(userDataPath, 'data.json');

  //     // Write the JSON data to a file
  //     fs.writeFile(filePath, JSON.stringify(data.cookie), (err) => {
  //       if (err) {
  //         console.error('Failed to write file:', err);
  //         event.reply('file-write-error', 'Failed to write data to file.');
  //       } else {
  //         console.log('Data written to file successfully');
  //         event.reply('file-write-success', 'Data written to file successfully.');
  //       }
  //     });

  //     // Send the updated data back to the renderer process
  //     mainWindow.webContents.send('appInfo', data);
  //   } catch (error) {
  //     console.error('Error processing cookie:', error);
  //     event.reply('cookie-format-error', error.message);
  //   }
  // });

  ipcMain.on('setCookie', async (event, { cookie }) => {
    try {
      // Check if cookie is a string and if it's empty, adjust accordingly
      if (typeof cookie === 'string' && cookie.trim() === "") {
        cookie = []; // Set as an empty array directly
      } else if (typeof cookie === 'string') {
        // Validate the cookie format if it is a string
        const isValidFormat = /^\[\s*\{.+\}\s*(,\s*\{.+\}\s*)*\]$/.test(cookie);
        if (!isValidFormat) {
          return new Promise((resolve) => {
            const options = {
              type: 'error',
              title: 'Invalid cookie format',
              message: `The correct format should be like [{ "key": "value" }, { "key": "value" }]`
            };

            dialog.showMessageBox(mainWindow, options).then(result => {
              resolve(result.response === 0);
            });
          });
        }

        // Try parsing the cookie if it's in valid string format
        try {
          cookie = JSON.parse(cookie);
        } catch (parseError) {
          console.error('Error parsing cookie:', parseError);
          return event.reply('cookie-parse-error', 'Failed to parse cookie.');
        }
      }

      // Save the cookie to your store
      await setStoreAsync(appInfo, 'cookie', cookie);
      console.log('Cookie updated:', cookie);

      const data = { ...appInfo.store, cookie: cookie };

      const filePath = path.join(userDataPath, 'data.json');

      fs.writeFile(filePath, JSON.stringify(data.cookie), (err) => {
        if (err) {
          console.error('Failed to write file:', err);
          event.reply('file-write-error', 'Failed to write data to file.');
        } else {
          console.log('Data written to file successfully');
          event.reply('file-write-success', 'Data written to file successfully.');
        }
      });

      mainWindow.webContents.send('appInfo', data);
    } catch (error) {
      console.error('Error processing cookie:', error);
      event.reply('cookie-format-error', error.message);
    }
  });

  function startPlaylistCheckInterval(newInterval) {
    if (playlistCheckTimer !== null) {
      clearInterval(playlistCheckTimer);  // Clear the existing interval
    }
    playlistCheckTimer = setInterval(checkPlaylistUpdates, newInterval);
    console.log(`Playlist check interval set to every ${newInterval / 1000 / 60} minutes.`);
  }

  ipcMain.on('setCheckPlaylistInterval', async (event, { interval }) => {
    const intervalMs = interval * 60 * 1000; // Convert minutes to milliseconds
    await setStoreAsync(appInfo, 'playlistInterval', interval);
    startPlaylistCheckInterval(intervalMs);
    console.log('Playlist check interval updated:', interval);
    const data = { ...appInfo.store };
    mainWindow.webContents.send('appInfo', data);
  });

  createWindow();
  autoUpdater.checkForUpdates();
  // setInterval(checkPlaylistUpdates, 1000 * 60 * 1); // Check every 1 minutes

  const isPortInUse = await checkPort(expressPort);
  if (isPortInUse) {
    console.log(`Port ${expressPort} is in use. Sending shutdown message.`);
    const client = net.createConnection({ port: expressPort }, () => {
      client.write('shutdown');
      client.end();
    });

    client.on('end', () => {
      console.log('Shutdown message sent. Exiting.');
      app.quit();
    });

    client.on('error', (err) => {
      console.error('Error sending shutdown message:', err);
      app.quit();
    });
  } else {
    startExpressServer(expressPort);
  }

  // Initialize with default or stored interval
  const defaultInterval = appInfo.get('playlistInterval', 5) * 60 * 1000; // Default to 5 minutes if not set
  startPlaylistCheckInterval(defaultInterval);

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    // if (BrowserWindow.getAllWindows().length === 0) createWindow()

    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      mainWindow.show();
    }
  })

  if (app.dock) app.dock.hide();
  const tray = new Tray(path.join(__dirname, getTrayIcon())); // Ensure this is a transparent PNG
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open',
      click: function () {
        mainWindow.show();
      }
    },
    // {
    //   label: 'Quit',
    //   click() { app.quit(); },
    //   accelerator: 'CommandOrControl+Q'
    // }
    {
      label: 'Quit',
      click: async function () {
        const userId = await getStoreAsync(appInfo, 'userId');
        await logoutApi(userId).then((res) => console.log(res)).catch((err) => console.log(err));
        app.isQuitting = true;
        powerSaveBlocker.stop(id);
        console.log("powerSaveBlocker stop");
        app.quit();
      },
      accelerator: 'CommandOrControl+Q'
    }
  ]);

  tray.setToolTip('Play Downloader');
  tray.setContextMenu(contextMenu);
  // Add this to handle double-click on the tray icon
  tray.on('double-click', () => {
    mainWindow.show();
  });
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    powerSaveBlocker.stop(id)
    app.quit()
  }
})

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // If we couldn't obtain the lock, quit the application.
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      // mainWindow.focus();
      mainWindow.show();  // Ensure the window is not only focused but also visible.
    }
  });
}