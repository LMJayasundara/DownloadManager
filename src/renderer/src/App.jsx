import { Route, Routes, Navigate } from "react-router-dom";
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
          </Sidebar>
          <Content>
            <Routes> {/* Nested Routes for other pages */}
              <Route path="/home" element={<Home />} />
              <Route path="/playlists" element={<Playlists />} />
              <Route path="/search" element={<Search />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/help" element={<Help />} />
              <Route path="/about" element={<About />} />
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
}

export default App

