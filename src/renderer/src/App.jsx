// import Versions from './components/Versions'
// import electronLogo from './assets/electron.svg'

import { useState } from "react";
import { Route, Routes, Link, Navigate } from "react-router-dom";
import { Content, RootLayout, Sidebar } from "./components";
import SidebarButton from "./components/SidebarButton";

import Login from "./pages/Login"
import Home from "./pages/Home";
import Search from "./pages/Search";
import Playlists from "./pages/Playlists";
import Settings from "./pages/Settings";
import Help from "./pages/Help";
import About from "./pages/About";
import Album from "./pages/Album";
import Player from "./pages/Player";
import PlayListPlayer from "./pages/PlayListPlayer";

function App() {
  // const ipcHandle = () => window.electron.ipcRenderer.send('ping')

  // return (
  //   <div className='flex h-full items-center justify-center'>
  //     <span className='text-4xl text-blue-500'>Hello World</span>
  //   </div>
  // )

  // return (
  //   <Routes>
  //     <Route path="/" element={<Login />} />
  //     <Route path="/home" element={<Home />} />
  //     <Route path="/search" element={<Search />} />
  //     <Route path="/playlist" element={<Playlist />} />
  //     <Route path="/settings" element={<Settings />} />
  //     <Route path="/help" element={<Help />} />
  //   </Routes>
  // )

  // return (
  //   <div>
  //     <nav>
  //       <ul>
  //         <li>
  //           <Link to="/">Home</Link>
  //         </li>
  //         <li>
  //           <Link to="/dashboard">About</Link>
  //         </li>
  //       </ul>
  //     </nav>
  //     <Routes>
  //       <Route path="/dashboard" element={<Dashboard />} />
  //       <Route path="/" element={<Login />} />
  //     </Routes>
  //   </div>
  // );

  // const [currentPage, setCurrentPage] = useState('home');
  // return (
  //   <RootLayout>
  //     <Sidebar className={"bg-gray-700"}>
  //       <SidebarButton text="Home" to="/home" currentPage={currentPage} setCurrentPage={setCurrentPage} />
  //       <SidebarButton text="Search" to="/search" currentPage={currentPage} setCurrentPage={setCurrentPage} />
  //       <SidebarButton text="Playlist" to="/playlists" currentPage={currentPage} setCurrentPage={setCurrentPage} />
  //       <SidebarButton text="Settings" to="/settings" currentPage={currentPage} setCurrentPage={setCurrentPage} />
  //       <SidebarButton text="Help" to="/help" currentPage={currentPage} setCurrentPage={setCurrentPage} />
  //     </Sidebar>
  //     <Content className={""}> Content </Content>
  //   </RootLayout>
  // )

  return (
    <Routes>
      {/* Directly render the Login component for the root path */}
      <Route path="/" element={<Login />} />

      {/* Wrap other pages in the RootLayout component */}
      <Route path="*" element={
        <RootLayout>
          <Sidebar className={"bg-gray-700"}>
            <SidebarButton to="/home" text="Home" />
            <SidebarButton to="/playlists" text="Playlists" />
            <SidebarButton to="/search" text="Search" />
            <SidebarButton to="/settings" text="Settings" />
            <SidebarButton to="/help" text="Help" />
            <SidebarButton to="/about" text="About" />
            {/* <SidebarButton to="/" text="Logout" /> */}
          </Sidebar>
          <Content>
            <Routes> {/* Nested Routes for other pages */}
              <Route path="/home" element={<Home />} />
              <Route path="/playlists" element={<Playlists />} />
              <Route path="/search" element={<Search />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/help" element={<Help />} />
              <Route path="/about" element={<About />} />
              {/* <Route path="/album/:id" element={<Album />} /> */}
              {/* <Route path="/album/:playlistName" element={<Album />} /> */}
              <Route path="/album" element={<Album />} />
              <Route path="/player" element={<Player />} />
              <Route path="/playlistplayer" element={<PlayListPlayer />} />
              {/* Redirect unknown paths back to the root path, which is the Login page */}
              <Route path="*" element={<Navigate replace to="/" />} />
            </Routes>
          </Content>
        </RootLayout>
      } />
    </Routes>
  );

  // return (
  //   <>
  //     <img alt="logo" className="logo" src={electronLogo} />
  //     <div className="creator">Powered by electron-vite</div>
  //     <div className="text">
  //       Build an Electron app with <span className="react">React</span>
  //     </div>
  //     <p className="tip">
  //       Please try pressing <code>F12</code> to open the devTool
  //     </p>
  //     <div className="actions">
  //       <div className="action">
  //         <a href="https://electron-vite.org/" target="_blank" rel="noreferrer">
  //           Documentation
  //         </a>
  //       </div>
  //       <div className="action">
  //         <a target="_blank" rel="noreferrer" onClick={ipcHandle}>
  //           Send IPC
  //         </a>
  //       </div>
  //     </div>
  //     <Versions></Versions>
  //   </>
  // )
}

export default App

