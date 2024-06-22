const { v2 } = require("node-tiklydown");
const url = "https://www.tiktok.com/@gearheadgastronome/video/7367273313363676423?is_from_webapp=1&sender_device=pc"

async function getdata(url) {
    try {
        const data = await v2(url);
        console.log(data);
        if (data.status === 200 && data.result) {
            const { video1, video2, video_hd } = data.result;
            const videoLink = video1 || video2 || video_hd || "No video link available";
            console.log(videoLink);
        } else {
            console.log("Failed to retrieve data or invalid response format");
        }
    } catch (error) {
        console.error("Error fetching data:", error);
    }
}

getdata(url);