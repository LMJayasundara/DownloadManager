import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ReactPlayer from 'react-player';
import ReactMarkdown from 'react-markdown';
import { FaArrowLeft, FaTrash } from 'react-icons/fa';
import PlayerMP3 from "../assets/PlayerMP3.png";

const ipcRenderer = electron.ipcRenderer;

function Player() {
  const location = useLocation();
  const navigate = useNavigate();
  const video = location.state?.video;

  let videoPath = null;
  let isAudio = false;

  switch (video.format) {
    case "mp4":
      videoPath = `media-loader://${video.id}.mp4`;
      isAudio = false;
      break;

    case "mkv":
      videoPath = `media-loader://${video.id}.mp4`;
      isAudio = false;
      break;

    case "flv":
      videoPath = `media-loader://${video.id}.mp4`;
      isAudio = false;
      break;

    case "3gp":
      videoPath = `media-loader://${video.id}.mp4`;
      isAudio = false;
      break;

    case "mp3":
      videoPath = `media-loader://Audio/${video.id}.mp3`;
      isAudio = true;
      break;

    default:
      break;
  }

  // console.log(videoPath);
  // const videoPath = video.format === "mp4" ? `media-loader://${video.id}.mp4` : `media-loader://Audio/${video.id}.mp3`;
  // const isAudio = video.format === "mp3";
  const defaultImage = PlayerMP3;  // Path to the default image to display for audio

  const handleDeleteVideo = () => {
    ipcRenderer.send('deleteVideo', { videoId: video.id });
    navigate(-1);
  };

  const formatDateTime = (dateTime) => {
    const date = new Date(dateTime);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true }) + " on " + date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className='flex flex-col h-screen justify-start p-4 border-2 rounded-lg overflow-hidden'>
      <div className='w-full flex justify-between items-center mb-4 px-4'>
        <button onClick={() => navigate(-1)} className='flex items-center text-gray-600'>
          <FaArrowLeft />
          <span className='ml-2'>Back</span>
        </button>
        {/* <button onClick={handleDeleteVideo} className='flex items-center text-gray-600'>
          <FaTrash />
          <span className='ml-2'>Delete</span>
        </button> */}
      </div>

      <div className='flex-grow overflow-auto'>
        <div className='w-full' style={{ height: '75vh' }}>
          <ReactPlayer
            url={videoPath}
            controls
            width='100%'
            height='100%'
            light={isAudio ? defaultImage : false}
          />
        </div>

        <div className='w-full px-4 mt-2'>
          <img src={video.authorPhoto || defaultImage} alt="Author" className="w-12 h-12 rounded-full mr-4" />
          <div>
            <h2 className='text-xl font-bold'>{video.title}</h2>
            <p className='text-sm'>{video.author}</p>
            {/* Render tags if they exist */}
            {video.tags && video.tags.length > 0 && (
              <div className='text-sm text-gray-500 mt-1'>
                Tags: {video.tags.join(', ')}
              </div>
            )}
            <p className='text-sm'>{formatDateTime(video.date)} | Size: {video.fileSizeMB} MB</p>
          </div>
          {/* Check if description is not empty */}
          {video.description && video.description.trim() !== "" && (
            <div className='mt-2 bg-gray-100 p-3 rounded-lg'>
              <ReactMarkdown className='text-gray-800 text-sm'>
                {video.description}
              </ReactMarkdown>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default Player;