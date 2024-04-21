// const fs = require('fs');
// const ytdl = require('ytdl-core');
// const cp = require('child_process');
// // const axios = require('axios');
// // const { app } = require('electron');
// const ffmpegPath = require('ffmpeg-static').replace("app.asar", "app.asar.unpacked");
// const Store = require('electron-store'); // Adjust this to your actual store import
// const store = new Store();

// // store.clear()

// // Utility Functions
// const createDirIfNotExist = (dirPath) => {
//   if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
// };

// const isYouTubeVideo = (url) => url.includes("youtube.com") || url.includes("youtu.be");

// const downloadThirdPartyVideo = async (url) => {
//   // Implement the logic for downloading third-party videos
// };

// function selectFormat(formats, desiredQuality) {
//   const availableItags = formats
//     .map((format) => format.itag)
//     .sort((a, b) => a - b);

//   let selectedItagVideo = 134; // Default video quality
//   let selectedItagAudio = 139; // Default audio quality

//   // Select video itag based on desired quality
//   if (desiredQuality === "1080p") {
//     selectedItagVideo = availableItags.includes(399) ? 399 :
//       availableItags.includes(137) ? 137 :
//       availableItags.includes(248) ? 248 :
//       availableItags.includes(136) ? 136 :
//       availableItags.includes(135) ? 135 : 134;
//   } else if (desiredQuality === "720p") {
//     selectedItagVideo = availableItags.includes(247) ? 247 :
//       availableItags.includes(136) ? 136 :
//       availableItags.includes(135) ? 135 : 134;
//   } else if (desiredQuality === "360p") {
//     selectedItagVideo = availableItags.includes(134) ? 134 :
//       availableItags.includes(133) ? 133 :
//       availableItags.includes(167) ? 167 : 168;
//   }

//   // Select audio itag based on availability
//   selectedItagAudio = availableItags.includes(140) ? 140 :
//     availableItags.includes(141) ? 141 :
//     availableItags.includes(139) ? 139 :
//     availableItags.includes(250) ? 250 : 251;

//   return { selectedItagVideo, selectedItagAudio };
// }

// async function mergeStreams(video, audio, outputPath) {
//   // Adapted merging logic using ffmpeg
//   const ffmpegProcess = cp.spawn(ffmpegPath, [
//     "-loglevel", "8", "-hide_banner",
//     "-progress", "pipe:3",
//     "-i", "pipe:4", "-i", "pipe:5",
//     "-map", "0:a", "-map", "1:v",
//     "-c:v", "copy", outputPath,
//   ], { windowsHide: true, stdio: ["inherit", "inherit", "inherit", "pipe", "pipe", "pipe"] });

//   audio.pipe(ffmpegProcess.stdio[4]);
//   video.pipe(ffmpegProcess.stdio[5]);

//   return new Promise((resolve, reject) => {
//     ffmpegProcess.on('close', () => {
//       resolve();
//     });
//     ffmpegProcess.on('error', reject);
//   });
// }

// // const downloadYouTubeVideo = async (downloadDirectory, url, quality) => {
// //   let videosBeingDownloaded;
// //   try {
// //     videosBeingDownloaded = store.get("videosBeingDownloaded") || [];
// //     if (videosBeingDownloaded.includes(url)) {
// //       console.log('Video is already being downloaded.');
// //       return;
// //     }

// //     const Cookie = store.get("cookie") || "";
// //     const info = await ytdl.getInfo(url, { requestOptions: { headers: { Cookie } } });
// //     const videoFilePath = `${downloadDirectory}/${info.videoDetails.videoId}.mp4`;

// //     if (fs.existsSync(videoFilePath)) {
// //       console.log('Video already exists.');
// //       return;
// //     }

// //     videosBeingDownloaded.push(url);
// //     store.set("videosBeingDownloaded", videosBeingDownloaded);
// //     const { selectedItagVideo, selectedItagAudio } = selectFormat(info.formats, quality);

// //     let videoProgress = 0;
// //     let audioProgress = 0;

// //     // Download video
// //     const video = ytdl.downloadFromInfo(info, {
// //       quality: selectedItagVideo,
// //       requestOptions: { headers: { Cookie } },
// //     }).on('progress', (_, downloaded, total) => {
// //       videoProgress = downloaded / total;
// //       updateOverallProgress();
// //     });

// //     // Download audio
// //     const audio = ytdl.downloadFromInfo(info, {
// //       quality: selectedItagAudio,
// //       requestOptions: { headers: { Cookie } },
// //     }).on('progress', (_, downloaded, total) => {
// //       audioProgress = downloaded / total;
// //       updateOverallProgress();
// //     });

// //     const updateOverallProgress = () => {
// //       // Use the minimum progress value between video and audio
// //       const overallProgress = Math.min(videoProgress, audioProgress) * 100;
// //       console.log(`Overall download progress: ${overallProgress.toFixed(2)}%`);
// //     };

// //     await mergeStreams(video, audio, videoFilePath);
// //     console.log("Download and processing complete.");

// //     // Remove URL from videosBeingDownloaded
// //     const updatedVideosBeingDownloaded = videosBeingDownloaded.filter(v => v !== url);
// //     store.set("videosBeingDownloaded", updatedVideosBeingDownloaded);
// //   } catch (error) {
// //     // console.error('Failed to download and process video:', error);
// //     console.error('Failed to download and process video:', error);
// //     // Ensure the URL is removed from videosBeingDownloaded even if an error occurs
// //     const updatedVideosBeingDownloaded = videosBeingDownloaded.filter(v => v !== url);
// //     store.set("videosBeingDownloaded", updatedVideosBeingDownloaded);
// //   }
// // };

// const downloadYouTubeVideo = async (downloadDirectory, url, quality) => {
//   try {
//     let downloadTracking = store.get("downloadTracking", {});
//     console.log("Download Tracking at the start:", downloadTracking); // Log at the start

//     const Cookie = store.get("cookie", "");
//     const info = await ytdl.getInfo(url, { requestOptions: { headers: { Cookie } } });
//     const videoId = info.videoDetails.videoId;
//     const videoFilePath = `${downloadDirectory}/${videoId}.mp4`;

