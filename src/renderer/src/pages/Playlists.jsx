import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { FaPlayCircle, FaEllipsisV } from 'react-icons/fa';
import { useData } from '../DownloadContext';
const ipcRenderer = electron.ipcRenderer;

const useOutsideAlerter = (ref, onClose) => {
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [ref, onClose]);
};

const VideoCard = ({ video, index }) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  useOutsideAlerter(menuRef, () => setMenuVisible(false));

  const goToPlayListAlbum = (video) => {
    navigate('/album', { state: { video } });
  };

  // const handleDeletePlaylist = (e) => {
  //   console.log('deleteVideo');
  //   e.stopPropagation();
  //   ipcRenderer.send('deletePlaylist', { videoId: video.id });
  // };

  return (
    <div key={index}
      className="group relative bg-white rounded-lg bg-opacity-10 backdrop-filter backdrop-blur-lg w-full transition-transform duration-200 hover:scale-105 hover:shadow-xl border border-gray-300 cursor-pointer overflow-hidden"
      onClick={() => goToPlayListAlbum(video)}
      role="button"
    >
      <div className="relative">
        {/* Thumbnail Image */}
        <img src={video.thumbnailUrl} alt={video.title} className="rounded-lg w-full object-cover" />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

        {/* Playlist Details Overlay */}
        <div className="absolute bottom-0 p-4 w-full text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          {/* <p className="font-bold">{playlist.title}</p> */}
          <p>{video.items.length} Videos</p>
        </div>
      </div>

      <div className="p-2">
        <div className="flex items-center space-x-3 mt-2">
          <img src={video.authorPhoto} alt={video.author} className="h-10 w-10 rounded-full object-cover" />
          <span className="text-sm font-semibold text-gray-800">{video.author}</span>
        </div>
        <h3 className="text-md font-semibold mt-1 text-gray-900" style={{ minHeight: '4rem' }}>{video.title}</h3>
      </div>

      {/* Play Button Overlay */}
      {/* <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 group-hover:flex hidden">
        <FaPlayCircle className="text-gray text-6xl opacity-65" color="blue" />
      </div> */}

      {/* Option Menu Button */}
      <button
        className="absolute right-2 bottom-2 text-gray-600"
        onClick={(e) => {
          e.stopPropagation();
          setMenuVisible(!menuVisible);
        }}
      >
        <FaEllipsisV />
      </button>

      {/* Options Menu */}
      <div ref={menuRef}>
        {menuVisible && (
          <div className="absolute right-2 bottom-10 bg-white rounded-md shadow-lg">
            <ul>
              {/* <li className="px-4 py-2 hover:bg-gray-100 cursor-pointer" onClick={() => console.log("Play Video")}>Play All</li> */}
              {/* <li className="px-4 py-2 hover:bg-gray-100 cursor-pointer" onClick={() => handleDeletePlaylist}>Delete</li> */}

              <li className="px-4 py-2 hover:bg-gray-100 cursor-pointer" role="button"
                onClick={(e) => {
                  e.stopPropagation();
                  ipcRenderer.send('deletePlaylist', { playlistId: video.id });
                }}>Delete</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

function Playlists() {
  const [playlistURL, setVideoURL] = useState('');
  const [videoQuality, setVideoQuality] = useState('720p');
  const [renderedVideos, setRenderedVideos] = useState(null);
  const { playlists, loadingPlaylists } = useData();
  
  useEffect(() => {
    ipcRenderer.send('page', { page: 'PlayList' });
    return () => {
      ipcRenderer.removeAllListeners('page');
    };
  }, []);

  const renderSkeletonVideos = () => {
    return Array.from({ length: Object.keys(playlists).length ? Object.keys(playlists).length : 1 }).map((_, index) => (
      <div key={index} className="flex flex-col space-y-2">
        <Skeleton height={180} /> {/* Video thumbnail */}
        <Skeleton height={20} width={`60%`} /> {/* Video title */}
        <Skeleton height={20} width={`30%`} /> {/* Additional info */}
      </div>
    ));
  };

  // const renderPlaylists = () => {
  //   if (playlists && typeof playlists === 'object') {
  //     return Object.values(playlists).map((playlist, index) => (
  //       <VideoCard key={index} video={playlist} index={index} />
  //     ));
  //   }
  //   return null;
  // };

  useEffect(() => {
    if (!loadingPlaylists) {
      function renderPlaylists() {
        if (playlists && typeof playlists === 'object') {
          return Object.values(playlists).map((playlist, index) => (
            <VideoCard key={index} video={playlist} index={index} />
          ));
        }
        return null;
      }
      // Call renderVideos whenever `videos` changes
      setRenderedVideos(renderPlaylists());
    }
  }, [loadingPlaylists]); // Dependency array includes `videos` to react on its changes


  const sendURL = () => {
    if (playlistURL.trim() !== '') { // Check if the playlistURL is not empty
      ipcRenderer.send('downloadPlaylist', { url: playlistURL, quality: videoQuality }); // Send the trimmed playlistURL
      setVideoURL(''); // Clear the input field by setting playlistURL state to an empty string
    }
  };

  return (
    <div className='flex flex-col h-screen h-full items-center justify-center p-4 border-2 rounded-lg w-full'>
      <header className='w-full flex flex-col md:flex-row justify-between items-center mb-4 space-y-4 md:space-y-0'>
        <input
          type="text"
          value={playlistURL} // Bind input value to state
          onChange={(e) => setVideoURL(e.target.value)}
          placeholder="Enter Playlist URL to Download..."
          className="px-4 py-2 w-full border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 md:max-w-lg"
        />
        <div className="flex space-x-2">
          <select
            value={videoQuality}
            onChange={(e) => setVideoQuality(e.target.value)}
            className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
          >
            <option value="240p">240p</option>
            <option value="360p">360p</option>
            <option value="480p">480p</option>
            <option value="720p">720p</option>
            <option value="1080p">1080p</option>
          </select>
          <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none"
            onClick={sendURL}
          >
            Download
          </button>
        </div>
      </header>

      <div className='w-full border-t-2 border-gray-200 mb-4'></div>
      
      <main className='w-full flex-grow overflow-auto p-4'>
        {loadingPlaylists ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {renderSkeletonVideos()}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {renderedVideos}
          </div>
        )}
      </main>

      <footer className='w-full text-center pt-4'>
        <span className='text-gray-600'>{Object.keys(playlists).length} Playlists</span>
      </footer>

    </div>
  );
}

export default Playlists;
