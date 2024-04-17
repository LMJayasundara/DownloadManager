
const path = require('path');
import { app, shell, BrowserWindow, ipcMain, Menu, MenuItem, Tray, protocol, dialog } from 'electron';
import { join } from 'path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import { login, appendToDB, readFromDB } from './src/fb';
import { getVideoDetailsFromFiles } from './src/getVideos';
import { getVideoInfo, getPlaylistInfo } from './src/getVideoInfo';
import cp from 'child_process';
import fs from 'fs';
import ytdl from 'ytdl-core';
import ffmpegPath from 'ffmpeg-static';
import stream from 'stream';
import util from 'util';

import { autoUpdater, AppUpdater } from "electron-updater";
import ProgressBar from 'electron-progressbar';

const { v1, v2 } = require("node-tiklydown");
const { DownloaderHelper } = require('node-downloader-helper');
const uuid = require("uuid");
let playlistCheckTimer = null;
let mainWindow = null, progressBar = null;

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

const Store = require('electron-store'); // Adjust this to your actual store import
const videoList = new Store({ name: 'videoList' });
const playList = new Store({ name: 'playList' });
const appInfo = new Store({
  name: 'appInfo',
  defaults: {
    cookie: '',  // Default value for cookie
    playlistInterval: 5  // Default value for playlistInterval
  }
});

// Wrapping the `set` method in a Promise
function setStoreAsync(store, key, value) {
  return new Promise((resolve, reject) => {
    try {
      store.set(key, value);
      resolve();
    } catch (error) {
      reject(error);
    }
  });
};

// Wrapping the `get` method in a Promise
function getStoreAsync(store, key) {
  return new Promise((resolve, reject) => {
    try {
      const result = store.get(key);
      resolve(result);
    } catch (error) {
      reject(error);
    }
  });
};

// Function to dynamically import the icon based on the platform
const getIcon = async () => {
  if (process.platform === 'win32') {
    const module = await import('../../resources/icon.ico?asset');
    return module.default;
  } else {
    const module = await import('../../resources/icon.png?asset');
    return module.default;
  }
};

const getTaryIcon = () => {
  if (process.platform === 'win32') return '../../resources/icon.ico';
  else return '../../resources/icon.png';
};

let defaultThumbnail;
async function loadDefaultThumbnail() {
  const module = await import('../../resources/default-thumbnail.jpg');
  defaultThumbnail = module.default;
}

let defaultAuthor;
async function loadDefaultAuthor() {
  const module = await import('../../resources/default-author-photo.jpg');
  defaultAuthor = module.default;
}