//     // // Check if the video is already being downloaded or exists
//     // if (downloadTracking[url] && downloadTracking[url].progress < 100) {
//     //   console.log('Incomplete download found. Restarting download...');
//     //   // Attempt to delete the existing file
//     //   if (fs.existsSync(videoFilePath)) {
//     //     fs.unlinkSync(videoFilePath);
//     //     console.log('Existing incomplete file deleted.');
//     //   }
//     // } else if (fs.existsSync(videoFilePath)) {
//     //   console.log('Video already exists.');
//     //   return;
//     // }

//     const currentTime = Date.now();
//     if (downloadTracking[url] && downloadTracking[url].progress < 100) { 
//       if(currentTime - downloadTracking[url].lastUpdated > 5000) { // 5 seconds without update
//         console.log('Incomplete download found. Restarting download...');
//         if (fs.existsSync(videoFilePath)) {
//           fs.unlinkSync(videoFilePath);
//           console.log('Existing incomplete file deleted.');
//         }
//       } else {
//         console.log("Video is already being downloaded.");
//         return
//       }
//     } else if (fs.existsSync(videoFilePath)) {
//       console.log('Video already exists.');
//       return;
//     }

//     // Initialize or reset download tracking for the URL
//     downloadTracking[url] = { progress: 0, completed: false, lastUpdated: currentTime };
//     store.set("downloadTracking", downloadTracking);

//     const { selectedItagVideo, selectedItagAudio } = selectFormat(info.formats, quality);

//     let videoProgress = 0;
//     let audioProgress = 0;

//     const updateOverallProgress = () => {
//       const overallProgress = Math.min(videoProgress, audioProgress) * 100;
//       console.log(`Overall download progress: ${overallProgress.toFixed(2)}%`);
//       // downloadTracking[url].progress = overallProgress;
//       // downloadTracking[url].completed = false;
//       downloadTracking[url] = { progress: overallProgress, completed: false, lastUpdated: Date.now() };
//       store.set("downloadTracking", downloadTracking);
//       // console.log("Download Tracking during download:", downloadTracking); // Log during download
//     };

//     const video = ytdl.downloadFromInfo(info, {
//       quality: selectedItagVideo,
//       requestOptions: { headers: { Cookie } }
//     }).on('progress', (_, downloaded, total) => {
//       videoProgress = downloaded / total;
//       updateOverallProgress();
//     });

//     const audio = ytdl.downloadFromInfo(info, {
//       quality: selectedItagAudio,
//       requestOptions: { headers: { Cookie } }
//     }).on('progress', (_, downloaded, total) => {
//       audioProgress = downloaded / total;
//       updateOverallProgress();
//     });

//     await mergeStreams(video, audio, videoFilePath);

//     // Once download is complete, update tracking to mark completion
//     downloadTracking[url] = { progress: 100, completed: true };
//     store.set("downloadTracking", downloadTracking);
//     console.log("Download and processing complete.");

//     // Optionally, after successful download, remove URL from downloadTracking
//     delete downloadTracking[url];
//     store.set("downloadTracking", downloadTracking);
//     console.log("Download Tracking after deletion:", store.get("downloadTracking")); // Log after deletion

//   } catch (error) {
//     console.error('Failed to download and process video:', error);
//     // Consider your retry logic or error handling here
//   }
// };

// // Main Download Function
// const downloadVideo = async (url, quality = '360p') => {

//   // const userDataPath = app.getPath("userData");
//   // const directoryPath = `${userDataPath}/DownloadVideos`;
//   const directoryPath = `./DownloadVideos`;
//   createDirIfNotExist(directoryPath);

//   if (isYouTubeVideo(url)) {
//     await downloadYouTubeVideo(directoryPath, url, quality);
//   } else {
//     await downloadThirdPartyVideo(url);
//   }
// };

// // Example usage of downloadVideo
// downloadVideo('https://youtu.be/WhhMQlpGzdw&t', '720p')
//   .then(() => console.log('Download completed'))
//   .catch((error) => console.error('Download failed:', error));


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// const ytdl = require('ytdl-core');

// async function getVideoDetails(videoURL) {
//     try {
//         const info = await ytdl.getInfo(videoURL);
//         const details = {
//             title: info.videoDetails.title,
//             author: info.videoDetails.author.name,
//             description: info.videoDetails.description,
//             thumbnailUrl: info.videoDetails.thumbnails[info.videoDetails.thumbnails.length - 1].url, // Getting the highest quality thumbnail
//         };
//         console.log(details);
//     } catch (error) {
//         console.error('Error fetching video details:', error);
//     }
// }

// // Example usage with a YouTube video URL
// getVideoDetails('https://www.youtube.com/watch?v=5ChkQKUzDCs');


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const ytpl = require('ytpl');

async function getPlaylistDetails(playlistURL) {
  try {
    const details = await ytpl(playlistURL);
    return details; // Return the details to be used where the function is called
  } catch (error) {
    console.error('Error fetching playlist details:', error);
    throw error; // Rethrow the error if you need to handle it outside
  }
}

// Example usage
getPlaylistDetails('https://www.youtube.com/watch?v=WhhMQlpGzdw&list=PLVAdpaiYtiTDEn7YjnGQx5bWq4K4sOexY')
  .then(details => console.log(details))
  .catch(error => console.error(error));

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// const ytpl = require('ytpl');
// const ytdl = require('ytdl-core');

// async function getVideoDescription(videoId) {
//   try {
//     const info = await ytdl.getBasicInfo(videoId);
//     return info.videoDetails.description;
//   } catch (error) {
//     console.error(`Error fetching video description for video ID ${videoId}:`, error);
//     return ''; // Return an empty string or some default message if the description cannot be fetched
//   }
// }

// async function getPlaylistDetails(playlistURL) {
//   try {
//     const details = await ytpl(playlistURL);
//     const itemsWithDescriptionsPromises = details.items.map(async (item) => {
//       const description = await getVideoDescription(item.id);
//       return {
//         title: item.title,
//         author: item.author.name,
//         description: description,
//         thumbnailUrl: item.bestThumbnail.url,
//       };
//     });
//     const itemsWithDescriptions = await Promise.all(itemsWithDescriptionsPromises);
//     return {
//       ...details,
//       items: itemsWithDescriptions,
//     };
//   } catch (error) {
//     console.error('Error fetching playlist details:', error);
//     throw error;
//   }
// }

