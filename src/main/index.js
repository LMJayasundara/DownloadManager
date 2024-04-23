const path = require('path');
import { app, shell, BrowserWindow, ipcMain, Menu, MenuItem, Tray, protocol, dialog } from 'electron';
import { join } from 'path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import cp from 'child_process';
import fs from 'fs';
import ytdl from 'ytdl-core';
import ffmpegPath from 'ffmpeg-static';
import stream from 'stream';
import util from 'util';
import { autoUpdater, AppUpdater } from "electron-updater";
import ProgressBar from 'electron-progressbar';
const { v1 } = require("node-tiklydown");
const { DownloaderHelper } = require('node-downloader-helper');

import { addMetadata, getMetadata } from './src/metadata';
import { YoutubeVideoDetails, TikTokVideoDetails, GenericVideoDetails, PlaylistVideoDetails } from './src/getVideoInfo';
import { videoList, playList, appInfo, setStoreAsync, getStoreAsync } from './src/localdb';
import { getIcon, getTrayIcon, loadDefaultThumbnail, loadDefaultAuthor } from './src/setIcons';
import { login } from './src/apiHandler';

// import { first, all } from "macaddress-local-machine";
// // Get the first MAC address
// const macAddress = first();
// console.log(macAddress.macAddr);

let playlistCheckTimer = null;
let mainWindow = null, progressBar = null;
let downloadProgress = {};
let defaultThumbnail = null, defaultAuthor = null;

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
      buttons: ['Okay'],
      title: 'Error!',
      message: "Got An Error",
      details: `${error, message}`
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

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

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

      return callback(finalPath);
    } catch (error) {
      console.error('Error loading media:', error);
      callback({ error: error });
    }
  });

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

      this.start();
    }

    async start() {
      this.data = { ...appInfo.store };
      this.info = await ytdl.getInfo(this.url, { requestOptions: { headers: { "Cookie": this.data.cookie } } });

      if (this.isDownloading) {
        console.log(`Download for video ID ${this.videoId} is already in progress.`);
        return;
      }
      if (this.format === "mp4") {
        this.outputFilePath = path.join(this.directoryPath, `${this.videoId}.mp4`);
        this.isDownloading = true;
        console.log(`Starting download for: ${this.videoId} - Format: ${this.format}`);
        this.initializeDownloadMP4();
      }
      if (this.format === "mp3") {
        this.outputFilePath = path.join(this.directoryPath, `Audio/${this.videoId}.mp3`);
        this.isDownloading = true;
        console.log(`Starting download for: ${this.videoId} - Format: ${this.format}`);
        this.initializeDownloadMP3();
      }
      else {
        return
      }
    }

    initializeDownloadMP4() {
      const { selectedItagVideo, selectedItagAudio } = selectFormat(this.info.formats, this.quality);
      const videoFormat = ytdl.chooseFormat(this.info.formats, { quality: selectedItagVideo, requestOptions: { headers: { "Cookie": this.data.cookie } } });
      const audioFormat = ytdl.chooseFormat(this.info.formats, { quality: selectedItagAudio, requestOptions: { headers: { "Cookie": this.data.cookie } } });

      this.videoDownloadStream = ytdl.downloadFromInfo(this.info, { format: videoFormat });
      this.audioDownloadStream = ytdl.downloadFromInfo(this.info, { format: audioFormat });
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
      const audioFormat = ytdl.chooseFormat(this.info.formats, { quality: selectedItagAudio, requestOptions: { headers: { "Cookie": this.data.cookie } } });

      this.audioDownloadStream = ytdl.downloadFromInfo(this.info, { format: audioFormat });
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
      this.options = null;
      this.dataurl = null;
      this.dl = null;
      this.managerCallback = managerCallback;
      this.start();
    }

    async start() {
      const data = await v1(this.url);
      if (this.isDownloading) {
        console.log(`Download for video ID ${this.videoId} is already in progress.`);
        return;
      }
      if (this.format === "mp4") {
        this.dataurl = data.video.noWatermark;
        this.outputFilePath = path.join(this.directoryPath, `${this.videoId}.${this.format}`);
      }
      if (this.format === "mp3") {
        this.dataurl = data.music.play_url;
        this.outputFilePath = path.join(this.directoryPath, `Audio/${this.videoId}.${this.format}`);
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
      this.options = null;
      this.dl = null;
      this.managerCallback = managerCallback;
      this.start();
    }

    start() {
      if (this.isDownloading) {
        console.log(`Download for video ID ${this.videoId} is already in progress.`);
        return;
      }
      if (this.format !== "mp4") {
        console.log("Unsupported format: " + this.format);
        this.managerCallback(this.videoId, 'delete');
        return new Promise((resolve) => {
          const options = {
            type: 'error',
            title: 'Unsupported Format',
            message: 'MP3 Format is Unsupported'
          };

          dialog.showMessageBox(mainWindow, options).then(result => {
            resolve(result.response === 0); // Resolve to true if 'Yes' (button index 0) was clicked
          });
        });
        // return;  // Early exit if the format is unsupported
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

          const fileSize = fs.statSync(this.outputFilePath).size; // Get file size in bytes
          const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2); // Convert bytes to megabytes

          await addMetadata(this.outputFilePath, this.videoId, 'tiktok', this.format, "COMPLETE", this.dataurl, fileSizeMB);
          mainWindow.webContents.send('downloadComplete', { videoId: this.videoId, status: true });

          const existingVideos = await getStoreAsync(videoList, 'videos') || {};
          const updatedVideos = { [this.videoId]: this.videoDetails, ...existingVideos };
          await setStoreAsync(videoList, 'videos', updatedVideos);
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
        this.videoDetails = await YoutubeVideoDetails(url, format, quality);
        this.videoId = this.videoDetails.id;

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
          const filePath = videoDetails.format === "mp4" ? path.join(directoryPath, `${videoDetails.id}.mp4`) : path.join(directoryPath, `Audio/${videoDetails.id}.mp3`);  // Assume .mp4, modify if necessary

          delete downloadProgress[videoId];
          if (fs.existsSync(filePath)) {
            try {
              const metadata = await getMetadata(filePath);
              // console.log("metadata: ", metadata); // { format: 'mp4', videoId: 'M93w3TjzVUE', type: 'youtube' }
              if (metadata && metadata.format.tags.status === "COMPLETE") {
                videoDetails.fileExist = true;
                videoDetails.fileSizeMB = metadata.format.tags.size
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
        const data = { ...appInfo.store };
        mainWindow.webContents.send('appInfo', data);
      } else {
        mainWindow.webContents.send('homeVideos', {});
      }
    }).catch(error => {
      console.error(`Error reading video:`, error);
    });
  }

  async function syncPlaylist() {
    try {
      const playlists = await getStoreAsync(playList, 'playlists');
      if (playlists) {
        for (const [playlistId, playlistDetails] of Object.entries(playlists)) {
          if (playlistDetails.items) {
            for (const [videoId, videoDetails] of Object.entries(playlistDetails.items)) {
              const fileExtension = videoDetails.format === "mp4" ? "mp4" : "mp3";
              const filePath = path.join(directoryPath, `${videoDetails.format === "mp4" ? "" : "Audio/"}`, `${videoDetails.id}.${fileExtension}`);
  
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
  }
  
  ipcMain.on('downloadPlaylist', async (event, obj) => {
    console.log("Playlist URL: ", obj.url);
    if (ytdl.validateURL(obj.url)) {
      let info = await PlaylistVideoDetails(obj.url);
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
        const rememberMe = await getStoreAsync(appInfo, 'rememberMe');
        if (rememberMe) {
          const username = await getStoreAsync(appInfo, 'username');
          const password = await getStoreAsync(appInfo, 'password');
          mainWindow.webContents.send('checkRes', { username: username, password: password, rememberMe: rememberMe });
        } else {
          mainWindow.webContents.send('checkRes', { username: '', password: '', rememberMe: false });
        }
        break;

      case 'Login':
        let respond = await login(obj.email, obj.password, "windows"); // Ensure device_id is passed
        if (respond.status === "success") {
          mainWindow.webContents.send('status', { status: "success" });
          if (obj.rememberMe) {
            await setStoreAsync(appInfo, 'username', obj.email);
            await setStoreAsync(appInfo, 'password', obj.password);
            await setStoreAsync(appInfo, 'rememberMe', true);
          } else {
            await setStoreAsync(appInfo, 'username', '');
            await setStoreAsync(appInfo, 'password', '');
            await setStoreAsync(appInfo, 'rememberMe', false);
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
        // await getStoreAsync(playList, 'playlists').then((response) => {
        //   console.log('playlists: ', response);
        //   if (response) {
        //     mainWindow.webContents.send('palylistVideos', response);
        //   } else {
        //     mainWindow.webContents.send('palylistVideos', {});
        //   }
        // }).catch(error => {
        //   console.error(`Error reading video:`, error);
        // });
        await syncPlaylist()
        break;

      case 'Search':
        await syncHome();
        break;

      case 'Settings':
        const data = { ...appInfo.store };
        mainWindow.webContents.send('appInfo', data);
        break;

      default:
        break;
    }
  });

  ipcMain.on('deleteVideo', async (event, obj) => {
    // Show confirmation dialog before proceeding
    const confirm = await confirmDeletion(mainWindow);
    if (!confirm) {
      console.log('Deletion cancelled by the user.');
      return; // Exit if the user cancels
    }

    const videoId = obj.videoId;

    try {
      // Retrieve the existing videos list from the store
      const existingVideos = await getStoreAsync(videoList, 'videos') || {};
      // Check if the video exists in the list
      if (existingVideos.hasOwnProperty(videoId)) {
        // Determine the format and set the appropriate file path
        let videoFilePath;
        if (existingVideos[videoId].format === 'mp4') {
          videoFilePath = path.join(directoryPath, `${videoId}.mp4`);
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
          if (details.format === 'mp4' && details.type !== 'playlist') {
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


  ipcMain.on('logout', async (event, obj) => {
    // Show confirmation dialog before proceeding
    const confirm = await confirmLogout(mainWindow);
    if (!confirm) {
      console.log('Deletion cancelled by the user.');
      return; // Exit if the user cancels
    }

    await setStoreAsync(appInfo, 'username', '');
    await setStoreAsync(appInfo, 'password', '');
    await setStoreAsync(appInfo, 'rememberMe', false);
    mainWindow.webContents.send('confirmLogout');
  });

  ipcMain.on('setCookie', async (event, { cookie }) => {
    await setStoreAsync(appInfo, 'cookie', cookie);
    console.log('Cookie updated:', cookie);
    const data = { ...appInfo.store };
    mainWindow.webContents.send('appInfo', data);
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

  // Initialize with default or stored interval
  const defaultInterval = appInfo.get('playlistInterval', 5) * 60 * 1000; // Default to 5 minutes if not set
  startPlaylistCheckInterval(defaultInterval);

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

  if (app.dock) app.dock.hide();
  const tray = new Tray(path.join(__dirname, getTrayIcon())); // Ensure this is a transparent PNG
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Quit',
      click() { app.quit(); },
      accelerator: 'CommandOrControl+Q'
    }
  ]);

  tray.setToolTip('Play Downloader');
  tray.setContextMenu(contextMenu);
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
