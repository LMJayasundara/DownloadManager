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
            ipcRenderer.send('downloadVideo', { url: data.url, quality: data.quality, format: "mp4" });
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