// // Example usage
// getPlaylistDetails('https://www.youtube.com/watch?v=WhhMQlpGzdw&list=PLVAdpaiYtiTDEn7YjnGQx5bWq4K4sOexY')
//   .then(details => {
//     // Process or log the details with simplified items here
//     console.log(details);
//   })
//   .catch(error => console.error(error));

/////////////////////////////////////////////////////////////////////////

// const ytpl = require('ytpl');
// const ytdl = require('ytdl-core');

// async function getVideoDescription(videoId) {
//   try {
//     const info = await ytdl.getBasicInfo(videoId);
//     // Since you now also need tags and author photo, ensure these are included if available
//     const tags = info.videoDetails.keywords || []; // keywords can serve as tags
//     const authorPhoto = info.videoDetails.author.thumbnails ? info.videoDetails.author.thumbnails[0].url : ''; // Get the first thumbnail as author photo
//     return {
//       description: info.videoDetails.description,
//       tags: tags,
//       authorPhoto: authorPhoto
//     };
//   } catch (error) {
//     console.error(`Error fetching video description for video ID ${videoId}:`, error);
//     return {
//       description: '',
//       tags: [],
//       authorPhoto: ''
//     }; // Return an object with empty strings or arrays for each property if the description cannot be fetched
//   }
// }

// async function getPlaylistDetails(playlistURL) {
//   try {
//     const details = await ytpl(playlistURL);
//     const itemsWithDetailsPromises = details.items.map(async (item) => {
//       const { description, tags, authorPhoto } = await getVideoDescription(item.id);
//       return {
//         id: item.id,
//         title: item.title,
//         author: item.author.name,
//         description: description,
//         tags: tags,
//         authorPhoto: authorPhoto,
//         thumbnailUrl: item.bestThumbnail.url,
//       };
//     });
//     const itemsWithDetails = await Promise.all(itemsWithDetailsPromises);

//     return {
//       id: details.id,
//       title: details.title,
//       author: details.author.name,
//       description: details.description,
//       tags: details.tags,
//       authorPhoto: details.author.bestAvatar.url,
//       thumbnailUrl: details.bestThumbnail.url,
//       items: itemsWithDetails,
//     };
//   } catch (error) {
//     console.error('Error fetching playlist details:', error);
//     throw error;
//   }
// }

// // Example usage
// getPlaylistDetails('https://www.youtube.com/playlist?list=PLVAdpaiYtiTDEn7YjnGQx5bWq4K4sOexY')
//   .then(details => {
//     // Process or log the details with simplified items here
//     console.log(details);
//   })
//   .catch(error => console.error(error));

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// const { DownloaderHelper } = require('node-downloader-helper');
// const dl = new DownloaderHelper('https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_10mb.mp4', __dirname);

// dl.on('end', () => console.log('Download Completed'));
// dl.on('error', (err) => console.log('Download Failed', err));
// dl.start().catch(err => console.error(err));

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// const { MediaInfo } = require('mediainfo-node');
// const mediaInfo = new MediaInfo();

// async function get(){
//   const data = await mediaInfo.getInfo('https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_10mb.mp4');
//   console.log(JSON.stringify(data, null, 2));
// }

// get()

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// const readline = require('readline');
// const { DownloaderHelper } = require('node-downloader-helper');
// const zlib = require('zlib');

// const options = {
//   method: 'GET'
// };

// // Create a new DownloaderHelper instance with your URL and options
// // const dl = new DownloaderHelper('https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_10mb.mp4', __dirname, options);
// const dl = new DownloaderHelper('https://vt.tiktok.com/ZS84BnrU9', __dirname, options);

// // Listen for user input to control the download
// const rl = readline.createInterface({
//     input: process.stdin,
//     output: process.stdout
// });

// console.log('Press 1 to start, 2 to pause, 3 to resume, 0 to stop the download');

// rl.on('line', (input) => {
//     switch (input.trim()) {
//         case '1':
//             dl.start();
//             break;
//         case '2':
//             dl.pause();
//             console.log('Download is not in progress');
//             break;
//         case '3':
//             dl.resume()
//             console.log('Download is not paused');
//             break;
//         case '0':
//             dl.stop();
//             break;
//         default:
//             console.log('Invalid input');
//     }
// });

// // Log events
// dl.on('download', () => console.log('Download started'))
//   .on('pause', () => console.log('Download paused'))
//   .on('resume', () => console.log('Download resumed'))
//   .on('stop', () => console.log('Download stopped'))
//   .on('end', () => console.log('Download completed'))
//   .on('error', (err) => console.error('Download failed:', err))
//   .on('progress', (stats) => {
//       const percent = stats.progress.toFixed(2);
//       const speed = `${(stats.speed / 1024 / 1024).toFixed(2)} MB/s`;
//       const downloaded = `${(stats.downloaded / 1024 / 1024).toFixed(2)} MB`;
//       const total = `${(stats.total / 1024 / 1024).toFixed(2)} MB`;

//       console.clear(); // Clears the console for a cleaner look, you might want to remove this in real scenarios
//       console.log(`Download progress: ${percent}% [${downloaded}/${total}] at ${speed}`);
//   });

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// const fs = require('fs');
// const ytdl = require('ytdl-core');
// const readline = require('readline');
// const ffmpegPath = require("ffmpeg-static");

// const videoURL = 'https://www.youtube.com/watch?v=5ChkQKUzDCs'; // Replace with your video URL

// // Initialize readline interface
// const rl = readline.createInterface({
//     input: process.stdin,
//     output: process.stdout
// });

// // Start downloading the video
// let downloaded = 0;
// let totalSize = 0;

// const videoStream = ytdl(videoURL, { quality: 134 });
// const writeStream = videoStream.pipe(fs.createWriteStream('downloaded_video.mp4'));

