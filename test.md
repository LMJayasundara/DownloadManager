I have bellow code works fine for download youtube video.  i want to intergrate it into tiktok video download and 3rd party video download as well. i got node-tiklydown repond as 

```
{
  "id": 123456789,
  "title": "Awesome TikTok Video",
  "created_at": "30 Jul 2023, 12:34 PM",
  "stats": {
    "likeCount": "1.2M",
    "commentCount": "36.5K",
    "shareCount": "500K",
    "playCount": "3M",
    "saveCount": "10.8K"
  },
  "images": [
    {
      "url": "https://example.com/image.jpg",
      "width": 640,
      "height": 480
    }
  ],
  "video": {
    "noWatermark": "https://example.com/video-nowatermark.mp4",
    "watermark": "https://example.com/video-watermark.mp4",
    "cover": "https://example.com/video-cover.jpg",
    "dynamic_cover": "https://example.com/video-dynamic-cover.jpg",
    "origin_cover": "https://example.com/video-origin-cover.jpg",
    "width": 1280,
    "height": 720,
    "durationFormatted": "3:20",
    "duration": 200,
    "ratio": "16:9"
  },
  "music": {
    "id": 987654321,
    "title": "Catchy Song",
    "author": "Awesome Artist",
    "cover_hd": "https://example.com/music-cover-hd.jpg",
    "cover_large": "https://example.com/music-cover-large.jpg",
    "cover_medium": "https://example.com/music-cover-medium.jpg",
    "cover_thumb": "https://example.com/music-cover-thumb.jpg",
    "durationFormatted": "2:45",
    "duration": 165,
    "play_url": "https://example.com/music-play.mp3"
  },
  "author": {
    "id": 123456,
    "name": "TikTokUser123",
    "unique_id": "tiktokuser123",
    "signature": "I'm TikTokUser123!",
    "avatar": "https://example.com/avatar-medium.jpg",
    "avatar_thumb": "https://example.com/avatar-thumb.jpg"
  }
}
```
and in 3rd party video i want to set defalut thumnail url and defalut author image and id as tittle and without any discription
when i send download commnd it shoud firsly idenety fy the what type of video url and then store the data in same format and if not data set as null or defalut images and then start download and when send pause shoud identy the video by id and pause and do resume or stop.

code:

```
const ytpl = require('ytpl');
const ytdl = require('ytdl-core');

export async function getVideoInfo(videoURL) {
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
        console.log("TikTok URL is valid and video found:", data.video.noWatermark);
        return true;
      } else {
        console.log("TikTok URL is valid but no watermark-free version available.");
        return false;
      }
    } catch (error) {
      if (error.response) {
        console.log("API Error:", error.response.status, error.response.data);
      } else if (error.request) {
        console.log("No response received from TikTok API");
      } else {
        console.log("Error while validating TikTok URL:", error.message);
      }
      return false;
    }
  };

  let downloadProgress = {};

  ipcMain.on('downloadVideo', async (event, obj) => {
    console.log("Video URL: ", obj.url);

    if (ytdl.validateURL(obj.url)) {
      console.log("Youtube Url");
      const info = await getVideoInfo(obj.url);

      if (!info) return;

      const videoId = info.id;
      if (!downloadProgress[videoId]) {
        try {
          const existingVideos = await getStoreAsync(videoList, 'videos') || {};

          // Create a new object with the latest video info as the first entry
          const updatedVideos = {
            [info.id]: info, // Add the latest video info
            ...existingVideos // Spread the existing videos after the new one
          };

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

          const data = { ...appInfo.store };
          // ytdl.getInfo(obj.url).then(info => {
          ytdl.getInfo(obj.url, { requestOptions: { headers: { "Cookie": data.cookie } } }).then(info => {
            // Setting up initial download state
            downloadProgress[videoId] = {
              videoprogress: 0,
              audioprogress: 0,
              isDownloading: true,
              videoPausable: new PausablePassThrough(),
              audioPausable: new PausablePassThrough(),
              ffmpegProcess: null
            };

            mainWindow.webContents.send('downloadComplete', { videoId, status: false });

            const { videoPausable, audioPausable } = downloadProgress[videoId];
            const { selectedItagVideo, selectedItagAudio } = selectFormat(info.formats, obj.quality);

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
                downloadProgress[videoId].isDownloading = false;
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
        } catch (error) {
          console.error(`Error updating video list:`, error);
          clearDownloadProgress(downloadProgress, videoId)
        }
      }
    }

    else if (await isValidTikTokUrl(obj.url)) {
      console.log("Tik-Tok Url");

      v1(obj.url).then(data => {
        const options = {
          method: 'GET',
          override: true,
          fileName: `${data.id}.mp4`
        };

        // Create a new DownloaderHelper instance with your URL and directory to save the file
        const dl = new DownloaderHelper(data.video.noWatermark, __dirname, options);

        // Setup readline interface for user commands
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });

        dl.start();
        dl.pause();
        dl.resume()
        dl.stop();

        // Log events related to the download process
        dl.on('download', () => console.log('Download started'))
          .on('pause', () => console.log('Download paused'))
          .on('resume', () => console.log('Download resumed'))
          .on('stop', () => console.log('Download stopped'))
          .on('end', () => {
            console.log('Download completed');
            rl.close(); // Ensure readline interface is closed after download completes
          })
          .on('error', (err) => console.error('Download failed:', err))
          .on('progress', (stats) => {
            const percent = stats.progress.toFixed(2);
            const speed = `${(stats.speed / 1024 / 1024).toFixed(2)} MB/s`;
            const downloaded = `${(stats.downloaded / 1024 / 1024).toFixed(2)} MB`;
            const total = `${(stats.total / 1024 / 1024).toFixed(2)} MB`;

            console.clear(); // Clears the console for a cleaner look
            console.log(`Download progress: ${percent}% [${downloaded}/${total}] at ${speed}`);
          });
      });
    }

    else {
      console.log("Another Url");

      const options = {
        method: 'GET',
        override: true,
        fileName: `${uuid.v4()}.mp4`
      };

      const dl = new DownloaderHelper(obj.url, __dirname, options);

      // Listen for user input to control the download
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      dl.start();
      dl.pause();
      dl.resume()
      dl.stop();

      // Log events
      dl.on('download', () => console.log('Download started'))
        .on('pause', () => console.log('Download paused'))
        .on('resume', () => console.log('Download resumed'))
        .on('stop', () => console.log('Download stopped'))
        .on('end', () => console.log('Download completed'))
        .on('error', (err) => console.error('Download failed:', err))
        .on('progress', (stats) => {
          const percent = stats.progress.toFixed(2);
          const speed = `${(stats.speed / 1024 / 1024).toFixed(2)} MB/s`;
          const downloaded = `${(stats.downloaded / 1024 / 1024).toFixed(2)} MB`;
          const total = `${(stats.total / 1024 / 1024).toFixed(2)} MB`;

          console.clear(); // Clears the console for a cleaner look, you might want to remove this in real scenarios
          console.log(`Download progress: ${percent}% [${downloaded}/${total}] at ${speed}`);
        });

    }
  });

  ipcMain.on('pauseVideo', (event, obj) => {
    const videoId = obj.videoId;
    if (downloadProgress[videoId] && downloadProgress[videoId].isDownloading) {
      downloadProgress[videoId].videoPausable.togglePause(true);
      downloadProgress[videoId].audioPausable.togglePause(true);
      mainWindow.webContents.send('downloadPaused', { videoId: videoId });
      console.log('Download paused for:', videoId);
    } else {
      console.log('Pause requested for non-active or non-existent download:', videoId);
    }
  });

  ipcMain.on('resumeVideo', (event, obj) => {
    const videoId = obj.videoId;
    if (downloadProgress[videoId] && downloadProgress[videoId].isDownloading) {
      downloadProgress[videoId].videoPausable.togglePause(false);
      downloadProgress[videoId].audioPausable.togglePause(false);
      mainWindow.webContents.send('downloadResumed', { videoId: videoId });
      console.log('Download resumed for:', videoId);
    } else {
      console.log('Resume requested for non-active or non-existent download:', videoId);
    }
  });

  ipcMain.on('stopVideo', async (event, obj) => {
    const videoId = obj.videoId;
    if (downloadProgress[videoId] && downloadProgress[videoId].isDownloading) {
      // // End the passthrough streams to avoid memory leaks
      // if (downloadProgress[videoId].videoPausable) {
      //   downloadProgress[videoId].videoPausable.end();
      // }
      // if (downloadProgress[videoId].audioPausable) {
      //   downloadProgress[videoId].audioPausable.end();
      // }
      // if (downloadProgress[videoId].ffmpegProcess) {
      //   downloadProgress[videoId].ffmpegProcess.kill('SIGINT'); // This sends SIGINT to ffmpeg to terminate it
      // }

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
```