async function createWindow() {
  // Dynamically get the icon
  const icon = await getIcon();
  await loadDefaultThumbnail();
  await loadDefaultAuthor();

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

  // protocol.registerFileProtocol('media-loader', (request, callback) => {
  //   // Decode URL to prevent issues with spaces and other characters
  //   const url = decodeURIComponent(request.url.replace('media-loader://', ''));
  //   try {
  //     // Use path.normalize to prevent .. attacks or similar
  //     const normalizedPath = path.normalize(url);
  //     // Optionally, you can add validation here to ensure that the requested file
  //     // is within a specific directory, enhancing security.
  //     // For instance, prevent accessing files outside a designated media folder.
  //     return callback({ path: normalizedPath });
  //   } catch (error) {
  //     console.error('Failed to load media:', error);
  //     return callback({ error: -2 }); // -2 maps to net::ERR_FAILED in Chromium net error codes
  //   }
  // });

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
      callback({ error: -2 }); // Use appropriate error code
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

  // // IPC test
  // ipcMain.on('ping', () => console.log('pong'))

  async function checkPlaylistUpdates() {
    console.log("Checking Playlist Updates...");
    try {
      const playlists = await getStoreAsync(playList, 'playlists') || {};

      for (let [key, playlistData] of Object.entries(playlists)) {
        const currentInfo = await getPlaylistInfo(playlistData.url);
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

  /////////////////////////////////////////////////////////////////////////////////////
  // Handle Login Event
  // ipcMain.on('login', async (event, obj) => {
  //   console.log(obj);
  //   // try {
  //   //   let respond = await login(obj.email, obj.password);
  //   //   console.log(respond);
  //   // } catch (error) {
  //   //   console.log(error.message);
  //   // }
  //   mainWindow.webContents.send('status', "sub11");

  //   // await getVideoDetailsFromFiles(directoryPath).then(videoDetails => {
  //   //   console.log('Video details:', videoDetails);
  //   //   const video = {
  //   //     id: videoDetails.id,
  //   //     title: videoDetails.title
  //   //   }
  //   //   appendVideos(respond.userId, video)
  //   // });

  //   // getVideoDetailsFromFiles(directoryPath).then(videoDetails => {
  //   //   // console.log('Video details:', videoDetails);

  //   //   Object.entries(videoDetails).forEach(([videoId, videoData]) => {
  //   //     // Note: videoData already includes id, title (as name), and thumbnailUrl
  //   //     // const video = {
  //   //     //   id: videoData.id,
  //   //     //   title: videoData.title,
  //   //     //   thumbnailUrl: videoData.thumbnailUrl
  //   //     // };
  //   //     const userId = "abc123"; // respond.userId

  //   //     // Assuming `db` is your initialized Firebase Realtime Database instance
  //   //     // and `respond.userId` contains the authenticated user's ID
  //   //     appendToDB("videos", userId, videoData).then(response => {
  //   //       console.log(`Video ${videoData.id} appended successfully:`, response.message);
  //   //     }).catch(error => {
  //   //       console.error(`Error appending video ${videoData.id}:`, error);
  //   //     });
  //   //   });
  //   // });
  // });

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

  function clearDownloadProgress(downloadProgress, videoId) {
    if (downloadProgress.hasOwnProperty(videoId)) {
      console.log(`Clearing download progress for video ID: ${videoId}`);
      // Close any additional resources or handles if needed
      if (downloadProgress[videoId].videoPausable) {
        downloadProgress[videoId].videoPausable.end();
      }
      if (downloadProgress[videoId].audioPausable) {
        downloadProgress[videoId].audioPausable.end();
      }
      delete downloadProgress[videoId];
    } else {
      console.log(`No download progress found for video ID: ${videoId} to clear.`);
    }
  };

  async function isValidTikTokUrl(url) {
    try {
      const data = await v1(url);
      if (data.video && data.video.noWatermark) {
        // console.log("TikTok URL is valid and video found:", data.video.noWatermark);
        return true;
      } else {
        console.log("TikTok URL is valid but no watermark-free version available.");
        return false;
      }
    } catch (error) {
      // if (error.response) {
      //   console.log("API Error:", error.response.status, error.response.data);

      //   delete downloadProgress[videoId];  // Cleanup
      //   // Update the video list in the store
      //   const existingVideos = await getStoreAsync(videoList, 'videos') || {};
      //   if (existingVideos.hasOwnProperty(videoId)) {
      //     delete existingVideos[videoId];
      //     await setStoreAsync(videoList, 'videos', existingVideos);
      //     mainWindow.webContents.send('homeVideos', existingVideos);
      //   };

      // } else if (error.request) {
      //   console.log("No response received from TikTok API");
      // } else {
      //   console.log("Error while validating TikTok URL:", error.message);
      // }
      return false;
    }
  };

  // Function to determine the video type
  async function getVideoType(url) {
    if (ytdl.validateURL(url)) {
      return 'youtube';
    } if (await isValidTikTokUrl(url)) {
      return 'tiktok';
    } else {
      return 'generic'; // Assume all other URLs are generic
    }
  };

  // Function to parse TikTok video details
  async function parseTikTokVideo(url, format) {
    try {
      const data = await v1(url);
      return {
        id: data.id.toString(),
        title: data.title,
        author: data.author.name,
        format: format,
        description: '',
        tags: [],
        authorPhoto: data.author.avatar || defaultAuthor,
        thumbnailUrl: data.video.cover || defaultThumbnail,
      };
    } catch (error) {
      console.error('Error fetching TikTok video details:', error);
      return null;
    }
  };

  // Generic video details as default
  function defaultVideoDetails(url, format) {
    return {
      id: uuid.v4(),
      title: 'Generic Video',
      author: 'Unknown',
      format: format,
      description: '',
      tags: [],
      authorPhoto: defaultAuthor,
      thumbnailUrl: defaultThumbnail,
    };
  };

  let downloadProgress = {};

  ipcMain.on('downloadVideo', async (event, { url, quality, format }) => {
    const videoType = await getVideoType(url);
    console.log(`Detected video type: ${videoType}`);
    let videoDetails;

    switch (videoType) {
      case 'youtube':
        videoDetails = await getVideoInfo(url, format);
        break;
      case 'tiktok':
        videoDetails = await parseTikTokVideo(url, format);
        break;
      case 'generic':
        videoDetails = defaultVideoDetails(url, format);
        break;
      default:
        console.error('Unsupported video type');
        return;
    }

    if (!videoDetails) {
      console.error('Failed to fetch video details');
      return;
    }

    // Store video details
    const videoId = videoDetails.id;

    if (downloadProgress[videoId]) {
      console.error('Download in Progress...');
      return;
    }

    const existingVideos = await getStoreAsync(videoList, 'videos') || {};
    const updatedVideos = { [videoId]: videoDetails, ...existingVideos };
    await setStoreAsync(videoList, 'videos', updatedVideos);
    await getStoreAsync(videoList, 'videos').then((response) => {
      if (response) {
        mainWindow.webContents.send('homeVideos', response);
      } else {
        mainWindow.webContents.send('homeVideos', {});
      }
    }).catch(error => {
      console.error(`Error reading video:`, error);
    });

    // Download handling
    startDownload(videoId, url, videoType, quality, format);
  });

  async function startDownload(videoId, url, videoType, quality, format) {
    const data = { ...appInfo.store };
    let outputFilePath, options, datav1, dl;
    switch (videoType) {
      case 'youtube':
        switch (format) {
          case "mp4":
            // const data = { ...appInfo.store };
            // ytdl.getInfo(obj.url).then(info => {
            ytdl.getInfo(url, { requestOptions: { headers: { "Cookie": data.cookie } } }).then(info => {
              // Setting up initial download state
              downloadProgress[videoId] = {
                videoprogress: 0,
                audioprogress: 0,
                isDownloading: true,
                videoPausable: new PausablePassThrough(),
                audioPausable: new PausablePassThrough(),
                ffmpegProcess: null,
                type: 'youtube',
                format: 'mp4'
              };

              mainWindow.webContents.send('downloadComplete', { videoId, status: false });

              const { videoPausable, audioPausable } = downloadProgress[videoId];
              const { selectedItagVideo, selectedItagAudio } = selectFormat(info.formats, quality);

              try {
                const format = ytdl.chooseFormat(info.formats, { quality: selectedItagVideo, requestOptions: { headers: { "Cookie": data.cookie } } });
                const audioFormat = ytdl.chooseFormat(info.formats, { quality: selectedItagAudio, requestOptions: { headers: { "Cookie": data.cookie } } });

                const videoDownloadStream = ytdl.downloadFromInfo(info, { format: format });
                const audioDownloadStream = ytdl.downloadFromInfo(info, { format: audioFormat });

                videoDownloadStream.on('progress', (chunkLength, downloaded, total) => {
                  downloadProgress[videoId].videoprogress = ((downloaded / total) * 100).toFixed(2);
                  updateProgress();
                });

                audioDownloadStream.on('progress', (chunkLength, downloaded, total) => {
                  downloadProgress[videoId].audioprogress = ((downloaded / total) * 100).toFixed(2);
                  updateProgress();
                });

                function updateProgress() {
                  const minProgress = Math.min(downloadProgress[videoId].videoprogress, downloadProgress[videoId].audioprogress);
                  mainWindow.webContents.send('downloadProgress', { videoId, progress: minProgress });
                }

                const outputFilePath = path.join(directoryPath, `${videoId}.mp4`);

                const ffmpegProcess = cp.spawn(ffmpegPath, [
                  '-y', '-loglevel', 'error', '-hide_banner',
                  '-i', 'pipe:3', '-i', 'pipe:4',
                  '-map', '0:v', '-map', '1:a',
                  '-c', 'copy',
                  `${outputFilePath}`
                ], {
                  windowsHide: true,
                  // stdio: ['inherit', 'inherit', 'inherit', 'pipe', 'pipe']
                  stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe']
                });

                ffmpegProcess.on('exit', (code, signal) => {
                  if (downloadProgress.hasOwnProperty(videoId)) {
                    downloadProgress[videoId].isDownloading = false;
                  }
                  ffmpegProcess.stdio[3].end();
                  ffmpegProcess.stdio[4].end();
                  console.log(`FFmpeg exited with code ${code} and signal ${signal}`);
                  // mainWindow.webContents.send('downloadComplete', { videoId, status: 'Completed', code, signal });
                  mainWindow.webContents.send('downloadComplete', { videoId, status: true });
                  clearDownloadProgress(downloadProgress, videoId)
                });

                ffmpegProcess.on('error', error => {
                  console.error('FFmpeg process error:', error);
                  mainWindow.webContents.send('downloadError', { videoId, error: error.message });
                  clearDownloadProgress(downloadProgress, videoId)
                });

                ffmpegProcess.on('close', (code) => {
                  // console.log(`FFmpeg exited with code ${code}`);
                  // if (code === 0) {
                  //   console.log('Processing completed successfully, now safe to delete file if needed.');
                  //   // Attempt to delete the file after a short delay
                  //   setTimeout(() => {
                  //     try {
                  //       if (fs.existsSync(outputFilePath)) {
                  //         fs.unlinkSync(outputFilePath);
                  //         console.log('File successfully deleted');
                  //       }
                  //     } catch (error) {
                  //       console.error('Error deleting file:', error);
                  //     }
                  //   }, 1000); // Delay file deletion to ensure no handles are left
                  // }
                  clearDownloadProgress(downloadProgress, videoId)
                });

                downloadProgress[videoId].ffmpegProcess = ffmpegProcess;
                videoDownloadStream.pipe(videoPausable).pipe(ffmpegProcess.stdio[3]);
                audioDownloadStream.pipe(audioPausable).pipe(ffmpegProcess.stdio[4]);

                videoDownloadStream.on('error', error => console.error('Video stream error:', error));
                audioDownloadStream.on('error', error => console.error('Audio stream error:', error));
                ffmpegProcess.on('error', error => console.error('ffmpeg process error:', error));

              } catch (error) {
                console.error('Download initiation failed:', error);
                mainWindow.webContents.send('downloadError', { videoId, error: error.message });
                clearDownloadProgress(downloadProgress, videoId)
              }
            })
            break;

          case "mp3":
            // const data = { ...appInfo.store };
            ytdl.getInfo(url, { requestOptions: { headers: { "Cookie": data.cookie } } }).then(info => {
              // Setting up initial download state for MP3, similar to MP4 structure
              downloadProgress[videoId] = {
                audioprogress: 0,
                isDownloading: true,
                audioPausable: new PausablePassThrough(),
                ffmpegProcess: null,
                type: 'youtube',
                format: 'mp3'  // Indicate this is an MP3 format
              };

              mainWindow.webContents.send('downloadComplete', { videoId, status: false });

              const { audioPausable } = downloadProgress[videoId];
              const audioFormat = ytdl.chooseFormat(info.formats, { quality: 'highestaudio', requestOptions: { headers: { "Cookie": data.cookie } } });
              const audioDownloadStream = ytdl.downloadFromInfo(info, { format: audioFormat });

              audioDownloadStream.on('progress', (chunkLength, downloaded, total) => {
                const progress = ((downloaded / total) * 100).toFixed(2);
                downloadProgress[videoId].audioprogress = progress;
                mainWindow.webContents.send('downloadProgress', { videoId, progress: progress });
              });

              const outputFilePath = path.join(directoryPath, `Audio/${videoId}.mp3`);
              const ffmpegProcess = cp.spawn(ffmpegPath, [
                '-y', '-loglevel', 'error', '-hide_banner',
                '-i', 'pipe:0',  // Input from the first pipe
                '-vn',  // No video
                '-ar', '44100',  // Set audio sample rate to 44.1 kHz
                '-ac', '2',  // Set audio channels to 2 (stereo)
                '-b:a', '192k',  // Bitrate for audio
                '-f', 'mp3',  // MP3 format
                outputFilePath
              ], {
                windowsHide: true,
                stdio: ['pipe', 'ignore', 'ignore', 'ignore']
              });

              ffmpegProcess.on('exit', (code, signal) => {
                downloadProgress[videoId].isDownloading = false;
                if (code === 0) {
                  console.log('MP3 download and conversion complete');
                  mainWindow.webContents.send('downloadComplete', { videoId, status: true });
                } else {
                  console.log(`FFmpeg exited with code ${code} and signal ${signal}`);
                }
                clearDownloadProgress(downloadProgress, videoId);
              });

              ffmpegProcess.on('error', error => {
                console.error('FFmpeg process error:', error);
                clearDownloadProgress(downloadProgress, videoId);
              });

              audioDownloadStream.pipe(audioPausable).pipe(ffmpegProcess.stdio[0]);
              audioDownloadStream.on('error', error => {
                console.error('Audio stream error:', error);
                clearDownloadProgress(downloadProgress, videoId)
              });
            }).catch(error => {
              console.error('Download initiation failed:', error);
            });
            break;

          default:
            break;
        }
        break;

      case 'tiktok':
        switch (format) {
          case "mp4":
            outputFilePath = path.join(directoryPath, `${videoId}.mp4`);
            options = { method: 'GET', fileName: `${videoId}.mp4`, override: true };

            downloadProgress[videoId] = {
              videoprogress: 0,
              audioprogress: 0,
              isDownloading: true,
              videoPausable: null,
              audioPausable: null,
              ffmpegProcess: null,
              dl: null,
              type: videoType,
            };

            // TikTok or generic
            datav1 = await v1(url);
            dl = new DownloaderHelper(datav1.video.noWatermark, path.dirname(outputFilePath), options);
            downloadProgress[videoId].dl = dl;
            dl.start();

            // Log events
            dl.on('download', () => console.log('Download started'))
              .on('pause', () => console.log('Download paused'))
              .on('resume', () => console.log('Download resumed'))
              .on('stop', () => {
                console.log('Download stopped')
                clearDownloadProgress(downloadProgress, videoId)
              })
              .on('end', () => {
                clearDownloadProgress(downloadProgress, videoId)
                console.log('Download completed')
                mainWindow.webContents.send('downloadComplete', { videoId, status: true });
              })
              .on('error', (err) => {
                clearDownloadProgress(downloadProgress, videoId)
                console.error('Download failed:', err)
              })
              .on('progress', (stats) => {
                const percent = stats.progress.toFixed(2);
                mainWindow.webContents.send('downloadProgress', { videoId, progress: percent });
              })
            break;

          case "mp3":
            outputFilePath = path.join(directoryPath, `Audio/${videoId}.mp3`);
            options = { method: 'GET', fileName: `${videoId}.mp3`, override: true };

            downloadProgress[videoId] = {
              isDownloading: true,
              dl: null,
              type: videoType,
              format: 'mp3'
            };

            // TikTok or generic
            datav1 = await v1(url);
            dl = new DownloaderHelper(datav1.music.play_url, path.dirname(outputFilePath), options);
            downloadProgress[videoId].dl = dl;
            dl.start();

            // Log events
            dl.on('download', () => console.log('Download started'))
              .on('pause', () => console.log('Download paused'))
              .on('resume', () => console.log('Download resumed'))
              .on('stop', () => {
                console.log('Download stopped')
                clearDownloadProgress(downloadProgress, videoId)
                mainWindow.webContents.send('downloadComplete', { videoId, status: true });
              })
              .on('end', () => {
                clearDownloadProgress(downloadProgress, videoId)
                console.log('Download completed')
              })
              .on('error', (err) => {
                clearDownloadProgress(downloadProgress, videoId)
                console.error('Download failed:', err)
              })
              .on('progress', (stats) => {
                const percent = stats.progress.toFixed(2);
                mainWindow.webContents.send('downloadProgress', { videoId, progress: percent });
              })
            break;

          default:
            break;
        }
        break;

      case 'generic':
        switch (format) {
          case "mp4":
            outputFilePath = path.join(directoryPath, `${videoId}.mp4`);
            options = { method: 'GET', fileName: `${videoId}.mp4`, override: true };
    
            downloadProgress[videoId] = {
              videoprogress: 0,
              audioprogress: 0,
              isDownloading: true,
              videoPausable: null,
              audioPausable: null,
              ffmpegProcess: null,
              dl: null,
              type: videoType,
            };
    
            // TikTok or generic
            dl = new DownloaderHelper(url, path.dirname(outputFilePath), options);
            downloadProgress[videoId].dl = dl;
            dl.start();
    
            // Log events
            dl.on('download', () => console.log('Download started'))
              .on('pause', () => console.log('Download paused'))
              .on('resume', () => console.log('Download resumed'))
              .on('stop', () => {
                console.log('Download stopped')
                clearDownloadProgress(downloadProgress, videoId)
              })
              .on('end', () => {
                clearDownloadProgress(downloadProgress, videoId)
                console.log('Download completed')
                mainWindow.webContents.send('downloadComplete', { videoId, status: true });
              })
              .on('error', (err) => {
                clearDownloadProgress(downloadProgress, videoId)
                console.error('Download failed:', err)
              })
              .on('progress', (stats) => {
                const percent = stats.progress.toFixed(2);
                mainWindow.webContents.send('downloadProgress', { videoId, progress: percent });
              })
            break;

          case "mp3":
            console.log("Not support");
            break;

          default:
            break;
        }
        break;

      default:
        break;
    }
    // if (videoType === 'youtube') {
    //   if (format === "mp4") {
    //     const data = { ...appInfo.store };
    //     // ytdl.getInfo(obj.url).then(info => {
    //     ytdl.getInfo(url, { requestOptions: { headers: { "Cookie": data.cookie } } }).then(info => {
    //       // Setting up initial download state
    //       downloadProgress[videoId] = {
    //         videoprogress: 0,
    //         audioprogress: 0,
    //         isDownloading: true,
    //         videoPausable: new PausablePassThrough(),
    //         audioPausable: new PausablePassThrough(),
    //         ffmpegProcess: null,
    //         type: 'youtube',
    //         format: 'mp4'
    //       };

    //       mainWindow.webContents.send('downloadComplete', { videoId, status: false });

    //       const { videoPausable, audioPausable } = downloadProgress[videoId];
    //       const { selectedItagVideo, selectedItagAudio } = selectFormat(info.formats, quality);

    //       try {
    //         const format = ytdl.chooseFormat(info.formats, { quality: selectedItagVideo, requestOptions: { headers: { "Cookie": data.cookie } } });
    //         const audioFormat = ytdl.chooseFormat(info.formats, { quality: selectedItagAudio, requestOptions: { headers: { "Cookie": data.cookie } } });

    //         const videoDownloadStream = ytdl.downloadFromInfo(info, { format: format });
    //         const audioDownloadStream = ytdl.downloadFromInfo(info, { format: audioFormat });

    //         videoDownloadStream.on('progress', (chunkLength, downloaded, total) => {
    //           downloadProgress[videoId].videoprogress = ((downloaded / total) * 100).toFixed(2);
    //           updateProgress();
    //         });

    //         audioDownloadStream.on('progress', (chunkLength, downloaded, total) => {
    //           downloadProgress[videoId].audioprogress = ((downloaded / total) * 100).toFixed(2);
    //           updateProgress();
    //         });

    //         function updateProgress() {
    //           const minProgress = Math.min(downloadProgress[videoId].videoprogress, downloadProgress[videoId].audioprogress);
    //           mainWindow.webContents.send('downloadProgress', { videoId, progress: minProgress });
    //         }

    //         const outputFilePath = path.join(directoryPath, `${videoId}.mp4`);

    //         const ffmpegProcess = cp.spawn(ffmpegPath, [
    //           '-y', '-loglevel', 'error', '-hide_banner',
    //           '-i', 'pipe:3', '-i', 'pipe:4',
    //           '-map', '0:v', '-map', '1:a',
    //           '-c', 'copy',
    //           `${outputFilePath}`
    //         ], {
    //           windowsHide: true,
    //           // stdio: ['inherit', 'inherit', 'inherit', 'pipe', 'pipe']
    //           stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe']
    //         });

    //         ffmpegProcess.on('exit', (code, signal) => {
    //           if (downloadProgress.hasOwnProperty(videoId)) {
    //             downloadProgress[videoId].isDownloading = false;
    //           }
    //           ffmpegProcess.stdio[3].end();
    //           ffmpegProcess.stdio[4].end();
    //           console.log(`FFmpeg exited with code ${code} and signal ${signal}`);
    //           // mainWindow.webContents.send('downloadComplete', { videoId, status: 'Completed', code, signal });
    //           mainWindow.webContents.send('downloadComplete', { videoId, status: true });
    //           clearDownloadProgress(downloadProgress, videoId)
    //         });

    //         ffmpegProcess.on('error', error => {
    //           console.error('FFmpeg process error:', error);
    //           mainWindow.webContents.send('downloadError', { videoId, error: error.message });
    //           clearDownloadProgress(downloadProgress, videoId)
    //         });

    //         ffmpegProcess.on('close', (code) => {
    //           // console.log(`FFmpeg exited with code ${code}`);
    //           // if (code === 0) {
    //           //   console.log('Processing completed successfully, now safe to delete file if needed.');
    //           //   // Attempt to delete the file after a short delay
    //           //   setTimeout(() => {
    //           //     try {
    //           //       if (fs.existsSync(outputFilePath)) {
    //           //         fs.unlinkSync(outputFilePath);
    //           //         console.log('File successfully deleted');
    //           //       }
    //           //     } catch (error) {
    //           //       console.error('Error deleting file:', error);
    //           //     }
    //           //   }, 1000); // Delay file deletion to ensure no handles are left
    //           // }
    //           clearDownloadProgress(downloadProgress, videoId)
    //         });

    //         downloadProgress[videoId].ffmpegProcess = ffmpegProcess;
    //         videoDownloadStream.pipe(videoPausable).pipe(ffmpegProcess.stdio[3]);
    //         audioDownloadStream.pipe(audioPausable).pipe(ffmpegProcess.stdio[4]);

    //         videoDownloadStream.on('error', error => console.error('Video stream error:', error));
    //         audioDownloadStream.on('error', error => console.error('Audio stream error:', error));
    //         ffmpegProcess.on('error', error => console.error('ffmpeg process error:', error));

    //       } catch (error) {
    //         console.error('Download initiation failed:', error);
    //         mainWindow.webContents.send('downloadError', { videoId, error: error.message });
    //         clearDownloadProgress(downloadProgress, videoId)
    //       }
    //     })
    //   } else if (format === "mp3") {
    //     const data = { ...appInfo.store };

    //     ytdl.getInfo(url, { requestOptions: { headers: { "Cookie": data.cookie } } }).then(info => {
    //       // Setting up initial download state for MP3, similar to MP4 structure
    //       downloadProgress[videoId] = {
    //         audioprogress: 0,
    //         isDownloading: true,
    //         audioPausable: new PausablePassThrough(),
    //         ffmpegProcess: null,
    //         type: 'youtube',
    //         format: 'mp3'  // Indicate this is an MP3 format
    //       };

    //       mainWindow.webContents.send('downloadComplete', { videoId, status: false });

    //       const { audioPausable } = downloadProgress[videoId];
    //       const audioFormat = ytdl.chooseFormat(info.formats, { quality: 'highestaudio', requestOptions: { headers: { "Cookie": data.cookie } } });
    //       const audioDownloadStream = ytdl.downloadFromInfo(info, { format: audioFormat });

    //       audioDownloadStream.on('progress', (chunkLength, downloaded, total) => {
    //         const progress = ((downloaded / total) * 100).toFixed(2);
    //         downloadProgress[videoId].audioprogress = progress;
    //         mainWindow.webContents.send('downloadProgress', { videoId, progress: progress });
    //       });

    //       const outputFilePath = path.join(directoryPath, `Audio/${videoId}.mp3`);
    //       const ffmpegProcess = cp.spawn(ffmpegPath, [
    //         '-y', '-loglevel', 'error', '-hide_banner',
    //         '-i', 'pipe:0',  // Input from the first pipe
    //         '-vn',  // No video
    //         '-ar', '44100',  // Set audio sample rate to 44.1 kHz
    //         '-ac', '2',  // Set audio channels to 2 (stereo)
    //         '-b:a', '192k',  // Bitrate for audio
    //         '-f', 'mp3',  // MP3 format
    //         outputFilePath
    //       ], {
    //         windowsHide: true,
    //         stdio: ['pipe', 'ignore', 'ignore', 'ignore']
    //       });

    //       ffmpegProcess.on('exit', (code, signal) => {
    //         downloadProgress[videoId].isDownloading = false;
    //         if (code === 0) {
    //           console.log('MP3 download and conversion complete');
    //           mainWindow.webContents.send('downloadComplete', { videoId, status: true });
    //         } else {
    //           console.log(`FFmpeg exited with code ${code} and signal ${signal}`);
    //         }
    //         clearDownloadProgress(downloadProgress, videoId);
    //       });

    //       ffmpegProcess.on('error', error => {
    //         console.error('FFmpeg process error:', error);
    //         clearDownloadProgress(downloadProgress, videoId);
    //       });

    //       audioDownloadStream.pipe(audioPausable).pipe(ffmpegProcess.stdio[0]);
    //       audioDownloadStream.on('error', error => {
    //         console.error('Audio stream error:', error);
    //         clearDownloadProgress(downloadProgress, videoId)
    //       });
    //     }).catch(error => {
    //       console.error('Download initiation failed:', error);
    //     });
    //   }

    // }

    // if (videoType === 'tiktok') {
    //   if (format === "mp4") {
    //     const outputFilePath = path.join(directoryPath, `${videoId}.mp4`);
    //     const options = { method: 'GET', fileName: `${videoId}.mp4`, override: true };

    //     downloadProgress[videoId] = {
    //       videoprogress: 0,
    //       audioprogress: 0,
    //       isDownloading: true,
    //       videoPausable: null,
    //       audioPausable: null,
    //       ffmpegProcess: null,
    //       dl: null,
    //       type: videoType,
    //     };

    //     // TikTok or generic
    //     const data = await v1(url);
    //     const dl = new DownloaderHelper(data.video.noWatermark, path.dirname(outputFilePath), options);
    //     downloadProgress[videoId].dl = dl;
    //     dl.start();

    //     // Log events
    //     dl.on('download', () => console.log('Download started'))
    //       .on('pause', () => console.log('Download paused'))
    //       .on('resume', () => console.log('Download resumed'))
    //       .on('stop', () => {
    //         console.log('Download stopped')
    //         clearDownloadProgress(downloadProgress, videoId)
    //       })
    //       .on('end', () => {
    //         clearDownloadProgress(downloadProgress, videoId)
    //         console.log('Download completed')
    //         mainWindow.webContents.send('downloadComplete', { videoId, status: true });
    //       })
    //       .on('error', (err) => {
    //         clearDownloadProgress(downloadProgress, videoId)
    //         console.error('Download failed:', err)
    //       })
    //       .on('progress', (stats) => {
    //         const percent = stats.progress.toFixed(2);
    //         mainWindow.webContents.send('downloadProgress', { videoId, progress: percent });
    //       })
    //   } else {
    //     const outputFilePath = path.join(directoryPath, `Audio/${videoId}.mp3`);
    //     const options = { method: 'GET', fileName: `${videoId}.mp3`, override: true };

    //     downloadProgress[videoId] = {
    //       isDownloading: true,
    //       dl: null,
    //       type: videoType,
    //       format: 'mp3'
    //     };

    //     // TikTok or generic
    //     const data = await v1(url);
    //     const dl = new DownloaderHelper(data.music.play_url, path.dirname(outputFilePath), options);
    //     downloadProgress[videoId].dl = dl;
    //     dl.start();

    //     // Log events
    //     dl.on('download', () => console.log('Download started'))
    //       .on('pause', () => console.log('Download paused'))
    //       .on('resume', () => console.log('Download resumed'))
    //       .on('stop', () => {
    //         console.log('Download stopped')
    //         clearDownloadProgress(downloadProgress, videoId)
    //       })
    //       .on('end', () => {
    //         clearDownloadProgress(downloadProgress, videoId)
    //         console.log('Download completed')
    //       })
    //       .on('error', (err) => {
    //         clearDownloadProgress(downloadProgress, videoId)
    //         console.error('Download failed:', err)
    //       })
    //       .on('progress', (stats) => {
    //         const percent = stats.progress.toFixed(2);
    //         mainWindow.webContents.send('downloadProgress', { videoId, progress: percent });
    //       })
    //   }
    // }

    // if (videoType === 'generic') {
    //   if (format === "mp4") {
    //     const outputFilePath = path.join(directoryPath, `${videoId}.mp4`);
    //     const options = { method: 'GET', fileName: `${videoId}.mp4`, override: true };

    //     downloadProgress[videoId] = {
    //       videoprogress: 0,
    //       audioprogress: 0,
    //       isDownloading: true,
    //       videoPausable: null,
    //       audioPausable: null,
    //       ffmpegProcess: null,
    //       dl: null,
    //       type: videoType,
    //     };

    //     // TikTok or generic
    //     const dl = new DownloaderHelper(url, path.dirname(outputFilePath), options);
    //     downloadProgress[videoId].dl = dl;
    //     dl.start();

    //     // Log events
    //     dl.on('download', () => console.log('Download started'))
    //       .on('pause', () => console.log('Download paused'))
    //       .on('resume', () => console.log('Download resumed'))
    //       .on('stop', () => {
    //         console.log('Download stopped')
    //         clearDownloadProgress(downloadProgress, videoId)
    //       })
    //       .on('end', () => {
    //         clearDownloadProgress(downloadProgress, videoId)
    //         console.log('Download completed')
    //         mainWindow.webContents.send('downloadComplete', { videoId, status: true });
    //       })
    //       .on('error', (err) => {
    //         clearDownloadProgress(downloadProgress, videoId)
    //         console.error('Download failed:', err)
    //       })
    //       .on('progress', (stats) => {
    //         const percent = stats.progress.toFixed(2);
    //         mainWindow.webContents.send('downloadProgress', { videoId, progress: percent });
    //       })
    //   } else {
    //     console.log("Not support");
    //   }
    // }
  }

  ipcMain.on('pauseVideo', (event, { videoId }) => {
    if (downloadProgress[videoId] && downloadProgress[videoId].isDownloading) {
      if (downloadProgress[videoId].type === 'youtube' && downloadProgress[videoId].format === 'mp4') {
        downloadProgress[videoId].videoPausable.togglePause(true);
        downloadProgress[videoId].audioPausable.togglePause(true);
        mainWindow.webContents.send('downloadPaused', { videoId: videoId });
      }
      else if (downloadProgress[videoId].type === 'youtube' && downloadProgress[videoId].format === 'mp3') {
        downloadProgress[videoId].audioPausable.togglePause(true);
        mainWindow.webContents.send('downloadPaused', { videoId: videoId });
      }
      else {
        downloadProgress[videoId].dl.pause();
        mainWindow.webContents.send('downloadPaused', { videoId: videoId });
      }
      console.log('Download paused for:', videoId);
    } else {
      console.log('Pause requested for non-active or non-existent download:', videoId);
    }
  });

  ipcMain.on('resumeVideo', (event, { videoId }) => {
    if (downloadProgress[videoId] && downloadProgress[videoId].isDownloading) {
      if (downloadProgress[videoId].type === 'youtube' && downloadProgress[videoId].format === 'mp4') {
        downloadProgress[videoId].videoPausable.togglePause(false);
        downloadProgress[videoId].audioPausable.togglePause(false);
        mainWindow.webContents.send('downloadResumed', { videoId: videoId });
      }
      else if (downloadProgress[videoId].type === 'youtube' && downloadProgress[videoId].format === 'mp3') {
        downloadProgress[videoId].audioPausable.togglePause(false);
        mainWindow.webContents.send('downloadResumed', { videoId: videoId });
      }
      else {
        downloadProgress[videoId].dl.resume();
        mainWindow.webContents.send('downloadResumed', { videoId: videoId });
      }
      console.log('Download resumed for:', videoId);
    } else {
      console.log('Resume requested for non-active or non-existent download:', videoId);
    }
  });

  ipcMain.on('stopVideo', async (event, { videoId }) => {
    if (downloadProgress[videoId] && downloadProgress[videoId].isDownloading) {

      const videoFilePath = downloadProgress[videoId].format === "mp4" ? path.join(directoryPath, `${videoId}.mp4`) : path.join(directoryPath, `Audio/${videoId}.mp3`);

      if (downloadProgress[videoId].type === 'youtube') {
        if (downloadProgress[videoId].ffmpegProcess) {
          downloadProgress[videoId].ffmpegProcess.stdio[3].end();
          downloadProgress[videoId].ffmpegProcess.stdio[4].end();
          downloadProgress[videoId].ffmpegProcess.kill('SIGINT');  // Safely terminate ffmpeg

          // Close streams or use any other method to stop the download
          if (downloadProgress[videoId].format === 'mp4') {
            downloadProgress[videoId].videoPausable.destroy();
            downloadProgress[videoId].audioPausable.destroy();
          } else {
            downloadProgress[videoId].audioPausable.destroy();
          }
        }
        mainWindow.webContents.send('downloadStoped', { videoId: videoId });
      } else {
        downloadProgress[videoId].dl.stop();
        mainWindow.webContents.send('downloadStoped', { videoId: videoId });
      }


      console.log('Download stopped for:', videoId);
      delete downloadProgress[videoId];  // Cleanup

      // Update the video list in the store
      const existingVideos = await getStoreAsync(videoList, 'videos') || {};
      if (existingVideos.hasOwnProperty(videoId)) {
        delete existingVideos[videoId];
        await setStoreAsync(videoList, 'videos', existingVideos);
        mainWindow.webContents.send('homeVideos', existingVideos);
      };

      // Delay to ensure all streams are closed and ffmpeg has terminated
      setTimeout(() => {
        try {
          if (fs.existsSync(videoFilePath)) {
            fs.unlinkSync(videoFilePath);
            console.log('File successfully deleted post-stop');
          }
          mainWindow.webContents.send('downloadStopped', { videoId });
        } catch (error) {
          console.error('Error handling stop video:', error);
          mainWindow.webContents.send('downloadError', { videoId, error: 'Failed to delete file after stopping' });
        }
      }, 1000);

    } else {
      console.log('Stop requested for non-active or non-existent download:', videoId);
    }
  });

  ipcMain.on('deleteVideo', async (event, obj) => {
    const videoId = obj.videoId;
    const videoFilePath = path.join(directoryPath, `${videoId}.mp4`);
    try {
      // Update the video list in the store
      const existingVideos = await getStoreAsync(videoList, 'videos') || {};
      if (existingVideos.hasOwnProperty(videoId)) {
        delete existingVideos[videoId];
        await setStoreAsync(videoList, 'videos', existingVideos);
        mainWindow.webContents.send('homeVideos', existingVideos);
      }

      // Delay to ensure all streams are closed and ffmpeg has terminated
      setTimeout(() => {
        try {
          if (fs.existsSync(videoFilePath)) {
            fs.unlinkSync(videoFilePath);
            console.log('File successfully deleted post-stop');
          }
          mainWindow.webContents.send('downloadStopped', { videoId });
        } catch (error) {
          console.error('Error handling stop video:', error);
          mainWindow.webContents.send('downloadError', { videoId, error: 'Failed to delete file after stopping' });
        }
      }, 1000);

      console.log('Download stopped and video file removed for:', videoId);
    } catch (error) {
      console.error('Error handling stop video:', error);
      mainWindow.webContents.send('downloadError', { videoId, error: 'Failed to update video list and delete file after stopping' });
    }
  });

  ipcMain.on('downloadPlaylist', async (event, obj) => {
    console.log("Playlist URL: ", obj.url);
    if (ytdl.validateURL(obj.url)) {
      let info = await getPlaylistInfo(obj.url);
      // console.log("INFO: ", info);
      // if (info) {
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
            mainWindow.webContents.send('downloadVideoPlaylist', { url: `https://www.youtube.com/watch?v=${video.id}`, quality: obj.quality });
          }

          // This process ensures the latest added video info appears first when iterating over the object

          // However, note that JavaScript object properties are ordered in a specific way since ES2015:
          // - Integer keys (array-like indices) are sorted
          // - Other keys appear in creation order
          // Thus, this approach relies on the latter behavior and works as long as the keys are not integers.

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
    } else {
      console.log("Invalide Playlist Url");
    }
  });

  ipcMain.on('page', async (event, obj) => {
    // const userId = "abc123"; // respond.userId
    switch (obj.page) {

      case 'Login':
        let respond = await login(obj.email, obj.password);
        console.log(respond);
        mainWindow.webContents.send('status', "success");
        break;

      case 'Home':
        // // shoud get from the store
        // await readFromDB("videos", userId).then((response) => {
        //   if (response.status === "success") {
        //     mainWindow.webContents.send('homeVideos', response.data);
        //     // {
        //     //   '4k6Xgjqkad4': {
        //     //     author: 'Fireship',
        //     //     authorPhoto: 'https://yt3.ggpht.com/ytc/AIdro_ltOWCZT10fChupyd1atupxII0RoP97CwYGr0Gphw=s48-c-k-c0x00ffffff-no-rj',
        //     //     description: "Let's take a first.." +
        //     //     id: '4k6Xgjqkad4',
        //     //     tags: [ 'webdev', 'app development', 'lesson', 'tutorial' ],
        //     //     thumbnailUrl: 'https://i.ytimg.com/vi_webp/4k6Xgjqkad4/maxresdefault.webp',
        //     //     title: 'They made React great again?'
        //     //   }
        //     // }
        //   } else {
        //     mainWindow.webContents.send('homeVideos', {});
        //   }
        // }).catch(error => {
        //   console.error(`Error reading video ${userId}:`, error);
        // });

        await getStoreAsync(videoList, 'videos').then((response) => {
          // console.log("response: ", response);
          if (response) {
            mainWindow.webContents.send('homeVideos', response);

            const data = { ...appInfo.store };
            mainWindow.webContents.send('appInfo', data);
          } else {
            mainWindow.webContents.send('homeVideos', {});
          }
        }).catch(error => {
          console.error(`Error reading video:`, error);
        });
        break;

      case 'PlayList':
        // await readFromDB("playlists", userId).then((response) => {
        //   if (response.status === "success") {
        //     mainWindow.webContents.send('palylistVideos', response.data);
        //   } else {
        //     mainWindow.webContents.send('palylistVideos', {});
        //   }
        // }).catch(error => {
        //   console.error(`Error reading video ${userId}:`, error);
        // });

        await getStoreAsync(playList, 'playlists').then((response) => {
          // console.log("response: ", response);
          if (response) {
            mainWindow.webContents.send('palylistVideos', response);
          } else {
            mainWindow.webContents.send('palylistVideos', {});
          }
        }).catch(error => {
          console.error(`Error reading video:`, error);
        });
        break;

      case 'Search':
        await getStoreAsync(videoList, 'videos').then((response) => {
          // console.log("response: ", response);
          if (response) {
            mainWindow.webContents.send('homeVideos', response);
          } else {
            mainWindow.webContents.send('homeVideos', {});
          }
        }).catch(error => {
          console.error(`Error reading video:`, error);
        });
        break;

      case 'Settings':
        const data = { ...appInfo.store };
        mainWindow.webContents.send('appInfo', data);
        break;

      default:
        break;
    }
  });

  ipcMain.on('deleteAllVideos', async () => {
    try {
      const videos = await getStoreAsync(videoList, 'videos'); // Assuming 'videos' is the correct key
      if (videos) {
        Object.keys(videos).forEach(videoId => {
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
        });
      }
      console.log('All videos deleted and store cleared.');
      mainWindow.webContents.send('allVideosDeleted'); // Notify renderer process if needed
    } catch (error) {
      console.error('Error deleting all videos:', error);
      mainWindow.webContents.send('errorDeletingVideos', { error: error.message }); // Send error to renderer if needed
    }
  });

  ipcMain.on('deletePlaylist', async (event, obj) => {
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
  const tray = new Tray(path.join(__dirname, getTaryIcon())); // Ensure this is a transparent PNG
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
