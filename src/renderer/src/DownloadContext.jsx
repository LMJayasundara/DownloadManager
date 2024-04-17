import React, { createContext, useContext, useState, useEffect } from 'react';
const ipcRenderer = electron.ipcRenderer;

export const DataContext = createContext();

export const DataProvider = ({ children }) => {
    const [downloadProgress, setDownloadProgress] = useState({});
    const [downloadComplete, setDownloadComplete ] = useState({});
    const [videos, setVideos] = useState({});
    const [loading, setLoading] = useState(true);
    const [playlists, setPlaylists] = useState({});
    const [loadingPlaylists, setLoadingPlaylists] = useState(true);
    const [appInfo, setAppInfo] = useState({});


    useEffect(() => {
        ipcRenderer.on('downloadProgress', (data) => {
            setDownloadProgress(current => ({ ...current, [data.videoId]: data.progress }));
        });

        ipcRenderer.on('downloadComplete', (data) => {
            setDownloadComplete(current => ({ ...current, [data.videoId]: data.status }));
        });

        ipcRenderer.on('homeVideos', (data) => {
            setLoading(true);
            setVideos(data);
            setTimeout(() => {
                setLoading(false);
            }, 1000);
        });

        ipcRenderer.on('palylistVideos', (data) => {
            setLoadingPlaylists(true);
            setPlaylists(data)
            setTimeout(() => {
                setLoadingPlaylists(false);
            }, 1000);
        });

        ipcRenderer.on('appInfo', (data) => {
            setAppInfo(data);
        });

        ipcRenderer.on('downloadVideoPlaylist', (data) => {
            ipcRenderer.send('downloadVideo', { url: data.url, quality: data.quality });
        });

        // Clean up the listener when the context provider is unmounted
        return () => {
            ipcRenderer.removeAllListeners('downloadProgress');
            ipcRenderer.removeAllListeners('downloadComplete');
            ipcRenderer.removeAllListeners('homeVideos');
            ipcRenderer.removeAllListeners('palylistVideos');
            ipcRenderer.removeAllListeners('appInfo');
            ipcRenderer.removeAllListeners('downloadVideoPlaylist');
        };
    }, []);

    return (
        <DataContext.Provider value={{ downloadProgress, downloadComplete, videos, loading, playlists, loadingPlaylists, appInfo }}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => useContext(DataContext);

/////////////////////////////////////////////////////////////////////////////////////////////////////

// import React, { createContext, useContext, useState, useEffect } from 'react';
// const { ipcRenderer } = window.require('electron');

// export const DataContext = createContext();

// export const DataProvider = ({ children }) => {
//     const [downloadProgress, setDownloadProgress] = useState({});
//     const [videos, setVideos] = useState({});
//     const [playlistDetails, setPlaylistDetails] = useState({});

//     useEffect(() => {
//         // Listening for download progress updates
//         const handleDownloadProgress = (event, data) => {
//             setDownloadProgress(current => ({ ...current, [data.videoId]: data.progress }));
//         };

//         // Listening for videos data updates
//         const handleVideoUpdate = (event, videos) => {
//             setVideos(videos);
//         };

//         // Listening for playlist details updates
//         const handlePlaylistDetails = (event, details) => {
//             setPlaylistDetails(details);
//         };

//         ipcRenderer.on('downloadProgress', handleDownloadProgress);
//         ipcRenderer.on('homeVideos', handleVideoUpdate);
//         ipcRenderer.on('playlistDetails', handlePlaylistDetails);

//         return () => {
//             // Clean up all listeners when the context provider is unmounted
//             ipcRenderer.removeListener('downloadProgress', handleDownloadProgress);
//             ipcRenderer.removeListener('homeVideos', handleVideoUpdate);
//             ipcRenderer.removeListener('playlistDetails', handlePlaylistDetails);
//         };
//     }, []);

//     return (
//         <DataContext.Provider value={{ downloadProgress, videos, playlistDetails }}>
//             {children}
//         </DataContext.Provider>
//     );
// };

// export const useData = () => useContext(DataContext);