// videoStream.on('progress', (chunkLength, downloadedBytes, totalBytes) => {
//     downloaded += chunkLength;
//     totalSize = totalBytes;
//     const percent = (downloaded / totalBytes * 100).toFixed(2);
//     process.stdout.clearLine();
//     process.stdout.cursorTo(0);
//     process.stdout.write(`Downloading... ${percent}%`);
// });

// console.log('Download started. Press 2 to pause, 3 to resume, 0 to stop.');

// rl.on('line', (input) => {
//     switch (input.trim()) {
//         case '2': // Pause the download
//             videoStream.pause();
//             console.log('\nDownload paused.');
//             break;
//         case '3': // Resume the download
//             videoStream.resume();
//             console.log('Download resumed.');
//             break;
//         case '0': // Stop the download
//             writeStream.close(); // Close the write stream
//             videoStream.destroy(); // Destroy the source stream to stop downloading
//             console.log('\nDownload stopped.');
//             break;
//         default:
//             console.log('Invalid input.');
//     }
// });

// videoStream.on('end', () => {
//     console.log('\nDownload finished.');
// });

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// const fs = require('fs');
// const ytdl = require('ytdl-core');
// const cp = require('child_process');
// const readline = require('readline');
// const ffmpegPath = require("ffmpeg-static");

// const videoURL = 'https://www.youtube.com/watch?v=5ChkQKUzDCs'; // Replace with the actual YouTube video URL

// let ffmpegProcess;

// function downloadVideo() {
//   console.log('Starting download...');

//   ytdl.getInfo(videoURL).then(info => {
//     const format = ytdl.chooseFormat(info.formats, { quality: 247 });
//     const audioFormat = ytdl.chooseFormat(info.formats, { quality: 'highestaudio' });
//     const videoStream = ytdl.downloadFromInfo(info, { format: format });
//     const audioStream = ytdl.downloadFromInfo(info, { format: audioFormat });

//     ffmpegProcess = cp.spawn(ffmpegPath.replace("app.asar", "app.asar.unpacked"), [
//       '-y', '-loglevel', '8', '-hide_banner',
//       '-i', 'pipe:3', '-i', 'pipe:4',
//       '-map', '0:v', '-map', '1:a',
//       '-c', 'copy',
//       'output.mp4',
//     ], {
//       windowsHide: true,
//       stdio: [
//         'inherit', 'inherit', 'inherit',
//         'pipe', 'pipe',
//       ],
//     });

//     videoStream.pipe(ffmpegProcess.stdio[3]);
//     audioStream.pipe(ffmpegProcess.stdio[4]);

//     videoStream.on('progress', (chunkLength, downloaded, total) => {
//       const downloadedMB = (downloaded / 1024 / 1024).toFixed(2);
//       const totalMB = (total / 1024 / 1024).toFixed(2);
//       console.clear();
//       console.log(`Video Download Progress: ${downloadedMB}MB of ${totalMB}MB`);
//     });

//     audioStream.on('progress', (chunkLength, downloaded, total) => {
//       const downloadedMB = (downloaded / 1024 / 1024).toFixed(2);
//       const totalMB = (total / 1024 / 1024).toFixed(2);
//       console.clear();
//       console.log(`Audio Download Progress: ${downloadedMB}MB of ${totalMB}MB`);
//     });

//     ffmpegProcess.on('exit', (code, signal) => {
//       console.log(`ffmpeg exited with code ${code} and signal ${signal}`);
//       console.log('Download completed.');
//       // Cleanup or reset operations here
//     });

//     videoStream.on('error', error => console.error('Video stream error:', error));
//     audioStream.on('error', error => console.error('Audio stream error:', error));
//     ffmpegProcess.on('error', error => console.error('ffmpeg process error:', error));

//   });
// }

// // function stopDownload() {
// //   if (ffmpegProcess) {
// //     ffmpegProcess.kill('SIGINT'); // Sends SIGINT to ffmpeg to terminate the process
// //     console.log('Download stopped.');
// //   }
// // }

// function stopDownload() {
//   if (ffmpegProcess) {
//       // Close the input streams to ffmpeg to prevent EPIPE errors
//       ffmpegProcess.stdio[3].end();
//       ffmpegProcess.stdio[4].end();

//       // Terminate the ffmpeg process
//       ffmpegProcess.kill('SIGINT');
//       console.log('Download stopped and ffmpeg process terminated.');
//   }
// }

// const rl = readline.createInterface({
//   input: process.stdin,
//   output: process.stdout
// });

// rl.on('line', (input) => {
//   switch (input.trim()) {
//     case '1': // Start the download
//       downloadVideo();
//       break;
//     case '2': // Stop the download
//       stopDownload();
//       break;
//     default:
//       console.log('Invalid command. Use "start" to begin download and "stop" to cancel.');
//   }
// });

// console.log('Type "start" to begin download or "stop" to cancel.');

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// const fs = require('fs');
// const ytdl = require('ytdl-core');
// const cp = require('child_process');
// const readline = require('readline');
// const ffmpegPath = require("ffmpeg-static").replace("app.asar", "app.asar.unpacked");
// const stream = require('stream');
// const util = require('util');

// // Define the PausablePassThrough class
// util.inherits(PausablePassThrough, stream.Transform);
// function PausablePassThrough(options) {
//   stream.Transform.call(this, options);
//   this.paused = false;
//   this.queuedCallbacks = [];
// }

// PausablePassThrough.prototype.togglePause = function (paused) {
//   this.paused = paused;
//   if (!this.paused) {
//     while (this.queuedCallbacks.length) {
//       this.queuedCallbacks.shift()();
//     }
//   }
// };

// PausablePassThrough.prototype._transform = function (chunk, encoding, cb) {
//   this.push(chunk);
//   if (this.paused) {
//     this.queuedCallbacks.push(cb);
//   } else {
//     cb();
//   }
// };

// let ffmpegProcess;
// let isDownloading = false;
// let videoPausable; // Move to a broader scope
// let audioPausable; // Move to a broader scope
// let outputFilePath = ''; // This will store the path of the output file being written by ffmpeg

