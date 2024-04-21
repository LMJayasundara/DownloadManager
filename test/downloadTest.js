const path = require('path')
const ytdl = require('ytdl-core');
const { v1, v2 } = require("node-tiklydown");
const { DownloaderHelper } = require('node-downloader-helper');
const readline = require('readline');
const util = require('util');
const stream = require('stream');
const cp = require('child_process');
const ffmpegPath = require('ffmpeg-static');
const ffprobePath = require('ffprobe-static').path.replace('app.asar', 'app.asar.unpacked');
const fs = require('fs');

// shoud add quality
const addMetadata = async (filePath, videoId, type, format, status, url) => {
  console.log(format);
  const metadataFilePath = `${filePath}.temp.${format}`;

  let ffmpegArgs = [
    '-y', '-loglevel', 'error', '-hide_banner',
    '-i', filePath,
    '-movflags', 'use_metadata_tags',
    '-metadata', `videoId=${videoId}`,
    `-metadata`, `type=${type}`,
    `-metadata`, `format=${format}`,
    `-metadata`, `status=${status}`,
    `-metadata`, `url=${url}`,
  ];

  if (format === "mp4") {
    ffmpegArgs.push('-c:v', 'copy');  // Copy video codec settings without re-encoding
    ffmpegArgs.push('-c:a', 'copy');  // Copy audio codec settings without re-encoding
    ffmpegArgs.push(metadataFilePath); // Output file
  } else if (format === "mp3") {
    ffmpegArgs.push('-vn');  // No video
    ffmpegArgs.push('-c:a', 'libmp3lame');  // Encode audio to MP3
    ffmpegArgs.push('-b:a', '192k');  // Bitrate for audio
    ffmpegArgs.push(metadataFilePath); // Output file
  } else {
    console.log("Unsupported format");
    return;
  }

  // Create and manage the FFmpeg process
  const ffmpegProcess = cp.spawn(ffmpegPath.replace("app.asar", "app.asar.unpacked"), ffmpegArgs, {
    windowsHide: true,
    stdio: ['ignore', 'ignore', 'pipe']
  });

  ffmpegProcess.stderr.on('data', (data) => {
    console.error(`FFmpeg Error: ${data.toString()}`);
  });

  try {
    await new Promise((resolve, reject) => {
      ffmpegProcess.on('close', (code) => {
        if (code === 0) {
          fs.renameSync(metadataFilePath, filePath); // Overwrite old file with new metadata enhanced file
          console.log('Metadata added successfully');
          resolve();
        } else {
          reject(new Error(`Failed to add metadata, FFmpeg closed with code ${code}`));
        }
      });
    });
  } catch (error) {
    console.error("An error occurred:", error.message);
  }
};

function getMetadata(filePath) {
  return new Promise((resolve, reject) => {
    const args = [
      '-v', 'error',                  // Hide all warnings
      '-show_entries', 'format_tags', // Only show the comment tag in the format section // =videoId, type, format
      '-of', 'json',                  // Output format as JSON
      filePath                        // File to analyze
    ];

    const ffprobeProcess = cp.spawn(ffprobePath, args);

    let output = '';
    ffprobeProcess.stdout.on('data', (chunk) => {
      output += chunk;  // Append the output
    });

    ffprobeProcess.stderr.on('data', (data) => {
      console.error(`stderr: ${data.message}`); // Log any errors
    });

    ffprobeProcess.on('close', (code) => {
      if (code !== 0) {
        // reject(new Error(`ffprobe exited with code ${code}`));
        resolve(null);
      } else {
        try {
          const parsedData = JSON.parse(output); // Parse the JSON output
          resolve(parsedData);
        } catch (e) {
          // reject(new Error('Failed to parse ffprobe output: ' + e.message));
          resolve(null);
        }
      }
    });
  });
};

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

// // Utility functions
// const formatSelectors = {
//   '1080p': [399, 137, 248, 136, 135, 134],
//   '720p': [247, 136, 135, 134],
//   '360p': [134, 133, 167, 168]
// };

