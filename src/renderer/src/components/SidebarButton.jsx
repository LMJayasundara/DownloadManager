// const SidebarButton = ({ text, onClick, currentPage }) => (
//   <div className="p-4">
//     <button
//       onClick={onClick}
//       className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded inline-flex items-center"
//       style={{
//         display: "flex",
//         width: "100%",
//         padding: "16px",
//         borderRadius: "30px",
//         backgroundColor: currentPage === "home" ? "#bad5ff" : "transparent",
//         border: "none",
//         cursor: "pointer",
//         fontSize: "16px",
//         fontWeight: "bold",
//         textAlign: "left",
//         transition: "0.2s",
//         color: currentPage === "home" ? "#004aff" : "#fff",
//         alignItems: "center",
//         justifyContent: "flex-start",
//         gap: "10px",
//       }}

//     >
//       <span>{text}</span>
//       <svg className="fill-current w-4 h-4 ml-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
//         <path d="M0 0l10 10-10 10V0z" />
//       </svg>
//     </button>
//   </div>
// );

// export default SidebarButton;

/////////////////////////////////////////////////////////////////////////////////////////

// // SidebarButton.js
// const SidebarButton = ({ text, page, currentPage, setCurrentPage }) => {
//     // Determine if this button is the current page
//     const isActive = currentPage === page;

//     // Define the base styles
//     const baseStyle = {
//         display: "flex",
//         width: "100%",
//         padding: "16px",
//         borderRadius: "30px",
//         border: "none",
//         cursor: "pointer",
//         fontSize: "16px",
//         fontWeight: "bold",
//         textAlign: "left",
//         transition: "0.2s",
//         alignItems: "center",
//         justifyContent: "flex-start",
//         gap: "10px",
//     };

//     // Define the active and inactive styles
//     const activeStyle = {
//         backgroundColor: "#bad5ff",
//         color: "#004aff",
//     };

//     const inactiveStyle = {
//         backgroundColor: "transparent",
//         color: "#fff",
//     };

//     // Combine base styles with active/inactive styles
//     const buttonStyle = {
//         ...baseStyle,
//         ...(isActive ? activeStyle : inactiveStyle),
//     };

//     return (
//         <div className="p-4">
//             <link
//                 rel="stylesheet"
//                 href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@48,600,0,0"
//             />
//             <link
//                 rel="stylesheet"
//                 href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@48,600,0,0"
//             />
//             <link
//                 rel="stylesheet"
//                 href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@48,600,0,0"
//             />
//             <button
//                 onClick={() => setCurrentPage(page)}
//                 className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded inline-flex items-center"
//                 style={buttonStyle}
//             >
//                 <span className="material-symbols-outlined" >{text}</span>
//                 {/* ... SVG icon or other elements ... */}
//             </button>
//         </div>
//     );
// };

// export default SidebarButton;

/////////////////////////////////////////////////////////////////////////////////

// import React from "react";
// import { GoHome, GoSearch } from "react-icons/go";
// import { MdOutlineFeaturedPlayList } from "react-icons/md";
// import { IoSettingsOutline } from "react-icons/io5";
// import { LuHelpCircle } from "react-icons/lu";

// const iconMap = {
//   home: <GoHome />,
//   search: <GoSearch />,
//   playlists: <MdOutlineFeaturedPlayList />,
//   settings: <IoSettingsOutline />,
//   help: <LuHelpCircle /> // Use the appropriate icon name here
// };

// const SidebarButton = ({ text, page, currentPage, setCurrentPage }) => {
//   const isActive = currentPage === page;
  
//   const buttonClass = isActive
//     ? "bg-blue-500 text-white" // active classes
//     : "text-gray-400 hover:text-white hover:bg-blue-700"; // inactive classes

//   // Get the icon name from the mapping based on the page
//   const iconName = iconMap[page] || "help_outline"; // Default to 'help_outline' if the page is not found

//   return (
//     <div className="p-4">
//       <button
//         onClick={() => setCurrentPage(page)}
//         className={`font-bold py-2 px-4 rounded inline-flex items-center ${buttonClass}`}
//         style={{
//           display: "flex",
//           width: "100%",
//           padding: "16px",
//           borderRadius: "30px",
//           alignItems: "center",
//           justifyContent: "flex-start",
//           gap: "10px",
//           backgroundColor: isActive ? "#bad5ff" : "transparent",
//           color: isActive ? "#004aff" : "#fff",
//           border: "none",
//           cursor: "pointer",
//           fontSize: "16px",
//           fontWeight: "bold",
//           textAlign: "left",
//           transition: "0.2s",
//         }}
//       >
//         {/* Render the icon based on the page */}
//         <span>{iconName}</span>
//         <span>{text}</span>
//       </button>
//     </div>
//   );
// };

// export default SidebarButton;

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

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