// function formatBytes(bytes, decimals = 2) {
//   if (bytes === 0) return '0 Bytes';
//   const k = 1024;
//   const dm = decimals < 0 ? 0 : decimals;
//   const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
//   const i = Math.floor(Math.log(bytes) / Math.log(k));
//   return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
// }

// function downloadVideo(videoURL) {
//   outputFilePath = `${Date.now()}_output.mp4`;

//   if (isDownloading) {
//     console.log("A download is already in progress. Please wait for it to finish or stop it before starting a new one.");
//     return;
//   }

//   console.log('Starting download...');

//   ytdl.getInfo(videoURL).then(info => {
//     let videoDownloaded = 0, videoTotal = 0, audioDownloaded = 0, audioTotal = 0;

//     isDownloading = true;
//     const format = ytdl.chooseFormat(info.formats, { quality: 247 });
//     const audioFormat = ytdl.chooseFormat(info.formats, { quality: 'highestaudio' });

//     // Create download streams
//     const videoDownloadStream = ytdl.downloadFromInfo(info, { format: format });
//     const audioDownloadStream = ytdl.downloadFromInfo(info, { format: audioFormat });

//     // Attach progress event listeners directly to the download streams
//     // let videoDownloaded = 0;
//     videoDownloadStream.on('progress', (chunkLength, downloaded, total) => {
//       videoDownloaded = downloaded;
//       videoTotal = total;
//       // console.log(`Video Progress: ${formatBytes(videoDownloaded)} of ${formatBytes(total)}`);
//       displayProgress(videoDownloaded, videoTotal, audioDownloaded, audioTotal);
//     });

//     // let audioDownloaded = 0;
//     audioDownloadStream.on('progress', (chunkLength, downloaded, total) => {
//       audioDownloaded = downloaded;
//       audioTotal = total;
//       // console.log(`Audio Progress: ${formatBytes(audioDownloaded)} of ${formatBytes(total)}`);
//       displayProgress(videoDownloaded, videoTotal, audioDownloaded, audioTotal);
//     });

//     // Initialize these here instead of declaring new
//     videoPausable = new PausablePassThrough();
//     audioPausable = new PausablePassThrough();

//     // Now pipe the download streams through the PausablePassThrough streams
//     const videoStream = videoDownloadStream.pipe(videoPausable);
//     const audioStream = audioDownloadStream.pipe(audioPausable);
//     const videoID = "shan1996";

//     ffmpegProcess = cp.spawn(ffmpegPath, [
//       '-y', '-loglevel', '8', '-hide_banner',
//       '-i', 'pipe:3', '-i', 'pipe:4',
//       '-map', '0:v', '-map', '1:a',
//       '-c', 'copy',
//       '-movflags', 'use_metadata_tags',
//       '-metadata', `comment=${videoID}`, // Embedding custom ID into the video metadata
//       '-metadata', 'title=Your Title Here',
//       '-metadata', 'shan=Your Author Name',
//       `output.mp4`,
//     ], {
//       windowsHide: true,
//       stdio: [
//         'inherit', 'inherit', 'inherit',
//         'pipe', 'pipe',
//       ],
//     });

//     videoStream.pipe(ffmpegProcess.stdio[3]);
//     audioStream.pipe(ffmpegProcess.stdio[4]);

//     ffmpegProcess.on('exit', (code, signal) => {
//       console.log(`ffmpeg exited with code ${code} and signal ${signal}`);
//       console.log('Download completed or stopped.');
//       isDownloading = false;
//     });
//     ffmpegProcess.on('error', error => console.error('ffmpeg process error:', error));

//     videoStream.on('finish', () => console.log('Video download completed.'));
//     audioStream.on('finish', () => console.log('Audio download completed.'));

//     videoStream.on('error', error => console.error('Video stream error:', error));
//     audioStream.on('error', error => console.error('Audio stream error:', error));

//   }).catch(error => {
//     console.error('Failed to get video info:', error);
//     isDownloading = false;
//   });
// }

// function displayProgress(videoDownloaded, videoTotal, audioDownloaded, audioTotal) {
//   const videoProgress = ((videoDownloaded / videoTotal) * 100).toFixed(2);
//   const audioProgress = ((audioDownloaded / audioTotal) * 100).toFixed(2);
//   const overallProgress = Math.min(videoProgress, audioProgress).toFixed(2);

//   // console.log(`Video Progress: ${videoProgress}% of ${formatBytes(videoTotal)}`);
//   // console.log(`Audio Progress: ${audioProgress}% of ${formatBytes(audioTotal)}`);
//   console.log(`Overall Progress: ${overallProgress}%`);
// }

// function stopDownload() {
//   if (ffmpegProcess && isDownloading) {
//     ffmpegProcess.stdio[3].end();
//     ffmpegProcess.stdio[4].end();
//     ffmpegProcess.kill('SIGINT');
//     console.log('Download stopped and ffmpeg process terminated.');
//     isDownloading = false;
//   } else {
//     console.log('No download is currently in progress.');
//   }
// }

// function toggleDownloadPause(paused) {
//   if (!isDownloading) {
//     console.log("No download is in progress to pause or resume.");
//     return;
//   }
//   if (videoPausable && audioPausable) {
//     videoPausable.togglePause(paused);
//     audioPausable.togglePause(paused);
//     console.log(paused ? 'Download paused.' : 'Download resumed.');
//   } else {
//     console.log("Cannot toggle pause: Streams not initialized.");
//   }
// }

// const rl = readline.createInterface({
//   input: process.stdin,
//   output: process.stdout
// });

// console.log('Enter "1" to start download, "2" to stop, "pause" to pause, and "resume" to resume the download.');

// rl.on('line', (input) => {
//   switch (input.trim()) {
//     case '1':
//       const videoURL = 'https://www.youtube.com/watch?v=5ChkQKUzDCs'; // Example URL
//       downloadVideo(videoURL);
//       break;
//     case '2':
//       stopDownload();
//       break;
//     case '3':
//       toggleDownloadPause(true);
//       break;
//     case '4':
//       toggleDownloadPause(false);
//       break;
//     default:
//       console.log('Invalid command. Use "1" to start, "2" to stop, "pause" to pause, and "resume" to resume the download.');
//   }
// });

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// const fs = require('fs')
// const path = require('path')

