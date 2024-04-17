import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
const ipcRenderer = electron.ipcRenderer;
// import { FaPlayCircle, FaEllipsisV } from 'react-icons/fa'; // Import FaEllipsisV for the menu button
import { FaPlayCircle, FaEllipsisV, FaPauseCircle, FaStopCircle, FaPlay } from 'react-icons/fa';
import { useData } from '../DownloadContext';

// function useOutsideAlerter(ref, onClose) {
//   useEffect(() => {
//     function handleClickOutside(event) {
//       if (ref.current && !ref.current.contains(event.target)) {
//         onClose();
//       }
//     }
//     // Bind the event listener
//     document.addEventListener("mousedown", handleClickOutside);
//     return () => {
//       // Unbind the event listener on clean up
//       document.removeEventListener("mousedown", handleClickOutside);
//     };
//   }, [ref, onClose]);
// }

// const VideoCard = ({ video, index }) => {
//   const { downloadProgress } = useData();  // Use the hook to get downloadProgress
//   const progress = downloadProgress[video.id];  // Access progress using video ID

//   const [menuVisible, setMenuVisible] = useState(false);
//   const menuRef = useRef(null);
//   const navigate = useNavigate();

//   useOutsideAlerter(menuRef, () => setMenuVisible(false));

//   const goToAlbum = (video) => {
//     navigate('/player', { state: { video } });
//   };

//   return (
//     <div key={index}
//       className="relative bg-white rounded-lg bg-opacity-10 backdrop-filter backdrop-blur-lg space-y-4 w-full transition-transform duration-200 hover:scale-105 hover:shadow-lg border border-gray-300 group"
//       // className="group relative bg-white rounded-lg bg-opacity-10 backdrop-filter backdrop-blur-lg w-full transition-transform duration-200 hover:scale-105 hover:shadow-xl border border-gray-300 cursor-pointer overflow-hidden"
//       onClick={() => goToAlbum(video)}
//       role="button"
//     >
//       <div className="relative">
//         {/* Thumbnail Image */}
//         <img src={video.thumbnailUrl} alt={video.title} className="rounded-lg w-full object-cover" />

//         {/* Gradient Overlay */}
//         <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

//         {/* Playlist Details Overlay */}
//         <div className="absolute bottom-0 p-4 w-full text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
//           {/* <p className="font-bold">{playlist.title}</p> */}
//           <p>Videos</p>
//         </div>
//       </div>

//       <div className="p-2">
//         <div className="flex items-center space-x-3 mt-2">
//           <img src={video.authorPhoto} alt={video.author} className="h-10 w-10 rounded-full object-cover" />
//           <span className="text-sm font-semibold">{video.author}</span>
//         </div>
//         <h3 className="text-md font-semibold mt-1" style={{ minHeight: '4rem' }}>{video.title}</h3>
//       </div>

//       {/* Play Button Overlay */}
//       <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 group-hover:flex hidden">
//         <FaPlayCircle className="text-gray text-6xl opacity-65" color="blue" />
//       </div>

//       <div>
//         {/* {video.downloadProgress && `${video.downloadProgress.progress}`} */}
//         {progress && `${progress}`}
//       </div>

//       {/* Option Menu Button */}
//       <button
//         className="absolute right-2 bottom-2 text-gray-600"
//         onClick={(e) => {
//           e.stopPropagation();
//           setMenuVisible(!menuVisible);
//         }}
//       >
//         <FaEllipsisV />
//       </button>

//       {/* Options Menu */}
//       <div ref={menuRef}>
//         {menuVisible && (
//           <div className="absolute right-2 bottom-10 bg-white rounded-md shadow-lg">
//             <ul>
//               <li className="px-4 py-2 hover:bg-gray-100 cursor-pointer" onClick={() => console.log("Play Video")}>Play</li>
//               <li className="px-4 py-2 hover:bg-gray-100 cursor-pointer" onClick={() => console.log("Delete Video")}>Delete</li>
//             </ul>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const VideoCard = ({ video, index }) => {
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

  const handleDeleteVideo = () => {
    console.log('deleteVideo');
    ipcRenderer.send('deleteVideo', { videoId: video.id });
  };

  function truncateTitle(title, maxWords) {
    const titleWords = title.split(' ');
    if (titleWords.length > maxWords) {
      return titleWords.slice(0, maxWords).join(' ') + '...';
    }
    return title;
  }

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
          <p>Video</p>
        </div>

        {progress && !completed && (
          <div className="absolute bottom-0 left-0 bg-green-500" style={{ width: `${progress}%`, height: '4px' }}></div>
        )}

        {!completed && progress && progress < 100 && (
          <div className="absolute top-2 right-2 flex space-x-2">
            <button onClick={(e) => { e.stopPropagation(); handlePauseResume(); }}>
              {isPaused ? <FaPlay className="text-white" /> : <FaPauseCircle className="text-white" />}
            </button>
            <button onClick={(e) => { e.stopPropagation(); handleStop(); }}>
              <FaStopCircle className="text-white" />
            </button>
          </div>
        )}
      </div>

      {/* <div className="relative group w-full bg-black rounded-lg overflow-hidden">
        <img
          src={video.thumbnailUrl}
          alt={video.title}
          className="w-full h-28 object-cover" // Using h-48 which is 192px high
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

        <div className="absolute bottom-0 p-4 w-full text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <p className="text-sm">Video</p>
        </div>

        {progress && !completed && (
          <div className="absolute bottom-0 left-0 bg-green-500" style={{ width: `${progress}%`, height: '4px' }}></div>
        )}

        {!completed && progress && progress < 100 && (
          <div className="absolute top-2 right-2 flex space-x-2">
            <button onClick={(e) => { e.stopPropagation(); handlePauseResume(); }}>
              {isPaused ? <FaPlay className="text-white h-5 w-5" /> : <FaPauseCircle className="text-white h-5 w-5" />}
            </button>
            <button onClick={(e) => { e.stopPropagation(); handleStop(); }}>
              <FaStopCircle className="text-white h-5 w-5" />
            </button>
          </div>
        )}
      </div> */}



      {/* Play Button Overlay */}
      {/* {completed && progress && progress < 100 && (
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 group-hover:flex hidden">
        <FaPlayCircle className="text-gray text-6xl opacity-65" color="blue" />
      </div>
      )} */}

      <div className="p-2">
        <div className="flex items-center space-x-3 mt-2">
          <img src={video.authorPhoto} alt={video.author} className="h-10 w-10 rounded-full object-cover" />
          <span className="text-sm font-semibold">{video.author}</span>
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
                  ipcRenderer.send('deleteVideo', { videoId: video.id });
                }}>Delete</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

