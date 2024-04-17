const { join } = require('path');
const path = require('path')
const cp = require('child_process');
const fs = require('fs');
const ytdl = require('ytdl-core');
const ffmpegPath = require('ffmpeg-static');
const stream = require('stream');
const util = require('util');

const { v1, v2 } = require("node-tiklydown");
const { DownloaderHelper } = require('node-downloader-helper');
const uuid = require("uuid");
const readline = require('readline');

let downloadProgress = {};
const directoryPath = "./videos";

async function getVideoInfo(videoURL) {
  try {
    const info = await ytdl.getInfo(videoURL);
    const details = {
      id: info.videoDetails.videoId,
      title: info.videoDetails.title,
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
    if (error.response) {
      console.log("API Error:", error.response.status, error.response.data);

      // delete downloadProgress[videoId];  // Cleanup
    } else if (error.request) {
      console.log("No response received from TikTok API");
    } else {
      console.log("Error while validating TikTok URL:", error.message);
    }
    return false;
  }
};

// Function to parse TikTok video details
async function parseTikTokVideo(url) {
  try {
    const data = await v1(url);
    return {
      id: data.id.toString(),
      title: data.title,
      author: data.author.name,
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
function defaultVideoDetails(url) {
  return {
    id: uuid.v4(),
    title: 'Generic Video',
    author: 'Unknown',
    description: '',
    tags: [],
    authorPhoto: "defaultAuthor",
    thumbnailUrl: "defaultThumbnail",
  };
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

async function downloadVideo(url, quality, type) {
  const videoType = await getVideoType(url);
  console.log(`Detected video type: ${videoType}`);
  let videoDetails;

  switch (videoType) {
    case 'youtube':
      videoDetails = await getVideoInfo(url);
      break;
    case 'tiktok':
      videoDetails = await parseTikTokVideo(url);
      break;
    case 'generic':
      videoDetails = defaultVideoDetails(url);
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

  // Download handling
  startDownload(videoId, url, videoType, quality, type);
};

async function startDownload(videoId, url, videoType, quality, type) {
  if (videoType === 'youtube') {
    if (type === "mp4") {
      const data = { cookie: "" };
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
            clearDownloadProgress(downloadProgress, videoId)
          });

          ffmpegProcess.on('error', error => {
            console.error('FFmpeg process error:', error);
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
          clearDownloadProgress(downloadProgress, videoId)
        }
      })
    } else {
      const data = { cookie: "" };

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

        const { audioPausable } = downloadProgress[videoId];
        const audioFormat = ytdl.chooseFormat(info.formats, { quality: 'highestaudio', requestOptions: { headers: { "Cookie": data.cookie } } });
        const audioDownloadStream = ytdl.downloadFromInfo(info, { format: audioFormat });

        audioDownloadStream.on('progress', (chunkLength, downloaded, total) => {
          downloadProgress[videoId].audioprogress = ((downloaded / total) * 100).toFixed(2);
          console.log(`Audio Download Progress: ${downloadProgress[videoId].audioprogress}%`);
        });

        const outputFilePath = path.join(directoryPath, `${videoId}.mp3`);
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
        audioDownloadStream.on('error', error => console.error('Audio stream error:', error));
      }).catch(error => {
        console.error('Download initiation failed:', error);
      });
    }
  }

  if (videoType === 'tiktok') {
    if (type === "mp4") {
      const outputFilePath = path.join(directoryPath, `${videoId}.mp4`);
      const options = { method: 'GET', fileName: `${videoId}.mp4`, override: true };

      downloadProgress[videoId] = {
        isDownloading: true,
        dl: null,
        type: videoType,
        format: 'mp4' 
      };

      // TikTok or generic
      const data = await v1(url);
      const dl = new DownloaderHelper(data.video.noWatermark, path.dirname(outputFilePath), options);
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
        })
        .on('error', (err) => {
          clearDownloadProgress(downloadProgress, videoId)
          console.error('Download failed:', err)
        })
        .on('progress', (stats) => {
          const percent = stats.progress.toFixed(2);
          console.log(percent);
        })
    } else {
      const outputFilePath = path.join(directoryPath, `${videoId}.mp3`);
      const options = { method: 'GET', fileName: `${videoId}.mp3`, override: true };

      downloadProgress[videoId] = {
        isDownloading: true,
        dl: null,
        type: videoType,
        format: 'mp3' 
      };

      // TikTok or generic
      const data = await v1(url);
      const dl = new DownloaderHelper(data.music.play_url, path.dirname(outputFilePath), options);
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
        })
        .on('error', (err) => {
          clearDownloadProgress(downloadProgress, videoId)
          console.error('Download failed:', err)
        })
        .on('progress', (stats) => {
          const percent = stats.progress.toFixed(2);
          console.log(percent);
        })
    }
  }

  if (videoType === 'generic') {
    if (type === "mp4") {
      const outputFilePath = path.join(directoryPath, `${videoId}.mp4`);
      const options = { method: 'GET', fileName: `${videoId}.mp4`, override: true };

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
      const dl = new DownloaderHelper(url, path.dirname(outputFilePath), options);
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
        })
        .on('error', (err) => {
          clearDownloadProgress(downloadProgress, videoId)
          console.error('Download failed:', err)
        })
        .on('progress', (stats) => {
          const percent = stats.progress.toFixed(2);
        })
    }

  }
}