// function selectFormat(formats, desiredQuality) {
//   let videoItags = formatSelectors[desiredQuality] || formatSelectors['360p'];
//   let audioItags = [140, 141, 139, 250, 251];
//   const formatMap = formats.reduce((acc, format) => {
//       if (videoItags.includes(format.itag)) acc.video.push(format);
//       if (audioItags.includes(format.itag)) acc.audio.push(format);
//       return acc;
//   }, { video: [], audio: [] });

//   return {
//       videoFormat: formatMap.video[0], // Select the best available format
//       audioFormat: formatMap.audio[0]  // Select the best available format
//   };
// }


async function YoutubeVideoDetails(url, format, quality) {
  try {
    const info = await ytdl.getInfo(url);
    const details = {
      id: info.videoDetails.videoId,
      title: info.videoDetails.title,
      url: url,
      format: format,
      quality: quality,
      author: info.videoDetails.author.name,
      description: info.videoDetails.description,
      tags: info.videoDetails.keywords,
      authorPhoto: info.videoDetails.author.thumbnails[0].url,
      thumbnailUrl: info.videoDetails.thumbnails[info.videoDetails.thumbnails.length - 1].url, // Getting the highest quality thumbnail
    };
    return details;
  } catch (error) {
    console.error('Error fetching video details:', error);
    return null
  }
};

async function TikTokVideoDetails(url, format, quality) {
  try {
    const info = await v1(url);
    return {
      id: info.id.toString(),
      title: info.title,
      url: url,
      format: format,
      quality: quality,
      author: info.author.name,
      description: '',
      tags: [],
      authorPhoto: info.author.avatar || 'defaultAuthor',
      thumbnailUrl: info.video.cover || 'defaultThumbnail',
    };
  } catch (error) {
    console.error('Error fetching TikTok video details:', error);
    return null;
  }
};

function urlHash(url) {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

function GenericVideoDetails(url, format, quality) {
  return {
    id: urlHash(url),
    title: 'Generic Video',
    url: url,
    format: format,
    quality: quality,
    author: 'Unknown',
    description: '',
    tags: [],
    authorPhoto: "defaultAuthor",
    thumbnailUrl: "defaultThumbnail",
  };
};

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
    this.progress = 0;
  }
}

class YouTubeDownloader extends VideoDownloader {
  constructor(url, videoId, format, quality, videoDetails, managerCallback) {
    super(url, videoId, format, quality, videoDetails); // Correctly call the superclass constructor
    this.directoryPath = "./videos";
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
    this.data = { cookie: '' };
    // this.data = { ...appInfo.store };
    this.info = await ytdl.getInfo(this.url, { requestOptions: { headers: { "Cookie": this.data.cookie } } });

    if (this.isDownloading) {
      console.log(`Download for video ID ${this.videoId} is already in progress.`);
      return;
    }
    if (this.format === "mp4") {
      this.directoryPath = './videos';
      this.outputFilePath = path.join(this.directoryPath, `${this.videoId}.mp4`);
      this.isDownloading = true;
      console.log(`Starting download for: ${this.videoId} - Format: ${this.format}`);
      this.initializeDownloadMP4();
    }
    if (this.format === "mp3") {
      this.directoryPath = './videos/Audios';
      this.outputFilePath = path.join(this.directoryPath, `${this.videoId}.mp3`);
      this.isDownloading = true;
      console.log(`Starting download for: ${this.videoId} - Format: ${this.format}`);
      this.initializeDownloadMP3();
    }
    else {
      return
    }
  }

  // initializeDownloadMP4() {
  //   const { selectedItagVideo, selectedItagAudio } = selectFormat(this.info.formats, this.quality);
  //   const videoFormat = ytdl.chooseFormat(this.info.formats, { quality: selectedItagVideo });
  //   const audioFormat = ytdl.chooseFormat(this.info.formats, { quality: selectedItagAudio });

  //   this.setupStreams(videoFormat, audioFormat);
  //   this.setupFFmpegProcess();
  // }

