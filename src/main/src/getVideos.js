const fs = require('fs').promises;
const ytdl = require('ytdl-core');
const path = require('path');

export async function getVideoDetailsFromFiles(directoryPath) {
  try {
    // Object to hold video ID, title, and thumbnail
    let videoDetails = {};

    // Read all files in the directory
    const files = await fs.readdir(directoryPath);

    // Filter for MP4 files if needed
    const videoFiles = files.filter(file => path.extname(file) === '.mp4');

    for (const file of videoFiles) {
      // Extract video ID from file name (assuming the entire name before .mp4 is the ID)
      const videoId = path.basename(file, '.mp4');

      // Get video info
      try {
        const info = await ytdl.getInfo(videoId);
        // Extracting thumbnail URL, you can choose different resolutions by changing 'high'
        const thumbnailUrl = info.videoDetails.thumbnails[info.videoDetails.thumbnails.length - 1].url;

        // Store videoId, title, and thumbnail URL
        videoDetails[videoId] = {
          id: videoId,
          title: info.videoDetails.title,
          thumbnailUrl: thumbnailUrl,
          description: info.videoDetails.description,
          tags: info.videoDetails.keywords,
          author: info.videoDetails.author.name,
          authorPhoto: info.videoDetails.author.thumbnails[0].url
        };
      } catch (error) {
        console.error(`Error getting info for video ID ${videoId}:`, error.message);
      }
    }

    return videoDetails;
  } catch (error) {
    console.error('Error reading directory or processing files:', error);
    return null;
  }
}