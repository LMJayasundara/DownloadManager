import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaArrowLeft, FaEllipsisV, FaPauseCircle, FaStopCircle, FaPlay } from 'react-icons/fa';
import { MdDownloadForOffline } from "react-icons/md";
import { useData } from '../DownloadContext';
const ipcRenderer = electron.ipcRenderer;

const VideoCard = ({ video, index, id }) => {
  const { downloadProgress, downloadComplete } = useData();
  const progress = downloadProgress[video.id];
  const completed = downloadComplete[video.id];
  const [menuVisible, setMenuVisible] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  function useOutsideAlerter(ref, onClose) {
    useEffect(() => {
      function handleClickOutside(event) {
        if (ref.current && !ref.current.contains(event.target)) {
          onClose();
        }
      }
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [ref, onClose]);
  }

  useOutsideAlerter(menuRef, () => setMenuVisible(false));

  const goToAlbum = () => {
    navigate('/player', { state: { video } });
  };

  const handlePauseResume = () => {
    const message = isPaused ? 'resumeVideo' : 'pauseVideo';
    ipcRenderer.send(message, { videoId: video.id });
    setIsPaused(!isPaused);
  };

  const handleStop = () => {
    ipcRenderer.send('stopVideo', { videoId: video.id });
  };

  function truncateTitle(title, maxWords) {
    const titleWords = title ? title.split(' ') : "";
    if (titleWords.length > maxWords) {
      return titleWords.slice(0, maxWords).join(' ') + '...';
    }
    return title;
  }

  function truncateAuthor(author, maxLength) {
    if (!author) return "";
    // Check if the author name has no spaces
    if (author.indexOf(' ') === -1 && author.length > maxLength) {
        return author.slice(0, maxLength) + '...';
    }
    return author;
  }

  const handleDownload = () => {
    console.log('Download requested for video ID:', video.id);
    ipcRenderer.send('downloadVideo', { url: video.url, quality: video.quality, format: video.format }); // Ensure these details are correct as per your requirements
  };

  return (
    <div key={index}
      className="relative bg-white rounded-lg bg-opacity-10 backdrop-filter backdrop-blur-lg space-y-4 w-full transition-transform duration-200 hover:scale-105 hover:shadow-lg border border-gray-300 group"
      onClick={goToAlbum}
      role="button"
    >
      <div className="relative group w-full bg-black rounded-lg overflow-hidden">
        <img src={video.thumbnailUrl}
          alt={video.title}
          className="rounded-lg w-full object-cover h-28 w-32" />

        <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        <div className="absolute bottom-0 p-4 w-full text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <p>{video.format === "mp4" ? "Video" : "Audio"}</p>
        </div>

        {progress && !completed && (
          <div className="absolute bottom-0 left-0 bg-green-500" style={{ width: `${progress}%`, height: '4px' }}></div>
        )}

        {/* {!completed && progress && progress < 100 && (
          <div className="absolute top-2 right-2 flex space-x-2">
            <button onClick={(e) => { e.stopPropagation(); handlePauseResume(); }}>
              {isPaused ? <FaPlay className="text-white" /> : <FaPauseCircle className="text-white" />}
            </button>
            <button onClick={(e) => { e.stopPropagation(); handleStop(); }}>
              <FaStopCircle className="text-white" />
            </button>
          </div>
        )} */}

        {video && !video.fileExist && (
          <div className="absolute top-2 left-2 flex space-x-2">
            <button onClick={(e) => { e.stopPropagation(); handleDownload(); }}>
              <MdDownloadForOffline className="text-white" />
            </button>
          </div>
        )}
      </div>

      <div className="p-2">
        <div className="flex items-center space-x-3 mt-2">
          <img src={video.authorPhoto} alt={video.author} className="h-10 w-10 rounded-full object-cover" />
          <span className="text-sm font-semibold">{truncateAuthor(video.author, 12)}</span>
        </div>
        <h3 className="text-md font-semibold mt-1" style={{ minHeight: '4rem' }}>{truncateTitle(video.title, 8)}</h3>
      </div>

      <button
        className="absolute right-2 bottom-2 text-gray-600"
        onClick={(e) => {
          e.stopPropagation();
          setMenuVisible(!menuVisible);
        }}
      >
        <FaEllipsisV />
      </button>

      <div ref={menuRef}>
        {menuVisible && (
          <div className="absolute right-0 bottom-10 bg-white rounded-md shadow-lg">
            <ul>
              <li className="px-4 py-2 hover:bg-gray-100 cursor-pointer" role="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/player', { state: { video } });
                }}>Play</li>
              <li className="px-4 py-2 hover:bg-gray-100 cursor-pointer" role="button"
                onClick={(e) => {
                  e.stopPropagation();
                  ipcRenderer.send('deletePlaylistVideo', { playlistId: id, videoId: video.id });
                }}>Delete</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

function Album() {
  const navigate = useNavigate();
  const location = useLocation();
  const playlist = location.state?.video;
  const videos = playlist.items;
  const [filteredVideos, setFilteredVideos] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  // const [renderedVideos, setRenderedVideos] = useState(null);
  // const {loadingPlaylists} = useData();

  useEffect(() => {
    if (searchQuery === '') {
      setFilteredVideos(Object.values(videos));
    } else {
      const query = searchQuery.toLowerCase();
      const matchedVideos = Object.values(videos).filter(video =>
        video.title.toLowerCase().includes(query) || video.description.toLowerCase().includes(query)
      );
      setFilteredVideos(matchedVideos);
    }
  }, [videos, searchQuery]);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  useEffect(() => {
    const handlePlaylistUpdate = () => {
      navigate("/playlists")
    };
  
    ipcRenderer.on('palylistAlbumVideos', handlePlaylistUpdate);
  
    return () => {
      ipcRenderer.removeListener('palylistAlbumVideos', handlePlaylistUpdate);
    };
  }, []);

  return (
    <div className='flex flex-col h-screen h-full items-center justify-center p-4 border-2 rounded-lg w-full'>

      <header className='w-full flex flex-col md:flex-row justify-between items-center mb-4 space-y-4 md:space-y-0'>
        <button onClick={() => navigate(-1)} className='flex items-center text-gray-600'>
          <FaArrowLeft />
          <span className='ml-2'>Back</span>
        </button>
        <input
          type="text"
          placeholder="Search For Video in Playlist..."
          className="px-4 py-2 w-full border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 md:max-w-lg"
          onChange={handleSearchChange}
          value={searchQuery}
        />
        <div className="flex space-x-2">
          <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none">
            Search
          </button>
        </div>
      </header>

      <div className='w-full border-t-2 border-gray-200 mb-4'></div>

      <main className='w-full flex-grow overflow-auto p-4'>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredVideos.map((video, index) => (
            <VideoCard key={video.id} video={video} index={index} id={playlist.id} />
          ))}
        </div>
      </main>

      <footer className='w-full text-center pt-4'>
        <span className='text-gray-600'>{playlist.items.length} Video(s)</span>
      </footer>

    </div>
  );
}

export default Album;