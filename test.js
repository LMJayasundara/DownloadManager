const { v1 } = require("node-tiklydown");

async function validTikTokUrl(url) {
    try {
      const data = await v1(url);
      console.log("yyyyyyyyyyyyyyyy:", data);
      if (data.video && data.video.noWatermark) {
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