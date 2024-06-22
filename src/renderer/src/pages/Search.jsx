import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../DownloadContext';
import { useNavigate } from 'react-router-dom';
import Skeleton from 'react-loading-skeleton';
const ipcRenderer = electron.ipcRenderer;

const VideoCard = ({ video, index }) => {
  const navigate = useNavigate();

  const goToAlbum = () => {
    navigate('/player', { state: { video } });
  };

  function truncateTitle(title, maxWords) {
    const titleWords = title.split(' ');
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

  return (
    <div key={index}
      className="relative bg-white rounded-lg bg-opacity-10 backdrop-filter backdrop-blur-lg space-y-4 w-full transition-transform duration-200 hover:scale-105 hover:shadow-lg border border-gray-300 group"
      onClick={goToAlbum}
      role="button"
    >
      {/* <img src={video.thumbnailUrl} alt={video.title} className="rounded-lg w-full object-cover" /> */}
      <img src={video.thumbnailUrl} 
        alt={video.title} 
        className="rounded-lg w-full object-cover h-28 w-32" />
      
      <div className="p-2">
        <div className="flex items-center space-x-3 mt-2">
          <img src={video.authorPhoto} alt={video.author} className="h-10 w-10 rounded-full object-cover" />
          <span className="text-sm font-semibold">{truncateAuthor(video.author, 12)}</span>
        </div>
        <h3 className="text-md font-semibold mt-1" style={{ minHeight: '4rem' }}>{truncateTitle(video.title, 8)}</h3>
      </div>
    </div>
  );
};

function Search() {
  const { videos } = useData();  // Assume this is your data fetching context
  const [filteredVideos, setFilteredVideos] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

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

  // Mock loading state for demonstration
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500); // Simulates loading time of 1 seconds
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    ipcRenderer.send('page', { page: 'Search' });
    return () => {
      ipcRenderer.removeAllListeners('page');
    };
  }, []);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const renderSkeletonVideos = () => {
    return Array.from({ length: Object.keys(videos).length ? Object.keys(videos).length : 1 }).map((_, index) => (
      <div key={index} className="flex flex-col space-y-2">
        <Skeleton height={180} /> {/* Video thumbnail */}
        <Skeleton height={20} width={`60%`} /> {/* Video title */}
        <Skeleton height={20} width={`30%`} /> {/* Additional info */}
      </div>
    ));
  };

  return (
    <div className='flex flex-col h-full items-center justify-center p-4 border-2 rounded-lg w-full'>
      <header className='w-full flex flex-row items-center mb-4'>
        <input
          type="text"
          placeholder="Enter Keyword"
          className="flex-grow px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
          onChange={handleSearchChange}
          value={searchQuery}
        />
        <div className="flex items-center space-x-2 ml-4">
          <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none">
            Search
          </button>
        </div>
      </header>

      <div className='w-full border-t-2 border-gray-200 mb-4'></div>

      <main className='w-full flex-grow overflow-auto p-4'>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {renderSkeletonVideos()}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredVideos.map((video, index) => (
              <VideoCard key={video.id} video={video} index={index} />
            ))}
          </div>
        )}
      </main>

      <footer className='w-full text-center pt-4'>
        {/* <span className='text-gray-600'>{filteredVideos.length} Match{filteredVideos.length !== 1 ? 'es' : ''} Media Found</span> */}
        <span className='text-gray-600'>{filteredVideos.length} Media Found</span>
      </footer>
    </div>
  );
}

export default Search;
