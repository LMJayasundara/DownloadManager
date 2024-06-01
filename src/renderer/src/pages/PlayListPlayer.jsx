import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ReactPlayer from 'react-player';
import ReactMarkdown from 'react-markdown';
import { FaArrowLeft, FaTrash, FaBars, FaTimes } from 'react-icons/fa';

function PlayListPlayer() {
  const location = useLocation();
  const navigate = useNavigate();
  const playlist = location.state?.video;
  const [selectedVideo, setSelectedVideo] = useState(playlist.items[0]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playMode, setPlayMode] = useState(location.state?.mode);
  const [shuffledPlaylist, setShuffledPlaylist] = useState([]);

  useEffect(() => {
    if (playMode === 'shuffle') {
      const shuffled = [...playlist.items].sort(() => 0.5 - Math.random());
      setShuffledPlaylist(shuffled);
      setSelectedVideo(shuffled[0]);
      setCurrentIndex(0);
    } else {
      setSelectedVideo(playlist.items[0]);
      setCurrentIndex(0);
    }
  }, [playMode, playlist.items]);

  const videoPath = `media-loader://${selectedVideo.id}.mp4`;

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const selectVideo = (video) => {
    const index = playMode === 'shuffle' ? shuffledPlaylist.findIndex(item => item.id === video.id) : playlist.items.findIndex(item => item.id === video.id);
    setSelectedVideo(video);
    setCurrentIndex(index);
  };

  const playNext = () => {
    const nextIndex = currentIndex + 1;
  
    if (playMode === 'normal') {
      if (nextIndex < playlist.items.length) {
        // Move to the next video if it's not the last one
        setSelectedVideo(playlist.items[nextIndex]);
        setCurrentIndex(nextIndex);
      } else {
        // Log or handle the end of the playlist in normal mode
        console.log('End of Playlist');
      }
    } else if (playMode === 'repeat') {
      // In repeat mode, loop back to the first video after the last one
      const repeatIndex = nextIndex % playlist.items.length;
      setSelectedVideo(playlist.items[repeatIndex]);
      setCurrentIndex(repeatIndex);
    } else if (playMode === 'shuffle') {
      // In shuffle mode, move through the shuffled playlist without looping
      if (nextIndex < shuffledPlaylist.length) {
        setSelectedVideo(shuffledPlaylist[nextIndex]);
        setCurrentIndex(nextIndex);
      } else {
        console.log('End of Playlist');
      }
    }
  };

  const handleVideoEnd = () => {
    playNext();
  };

  const handleVideoError = () => {
    console.log('Error playing video, moving to next.');
    playNext();
  };

  return (
    <div className="flex flex-col h-screen justify-start p-4 border-2 rounded-lg overflow-hidden">
      <div className='w-full flex justify-between items-center mb-4 px-4'>
        <button onClick={() => navigate(-1)} className='flex items-center text-gray-600'>
          <FaArrowLeft />
          <span className='ml-2'>Back</span>
        </button>
        {/* <button className='flex items-center text-gray-600 mr-10'>
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
            onEnded={handleVideoEnd}
            onError={handleVideoError}
            playing={true}
          />
        </div>

        <div className='w-full px-4 mt-2'>
          <img src={selectedVideo.authorPhoto || 'defaultImage'} alt="Author" className="w-12 h-12 rounded-full mr-4" />
          <div>
            <h2 className='text-xl font-bold'>{selectedVideo.title}</h2>
            <p className='text-sm'>{selectedVideo.author}</p>
            <p className='text-sm'>Date: {selectedVideo.date} | Size: {selectedVideo.fileSizeMB} MB</p>
          </div>
          {selectedVideo.description && (
            <div className='mt-2 bg-gray-100 p-3 rounded-lg'>
              <ReactMarkdown className='text-gray-800 text-sm'>
                {selectedVideo.description}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </div>

      <div className={`absolute top-0 right-0 h-full bg-gray-100 bg-opacity-90 ${isSidebarOpen ? 'w-64 opacity-100' : 'w-0 opacity-0'} overflow-hidden transition-all duration-300 z-10`}>
        <div className='p-4 sticky top-0 bg-gray-100 z-20'>
          <div className='flex justify-between items-center'>
            <h2 className='text-lg font-semibold'>Playlist</h2>
            <button onClick={toggleSidebar} className='text-gray-600'>
              {isSidebarOpen ? <FaTimes /> : <FaBars />}
            </button>
          </div>
          <div>
            <button onClick={() => setPlayMode('normal')}>Normal</button>
            <button onClick={() => setPlayMode('repeat')}>Repeat</button>
            <button onClick={() => setPlayMode('shuffle')}>Shuffle</button>
          </div>
        </div>
        <div className='overflow-auto h-[calc(100%-8rem)] p-4'>
          {(playMode === 'shuffle' ? shuffledPlaylist : playlist.items).map((video, index) => (
            <div
              key={index}
              className={`cursor-pointer p-2 rounded-lg ${currentIndex === index ? "bg-blue-500 text-white" : "text-black hover:text-white hover:bg-blue-700"} transition duration-150 ease-in-out my-2`}
              onClick={() => selectVideo(video)}
            >
              {video.title}
            </div>
          ))}
        </div>
        <div className='p-4 sticky bottom-0 bg-gray-100 z-20'>
          <div className='text-center'>{(playMode === 'shuffle' ? shuffledPlaylist.length : playlist.items.length)} Videos</div>
        </div>
      </div>

      {!isSidebarOpen && (
        <button className='absolute top-4 right-4 z-20' onClick={toggleSidebar}>
          <FaBars className='text-gray-600 text-2xl' />
        </button>
      )}
    </div>
  );
}

export default PlayListPlayer;
