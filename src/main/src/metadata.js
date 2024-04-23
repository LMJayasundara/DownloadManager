const fs = require('fs');
const cp = require('child_process');
const ffprobePath = require('ffprobe-static').path.replace('app.asar', 'app.asar.unpacked');
const ffmpegPath = require('ffmpeg-static').replace('app.asar', 'app.asar.unpacked');

// shoud add quality
export const addMetadata = async (filePath, videoId, type, format, status, url, size) => {
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
    `-metadata`, `size=${size}`
  ];

  if (format === "mp4") {
    ffmpegArgs.push('-c', 'copy');
    ffmpegArgs.push(metadataFilePath); // Output file
  } else if (format === "mp3") {
    ffmpegArgs.push('-c:a', 'copy');
    ffmpegArgs.push('-id3v2_version', '3');
    ffmpegArgs.push(metadataFilePath); // Output file
  } else {
    console.log("Unsupported format");
    return;
  }

  // Create and manage the FFmpeg process
  const ffmpegProcess = cp.spawn(ffmpegPath, ffmpegArgs, {
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

export function getMetadata(filePath) {
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