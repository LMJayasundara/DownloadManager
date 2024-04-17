  // ipcMain.on('downloadVideo', async (event, obj) => {
  //   console.log("Video URL: ", obj.url);

  //   if (ytdl.validateURL(obj.url)) {
  //     console.log("Youtube Url");
  //     const info = await getVideoInfo(obj.url);

  //     if (!info) return;

  //     const videoId = info.id;
  //     if (!downloadProgress[videoId]) {
  //       try {
  //         const existingVideos = await getStoreAsync(videoList, 'videos') || {};

  //         // Create a new object with the latest video info as the first entry
  //         const updatedVideos = {
  //           [info.id]: info, // Add the latest video info
  //           ...existingVideos // Spread the existing videos after the new one
  //         };

  //         await setStoreAsync(videoList, 'videos', updatedVideos);
  //         await getStoreAsync(videoList, 'videos').then((response) => {
  //           if (response) {
  //             mainWindow.webContents.send('homeVideos', response);
  //           } else {
  //             mainWindow.webContents.send('homeVideos', {});
  //           }
  //         }).catch(error => {
  //           console.error(`Error reading video:`, error);
  //         });

  //         const data = { ...appInfo.store };
  //         // ytdl.getInfo(obj.url).then(info => {
  //         ytdl.getInfo(obj.url, { requestOptions: { headers: { "Cookie": data.cookie } } }).then(info => {
  //           // Setting up initial download state
  //           downloadProgress[videoId] = {
  //             videoprogress: 0,
  //             audioprogress: 0,
  //             isDownloading: true,
  //             videoPausable: new PausablePassThrough(),
  //             audioPausable: new PausablePassThrough(),
  //             ffmpegProcess: null
  //           };

  //           mainWindow.webContents.send('downloadComplete', { videoId, status: false });

  //           const { videoPausable, audioPausable } = downloadProgress[videoId];
  //           const { selectedItagVideo, selectedItagAudio } = selectFormat(info.formats, obj.quality);

  //           try {
  //             const format = ytdl.chooseFormat(info.formats, { quality: selectedItagVideo, requestOptions: { headers: { "Cookie": data.cookie } } });
  //             const audioFormat = ytdl.chooseFormat(info.formats, { quality: selectedItagAudio, requestOptions: { headers: { "Cookie": data.cookie } } });

  //             const videoDownloadStream = ytdl.downloadFromInfo(info, { format: format });
  //             const audioDownloadStream = ytdl.downloadFromInfo(info, { format: audioFormat });

  //             videoDownloadStream.on('progress', (chunkLength, downloaded, total) => {
  //               downloadProgress[videoId].videoprogress = ((downloaded / total) * 100).toFixed(2);
  //               updateProgress();
  //             });

  //             audioDownloadStream.on('progress', (chunkLength, downloaded, total) => {
  //               downloadProgress[videoId].audioprogress = ((downloaded / total) * 100).toFixed(2);
  //               updateProgress();
  //             });

  //             function updateProgress() {
  //               const minProgress = Math.min(downloadProgress[videoId].videoprogress, downloadProgress[videoId].audioprogress);
  //               mainWindow.webContents.send('downloadProgress', { videoId, progress: minProgress });
  //             }

  //             const outputFilePath = path.join(directoryPath, `${videoId}.mp4`);

  //             const ffmpegProcess = cp.spawn(ffmpegPath, [
  //               '-y', '-loglevel', 'error', '-hide_banner',
  //               '-i', 'pipe:3', '-i', 'pipe:4',
  //               '-map', '0:v', '-map', '1:a',
  //               '-c', 'copy',
  //               `${outputFilePath}`
  //             ], {
  //               windowsHide: true,
  //               // stdio: ['inherit', 'inherit', 'inherit', 'pipe', 'pipe']
  //               stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe']
  //             });

  //             ffmpegProcess.on('exit', (code, signal) => {
  //               downloadProgress[videoId].isDownloading = false;
  //               ffmpegProcess.stdio[3].end();
  //               ffmpegProcess.stdio[4].end();
  //               console.log(`FFmpeg exited with code ${code} and signal ${signal}`);
  //               // mainWindow.webContents.send('downloadComplete', { videoId, status: 'Completed', code, signal });
  //               mainWindow.webContents.send('downloadComplete', { videoId, status: true });
  //               clearDownloadProgress(downloadProgress, videoId)
  //             });

  //             ffmpegProcess.on('error', error => {
  //               console.error('FFmpeg process error:', error);
  //               mainWindow.webContents.send('downloadError', { videoId, error: error.message });
  //               clearDownloadProgress(downloadProgress, videoId)
  //             });

  //             ffmpegProcess.on('close', (code) => {
  //               // console.log(`FFmpeg exited with code ${code}`);
  //               // if (code === 0) {
  //               //   console.log('Processing completed successfully, now safe to delete file if needed.');
  //               //   // Attempt to delete the file after a short delay
  //               //   setTimeout(() => {
  //               //     try {
  //               //       if (fs.existsSync(outputFilePath)) {
  //               //         fs.unlinkSync(outputFilePath);
  //               //         console.log('File successfully deleted');
  //               //       }
  //               //     } catch (error) {
  //               //       console.error('Error deleting file:', error);
  //               //     }
  //               //   }, 1000); // Delay file deletion to ensure no handles are left
  //               // }
  //               clearDownloadProgress(downloadProgress, videoId)
  //             });

  //             downloadProgress[videoId].ffmpegProcess = ffmpegProcess;
  //             videoDownloadStream.pipe(videoPausable).pipe(ffmpegProcess.stdio[3]);
  //             audioDownloadStream.pipe(audioPausable).pipe(ffmpegProcess.stdio[4]);

  //             videoDownloadStream.on('error', error => console.error('Video stream error:', error));
  //             audioDownloadStream.on('error', error => console.error('Audio stream error:', error));
  //             ffmpegProcess.on('error', error => console.error('ffmpeg process error:', error));

  //           } catch (error) {
  //             console.error('Download initiation failed:', error);
  //             mainWindow.webContents.send('downloadError', { videoId, error: error.message });
  //             clearDownloadProgress(downloadProgress, videoId)
  //           }
  //         })
  //       } catch (error) {
  //         console.error(`Error updating video list:`, error);
  //         clearDownloadProgress(downloadProgress, videoId)
  //       }
  //     }
  //   }

  //   else if (await isValidTikTokUrl(obj.url)) {
  //     console.log("Tik-Tok Url");

  //     v1(obj.url).then(data => {
  //       const options = {
  //         method: 'GET',
  //         override: true,
  //         fileName: `${data.id}.mp4`
  //       };

  //       // Create a new DownloaderHelper instance with your URL and directory to save the file
  //       const dl = new DownloaderHelper(data.video.noWatermark, __dirname, options);

  //       // Setup readline interface for user commands
  //       const rl = readline.createInterface({
  //         input: process.stdin,
  //         output: process.stdout
  //       });

  //       dl.start();
  //       dl.pause();
  //       dl.resume()
  //       dl.stop();

  //       // Log events related to the download process
  //       dl.on('download', () => console.log('Download started'))
  //         .on('pause', () => console.log('Download paused'))
  //         .on('resume', () => console.log('Download resumed'))
  //         .on('stop', () => console.log('Download stopped'))
  //         .on('end', () => {
  //           console.log('Download completed');
  //           rl.close(); // Ensure readline interface is closed after download completes
  //         })
  //         .on('error', (err) => console.error('Download failed:', err))
  //         .on('progress', (stats) => {
  //           const percent = stats.progress.toFixed(2);
  //           const speed = `${(stats.speed / 1024 / 1024).toFixed(2)} MB/s`;
  //           const downloaded = `${(stats.downloaded / 1024 / 1024).toFixed(2)} MB`;
  //           const total = `${(stats.total / 1024 / 1024).toFixed(2)} MB`;

  //           console.clear(); // Clears the console for a cleaner look
  //           console.log(`Download progress: ${percent}% [${downloaded}/${total}] at ${speed}`);
  //         });
  //     });
  //   }

  //   else {
  //     console.log("Another Url");

  //     const options = {
  //       method: 'GET',
  //       override: true,
  //       fileName: `${uuid.v4()}.mp4`
  //     };

  //     const dl = new DownloaderHelper(obj.url, __dirname, options);

  //     // Listen for user input to control the download
  //     const rl = readline.createInterface({
  //       input: process.stdin,
  //       output: process.stdout
  //     });

  //     dl.start();
  //     dl.pause();
  //     dl.resume()
  //     dl.stop();

  //     // Log events
  //     dl.on('download', () => console.log('Download started'))
  //       .on('pause', () => console.log('Download paused'))
  //       .on('resume', () => console.log('Download resumed'))
  //       .on('stop', () => console.log('Download stopped'))
  //       .on('end', () => console.log('Download completed'))
  //       .on('error', (err) => console.error('Download failed:', err))
  //       .on('progress', (stats) => {
  //         const percent = stats.progress.toFixed(2);
  //         const speed = `${(stats.speed / 1024 / 1024).toFixed(2)} MB/s`;
  //         const downloaded = `${(stats.downloaded / 1024 / 1024).toFixed(2)} MB`;
  //         const total = `${(stats.total / 1024 / 1024).toFixed(2)} MB`;

  //         console.clear(); // Clears the console for a cleaner look, you might want to remove this in real scenarios
  //         console.log(`Download progress: ${percent}% [${downloaded}/${total}] at ${speed}`);
  //       });

  //   }
  // });


  //////////////////////////////////////////////////////////////////////////////////////////////////////

    // let downloadProgress = {};

  // ipcMain.on('downloadVideo', async (event, obj) => {
  //   console.log("Video URL: ", obj.url);
  //   console.log("Video Quality: ", obj.quality);
  //   const info = await getVideoInfo(obj.url);
  //   if (!info) return;

  //   try {
  //     const existingVideos = await getStoreAsync(videoList, 'videos') || {};
  //     // Create a new object with the latest video info as the first entry
  //     const updatedVideos = {
  //       [info.id]: info, // Add the latest video info
  //       ...existingVideos // Spread the existing videos after the new one
  //     };

  //     await setStoreAsync(videoList, 'videos', updatedVideos);
  //     await getStoreAsync(videoList, 'videos').then((response) => {
  //       if (response) {
  //         mainWindow.webContents.send('homeVideos', response);
  //       } else {
  //         mainWindow.webContents.send('homeVideos', {});
  //       }
  //     }).catch(error => {
  //       console.error(`Error reading video:`, error);
  //     });
  //   } catch (error) {
  //     console.error(`Error updating video list:`, error);
  //   }

  //   ytdl.getInfo(obj.url).then(info => {
  //     const videoId = info.videoDetails.videoId;

  //     // Ensure the downloadProgress object is properly initialized
  //     if (!downloadProgress[videoId]) {
  //       downloadProgress[videoId] = {
  //         videoProgress: 0,
  //         audioProgress: 0,
  //         overallProgress: 0,
  //         isDownloading: false,
  //         retries: 0,
  //         maxRetries: 3
  //       };
  //     }

  //     downloadProgress[videoId].isDownloading = true;
  //     downloadProgress[videoId].videoPausable = new PausablePassThrough();
  //     downloadProgress[videoId].audioPausable = new PausablePassThrough();

  //     async function startDownload(retryAttempt) {
  //       if (retryAttempt > downloadProgress[videoId].maxRetries) {
  //         console.error(`Max retries reached for videoId: ${videoId}`);
  //         mainWindow.webContents.send('downloadError', { videoId, error: 'Max retries reached' });
  //         return;
  //       }

  //       try {
  //         const format = ytdl.chooseFormat(info.formats, { quality: 'highestvideo' });
  //         const audioFormat = ytdl.chooseFormat(info.formats, { quality: 'highestaudio' });

  //         const videoDownloadStream = ytdl.downloadFromInfo(info, { format: format });
  //         const audioDownloadStream = ytdl.downloadFromInfo(info, { format: audioFormat });

  //         let videoTotal = 0, audioTotal = 0, videoDownloaded = 0, audioDownloaded = 0;

  //         videoDownloadStream.on('progress', (_, downloaded, total) => {
  //           videoDownloaded = downloaded;
  //           videoTotal = total;
  //           downloadProgress[videoId].videoProgress = (downloaded / total) * 100;
  //           updateProgress();
  //         });

  //         audioDownloadStream.on('progress', (_, downloaded, total) => {
  //           audioDownloaded = downloaded;
  //           audioTotal = total;
  //           downloadProgress[videoId].audioProgress = (downloaded / total) * 100;
  //           updateProgress();
  //         });

  //         function updateProgress() {
  //           const minProgress = Math.min(downloadProgress[videoId].videoProgress, downloadProgress[videoId].audioProgress);
  //           downloadProgress[videoId].overallProgress = minProgress;
  //           mainWindow.webContents.send('downloadProgress', { videoId, progress: minProgress });
  //         }

  //         const outputFilePath = path.join(directoryPath, `${videoId}.mp4`);
  //         const ffmpegProcess = cp.spawn(ffmpegPath, [
  //           '-y', '-loglevel', 'error', '-hide_banner',
  //           '-i', 'pipe:3', '-i', 'pipe:4',
  //           '-map', '0:v', '-map', '1:a',
  //           '-c', 'copy',
  //           outputFilePath
  //         ], {
  //           windowsHide: true,
  //           stdio: ['inherit', 'inherit', 'inherit', 'pipe', 'pipe']
  //         });

  //         ffmpegProcess.on('exit', (code, signal) => {
  //           if (code !== 0 || signal !== null) {
  //             console.log(`FFmpeg exited with code ${code} and signal ${signal}`);
  //             startDownload(retryAttempt + 1);  // Retry on failure
  //           } else {
  //             console.log(`FFmpeg processing completed successfully for ${videoId}`);
  //             mainWindow.webContents.send('downloadComplete', { videoId, status: 'Completed' });
  //           }
  //         });

  //         ffmpegProcess.on('error', error => {
  //           console.error('FFmpeg process error:', error);
  //           mainWindow.webContents.send('downloadError', { videoId, error: error.message });
  //           startDownload(retryAttempt + 1);  // Retry on process error
  //         });

  //         videoDownloadStream.pipe(downloadProgress[videoId].videoPausable).pipe(ffmpegProcess.stdio[3]);
  //         audioDownloadStream.pipe(downloadProgress[videoId].audioPausable).pipe(ffmpegProcess.stdio[4]);

  //         videoDownloadStream.on('error', error => {
  //           console.error('Video stream error:', error);
  //           startDownload(retryAttempt + 1);
  //         });

  //         audioDownloadStream.on('error', error => {
  //           console.error('Audio stream error:', error);
  //           startDownload(retryAttempt + 1);
  //         });

  //       } catch (error) {
  //         console.error('Download initiation failed:', error);
  //         mainWindow.webContents.send('downloadError', { videoId, error: error.message });
  //         startDownload(retryAttempt + 1);
  //       }
  //     }
  //     // Start the download process with 0 initial retries
  //     startDownload(0);
  //   })
  // });


  ////////////////////////////////////////////////////////////////////////////

    // ipcMain.on('stopVideo', async (event, obj) => {
  //   const videoId = obj.videoId;
  //   if (downloadProgress[videoId] && downloadProgress[videoId].isDownloading) {
  //     // // End the passthrough streams to avoid memory leaks
  //     // if (downloadProgress[videoId].videoPausable) {
  //     //   downloadProgress[videoId].videoPausable.end();
  //     // }
  //     // if (downloadProgress[videoId].audioPausable) {
  //     //   downloadProgress[videoId].audioPausable.end();
  //     // }
  //     // if (downloadProgress[videoId].ffmpegProcess) {
  //     //   downloadProgress[videoId].ffmpegProcess.kill('SIGINT'); // This sends SIGINT to ffmpeg to terminate it
  //     // }

  //     const videoFilePath = path.join(directoryPath, `${videoId}.mp4`);
  //     try {
  //       // Update the video list in the store
  //       const existingVideos = await getStoreAsync(videoList, 'videos') || {};
  //       if (existingVideos.hasOwnProperty(videoId)) {
  //         delete existingVideos[videoId];
  //         await setStoreAsync(videoList, 'videos', existingVideos);
  //         mainWindow.webContents.send('homeVideos', existingVideos);
  //       }

  //       // Delay to ensure all streams are closed and ffmpeg has terminated
  //       setTimeout(() => {
  //         try {
  //           if (fs.existsSync(videoFilePath)) {
  //             fs.unlinkSync(videoFilePath);
  //             console.log('File successfully deleted post-stop');
  //           }
  //           mainWindow.webContents.send('downloadStopped', { videoId });
  //         } catch (error) {
  //           console.error('Error handling stop video:', error);
  //           mainWindow.webContents.send('downloadError', { videoId, error: 'Failed to delete file after stopping' });
  //         }
  //       }, 1000);

  //       console.log('Download stopped and video file removed for:', videoId);
  //     } catch (error) {
  //       console.error('Error handling stop video:', error);
  //       mainWindow.webContents.send('downloadError', { videoId, error: 'Failed to update video list and delete file after stopping' });
  //     }
  //   } else {
  //     console.log('Stop requested for non-active or non-existent download:', videoId);
  //   }
  // });