import React, { useEffect } from 'react';
import { useData } from '../DownloadContext';
const ipcRenderer = electron.ipcRenderer;

const About = () => {
  const { aboutApp } = useData();

  useEffect(() => {
    ipcRenderer.send('page', { page: 'About' });
  
    return () => {
      ipcRenderer.removeAllListeners('page');
    };
  }, []);

  // Assuming these values might be dynamic or come from some global state or props
  const softwareName = "PlayDownloader";
  const currentVersion = aboutApp.currentVersion;
  const licenseKey = aboutApp.licenseKey;
  // const currentYear = new Date().getFullYear();
  const discription = "Save videos, audios and YouTube playlists to your PC";

  return (
    <div className='flex h-full flex-col items-center justify-center'>
      {/* This is the new wrapper div with rounded borders and a background */}
      <div className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-lg p-8 border border-gray-200 shadow-md space-y-4 w-full max-w-md mx-auto">
        <h1 className='text-2xl font-bold text-gray-500 text-center'>About</h1>
        <p className='text-lg text-center text-gray-900 mb-8'>{discription}</p>
        <p className='text-lg text-center text-gray-500'>App Name: {softwareName}</p>
        <p className='text-lg text-center text-gray-500'>Current Version: {currentVersion}</p>
        <p className='text-lg text-center text-gray-500'>License Key: {licenseKey}</p>
        <p className='text-lg text-center text-gray-500'>
          © 
          <a href="https://playdownloader.com" className='text-blue-500 hover:text-blue-700 underline ml-1' target="_blank" rel="noopener noreferrer">
            PlayDownloader.com
          </a>
          {/* {` ${currentYear}`} */}
        </p>
      </div>
    </div>
  );
}

export default About;
