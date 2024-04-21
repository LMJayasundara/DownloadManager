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
      syncHome();
    } else {
      console.log(`No download progress found for video ID: ${videoId} to clear.`);
    }
  };

  async function isValidTikTokUrl(url) {
    try {
      const data = await v1(url);
      if (data.video && data.video.noWatermark) {
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
        id: data.id.toString() + format,
        title: data.title,
        author: data.author.name,
        url: url,
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

  function simpleHash(url) {
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }

  // Generic video details as default
  function defaultVideoDetails(url, format) {
    // const id = await generateHashFromURL(url);
    return {
      id: simpleHash(url) + format,
      title: 'Generic Video',
      author: 'Unknown',
      url: url,
      format: format,
      description: '',
      tags: [],
      authorPhoto: defaultAuthor,
      thumbnailUrl: defaultThumbnail,
    };
  };

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
    // await getStoreAsync(videoList, 'videos').then((response) => {
    //   if (response) {
    //     mainWindow.webContents.send('homeVideos', response);
    //   } else {
    //     mainWindow.webContents.send('homeVideos', {});
    //   }
    // }).catch(error => {
    //   console.error(`Error reading video:`, error);
    // });
    await syncHome();

    // Download handling
    startDownload(videoId, url, videoType, quality, format);
  });

  const addMetadataMp4 = (filePath, videoId, type, format, status, url) => {
    const metadataFilePath = `${filePath}.temp.mp4`;

    const ffmpegProcess = cp.spawn(ffmpegPath.replace("app.asar", "app.asar.unpacked"), [
      '-y', '-loglevel', 'error', '-hide_banner',
      '-i', filePath,
      '-c', 'copy',
      '-movflags', 'use_metadata_tags',
      '-metadata', `videoId=${videoId}`,
      `-metadata`, `type=${type}`,
      `-metadata`, `format=${format}`,
      `-metadata`, `status=${status}`,
      `-metadata`, `url=${url}`,
      metadataFilePath
    ], {
      windowsHide: true
    });

    ffmpegProcess.on('close', (code) => {
      if (code === 0) {
        console.log('Metadata added successfully');
        fs.renameSync(metadataFilePath, filePath);
      } else {
        console.error(`Failed to add metadata, ffmpeg closed with code ${code}`);
      }
    });

    ffmpegProcess.stderr.on('data', (data) => {
      console.error(`FFmpeg Error: ${data}`);
    });
  };

  const addMetadataMp3 = (filePath, videoId, type, format, status, url) => {
    const metadataFilePath = `${filePath}.temp.mp3`;

    const ffmpegProcess = cp.spawn(ffmpegPath.replace("app.asar", "app.asar.unpacked"), [
      '-y', '-loglevel', 'error', '-hide_banner',
      '-i', filePath,
      '-c:a', 'copy',
      '-id3v2_version', '3',
      '-movflags', 'use_metadata_tags',
      '-metadata', `videoId=${videoId}`,
      `-metadata`, `type=${type}`,
      `-metadata`, `format=${format}`,
      `-metadata`, `status=${status}`,
      `-metadata`, `url=${url}`,
      metadataFilePath
    ], {
      windowsHide: true
    });

    ffmpegProcess.on('close', (code) => {
      if (code === 0) {
        console.log('Metadata added successfully');
        fs.renameSync(metadataFilePath, filePath);
      } else {
        console.error(`Failed to add metadata, ffmpeg closed with code ${code}`);
      }
    });

    ffmpegProcess.stderr.on('data', (data) => {
      console.error(`FFmpeg Error: ${data}`);
    });
  };

  async function startDownload(videoId, url, videoType, quality, downloadformat) {
    const data = { ...appInfo.store };
    let outputFilePath = null, options = null, datav1 = null, dl = null;
    switch (videoType) {
      case 'youtube':
        switch (downloadformat) {
          case "mp4":
            try {
              outputFilePath = path.join(directoryPath, `${videoId}.mp4`);
              const info = await ytdl.getInfo(url, { requestOptions: { headers: { "Cookie": data.cookie } } });
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
              const format = ytdl.chooseFormat(info.formats, { quality: selectedItagVideo, requestOptions: { headers: { "Cookie": data.cookie } } });
              const audioFormat = ytdl.chooseFormat(info.formats, { quality: selectedItagAudio, requestOptions: { headers: { "Cookie": data.cookie } } });

              const videoDownloadStream = ytdl.downloadFromInfo(info, { format: format });
              const audioDownloadStream = ytdl.downloadFromInfo(info, { format: audioFormat });

              videoDownloadStream.on('progress', (chunkLength, downloaded, total) => {
                if (downloadProgress[videoId]) {
                  downloadProgress[videoId].videoprogress = ((downloaded / total) * 100).toFixed(2);
                  updateProgress();
                }
              });

              audioDownloadStream.on('progress', (chunkLength, downloaded, total) => {
                if (downloadProgress[videoId]) {
                  downloadProgress[videoId].audioprogress = ((downloaded / total) * 100).toFixed(2);
                  updateProgress();
                }
              });

              function updateProgress() {
                if (downloadProgress[videoId].videoprogress && downloadProgress[videoId].audioprogress) {
                  const minProgress = Math.min(downloadProgress[videoId].videoprogress, downloadProgress[videoId].audioprogress);
                  mainWindow.webContents.send('downloadProgress', { videoId, progress: minProgress });
                }
              }

              const ffmpegProcess = cp.spawn(ffmpegPath.replace("app.asar", "app.asar.unpacked"), [
                '-y', '-loglevel', 'error', '-hide_banner',
                '-i', 'pipe:3', '-i', 'pipe:4',
                '-map', '0:v', '-map', '1:a',
                '-c', 'copy',
                '-movflags', 'use_metadata_tags',
                `-metadata`, `videoId=${videoId}`,
                `-metadata`, `type=youtube`,
                `-metadata`, `format=mp4`,
                `-metadata`, `status=START`,
                `-metadata`, `url=${url}`,
                `${outputFilePath}`
              ], {
                windowsHide: true,
                // stdio: ['inherit', 'inherit', 'inherit', 'pipe', 'pipe']
                stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe']
              });

              // ffmpegProcess.on('exit', async (code, signal) => {
              //   if (downloadProgress.hasOwnProperty(videoId)) {
              //     downloadProgress[videoId].isDownloading = false;
              //   }
              //   ffmpegProcess.stdio[3].end();
              //   ffmpegProcess.stdio[4].end();
              //   console.log(`FFmpeg exited with code ${code} and signal ${signal}`);
              //   // mainWindow.webContents.send('downloadComplete', { videoId, status: 'Completed', code, signal });
              //   mainWindow.webContents.send('downloadComplete', { videoId, status: true });
              //   clearDownloadProgress(downloadProgress, videoId)
              // });

              ffmpegProcess.on('exit', async (code, signal) => {
                if (code === 0) {
                  // If the initial ffmpeg process succeeds, start a second one to add completion metadata
                  const addMetadataProcess = cp.spawn(ffmpegPath.replace("app.asar", "app.asar.unpacked"), [
                    '-y', '-loglevel', 'error', '-hide_banner',
                    '-i', `${outputFilePath}`,
                    '-c', 'copy',
                    '-movflags', 'use_metadata_tags',
                    `-metadata`, `status=COMPLETE`,
                    `${outputFilePath}.temp.mp4`
                  ], {
                    windowsHide: true
                  });

                  addMetadataProcess.on('exit', (metadataCode, metadataSignal) => {
                    if (metadataCode === 0) {
                      fs.renameSync(`${outputFilePath}.temp.mp4`, `${outputFilePath}`);
                      console.log("Metadata added and file renamed successfully.");
                    } else {
                      console.log(`Metadata addition failed with code ${metadataCode}`);
                    }
                    // mainWindow.webContents.send('downloadComplete', { videoId, status: true });
                  });
                } else {
                  console.log(`Initial FFmpeg process failed with code ${code} and signal ${signal}`);
                  // mainWindow.webContents.send('downloadComplete', { videoId, status: false });
                }

                if (downloadProgress.hasOwnProperty(videoId)) {
                  downloadProgress[videoId].isDownloading = false;
                }
                ffmpegProcess.stdio[3].end();
                ffmpegProcess.stdio[4].end();

                mainWindow.webContents.send('downloadComplete', { videoId, status: true });
                clearDownloadProgress(downloadProgress, videoId)
              });

              ffmpegProcess.on('error', error => {
                console.error('FFmpeg process error:', error);
                mainWindow.webContents.send('downloadError', { videoId, error: error.message });
                clearDownloadProgress(downloadProgress, videoId)
              });

              ffmpegProcess.on('close', (code) => {
                console.log(`FFmpeg closed with code ${code}`);
                clearDownloadProgress(downloadProgress, videoId)
              });

              downloadProgress[videoId].ffmpegProcess = ffmpegProcess;
              videoDownloadStream.pipe(videoPausable).pipe(ffmpegProcess.stdio[3]);
              audioDownloadStream.pipe(audioPausable).pipe(ffmpegProcess.stdio[4]);

              videoDownloadStream.on('error', error => {
                console.log('Video stream error:', error);
                clearDownloadProgress(downloadProgress, videoId);
              });
              audioDownloadStream.on('error', error => {
                console.log('Audio stream error:', error)
                clearDownloadProgress(downloadProgress, videoId);
              });
              ffmpegProcess.on('error', error => {
                console.log('ffmpeg process error:', error)
                clearDownloadProgress(downloadProgress, videoId);
              });

              // And continue with your existing setup...
            } catch (error) {
              console.error('Error fetching video info:', error);
              mainWindow.webContents.send('downloadError', { videoId, error: error.message });
            }
            break;

          case "mp3":
            try {
              outputFilePath = path.join(directoryPath, `Audio/${videoId}.mp3`);
              const info = await ytdl.getInfo(url, { requestOptions: { headers: { "Cookie": data.cookie } } });

              // Setting up initial download state for MP3, similar to MP4 structure
              downloadProgress[videoId] = {
                videoprogress: 0,
                audioprogress: 0,
                isDownloading: true,
                videoPausable: null,
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
                if (downloadProgress[videoId]) {
                  const progress = ((downloaded / total) * 100).toFixed(2);
                  downloadProgress[videoId].audioprogress = progress;
                  mainWindow.webContents.send('downloadProgress', { videoId, progress: progress });
                }
              });

              const ffmpegProcess = cp.spawn(ffmpegPath.replace("app.asar", "app.asar.unpacked"), [
                '-y', '-loglevel', 'error', '-hide_banner',
                '-i', 'pipe:0',  // Input from the first pipe
                '-vn',  // No video
                '-ar', '44100',  // Set audio sample rate to 44.1 kHz
                '-ac', '2',  // Set audio channels to 2 (stereo)
                '-b:a', '192k',  // Bitrate for audio
                '-f', 'mp3',  // MP3 format
                '-movflags', 'use_metadata_tags',
                `-metadata`, `videoId=${videoId}`,
                `-metadata`, `type=youtube`,
                `-metadata`, `format=mp3`,
                `-metadata`, `status=START`,
                `-metadata`, `url=${url}`,
                outputFilePath
              ], {
                windowsHide: true,
                stdio: ['pipe', 'ignore', 'ignore', 'ignore']
              });

              ffmpegProcess.on('exit', (code, signal) => {
                downloadProgress[videoId].isDownloading = false;
                if (code === 0) {
                  console.log('MP3 download and conversion complete');
                  addMetadataMp3(outputFilePath, videoId, "mp3", 'youtube', "COMPLETE", url);
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

            } catch (error) {
              console.error('Error fetching Audio info:', error);
              mainWindow.webContents.send('downloadError', { videoId, error: error.message });
            }
            break;

          default:
            break;
        }
        break;

      case 'tiktok':
        switch (downloadformat) {
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
              type: 'tiktok',
              format: 'mp4'
            };

            // TikTok or generic
            datav1 = await v1(url);
            mainWindow.webContents.send('downloadComplete', { videoId, status: false });
            dl = new DownloaderHelper(datav1.video.noWatermark, path.dirname(outputFilePath), options);
            downloadProgress[videoId].dl = dl;
            addMetadataMp4(outputFilePath, videoId, 'tiktok', 'mp4', 'START', url);
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
                addMetadataMp4(outputFilePath, videoId, 'tiktok', 'mp4', 'COMPLETE', url);
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
              videoprogress: 0,
              audioprogress: 0,
              isDownloading: true,
              videoPausable: null,
              audioPausable: null,
              ffmpegProcess: null,
              dl: null,
              type: 'tiktok',
              format: 'mp3'
            };

            // TikTok or generic
            datav1 = await v1(url);
            mainWindow.webContents.send('downloadComplete', { videoId, status: false });
            dl = new DownloaderHelper(datav1.music.play_url, path.dirname(outputFilePath), options);
            downloadProgress[videoId].dl = dl;
            addMetadataMp3(outputFilePath, videoId, "mp3", 'tiktok', "START", url);
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
                clearDownloadProgress(downloadProgress, videoId);
                mainWindow.webContents.send('downloadComplete', { videoId, status: true });
                addMetadataMp3(outputFilePath, videoId, "mp3", 'tiktok', "COMPLETE", url);
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
        switch (downloadformat) {
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
              type: 'generic',
              format: 'mp4'
            };

            // TikTok or generic
            mainWindow.webContents.send('downloadComplete', { videoId, status: false });
            dl = new DownloaderHelper(url, path.dirname(outputFilePath), options);
            downloadProgress[videoId].dl = dl;
            addMetadataMp4(outputFilePath, videoId, 'generic', 'mp4', 'START', url);
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
                addMetadataMp4(outputFilePath, videoId, 'generic', 'mp4', 'COMPLETE', url);
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
            const winoptions = {
              type: 'error',
              buttons: ['Ok'],
              defaultId: 1,
              title: 'Not Support',
              message: 'Not Found MP3 Format',
            };
            dialog.showMessageBox(mainWindow, winoptions)
            break;

          default:
            break;
        }
        break;

      default:
        break;
    }
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
    // Show confirmation dialog before proceeding
    const confirm = await confirmDeletion(mainWindow);
    if (!confirm) {
      console.log('Deletion cancelled by the user.');
      return; // Exit if the user cancels
    }

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