// const filePath = path.join(process.cwd(), 'output.mp4')

// const fileStats = fs.statSync(filePath)

// console.log(fileStats);

//////////////////////////////////////////////////////////////////

// const path = require('path')
// const { getVideoMetadata } = require("@remotion/renderer");
// const filePath = path.join(process.cwd(), 'output.mp4')

// async function test() {
//   const data = await getVideoMetadata(
//     filePath,
//   );
//   console.log(data);
// }

// test()

// ///////////////////////////////////////////////////////////

// const cp = require('child_process');
// const ffprobePath = require('ffprobe-static').path.replace('app.asar', 'app.asar.unpacked');

// function getCustomVideoMetadata(videoFilePath) {
//     return new Promise((resolve, reject) => {
//         const args = [
//             '-v', 'error',                     // Hide all warnings
//             '-show_entries', 'format_tags=comment, title, shan', // Only show the comment tag in the format section
//             '-of', 'json',                     // Output format as JSON
//             videoFilePath                      // File to analyze
//         ];

//         const ffprobeProcess = cp.spawn(ffprobePath, args);

//         let output = '';
//         ffprobeProcess.stdout.on('data', (chunk) => {
//             output += chunk;  // Append the output
//         });

//         ffprobeProcess.stderr.on('data', (data) => {
//             console.error(`stderr: ${data}`); // Log any errors
//         });

//         ffprobeProcess.on('close', (code) => {
//             if (code !== 0) {
//                 reject(new Error(`ffprobe exited with code ${code}`));
//             } else {
//                 try {
//                     const parsedData = JSON.parse(output); // Parse the JSON output
//                     resolve(parsedData);
//                 } catch (e) {
//                     reject(new Error('Failed to parse ffprobe output: ' + e.message));
//                 }
//             }
//         });
//     });
// }

// // Example usage
// const videoFilePath = 'output.mp4';  // Adjust this to the correct output file path
// getCustomVideoMetadata(videoFilePath)
//     .then(metadata => console.log('Custom Metadata:', metadata))
//     .catch(error => console.error('Error reading metadata:', error));

////////////////////////////////////////////////////////////////////////////////////////////////////

// const { v1, v2 } = require("node-tiklydown");
// // const videoUrl = "https://www.tiktok.com/@sew_mi____gurl/video/7356784739136605456";
// const videoUrl = "https://vt.tiktok.com/ZS84BnrU9";

// v1(videoUrl).then(data => {
//   // Do something with the data
//   console.log(data);
// });

////////////////////////////////////////////////////////////////////////////////////////////////////

// const { v1, v2 } = require("node-tiklydown");
// const readline = require('readline');
// const { DownloaderHelper } = require('node-downloader-helper');
// const videoUrl = "https://www.tiktok.com/@sew_mi____gurl/video/7356784739136605456";

// v1(videoUrl).then(data => {
//   // // Do something with the data
//   // console.log(data);

//   // Extracted 'noWatermark' URL from your previous output data
//   // const videoUrl = 'https://v16m-default.akamaized.net/e2d2e2bbfde862958dd658a2d1afd10f/661c09b3/video/tos/alisg/tos-alisg-pve-0037c001/ocFWD3eGgQfPjXMIIjYSQM8RYCNAMIieLKPjIA/?a=0&bti=OHYpOTY0Zik3OjlmOm01MzE6ZDQ0MDo%3D&ch=0&cr=13&dr=0&lr=all&cd=0%7C0%7C0%7C&cv=1&br=618&bt=309&cs=0&ds=6&ft=pK~tdMZj8Zmo0fWbu-4jVk_Zr5WrKsd.&mime_type=video_mp4&qs=4&rc=aTg5OWU2OTU7ZDw1N2Y5aUBpanhoNXk5cm47cjMzODczNEBiXl9gY2MxXy4xYGI2Y2AyYSMxa29mMmRjbGBgLS1kMS1zcw%3D%3D&vvpl=1&l=20240414105152FDFE6291F5D8D916305D';

//   const options = {
//     method: 'GET',
//     fileName: `video-${data.id}.mp4`
//   };

//   // Create a new DownloaderHelper instance with your URL and directory to save the file
//   const dl = new DownloaderHelper(data.video.noWatermark, __dirname, options);

//   // Setup readline interface for user commands
//   const rl = readline.createInterface({
//     input: process.stdin,
//     output: process.stdout
//   });

//   console.log('Press 1 to start, 2 to pause, 3 to resume, 0 to stop the download');

//   // Listen for user input to control the download
//   rl.on('line', (input) => {
//     switch (input.trim()) {
//       case '1':
//         dl.start();
//         break;
//       case '2':
//         dl.pause();
//         console.log('Download paused');
//         break;
//       case '3':
//         dl.resume()
//         console.log('Download resumed');
//         break;
//       case '0':
//         dl.stop();
//         rl.close(); // Close the readline interface
//         break;
//       default:
//         console.log('Invalid input');
//     }
//   });

//   // Log events related to the download process
//   dl.on('download', () => console.log('Download started'))
//     .on('pause', () => console.log('Download paused'))
//     .on('resume', () => console.log('Download resumed'))
//     .on('stop', () => console.log('Download stopped'))
//     .on('end', () => {
//       console.log('Download completed');
//       rl.close(); // Ensure readline interface is closed after download completes
//     })
//     .on('error', (err) => console.error('Download failed:', err))
//     .on('progress', (stats) => {
//       const percent = stats.progress.toFixed(2);
//       const speed = `${(stats.speed / 1024 / 1024).toFixed(2)} MB/s`;
//       const downloaded = `${(stats.downloaded / 1024 / 1024).toFixed(2)} MB`;
//       const total = `${(stats.total / 1024 / 1024).toFixed(2)} MB`;

//       console.clear(); // Clears the console for a cleaner look
//       console.log(`Download progress: ${percent}% [${downloaded}/${total}] at ${speed}`);
//     });
// });

////////////////////////////////////////////////////////////////////////////////////////////////////

