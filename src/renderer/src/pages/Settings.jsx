import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from "react-router-dom";
import { FaSave, FaDownload, FaTrashAlt, FaArrowLeft } from 'react-icons/fa'; // Example icons
import { useData } from '../DownloadContext';
const ipcRenderer = electron.ipcRenderer;

function Settings() {
  const { appInfo } = useData();
  const [cookie, setCookie] = useState(appInfo.cookie);
  const [interval, setInterval] = useState(appInfo.playlistInterval);

  // Function to handle logout logic
  const logout = () => {
    // Here you would clear any authentication tokens, user data, etc.
    console.log("Logging out..."); // Replace with actual logout logic
    navigate('/'); // Redirect to login or another appropriate route
  };

  useEffect(() => {
    ipcRenderer.send('page', { page: 'Settings' });
    return () => {
      ipcRenderer.removeAllListeners('page');
    };
  }, []);

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

  const deleteAllPlaylists = () => {
    console.log("Deleting all playlists...");
    // Implement deletion logic
    ipcRenderer.send('deleteAllPlaylists');
  };

  // Function to update the cookie in the store and main process
  const saveCookie = () => {
    console.log("Saving Cookie:", cookie);
    ipcRenderer.send('setCookie', { cookie: cookie });
  };

  // Function to update the check playlist interval in the store and main process
  const saveInterval = () => {
    console.log("Saving Interval:", interval);
    ipcRenderer.send('setCheckPlaylistInterval', { interval: interval });
  };

  // Determine the common width for all buttons
  const buttonWidthClass = "w-40"; // You can adjust this value as needed

  const navigate = useNavigate();

  return (
    <div className='flex flex-col h-full items-center justify-center p-4 border-2 rounded-lg w-full'>

      <header className='w-full mb-4'>
        <span className='text-2xl font-bold text-gray-500'>Settings</span>
      </header>

      <div className='w-full border-t-2 border-gray-200 mb-4'></div>

      <main className='flex-grow w-full px-4'>
        <div className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-lg p-8 border border-gray-200 shadow-md space-y-4 w-full">

          <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <p className="text-lg text-gray-600 mb-4 md:mb-0 md:mr-4">
              YouTube Cookie <br />(required for downloading private videos)
            </p>
            <div className="flex flex-col md:flex-row items-center gap-4 w-full">
              <input
                className="flex-grow p-4 rounded-lg border-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 md:flex-grow md:basis-3/5"
                value={cookie}
                onChange={(e) => setCookie(e.target.value)}
                placeholder="Enter your YouTube Cookie..."
              />
              <button className="py-3 px-6 bg-blue-500 rounded-lg text-white font-bold text-md hover:bg-blue-600 focus:outline-none flex items-center justify-center space-x-2"
                onClick={saveCookie}
              >
                <FaSave className="text-lg" />
                <span>Save</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
            <p className="text-lg font-bold text-gray-600 mb-4 md:mb-0 md:mr-4">
              Set the interval to check for new videos <br />(in minutes)
            </p>
            <div className="flex flex-col md:flex-row items-center gap-4 w-full">
              <input
                className="flex-grow p-4 rounded-lg border-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 md:flex-grow md:basis-2/5"
                type="number"
                value={interval}
                onChange={(e) => setInterval(Number(e.target.value))}
                min="1"
                max="60"
                placeholder="Set interval in minutes"
              />
              <button className="py-3 px-6 bg-blue-500 rounded-lg text-white font-bold text-md hover:bg-blue-600 focus:outline-none flex items-center justify-center space-x-2"
                onClick={saveInterval}
              >
                <FaSave className="text-lg" />
                <span>Save</span>
              </button>
            </div>
          </div>

          {/* New sections with same-width buttons */}
          <div className="flex flex-col space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-lg font-bold text-gray-600">Browser Extension</p>
              <button className={`${buttonWidthClass} py-3 px-6 bg-blue-500 rounded-lg text-white font-bold text-md hover:bg-blue-600 focus:outline-none flex items-center justify-center space-x-2`}>
                <FaDownload className="text-lg" />
                <span>Download</span>
              </button>
            </div>

            <div className="flex justify-between items-center">
              <p className="text-lg font-bold text-gray-600">Delete all videos</p>
              <button className={`${buttonWidthClass} py-3 px-6 bg-red-500 rounded-lg text-white font-bold text-md hover:bg-red-600 focus:outline-none flex items-center justify-center space-x-2`}
                onClick={deleteAllVideos}
              >
                <FaTrashAlt className="text-lg" />
                <span>Delete</span>
              </button>
            </div>

            <div className="flex justify-between items-center">
              <p className="text-lg font-bold text-gray-600">Delete all playlists</p>
              <button className={`${buttonWidthClass} py-3 px-6 bg-red-500 rounded-lg text-white font-bold text-md hover:bg-red-600 focus:outline-none flex items-center justify-center space-x-2`}
                onClick={deleteAllPlaylists}
              >
                <FaTrashAlt className="text-lg" />
                <span>Delete</span>
              </button>
            </div>

            <div className="flex justify-between items-center">
              <p className="text-lg font-bold text-gray-600">Sign Out</p>
              <button onClick={logout} className={`${buttonWidthClass} py-3 px-6 bg-red-500 rounded-lg text-white font-bold text-md hover:bg-red-600 focus:outline-none flex items-center justify-center space-x-2`}>
                <FaArrowLeft className="text-lg" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>

        </div>
      </main>

      <footer className='w-full flex justify-between items-center pt-4 px-4'>
        {/* <span className='text-gray-600'>Settings Page Footer</span> */}
        {/* <button
          onClick={logout}
          className="py-3 px-6 bg-red-500 rounded-lg text-white font-bold text-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
        >
          Sign Out
        </button> */}
      </footer>

    </div>
  );
}

export default Settings;


