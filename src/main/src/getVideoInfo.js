const ytpl = require('ytpl');
const ytdl = require('ytdl-core');
const { v1 } = require("node-tiklydown");

export async function YoutubeVideoDetails(url, format, quality) {
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

export async function TikTokVideoDetails(url, format, quality, defaultAuthor, defaultThumbnail) {
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
      authorPhoto: info.author.avatar || defaultAuthor,
      thumbnailUrl: info.video.cover || defaultThumbnail
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

export function GenericVideoDetails(url, format, quality, defaultAuthor, defaultThumbnail) {
  return {
    id: urlHash(url),
    title: 'Generic Video',
    url: url,
    format: format,
    quality: quality,
    author: 'Unknown',
    description: '',
    tags: [],
    authorPhoto: defaultAuthor,
    thumbnailUrl: defaultThumbnail
  };
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

export async function PlaylistVideoDetails(playlistURL) {
  try {
    const details = await ytpl(playlistURL);
    const itemsWithDetailsPromises = details.items.map(async (item) => {
      const { description, tags, authorPhoto } = await getVideoDescription(item.id);
      return {
        id: item.id,
        title: item.title,
        format: "mp4",
        url: item.shortUrl,
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