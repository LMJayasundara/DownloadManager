const ytpl = require('ytpl');
const ytdl = require('ytdl-core');

export async function getVideoInfo(videoURL, format) {
    try {
        const info = await ytdl.getInfo(videoURL);
        const details = {
            id: info.videoDetails.videoId,
            title: info.videoDetails.title,
            format: format,
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

async function getVideoDescription(videoId) {
  try {
    const info = await ytdl.getBasicInfo(videoId);
    // Since you now also need tags and author photo, ensure these are included if available
    const tags = info.videoDetails.keywords || []; // keywords can serve as tags
    const authorPhoto = info.videoDetails.author.thumbnails ? info.videoDetails.author.thumbnails[0].url : ''; // Get the first thumbnail as author photo
    return {
      description: info.videoDetails.description,
      tags: tags,
      authorPhoto: authorPhoto
    };
  } catch (error) {
    console.error(`Error fetching video description for video ID ${videoId}:`, error);
    return {
      description: '',
      tags: [],
      authorPhoto: ''
    }; // Return an object with empty strings or arrays for each property if the description cannot be fetched
  }
}

export async function getPlaylistInfo(playlistURL) {
  try {
    const details = await ytpl(playlistURL);
    const itemsWithDetailsPromises = details.items.map(async (item) => {
      const { description, tags, authorPhoto } = await getVideoDescription(item.id);
      return {
        id: item.id,
        title: item.title,
        author: item.author.name,
        description: description,
        tags: tags,
        authorPhoto: authorPhoto,
        thumbnailUrl: item.bestThumbnail.url,
      };
    });
    const itemsWithDetails = await Promise.all(itemsWithDetailsPromises);

    return {
      id: details.id,
      url: playlistURL,
      title: details.title,
      author: details.author.name,
      description: details.description,
      tags: details.tags,
      authorPhoto: details.author.bestAvatar.url,
      thumbnailUrl: details.bestThumbnail.url,
      items: itemsWithDetails,
    };
  } catch (error) {
    console.error('Error fetching playlist details:', error);
    throw error;
  }
}