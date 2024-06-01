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
    // const [loadingPlaylistsAlbum, setLoadingPlaylistsAlbum] = useState(true);
    const [appInfo, setAppInfo] = useState({});
    const [checkRes, setCheckRes] = useState({});
    const [status, setStatus] = useState({});
    const [logoutStatus, setLogoutStatus] = useState(false);
    const [aboutApp, setAboutApp] = useState({});


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

        ipcRenderer.on('downloadUrlExtention', (data) => {
            ipcRenderer.send('downloadVideo', { url: data.url, quality: data.quality, format: "mp4" });
        });

        ipcRenderer.on('downloadUrlVideo', (data) => {
            ipcRenderer.send('downloadVideo', { url: data.url, quality: data.quality, format: data.format });
        });

        ipcRenderer.on('checkRes', (data) => {
            setCheckRes(data);
        });

        ipcRenderer.on('status', (data) => {
            setStatus(data);
            if(data.status === "success"){
                setLogoutStatus(false);
            }
        });

        ipcRenderer.on('confirmLogout', () => {
            setLogoutStatus(true);
        });

        ipcRenderer.on('aboutApp', (data) => {
            setAboutApp(data);
        });
        
        // Clean up the listener when the context provider is unmounted
        return () => {
            ipcRenderer.removeAllListeners('downloadProgress');
            ipcRenderer.removeAllListeners('downloadComplete');
            ipcRenderer.removeAllListeners('homeVideos');
            ipcRenderer.removeAllListeners('palylistVideos');
            ipcRenderer.removeAllListeners('appInfo');
            ipcRenderer.removeAllListeners('downloadVideoPlaylist');
            ipcRenderer.removeAllListeners('downloadUrlExtention');
            ipcRenderer.removeAllListeners('downloadUrlVideo');
            ipcRenderer.removeAllListeners('checkRes');
            ipcRenderer.removeAllListeners('status');
            ipcRenderer.removeAllListeners('confirmLogout');
            ipcRenderer.removeAllListeners('aboutApp');
        };
    }, []);

    return (
        <DataContext.Provider value={{ downloadProgress, downloadComplete, videos, loading, playlists, loadingPlaylists, appInfo, checkRes, status, logoutStatus, aboutApp }}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => useContext(DataContext);