// const ytdl = require('ytdl-core');
// const { v1 } = require("node-tiklydown");
// const { DownloaderHelper } = require('node-downloader-helper');
// const axios = require('axios');

// async function isValidVideoUrl(url) {
//     try {
//         const response = await axios.head(url);
//         const contentType = response.headers['content-type'];

//         if (contentType.includes('video')) {
//             console.log("Valid video URL with content type:", contentType);
//             return true;
//         } else {
//             console.log("URL does not point to a video content, Content-Type:", contentType);
//             return false;
//         }
//     } catch (error) {
//         console.log("Error accessing URL:", error.message);
//         return false;
//     }
// }

// async function isValidTikTokUrl(url) {
//     try {
//         const data = await v1(url);
//         if (data.video && data.video.noWatermark) {
//             console.log("TikTok URL is valid and video found:", data.video.noWatermark);
//             return true;
//         } else {
//             console.log("TikTok URL is valid but no watermark-free version available.");
//             return false;
//         }
//     } catch (error) {
//         if (error.response) {
//             console.log("API Error:", error.response.status, error.response.data);
//         } else if (error.request) {
//             console.log("No response received from TikTok API");
//         } else {
//             console.log("Error while validating TikTok URL:", error.message);
//         }
//         return false;
//     }
// }

// async function validateUrl(url) {
//     if (ytdl.validateURL(url)) {
//         console.log("Valid YouTube URL");
//         return;
//     }
    
//     if (await isValidTikTokUrl(url)) {
//         return;
//     }

//     if (await isValidVideoUrl(url)) {
//         return;
//     }
    
//     console.log("URL is invalid or not supported");
// }

// // Example calls
// validateUrl('https://www.youtube.com/watch?v=ZzI9JE0i6Lc'); // YouTube
// validateUrl('https://www.tiktok.com/@sew_mi____gurl/video/7356784739136605456'); // TikTok
// validateUrl('https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_5mb.mp4'); // Generic Video