  // setupStreams(videoFormat, audioFormat) {
  //   this.videoDownloadStream = ytdl.downloadFromInfo(this.info, { format: videoFormat });
  //   this.audioDownloadStream = ytdl.downloadFromInfo(this.info, { format: audioFormat });

  //   this.videoDownloadStream.on('response', () => console.log("Video download has started"));
  //   this.audioDownloadStream.on('response', () => console.log("Audio download has started"));

  //   this.videoDownloadStream.pipe(this.videoPausable);
  //   this.audioDownloadStream.pipe(this.audioPausable);
  // }

  // setupFFmpegProcess() {
  //   this.ffmpegProcess = cp.spawn(ffmpegPath, [
  //     '-y', '-loglevel', 'error', '-hide_banner',
  //     '-i', 'pipe:3', '-i', 'pipe:4',
  //     '-c:v', 'copy', '-c:a', 'aac', '-strict', 'experimental',
  //     `${this.outputFilePath}`
  //   ], {
  //     windowsHide: true,
  //     stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe']
  //   });

  //   this.ffmpegProcess.on('spawn', () => console.log("FFmpeg processing has started"));
  //   this.videoPausable.pipe(this.ffmpegProcess.stdio[3]);
  //   this.audioPausable.pipe(this.ffmpegProcess.stdio[4]);
  // }


  initializeDownloadMP4() {
    // const { videoPausable, audioPausable } = downloadProgress[videoId];
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

    this.ffmpegProcess.on('spawn', async() => {
      console.log("FFmpeg processing has started");

      // mainWindow.webContents.send('downloadComplete', { videoId: this.videoId, status: false });
      // const existingVideos = await getStoreAsync(videoList, 'videos') || {};
      // const updatedVideos = { [this.videoId]: this.videoDetails, ...existingVideos };
      // await setStoreAsync(videoList, 'videos', updatedVideos);
      // await syncHome();
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
        // mainWindow.webContents.send('downloadComplete', { videoId: this.videoId, status: true });
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
    // const { videoPausable, audioPausable } = downloadProgress[videoId];
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
      } else {
        console.log(`FFmpeg exited with code ${code} and signal ${signal}`);
      }
    });

