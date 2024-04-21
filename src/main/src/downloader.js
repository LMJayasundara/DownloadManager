const path = require('path')
const ytdl = require('ytdl-core');
const { v1 } = require("node-tiklydown");
const { DownloaderHelper } = require('node-downloader-helper');
const util = require('util');
const stream = require('stream');
const cp = require('child_process');
const ffmpegPath = require('ffmpeg-static');
const fs = require('fs');

import { addMetadata } from './metadata';
import { YoutubeVideoDetails, TikTokVideoDetails, GenericVideoDetails, PlaylistVideoDetails } from './getVideoInfo';

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
    // this.directoryPath = directoryPath;
    this.progress = 0;
  }
}

class YouTubeDownloader extends VideoDownloader {
  constructor(url, videoId, format, quality, videoDetails, directoryPath, mainWindow, videoList, appInfo, managerCallback) {
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

    this.directoryPath = directoryPath;
    this.mainWindow = mainWindow;
    this.videoList = videoList;
    this.appInfo = appInfo

    this.start();
  }

  async start() {
    this.data = { ...this.appInfo.store };
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

      this.mainWindow.webContents.send('downloadComplete', { videoId: this.videoId, status: false });
      const existingVideos = await getStoreAsync(this.videoList, 'videos') || {};
      const updatedVideos = { [this.videoId]: this.videoDetails, ...existingVideos };
      await setStoreAsync(this.videoList, 'videos', updatedVideos);
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
        await addMetadata(this.outputFilePath, this.videoId, "youtube", 'mp4', "COMPLETE", this.url);
        this.mainWindow.webContents.send('downloadComplete', { videoId: this.videoId, status: true });
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

      this.mainWindow.webContents.send('downloadComplete', { videoId: this.videoId, status: false });
      const existingVideos = await getStoreAsync(this.videoList, 'videos') || {};
      const updatedVideos = { [this.videoId]: this.videoDetails, ...existingVideos };
      await setStoreAsync(this.videoList, 'videos', updatedVideos);
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
        await addMetadata(this.outputFilePath, this.videoId, 'youtube', "mp3", "COMPLETE", this.url);
        this.mainWindow.webContents.send('downloadComplete', { videoId: this.videoId, status: true });
      } else {
        console.log(`FFmpeg exited with code ${code} and signal ${signal}`);
      }
    });

    this.audioDownloadStream.on('progress', (_, downloaded, total) => {
      this.audioprogress = ((downloaded / total) * 100).toFixed(2);
      // console.log("Progress: ", this.audioprogress);
      this.mainWindow.webContents.send('downloadProgress', { videoId: this.videoId, progress: this.audioprogress });
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
    this.mainWindow.webContents.send('downloadProgress', { videoId: this.videoId, progress: minProgress });
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
    if (!this.isDownloading) {
      console.log(`No active download to stop for video ID ${this.videoId}.`);
      return;
    }
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
    this.mainWindow.webContents.send('downloadComplete', { videoId: this.videoId, status: false });
    const existingVideos = await getStoreAsync(this.videoList, 'videos') || {};
    if (existingVideos.hasOwnProperty(this.videoId)) {
      delete existingVideos[this.videoId];
      await setStoreAsync(this.videoList, 'videos', existingVideos);
      await syncHome();
    };
  }
}

class TikTokDownloader extends VideoDownloader {
  constructor(url, videoId, format, quality, videoDetails, directoryPath, mainWindow, videoList, appInfo, managerCallback) {
    super(url, videoId, format, quality, videoDetails); // Correctly call the superclass constructor
    this.outputFilePath = null;
    this.options = null;
    this.dataurl = null;
    this.dl = null;
    this.managerCallback = managerCallback;

    this.directoryPath = directoryPath;
    this.mainWindow = mainWindow;
    this.videoList = videoList;
    this.appInfo = appInfo

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

        this.mainWindow.webContents.send('downloadComplete', { videoId: this.videoId, status: false });
        const existingVideos = await getStoreAsync(this.videoList, 'videos') || {};
        const updatedVideos = { [this.videoId]: this.videoDetails, ...existingVideos };
        await setStoreAsync(this.videoList, 'videos', updatedVideos);
        await syncHome();
      })
      .on('pause', () => console.log('Download paused'))
      .on('resume', () => console.log('Download resumed'))
      .on('stop', () => {
        console.log('Download stopped');
        this.isDownloading = false;
        this.managerCallback(this.videoId, 'delete');
        this.mainWindow.webContents.send('downloadComplete', { videoId: this.videoId, status: false });
      })
      .on('end', async () => {
        console.log('Download completed');
        this.isDownloading = false;
        this.managerCallback(this.videoId, 'delete');
        await addMetadata(this.outputFilePath, this.videoId, 'tiktok', this.format, "COMPLETE", this.dataurl);
        this.mainWindow.webContents.send('downloadComplete', { videoId: this.videoId, status: true });
      })
      .on('error', (err) => {
        console.error(`Download failed: ${err.message}`);
        this.isDownloading = false;
        this.managerCallback(this.videoId, 'delete');
        this.mainWindow.webContents.send('downloadComplete', { videoId: this.videoId, status: false });
      })
      .on('progress', (stats) => {
        const percent = stats.progress.toFixed(2);
        // console.log(`Progress: ${percent}%`);
        this.mainWindow.webContents.send('downloadProgress', { videoId: this.videoId, progress: percent });
      });

    this.dl.start().catch(err => {
      console.error(`Download error for ${this.videoId}: ${err.message}`);
      this.isDownloading = false;
      this.managerCallback(this.videoId, 'delete');
      this.mainWindow.webContents.send('downloadComplete', { videoId: this.videoId, status: false });
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
    if (!this.isDownloading) {
      console.log(`No active download to stop for video ID ${this.videoId}.`);
      return;
    }
    console.log(`Stopping download for: ${this.videoId}`);
    this.dl.stop();
    this.isDownloading = false;

    // Update the video list in the store
    this.mainWindow.webContents.send('downloadComplete', { videoId: this.videoId, status: false });
    const existingVideos = await getStoreAsync(this.videoList, 'videos') || {};
    if (existingVideos.hasOwnProperty(this.videoId)) {
      delete existingVideos[this.videoId];
      await setStoreAsync(this.videoList, 'videos', existingVideos);
      await syncHome();
    };
  }
}