//////////////////////////////////////////

            // const data = { ...appInfo.store };
            // ytdl.getInfo(obj.url).then(info => {
            // ytdl.getInfo(url, { requestOptions: { headers: { "Cookie": data.cookie } } }).then(info => {
            //   // Setting up initial download state
            //   downloadProgress[videoId] = {
            //     videoprogress: 0,
            //     audioprogress: 0,
            //     isDownloading: true,
            //     videoPausable: new PausablePassThrough(),
            //     audioPausable: new PausablePassThrough(),
            //     ffmpegProcess: null,
            //     type: 'youtube',
            //     format: 'mp4'
            //   };

            //   mainWindow.webContents.send('downloadComplete', { videoId, status: false });

            //   const { videoPausable, audioPausable } = downloadProgress[videoId];
            //   const { selectedItagVideo, selectedItagAudio } = selectFormat(info.formats, quality);

            //   try {
            //     const format = ytdl.chooseFormat(info.formats, { quality: selectedItagVideo, requestOptions: { headers: { "Cookie": data.cookie } } });
            //     const audioFormat = ytdl.chooseFormat(info.formats, { quality: selectedItagAudio, requestOptions: { headers: { "Cookie": data.cookie } } });

            //     const videoDownloadStream = ytdl.downloadFromInfo(info, { format: format });
            //     const audioDownloadStream = ytdl.downloadFromInfo(info, { format: audioFormat });

            //     videoDownloadStream.on('progress', (chunkLength, downloaded, total) => {
            //       downloadProgress[videoId].videoprogress = ((downloaded / total) * 100).toFixed(2);
            //       updateProgress();
            //     });

            //     audioDownloadStream.on('progress', (chunkLength, downloaded, total) => {
            //       downloadProgress[videoId].audioprogress = ((downloaded / total) * 100).toFixed(2);
            //       updateProgress();
            //     });

            //     function updateProgress() {
            //       const minProgress = Math.min(downloadProgress[videoId].videoprogress, downloadProgress[videoId].audioprogress);
            //       mainWindow.webContents.send('downloadProgress', { videoId, progress: minProgress });
            //     }

            //     const outputFilePath = path.join(directoryPath, `${videoId}.mp4`);

            //     const ffmpegProcess = cp.spawn(ffmpegPath, [
            //       '-y', '-loglevel', 'error', '-hide_banner',
            //       '-i', 'pipe:3', '-i', 'pipe:4',
            //       '-map', '0:v', '-map', '1:a',
            //       '-c', 'copy',
            //       `${outputFilePath}`
            //     ], {
            //       windowsHide: true,
            //       // stdio: ['inherit', 'inherit', 'inherit', 'pipe', 'pipe']
            //       stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe']
            //     });

            //     ffmpegProcess.on('exit', (code, signal) => {
            //       if (downloadProgress.hasOwnProperty(videoId)) {
            //         downloadProgress[videoId].isDownloading = false;
            //       }
            //       ffmpegProcess.stdio[3].end();
            //       ffmpegProcess.stdio[4].end();
            //       console.log(`FFmpeg exited with code ${code} and signal ${signal}`);
            //       // mainWindow.webContents.send('downloadComplete', { videoId, status: 'Completed', code, signal });
            //       mainWindow.webContents.send('downloadComplete', { videoId, status: true });
            //       clearDownloadProgress(downloadProgress, videoId)
            //     });

            //     ffmpegProcess.on('error', error => {
            //       console.error('FFmpeg process error:', error);
            //       mainWindow.webContents.send('downloadError', { videoId, error: error.message });
            //       clearDownloadProgress(downloadProgress, videoId)
            //     });

            //     ffmpegProcess.on('close', (code) => {
            //       // console.log(`FFmpeg exited with code ${code}`);
            //       // if (code === 0) {
            //       //   console.log('Processing completed successfully, now safe to delete file if needed.');
            //       //   // Attempt to delete the file after a short delay
            //       //   setTimeout(() => {
            //       //     try {
            //       //       if (fs.existsSync(outputFilePath)) {
            //       //         fs.unlinkSync(outputFilePath);
            //       //         console.log('File successfully deleted');
            //       //       }
            //       //     } catch (error) {
            //       //       console.error('Error deleting file:', error);
            //       //     }
            //       //   }, 1000); // Delay file deletion to ensure no handles are left
            //       // }
            //       clearDownloadProgress(downloadProgress, videoId)
            //     });

            //     downloadProgress[videoId].ffmpegProcess = ffmpegProcess;
            //     videoDownloadStream.pipe(videoPausable).pipe(ffmpegProcess.stdio[3]);
            //     audioDownloadStream.pipe(audioPausable).pipe(ffmpegProcess.stdio[4]);

            //     videoDownloadStream.on('error', error => console.error('Video stream error:', error));
            //     audioDownloadStream.on('error', error => console.error('Audio stream error:', error));
            //     ffmpegProcess.on('error', error => console.error('ffmpeg process error:', error));

            //   } catch (error) {
            //     console.error('Download initiation failed:', error);
            //     mainWindow.webContents.send('downloadError', { videoId, error: error.message });
            //     clearDownloadProgress(downloadProgress, videoId)
            //   }
            // })


                        // const data = { ...appInfo.store };
            // ytdl.getInfo(url, { requestOptions: { headers: { "Cookie": data.cookie } } }).then(info => {
            //   // Setting up initial download state for MP3, similar to MP4 structure
            //   downloadProgress[videoId] = {
            //     videoprogress: 0,
            //     audioprogress: 0,
            //     isDownloading: true,
            //     videoPausable: null,
            //     audioPausable: new PausablePassThrough(),
            //     ffmpegProcess: null,
            //     type: 'youtube',
            //     format: 'mp3'  // Indicate this is an MP3 format
            //   };

            //   mainWindow.webContents.send('downloadComplete', { videoId, status: false });

            //   const { audioPausable } = downloadProgress[videoId];
            //   const audioFormat = ytdl.chooseFormat(info.formats, { quality: 'highestaudio', requestOptions: { headers: { "Cookie": data.cookie } } });
            //   const audioDownloadStream = ytdl.downloadFromInfo(info, { format: audioFormat });

            //   audioDownloadStream.on('progress', (chunkLength, downloaded, total) => {
            //     const progress = ((downloaded / total) * 100).toFixed(2);
            //     downloadProgress[videoId].audioprogress = progress;
            //     mainWindow.webContents.send('downloadProgress', { videoId, progress: progress });
            //   });

            //   const ffmpegProcess = cp.spawn(ffmpegPath, [
            //     '-y', '-loglevel', 'error', '-hide_banner',
            //     '-i', 'pipe:0',  // Input from the first pipe
            //     '-vn',  // No video
            //     '-ar', '44100',  // Set audio sample rate to 44.1 kHz
            //     '-ac', '2',  // Set audio channels to 2 (stereo)
            //     '-b:a', '192k',  // Bitrate for audio
            //     '-f', 'mp3',  // MP3 format
            //     outputFilePath
            //   ], {
            //     windowsHide: true,
            //     stdio: ['pipe', 'ignore', 'ignore', 'ignore']
            //   });

            //   ffmpegProcess.on('exit', (code, signal) => {
            //     downloadProgress[videoId].isDownloading = false;
            //     if (code === 0) {
            //       console.log('MP3 download and conversion complete');
            //       mainWindow.webContents.send('downloadComplete', { videoId, status: true });
            //     } else {
            //       console.log(`FFmpeg exited with code ${code} and signal ${signal}`);
            //     }
            //     clearDownloadProgress(downloadProgress, videoId);
            //   });

            //   ffmpegProcess.on('error', error => {
            //     console.error('FFmpeg process error:', error);
            //     clearDownloadProgress(downloadProgress, videoId);
            //   });

            //   audioDownloadStream.pipe(audioPausable).pipe(ffmpegProcess.stdio[0]);
            //   audioDownloadStream.on('error', error => {
            //     console.error('Audio stream error:', error);
            //     clearDownloadProgress(downloadProgress, videoId)
            //   });
            // }).catch(error => {
            //   console.error('Download initiation failed:', error);
            // });

            
    /////////////////////////////////////////////////////////////////////////////////////////////////////////////

    // if (videoType === 'youtube') {
    //   if (downloadformat === "mp4") {
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
    //         type: videoType,
    //         format: downloadformat
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
    //           downloadProgress[videoId].videoprogress = (downloaded / total) ? ((downloaded / total) * 100).toFixed(2) : 0;
    //           updateProgress();
    //         });

    //         audioDownloadStream.on('progress', (chunkLength, downloaded, total) => {
    //           downloadProgress[videoId].audioprogress = (downloaded / total) ? ((downloaded / total) * 100).toFixed(2) : 0;
    //           updateProgress();
    //         });

    //         function updateProgress() {
    //           if(downloadProgress[videoId].videoprogress && downloadProgress[videoId].audioprogress){
    //             const minProgress = Math.min(downloadProgress[videoId].videoprogress, downloadProgress[videoId].audioprogress);
    //             mainWindow.webContents.send('downloadProgress', { videoId, progress: minProgress });
    //           }
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
    //   } else if (downloadformat === "mp3") {
    //     const data = { ...appInfo.store };

    //     ytdl.getInfo(url, { requestOptions: { headers: { "Cookie": data.cookie } } }).then(info => {
    //       // Setting up initial download state for MP3, similar to MP4 structure
    //       downloadProgress[videoId] = {
    //         audioprogress: 0,
    //         isDownloading: true,
    //         audioPausable: new PausablePassThrough(),
    //         ffmpegProcess: null,
    //         type: videoType,
    //         format: downloadformat
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
    //   if (downloadformat === "mp4") {
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
    //       format: downloadformat
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
    //   } else if (downloadformat === "mp3") {
    //     const outputFilePath = path.join(directoryPath, `Audio/${videoId}.mp3`);
    //     const options = { method: 'GET', fileName: `${videoId}.mp3`, override: true };

    //     downloadProgress[videoId] = {
    //       isDownloading: true,
    //       dl: null,
    //       type: videoType,
    //       format: downloadformat
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
    //   if (downloadformat === "mp4") {
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
    //       format: downloadformat
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