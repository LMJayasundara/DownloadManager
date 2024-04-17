import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ReactPlayer from 'react-player';
import ReactMarkdown from 'react-markdown';
import { FaAngleDown, FaAngleUp, FaArrowLeft, FaTrash } from 'react-icons/fa'; // Import icons
const ipcRenderer = electron.ipcRenderer;

function Player() {
  const location = useLocation();
  const navigate = useNavigate();
  const video = location.state?.video;

  console.log("video.format: ", video.format);
  const videoPath = video.format === "mp4" ? `media-loader://${video.id}.mp4`: `media-loader://Audio/${video.id}.mp3`;

  const [isExpanded, setIsExpanded] = useState(false);

  const videoContainerStyle = isExpanded ? { height: '60vh' } : {height: '75vh'};
  const descriptionStyle = isExpanded ? { maxHeight: '28vh', overflowY: 'auto', transition: 'max-height 0.3s ease' } : { maxHeight: '0', overflowY: 'hidden', transition: 'max-height 0.3s ease' };

  const toggleDescription = () => {
    setIsExpanded(!isExpanded);
  };

  const authorPhotoContainerStyle = { paddingTop: '10px' };

  const handleDeleteVideo = () => {
    console.log('deleteVideo');
    ipcRenderer.send('deleteVideo', { videoId: video.id });
    navigate(-1);
  };

  return (
    <div className='flex flex-col h-screen justify-start p-4 border-2 rounded-lg overflow-hidden'>
      {/* Header Section */}
      <div className='w-full flex justify-between items-center mb-4 px-4'>
        <button onClick={() => navigate(-1)} className='flex items-center text-gray-600'>
          <FaArrowLeft />
          <span className='ml-2'>Back</span>
        </button>
        {/* <h1 className='text-xl font-bold'>Video Player</h1> */}
        <button className='flex items-center text-gray-600'
        onClick={handleDeleteVideo}
        >
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
            <img src={video.authorPhoto} alt="Author" className="w-12 h-12 rounded-full mr-4" />
            <div className='flex-grow'>
              <h2 className='text-xl font-bold'>{video.title}</h2>
              <p className='text-sm'>{video.author}</p>
            </div>
            <button onClick={toggleDescription} className='text-gray-600 ml-auto'>
              {isExpanded ? <FaAngleUp /> : <FaAngleDown />}
              <span className='ml-2'>{isExpanded ? 'Less' : 'More'}</span>
            </button>
          </div>
          <div style={descriptionStyle}>
            <ReactMarkdown className='text-gray-800 text-sm my-2'>
              {video.description}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Player;


////////////////////////////////////////////////////////////////////////////////////////////////

// import React, { useState } from 'react';
// import Modal from './Modal'; // Assume this is a simple modal component you've created

// function Search() {
//   const [showModal, setShowModal] = useState(false);
//   const [videoPath, setVideoPath] = useState(`media-loader://your-video-id.mp4`);

//   // Dummy function to simulate checking the video path
//   const checkVideoPath = () => {
//     // Example condition: if the video path does not exist
//     const fileExists = false; // Replace this with actual file existence check
//     if (!fileExists) {
//       setShowModal(true); // Show the modal if the file doesn't exist
//     }
//   };

//   // Call this function when the ReactPlayer encounters an error
//   const handleVideoError = () => {
//     setShowModal(true);
//   };

//   // User chooses to download the file
//   const handleDownload = () => {
//     // Logic to download the file
//     // This could be setting `window.location.href` to the download URL or using a library to handle downloads
//     console.log("Downloading file...");
//     setShowModal(false);
//   };

//   // User cancels the download
//   const handleCancel = () => {
//     setShowModal(false);
//   };

//   return (
//     <div>
//       {/* Your existing application structure */}

//       {/* Example usage of ReactPlayer with an onError handler */}
//       <ReactPlayer url={videoPath} playing={true} onError={handleVideoError} />

//       {/* Modal for download prompt */}
//       {showModal && (
//         <Modal title="File Not Found" onClose={() => setShowModal(false)}>
//           <p>The file you are trying to access is not available. Would you like to download it instead?</p>
//           <button onClick={handleDownload}>Download</button>
//           <button onClick={handleCancel}>Cancel</button>
//         </Modal>
//       )}
//     </div>
//   );
// }
