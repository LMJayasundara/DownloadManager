import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ReactPlayer from 'react-player';
import ReactMarkdown from 'react-markdown';
import { FaArrowLeft, FaTrash, FaBars, FaTimes, FaAngleDown, FaAngleUp } from 'react-icons/fa';

function PlayListPlayer() {
  const location = useLocation();
  const navigate = useNavigate();
  const playlist = location.state?.video;
  const [selectedVideo, setSelectedVideo] = useState(playlist.items[0]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const videoPath = `media-loader://${selectedVideo.id}.mp4`;

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const selectVideo = (video) => {
    setSelectedVideo(video);
  };

  const toggleDescription = () => {
    setIsExpanded(!isExpanded);
  };

  const activeLinkClass = "bg-blue-500 text-white transition duration-150 ease-in-out";
  const inactiveLinkClass = "text-black hover:text-white hover:bg-blue-700 transition duration-150 ease-in-out";
  const videoContainerStyle = isExpanded ? { height: '60vh' } : {};
  const descriptionStyle = isExpanded ? { maxHeight: '28vh', overflowY: 'auto', transition: 'max-height 0.3s ease' } : { maxHeight: '0', overflowY: 'hidden', transition: 'max-height 0.3s ease' };
  const sidebarStyle = isSidebarOpen ? 'w-64 opacity-100' : 'w-0 opacity-0';
  const authorPhotoContainerStyle = { paddingTop: '10px' };

  return (
    <div className="flex flex-col h-screen justify-start p-4 border-2 rounded-lg overflow-hidden">
      {/* Header Section */}
      <div className='w-full flex justify-between items-center mb-4 px-4'>
        <button onClick={() => navigate(-1)} className='flex items-center text-gray-600'>
          <FaArrowLeft />
          <span className='ml-2'>Back</span>
        </button>
        <h1 className='text-xl font-bold'>Playlist Player</h1> {/* Example title */}
        <button className='flex items-center text-gray-600 mr-10'>
          <FaTrash />
          <span className='ml-2'>Delete</span>
        </button>
      </div>

      <div className='flex-grow overflow-auto'> {/* Make sure the rest of the content is scrollable if needed */}
        <div className='w-full' style={videoContainerStyle}>
          <ReactPlayer
            url={videoPath}
            playing={!isExpanded}
            controls
            width='100%'
            height='100%'
          />
        </div>

        <div className='w-full px-4' style={authorPhotoContainerStyle}>
          <div className='flex items-center'>
            <img src={selectedVideo.authorPhoto} alt="Author" className="w-12 h-12 rounded-full mr-4" />
            <div className='flex-grow'>
              <h2 className='text-xl font-bold'>{selectedVideo.title}</h2>
              <p className='text-sm'>{selectedVideo.author}</p>
            </div>
            <button onClick={toggleDescription} className='text-gray-600 ml-auto'>
              {isExpanded ? <FaAngleUp /> : <FaAngleDown />}
              <span className='ml-2'>{isExpanded ? 'Less' : 'More'}</span>
            </button>
          </div>
          <div style={descriptionStyle}>
            <ReactMarkdown className='text-gray-800 text-sm my-2'>
            {selectedVideo.description || ""}
            </ReactMarkdown>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className={`absolute top-0 right-0 h-full bg-gray-100 bg-opacity-90 ${sidebarStyle} overflow-hidden transition-all duration-300 z-10`}>
        {/* Fixed Sidebar Header */}
        <div className='p-4 sticky top-0 bg-gray-100 z-20'>
          <div className='flex justify-between items-center'>
            <h2 className='text-lg font-semibold'>Playlist</h2>
            <button onClick={toggleSidebar} className='text-gray-600'>
              {isSidebarOpen ? <FaTimes /> : <FaBars />}
            </button>
          </div>
        </div>
        {/* Scrollable Video List */}
        <div className='overflow-auto h-[calc(100%-8rem)] p-4'>
          {playlist.items.map((video, index) => (
            <div
              key={index}
              className={`cursor-pointer p-2 rounded-lg ${selectedVideo === video ? activeLinkClass : inactiveLinkClass} my-2`}
              onClick={() => selectVideo(video)}
            >
              {video.title}
            </div>
          ))}
        </div>
        {/* Fixed Sidebar Footer */}
        <div className='p-4 sticky bottom-0 bg-gray-100 z-20'>
          <div className='text-center'>
            {playlist.items.length} Videos
          </div>
        </div>
      </div>

      {/* Sidebar Toggle Button */}
      {!isSidebarOpen && (
        <button className='absolute top-4 right-4 z-20' onClick={toggleSidebar}>
          <FaBars className='text-gray-600 text-2xl' />
        </button>
      )}
    </div>
  );
}

export default PlayListPlayer;