function pauseVideo(videoId) {
  if (downloadProgress[videoId] && downloadProgress[videoId].isDownloading) {
    if (downloadProgress[videoId].type === 'youtube' && downloadProgress[videoId].format === 'mp4') {
      downloadProgress[videoId].videoPausable.togglePause(true);
      downloadProgress[videoId].audioPausable.togglePause(true);
    }
    else if (downloadProgress[videoId].type === 'youtube' && downloadProgress[videoId].format === 'mp3') {
      downloadProgress[videoId].audioPausable.togglePause(true);
    }
    else {
      downloadProgress[videoId].dl.pause();
    }
    console.log('Download paused for:', videoId);
  } else {
    console.log('Pause requested for non-active or non-existent download:', videoId);
  }
};

function resumeVideo(videoId) {
  if (downloadProgress[videoId] && downloadProgress[videoId].isDownloading) {
    if (downloadProgress[videoId].type === 'youtube' && downloadProgress[videoId].format === 'mp4') {
      downloadProgress[videoId].videoPausable.togglePause(false);
      downloadProgress[videoId].audioPausable.togglePause(false);
    }
    else if (downloadProgress[videoId].type === 'youtube' && downloadProgress[videoId].format === 'mp3') {
      downloadProgress[videoId].audioPausable.togglePause(false);
    }
    else {
      downloadProgress[videoId].dl.resume();
    }
    console.log('Download resumed for:', videoId);
  } else {
    console.log('Resume requested for non-active or non-existent download:', videoId);
  }
};

// function stopVideo(videoId) {
//   if (downloadProgress[videoId] && downloadProgress[videoId].isDownloading) {

//     const videoFilePath = path.join(directoryPath, `${videoId}.mp4`);

//     if (downloadProgress[videoId].type === 'youtube') {
//       if (downloadProgress[videoId].ffmpegProcess) {
//         downloadProgress[videoId].ffmpegProcess.stdio[3].end();
//         downloadProgress[videoId].ffmpegProcess.stdio[4].end();
//         downloadProgress[videoId].ffmpegProcess.kill('SIGINT');  // Safely terminate ffmpeg

//         // Close streams or use any other method to stop the download
//         downloadProgress[videoId].videoPausable.destroy();
//         downloadProgress[videoId].audioPausable.destroy();
//       }
//     } else {
//       downloadProgress[videoId].dl.stop();
//     }
//     console.log('Download stopped for:', videoId);
//     delete downloadProgress[videoId];  // Cleanup

//     // Delay to ensure all streams are closed and ffmpeg has terminated
//     setTimeout(() => {
//       try {
//         if (fs.existsSync(videoFilePath)) {
//           fs.unlinkSync(videoFilePath);
//           console.log('File successfully deleted post-stop');
//         }
//       } catch (error) {
//         console.error('Error handling stop video:', error);
//       }
//     }, 1000);

//   } else {
//     console.log('Stop requested for non-active or non-existent download:', videoId);
//   }
// };


const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.on('line', (input) => {
  let videoURL
  switch (input.trim()) {
    case '1':
      videoURL = 'https://www.youtube.com/watch?v=5ChkQKUzDCs';
      downloadVideo(videoURL, "720p", "mp3");
      break;
    case '2':
      videoURL = 'https://www.tiktok.com/@sew_mi____gurl/video/7356784739136605456';
      downloadVideo(videoURL, "720p", "mp3");
      break;
    case '3':
      videoURL = 'https://sample-videos.com/video321/mp4/480/big_buck_bunny_480p_5mb.mp4';
      downloadVideo(videoURL, "720p", "mp4");
      break;

    case '4':
      pauseVideo("7356784739136605000")
      break;
    case '5':
      resumeVideo("7356784739136605000")
      break;
    default:
      console.log('Invalid command. Use "1" to start, "2" to stop, "pause" to pause, and "resume" to resume the download.');
  }
});