    this.audioDownloadStream.on('progress', (_, downloaded, total) => {
      this.audioprogress = ((downloaded / total) * 100).toFixed(2);
      // console.log("Progress: ", this.audioprogress);
      // mainWindow.webContents.send('downloadProgress', { videoId: this.videoId, progress: this.audioprogress });
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
    // mainWindow.webContents.send('downloadProgress', { videoId: this.videoId, progress: minProgress });
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

  stop() {
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

    setTimeout(() => {
      if (fs.existsSync(this.outputFilePath)) {
        fs.unlinkSync(this.outputFilePath);
        console.log('File successfully deleted post-stop');
      }
    }, 3000);
    
  }
}

class TikTokDownloader extends VideoDownloader {
  constructor(url, videoId, format, quality, videoDetails, managerCallback) {
    super(url, videoId, format, quality, videoDetails); // Correctly call the superclass constructor
    this.directoryPath = "./videos";
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
      this.directoryPath = './videos'
      this.dataurl = data.video.noWatermark;
    }
    if (this.format === "mp3") {
      this.directoryPath = './videos/Audios'
      this.dataurl = data.music.play_url;
    }
    this.isDownloading = true;
    console.log(`Starting download for: ${this.videoId} - Format: ${this.format}`);
    this.initializeDownload();
  }

  initializeDownload() {
    this.outputFilePath = path.join(this.directoryPath, `${this.videoId}.${this.format}`);
    this.options = { method: 'GET', fileName: `${this.videoId}.${this.format}`, override: true };
    this.dl = new DownloaderHelper(this.dataurl, path.dirname(this.outputFilePath), this.options);

    this.dl.on('download', () => console.log('Download started'))
      .on('pause', () => console.log('Download paused'))
      .on('resume', () => console.log('Download resumed'))
      .on('stop', () => {
        console.log('Download stopped');
        this.isDownloading = false;
        this.managerCallback(this.videoId, 'delete');
      })
      .on('end', async() => {
        console.log('Download completed');
        this.isDownloading = false;
        await addMetadata(this.outputFilePath, this.videoId, 'tiktok', this.format, "COMPLETE", this.dataurl);
        this.managerCallback(this.videoId, 'delete');
      })
      .on('error', (err) => {
        console.error(`Download failed: ${err.message}`);
        this.isDownloading = false;
        this.managerCallback(this.videoId, 'delete');
      })
      .on('progress', (stats) => {
        const percent = stats.progress.toFixed(2);
        console.log(`Progress: ${percent}%`);
      });

    this.dl.start().catch(err => {
      console.error(`Download error for ${this.videoId}: ${err.message}`);
      this.isDownloading = false;
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

  stop() {
    if (!this.isDownloading) {
      console.log(`No active download to stop for video ID ${this.videoId}.`);
      return;
    }
    console.log(`Stopping download for: ${this.videoId}`);
    this.dl.stop();
    this.isDownloading = false;
  }
}

class GenericDownloader extends VideoDownloader {
  constructor(url, videoId, format, quality, videoDetails, managerCallback) {
    super(url, videoId, format, quality, videoDetails); // Correctly call the superclass constructor
    this.directoryPath = "./videos";
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
      .on('download', async() => {
        console.log('Download started');
      })
      .on('pause', () => console.log('Download paused'))
      .on('resume', () => console.log('Download resumed'))
      .on('stop', () => {
        console.log('Download stopped');
        this.isDownloading = false;
        this.managerCallback(this.videoId, 'delete');
      })
      .on('end', async() => {
        console.log('Download completed');
        this.isDownloading = false;
        await addMetadata(this.outputFilePath, this.videoId, 'generic', this.format, "COMPLETE", this.url);
        this.managerCallback(this.videoId, 'delete');
      })
      .on('error', (err) => {
        console.error(`Download failed: ${err.message}`);
        this.isDownloading = false;
        this.managerCallback(this.videoId, 'delete');
      })
      .on('progress', (stats) => {
        const percent = stats.progress.toFixed(2);
        console.log(`Progress: ${percent}%`);
      });

      this.dl.start().catch(err => {
      console.error(`Download error for ${this.videoId}: ${err.message}`);
      this.isDownloading = false;
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

  stop() {
    if (!this.isDownloading) {
      console.log(`No active download to stop for video ID ${this.videoId}.`);
      return;
    }
    console.log(`Stopping download for: ${this.videoId}`);
    this.dl.stop();
    this.isDownloading = false;
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
      this.videoDetails = await TikTokVideoDetails(url, format, quality);
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
      this.videoDetails = GenericVideoDetails(url, format, quality);
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

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function main() {
  const manager = new DownloadManager();
  console.log("Enter 'start' to download, 'pause', 'resume', or 'stop' to control:");

  rl.on('line', async (input) => {
    switch (input.trim()) {
      case '1':
        // let testURL = 'https://example.com/video.mp4';
        let genericURL = 'https://sample-videos.com/video321/mp4/480/big_buck_bunny_480p_10mb.mp4';
        // let tikvideoURL = "https://www.tiktok.com/@sew_mi____gurl/video/7356784739136605456?is_from_webapp=1&sender_device=pc";
        // let ytURL = "https://www.youtube.com/watch?v=ekPbZqPvCRA";

        await manager.createDownloader(genericURL, "mp4", "720p");
        break;
      case '2':
        manager.pauseDownload("ekPbZqPvCRA");
        break;
      case '3':
        manager.resumeDownload("ekPbZqPvCRA");
        break;
      case '4':
        manager.stopDownload("ekPbZqPvCRA");
        break;
      case '5':
        console.log(await getMetadata("./videos/12345.mp4"));
        break;
      default:
        console.log('Unknown command. Please use "start", "pause", "resume", or "stop".');
    }
  });
}

main();