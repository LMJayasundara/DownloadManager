import React, { useState, useEffect, useRef } from 'react';
import { FaSave, FaDownload, FaTrashAlt, FaArrowLeft } from 'react-icons/fa'; // Example icons
import { useData } from '../DownloadContext';
const ipcRenderer = electron.ipcRenderer;

function Settings() {
  const { appInfo } = useData();
  const [cookie, setCookie] = useState(appInfo.cookie.length ? JSON.stringify(appInfo.cookie, null, 2) : '');
  const [interval, setInterval] = useState(appInfo.playlistInterval);
  const [isValidJson, setIsValidJson] = useState(true);
  const textareaRef = useRef(null);

  // Function to handle logout logic
  const logout = () => {
    ipcRenderer.send('logout');
  };

  useEffect(() => {
    ipcRenderer.send('page', { page: 'Settings' });

    return () => {
      ipcRenderer.removeAllListeners('page');
    };
  }, []);

  useEffect(() => {
    const textarea = textareaRef.current;
    const adjustHeight = () => {
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    };
    adjustHeight(); // Adjust the height initially
    textarea.addEventListener('input', adjustHeight);
    return () => textarea.removeEventListener('input', adjustHeight);
  }, [cookie]);

  // Add function stubs for the new actions
  const installBrowserExtension = () => {
    console.log("Installing Browser Extension...");
    // Implement installation logic
  };

  const deleteAllVideos = () => {
    console.log("Deleting all videos...");
    // Implement deletion logic
    ipcRenderer.send('deleteAllVideos');
  };

  const deleteAllAudios = () => {
    console.log("Deleting all audios...");
    // Implement deletion logic
    ipcRenderer.send('deleteAllAudios');
  };

  const deleteAllPlaylists = () => {
    console.log("Deleting all playlists...");
    // Implement deletion logic
    ipcRenderer.send('deleteAllPlaylists');
  };

  const openFolder = () => {
    console.log("Open Extension Folder...");
    // Implement deletion logic
    ipcRenderer.send('openExtensionFolder');
  };

  const bckupData = () => {
    console.log("Backup Data...");
    // Implement deletion logic
    ipcRenderer.send('bckupData');
  };

  // Function to update the cookie in the store and main process
  const saveCookie = () => {
    try {
      const parsedCookie = cookie.trim() === '' ? [] : JSON.parse(cookie);
      console.log("Saving Cookie:", parsedCookie);
      ipcRenderer.send('setCookie', { cookie: parsedCookie });
      setIsValidJson(true);
      setCookie(cookie.trim() === '' ? '' : JSON.stringify(parsedCookie, null, 2)); // Reformat if not empty
    } catch (e) {
      console.error("Invalid JSON format:", e);
      setIsValidJson(false);
    }
  };

  // Function to update the check playlist interval in the store and main process
  const saveInterval = () => {
    console.log("Saving Interval:", interval);
    ipcRenderer.send('setCheckPlaylistInterval', { interval: interval });
  };

  return (
    <div className='flex flex-col h-full items-center justify-center p-4 border-2 rounded-lg w-full'>

      <header className='w-full mb-4'>
        <span className='text-lg font-bold text-gray-500'>Settings</span>
      </header>

      <div className='w-full border-t-2 border-gray-200 mb-4'></div>

      <main className='flex-grow w-full px-4'>
        <div className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-lg p-8 border border-gray-200 shadow-md space-y-4 w-full">
          <div className="flex flex-col md:flex-row items-center gap-4 w-full">
            <div className="flex-grow md:flex-none md:w-1/3">
              <p className="text-sm font-bold text-gray-600 mb-4 md:mb-0 md:mr-4">
                YouTube Cookie <br />(required for downloading private videos)
              </p>
            </div>
            <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-2/3">
              <textarea
                ref={textareaRef}
                className={`flex-grow p-3 rounded-lg border-2 ${isValidJson ? 'border-gray-300' : 'border-red-500'} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50`}
                value={cookie}
                onChange={(e) => setCookie(e.target.value)}
                placeholder="Enter your YouTube Cookie..."
                rows={cookie.length === 0 ? 1 : 10} // Adjust the textarea rows based on the cookie length
                style={{ maxHeight: '150px', minHeight: '50px'}} // Set max width and hide horizontal overflow
              />
              <button className="py-2 px-4 bg-blue-500 rounded-lg text-white font-bold text-sm hover:bg-blue-600 focus:outline-none flex items-center justify-center space-x-2"
                onClick={saveCookie}
              >
                <FaSave className="text-md" />
                <span>Save</span>
              </button>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row items-center gap-4 w-full">
            <div className="flex-grow md:flex-none md:w-1/3">
              <p className="text-sm font-bold text-gray-600 mb-4 md:mb-0 md:mr-4">
                Set the interval to check for new videos <br />(in minutes)
              </p>
            </div>
            <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-2/3">
              <input
                className="flex-grow p-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                type="number"
                value={interval}
                onChange={(e) => setInterval(Number(e.target.value))}
                min="1"
                max="60"
                placeholder="Set interval in minutes"
              />
              <button className="py-2 px-4 bg-blue-500 rounded-lg text-white font-bold text-sm hover:bg-blue-600 focus:outline-none flex items-center justify-center space-x-2"
                onClick={saveInterval}
              >
                <FaSave className="text-md" />
                <span>Save</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm font-bold text-gray-600">Browser Extension</p>
              <button className="py-2 px-4 bg-blue-500 rounded-lg text-white font-bold text-sm hover:bg-blue-600 focus:outline-none flex items-center justify-center space-x-2"
              onClick={openFolder}
              >
                <FaDownload className="text-md" />
                <span>Download</span>
              </button>
            </div>

            <div className="flex justify-between items-center">
              <p className="text-sm font-bold text-gray-600">Delete all videos</p>
              <button className="py-2 w-32 px-4 bg-red-500 rounded-lg text-white font-bold text-sm hover:bg-red-600 focus:outline-none flex items-center justify-center space-x-2"
                onClick={deleteAllVideos}
              >
                <FaTrashAlt className="text-md" />
                <span>Delete</span>
              </button>
            </div>

            <div className="flex justify-between items-center">
              <p className="text-sm font-bold text-gray-600">Delete all audios</p>
              <button className="py-2 w-32 px-4 bg-red-500 rounded-lg text-white font-bold text-sm hover:bg-red-600 focus:outline-none flex items-center justify-center space-x-2"
                onClick={deleteAllAudios}
              >
                <FaTrashAlt className="text-md" />
                <span>Delete</span>
              </button>
            </div>

            <div className="flex justify-between items-center">
              <p className="text-sm font-bold text-gray-600">Delete all playlists</p>
              <button className="py-2 w-32 px-4 bg-red-500 rounded-lg text-white font-bold text-sm hover:bg-red-600 focus:outline-none flex items-center justify-center space-x-2"
                onClick={deleteAllPlaylists}
              >
                <FaTrashAlt className="text-md" />
                <span>Delete</span>
              </button>
            </div>

            <div className="flex justify-between items-center">
              <p className="text-sm font-bold text-gray-600">Sign Out</p>
              <button className="py-2 w-32 px-4 bg-red-500 rounded-lg text-white font-bold text-sm hover:bg-red-600 focus:outline-none flex items-center justify-center space-x-2"
                onClick={logout}
              >
                <FaArrowLeft className="text-md" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>

        </div>
      </main>

      <footer className='w-full flex justify-between items-center pt-4 px-4'>
      </footer>

    </div>
  );
}

export default Settings;