class GenericDownloader extends VideoDownloader {
  constructor(url, videoId, format, quality, videoDetails, directoryPath, mainWindow, videoList, appInfo, managerCallback) {
    super(url, videoId, format, quality, videoDetails); // Correctly call the superclass constructor
    this.outputFilePath = null;
    this.options = null;
    this.dl = null;
    this.managerCallback = managerCallback;

    this.directoryPath = directoryPath;
    this.mainWindow = mainWindow;
    this.videoList = videoList;
    this.appInfo = appInfo

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
      return;  // Early exit if the format is unsupported
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

        this.mainWindow.webContents.send('downloadComplete', { videoId: this.videoId, status: false });
        const existingVideos = await getStoreAsync(this.videoList, 'videos') || {};
        const updatedVideos = { [this.videoId]: this.videoDetails, ...existingVideos };
        await setStoreAsync(this.videoList, 'videos', updatedVideos);
        await syncHome();
      })
      .on('pause', () => console.log('Download paused'))
      .on('resume', () => console.log('Download resumed'))
      .on('stop', () => {
        console.log('Download stopped');
        this.isDownloading = false;
        this.managerCallback(this.videoId, 'delete');
        this.mainWindow.webContents.send('downloadComplete', { videoId: this.videoId, status: false });
      })
      .on('end', async () => {
        console.log('Download completed');
        this.isDownloading = false;
        this.managerCallback(this.videoId, 'delete');
        await addMetadata(this.outputFilePath, this.videoId, 'tiktok', this.format, "COMPLETE", this.dataurl);
        this.mainWindow.webContents.send('downloadComplete', { videoId: this.videoId, status: true });
      })
      .on('error', (err) => {
        console.error(`Download failed: ${err.message}`);
        this.isDownloading = false;
        this.managerCallback(this.videoId, 'delete');
        this.mainWindow.webContents.send('downloadComplete', { videoId: this.videoId, status: false });
      })
      .on('progress', (stats) => {
        const percent = stats.progress.toFixed(2);
        // console.log(`Progress: ${percent}%`);
        this.mainWindow.webContents.send('downloadProgress', { videoId: this.videoId, progress: percent });
      });

    this.dl.start().catch(err => {
      console.error(`Download error for ${this.videoId}: ${err.message}`);
      this.isDownloading = false;
      this.isDownloading = false;
      this.managerCallback(this.videoId, 'delete');
      this.mainWindow.webContents.send('downloadComplete', { videoId: this.videoId, status: false });
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
    if (!this.isDownloading) {
      console.log(`No active download to stop for video ID ${this.videoId}.`);
      return;
    }
    console.log(`Stopping download for: ${this.videoId}`);
    this.dl.stop();
    this.isDownloading = false;

    // Update the video list in the store
    this.mainWindow.webContents.send('downloadComplete', { videoId: this.videoId, status: false });
    const existingVideos = await getStoreAsync(this.videoList, 'videos') || {};
    if (existingVideos.hasOwnProperty(this.videoId)) {
      delete existingVideos[this.videoId];
      await setStoreAsync(this.videoList, 'videos', existingVideos);
      await syncHome();
    };
  }
}

export class DownloadManager {
  constructor(directoryPath, mainWindow, videoList, appInfo) {
    this.downloaders = {};
    this.videoDetails = null;
    this.videoId = null;
    this.directoryPath = directoryPath;
    this.mainWindow = mainWindow;
    this.videoList = videoList;
    this.appInfo = appInfo
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

      this.downloaders[this.videoId] = new YouTubeDownloader(url, this.videoId, format, quality, this.videoDetails, this.directoryPath, this.mainWindow, this.videoList, this.appInfo, this.manageDownloader.bind(this));
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

      this.downloaders[this.videoId] = new TikTokDownloader(url, this.videoId, format, quality, this.videoDetails, this.directoryPath, this.mainWindow, this.videoList, this.appInfo, this.manageDownloader.bind(this));
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

      this.downloaders[this.videoId] = new GenericDownloader(url, this.videoId, format, quality, this.videoDetails, this.directoryPath, this.mainWindow, this.videoList, this.appInfo, this.manageDownloader.bind(this));
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