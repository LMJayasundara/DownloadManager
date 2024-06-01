const ytpl = require('ytpl');
// const ytdl = require('ytdl-core');
const ytdl = require("@distube/ytdl-core");
const { v2 } = require("node-tiklydown");
const fs = require('fs');

export async function YoutubeVideoDetails(url, format, quality, filePath) {
  try {
    const agent = ytdl.createAgent(JSON.parse(fs.readFileSync(filePath)));

    const info = await ytdl.getInfo(url, { agent: agent });
    const details = {
      id: info.videoDetails.videoId + format,
      title: info.videoDetails.title,
      url: url,
      format: format,
      quality: quality,
      date: new Date(),
      type: 'youtube',
      author: info.videoDetails.author.name,
      description: info.videoDetails.description,
      tags: info.videoDetails.keywords,
      authorPhoto: info.videoDetails.author.thumbnails[0].url,
      thumbnailUrl: info.videoDetails.thumbnails[info.videoDetails.thumbnails.length - 1].url, // Getting the highest quality thumbnail
    };
    return details;
  } catch (error) {
    // console.error('Error fetching video details:', error);
    throw new Error("Failed to Fetch Video Details");
    // return null
  }
};

export async function TikTokVideoDetails(url, format, quality, defaultAuthor, defaultThumbnail) {
  try {
    const info = await v2(url);
    console.log(info.result);
    return {
      id: urlHash(url) + format,
      title: info.result.desc,
      url: url,
      format: format,
      quality: quality,
      date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      type: 'tiktok',
      author: info.result.author.nickname,
      description: '',
      tags: [],
      authorPhoto: info.result.author.avatar || defaultAuthor,
      thumbnailUrl: info.result.video ? info.result.video.cover : defaultThumbnail

    };
  } catch (error) {
    console.log(error);
    // console.error('Error fetching TikTok video details:', error);
    // return null;
    throw new Error("Failed to Fetch Video Details");
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

function extractInfo(url) {
  const domainPattern = /https?:\/\/([^\/]+)/;
  const namePattern = /([^\/]+)(?=\.\w+$)/;
  const formatPattern = /\.(\w+)$/; // Regex to capture file extension

  const domainMatch = url.match(domainPattern);
  const nameMatch = url.match(namePattern);
  const formatMatch = url.match(formatPattern); // Match the file extension

  let title = domainMatch ? domainMatch[1] : "Unknown";
  let name = nameMatch ? nameMatch[1] : "Unknown";
  let format = formatMatch ? formatMatch[1] : "mp4";

  // Replace underscores, hyphens, and certain characters with spaces in the name
  name = name.replace(/[%$3@_-]/g, ' ');

  // Remove separate words that are purely numeric
  name = name.split(' ').filter(part => !/^\d+$/.test(part)).join(' ');

  // Simplify title by extracting only the domain name, not subdomains
  title = title.replace(/www\./, '').split('.').slice(-2).join('.');

  return { title, name, format }; // Include format in the returned object
}


export function GenericVideoDetails(url, format, quality, defaultAuthor, defaultThumbnail) {
  try {
    const vidInfo = extractInfo(url);
    return {
      id: urlHash(url) + vidInfo.format,
      title: vidInfo.name,
      url: url,
      format: vidInfo.format,
      quality: quality,
      date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      type: 'generic',
      author: vidInfo.title,
      description: '',
      tags: [],
      authorPhoto: defaultAuthor,
      thumbnailUrl: defaultThumbnail
    };
  } catch (error) {
    throw new Error("Failed to Fetch Video Details");
  }
};


async function getVideoDescription(videoId) {
  try {
    const info = await ytdl.getBasicInfo(videoId);
    // Since you now also need tags and author photo, ensure these are included if available
    const tags = info.videoDetails.keywords || []; // keywords can serve as tags
    // const authorPhoto = info.videoDetails.author.thumbnails ? info.videoDetails.author.thumbnails[0].url : ''; // Get the first thumbnail as author photo
    let authorPhoto = "";
    if (info.videoDetails.author && info.videoDetails.author.thumbnails && info.videoDetails.author.thumbnails.length > 0) {
      authorPhoto = info.videoDetails.author.thumbnails[0].url;
    }
    
    return {
      description: info.videoDetails.description,
      tags: tags,
      authorPhoto: authorPhoto
    };
  } catch (error) {
    // console.error(`Error fetching video description for video ID ${videoId}:`, error);
    // return {
    //   description: '',
    //   tags: [],
    //   authorPhoto: ''
    // }; // Return an object with empty strings or arrays for each property if the description cannot be fetched
    throw new Error("Failed to Fetch Video Details");
  }
}

export async function PlaylistVideoDetails(playlistURL) {
  try {
    const details = await ytpl(playlistURL);
    const itemsWithDetailsPromises = details.items.map(async (item) => {
      const { description, tags, authorPhoto } = await getVideoDescription(item.id);
      return {
        id: item.id + "mp4",
        title: item.title,
        format: "mp4",
        url: item.shortUrl,
        date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        type: 'playlist',
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
    // console.error('Error fetching playlist details:', error);
    // throw error;
    throw new Error("Failed to Fetch Video Details");
  }
}