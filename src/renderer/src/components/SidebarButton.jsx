import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { GoHome, GoSearch, GoInfo } from "react-icons/go";
import { MdOutlineFeaturedPlayList } from "react-icons/md";
import { IoSettingsOutline } from "react-icons/io5";
import { LuHelpCircle } from "react-icons/lu";

const iconMap = {
  "/home": <GoHome />,
  "/search": <GoSearch />,
  "/playlists": <MdOutlineFeaturedPlayList />,
  "/settings": <IoSettingsOutline />,
  "/help": <LuHelpCircle />,
  "/about": <GoInfo />
};

const SidebarButton = ({ text, to }) => {
  // Custom style for the active link
  const activeLinkClass = "bg-blue-500 text-white";
  const inactiveLinkClass = "text-gray-400 hover:text-white hover:bg-blue-700";


  const navigate = useNavigate();
  // Function to handle logout logic
  const logout = () => {
    // Here you would clear any authentication tokens, user data, etc.
    console.log("Logging out..."); // Replace with actual logout logic
    navigate('/'); // Redirect to login or another appropriate route
  };

  // If the button is a logout button, handle it differently
  if (text === "Logout") {
    return (
      <div className="p-4 mt-auto w-full"> {/* Adjust this container as needed */}
        <button
          onClick={logout}
          className="w-2/4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md mx-auto flex items-center justify-center"
        >
          {text}
        </button>
      </div>
    );
  }

  return (
    <div className="p-4">
      <NavLink
        to={to}
        className={({ isActive }) =>
          `font-bold py-2 px-4 rounded inline-flex items-center ${isActive ? activeLinkClass : inactiveLinkClass}`
        }
        style={{
          display: "flex",
          width: "100%",
          padding: "16px",
          borderRadius: "13px",
          alignItems: "center",
          justifyContent: "flex-start",
          gap: "10px",
          textDecoration: "none", // Removes underline from all links
          fontSize: "16px",
          fontWeight: "bold",
          textAlign: "left",
          transition: "0.2s",
        }}
        end
      >
        <span className="inline-block mr-2">{iconMap[to]}</span>
        <span>{text}</span>
      </NavLink>
    </div>
  );
};

export default SidebarButton;