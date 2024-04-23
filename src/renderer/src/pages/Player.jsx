import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ReactPlayer from 'react-player';
import ReactMarkdown from 'react-markdown';
import { FaAngleDown, FaAngleUp, FaArrowLeft, FaTrash } from 'react-icons/fa';
import PlayerMP3 from "../assets/PlayerMP3.png";

const ipcRenderer = electron.ipcRenderer;

function Player() {
  const location = useLocation();
  const navigate = useNavigate();
  const video = location.state?.video;

  console.log("video.format: ", video.format);
  const videoPath = video.format === "mp4" ? `media-loader://${video.id}.mp4` : `media-loader://Audio/${video.id}.mp3`;
  const isAudio = video.format === "mp3";
  const defaultImage = PlayerMP3;  // Path to the default image to display for audio

  const [isExpanded, setIsExpanded] = useState(false);

  const videoContainerStyle = { height: isExpanded ? '60vh' : '75vh' };
  const descriptionStyle = {
    maxHeight: isExpanded ? '28vh' : '0',
    overflowY: 'auto',
    transition: 'max-height 0.3s ease'
  };

  const toggleDescription = () => {
    setIsExpanded(!isExpanded);
  };

  const handleDeleteVideo = () => {
    console.log('deleteVideo');
    ipcRenderer.send('deleteVideo', { videoId: video.id });
    navigate(-1);
  };

  return (
    <div className='flex flex-col h-screen justify-start p-4 border-2 rounded-lg overflow-hidden'>
      <div className='w-full flex justify-between items-center mb-4 px-4'>
        <button onClick={() => navigate(-1)} className='flex items-center text-gray-600'>
          <FaArrowLeft />
          <span className='ml-2'>Back</span>
        </button>
        <button onClick={handleDeleteVideo} className='flex items-center text-gray-600'>
          <FaTrash />
          <span className='ml-2'>Delete</span>
        </button>
      </div>

      <div className='flex-grow overflow-auto'>
        <div className='w-full' style={videoContainerStyle}>
          <ReactPlayer
            url={videoPath}
            playing={!isExpanded}
            controls
            width='100%'
            height='100%'
            light={isAudio ? defaultImage : false}  // Use the `light` property to display an image for audio
          />
        </div>

        <div className='w-full flex justify-between items-center px-4 mt-2'>
          <div className='flex'>
            <img src={video.authorPhoto || defaultImage} alt="Author" className="w-12 h-12 rounded-full mr-4" />
            <div>
              <h2 className='text-xl font-bold'>{video.title}</h2>
              <p className='text-sm'>{video.author}</p>
            </div>
          </div>
          <div className='text-center'>
            <p className='text-sm text-gray-600'>{video.date} {video.fileSizeMB ? `: ${video.fileSizeMB} mb` : ''}</p>
          </div>
          <div>
            <button onClick={() => setIsExpanded(!isExpanded)} className='flex items-center text-gray-600'>
              {isExpanded ? <FaAngleUp /> : <FaAngleDown />}
              <span className='ml-2'>{isExpanded ? 'Less' : 'More'}</span>
            </button>
          </div>
        </div>

        <div style={descriptionStyle} className={`w-full px-4 transition-max-height duration-300 ease-in-out ${isExpanded ? 'max-h-28vh' : 'max-h-0'} overflow-hidden`}>
          <ReactMarkdown className='text-gray-800 text-sm my-2'>
            {video.description}
          </ReactMarkdown>
        </div>

      </div>
    </div>
  );
}

export default Player;