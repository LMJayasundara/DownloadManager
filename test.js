const { v2 } = require("node-tiklydown");

async function validTikTokUrl(url) {
  try {
    const data = await v2(url);
    console.log("yyyyyyyyyyyyyyyy:", data);
    if (data.status === 200) {
      return true;
    } else {
      console.log("TikTok URL is valid but no watermark-free version available.");
      return false;
    }
  } catch (error) {
    console.log(error);
    return false;
  }
};

validTikTokUrl("https://www.tiktok.com/@pouty_page/video/7371466110878731528?is_from_webapp=1&sender_device=pc")