function Home() {
  const [videoQuality, setVideoQuality] = useState('720p');
  const [downloadFormat, setDownloadFormat] = useState('mp4');
  // const [loading, setLoading] = useState(true);
  // const [videos, setVideos] = useState({});
  const { videos, loading } = useData();
  const [videoURL, setVideoURL] = useState('');
  const [renderedVideos, setRenderedVideos] = useState(null);

  // // Mock loading state for demonstration
  // useEffect(() => {
  //   const timer = setTimeout(() => setLoading(false), 3000); // Simulates loading time of 3 seconds
  //   return () => clearTimeout(timer);
  // }, []);

  useEffect(() => {
    ipcRenderer.send('page', { page: 'Home' });
    return () => {
      ipcRenderer.removeAllListeners('page');
    };
  }, []);

  // useEffect(() => {
  //   ipcRenderer.on('homeVideos', (data) => {
  //     setVideos(data)
  //     setLoading(false);
  //   });

  //   return () => {
  //     ipcRenderer.removeAllListeners('homeVideos');
  //   };
  // }, []);

  const sendURL = () => {
    if (videoURL.trim() !== '') { // Check if the videoURL is not empty
      ipcRenderer.send('downloadVideo', { url: videoURL, quality: videoQuality, format: downloadFormat }); // Send the trimmed videoURL
      setVideoURL(''); // Clear the input field by setting videoURL state to an empty string
    }
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

  // useEffect(() => {
  //   // Function to handle download progress updates
  //   const handleDownloadProgress = (data) => {
  //     console.log(data);
  //     // Update state to reflect progress
  //     setVideos((prevVideos) => ({
  //       ...prevVideos,
  //       [data.videoId]: {
  //         ...prevVideos[data.videoId],
  //         downloadProgress: parseInt(data.progress)
  //       }
  //     }));
  //   };

  //   ipcRenderer.on('downloadProgress', handleDownloadProgress);

  //   return () => {
  //     // Clean up listener
  //     ipcRenderer.removeListener('downloadProgress', handleDownloadProgress);
  //   };
  // }, []);


  // const renderVideos = () => {
  //   console.log("render video");
  //   if (videos && typeof videos === 'object') {
  //     return Object.values(videos).map((video, index) => (
  //       <VideoCard key={index} video={video} index={index} />
  //     ));
  //   }
  //   return null;
  // };

  // useEffect(() => {
  //   if (!loading) {
  //     renderVideos();  // This will call renderVideos when loading changes to false
  //     // ipcRenderer.send('page', { page: 'Home' });
  //   }
  // }, [loading]);  // Dependency array, useEffect runs when `loading` changes

  useEffect(() => {
    if (!loading) {
      console.log("render video");
      function renderVideos() {
        if (videos && typeof videos === 'object') {
          return Object.values(videos).map((video, index) => (
            <VideoCard key={index} video={video} index={index} />
          ));
        }
        return null;
      }
      // Call renderVideos whenever `videos` changes
      setRenderedVideos(renderVideos());
    }
  }, [loading]); // Dependency array includes `videos` to react on its changes

  return (
    <div className='flex flex-col h-screen h-full items-center justify-center p-4 border-2 rounded-lg w-full'>

      <header className='w-full flex flex-col md:flex-row justify-between items-center mb-4 space-y-4 md:space-y-0'>
        <input
          type="text"
          value={videoURL} // Bind input value to state
          onChange={(e) => setVideoURL(e.target.value)}
          placeholder="Enter Video URL to Download..."
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
          <select
            value={downloadFormat}
            onChange={(e) => setDownloadFormat(e.target.value)}
            className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
          >
            <option value="mp4">mp4</option>
            <option value="mp3">mp3</option>
          </select>
          <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none"
            onClick={sendURL}
          >
            Download
          </button>
        </div>
      </header>

      <div className='w-full border-t-2 border-gray-200 mb-4'></div>

      {/* <main className='w-full flex-grow overflow-auto p-4'>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {renderSkeletonVideos()}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {renderVideos()}
          </div>
        )}
      </main> */}

      <main className='w-full flex-grow overflow-auto p-4'>
        {loading ? (
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
        <span className='text-gray-600'>{Object.keys(videos).length} Videos</span>
      </footer>

    </div>
  );
}

export default Home;