import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import LoginBackground from "../assets/login-background.jpg";
import AppLogo from "../assets/icon.png"; // Make sure this points to your logo's path
import { useData } from '../DownloadContext';
import { PropagateLoader } from 'react-spinners';
const ipcRenderer = electron.ipcRenderer;

// Email validation function
function isValidEmail(email) {
  const regex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
  return regex.test(email) && email.trim() !== '';
}

function Login() {
  const { checkRes, status } = useData();
  const navigate = useNavigate();
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false); // New loading state

  useEffect(() => {
    ipcRenderer.send('page', { page: 'Check' });
  
    return () => {
      ipcRenderer.removeAllListeners('page');
    };
  }, []);

  function login() {
    setLoading(true); // Set loading to true when login starts
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // Reset error messages
    setEmailError('');
    setPasswordError('');

    if (!isValidEmail(email)) {
      setEmailError("Please enter a valid email address.");
      setLoading(false); // Reset loading if there's an error
      return;
    }

    if (password.trim() === '') {
      setPasswordError("Password cannot be empty.");
      setLoading(false); // Reset loading if there's an error
      return;
    }

    ipcRenderer.send('page', { page: 'Login', email: email, password: password, rememberMe: rememberMe });
  }

  useEffect(() => {
    if(checkRes.username !== "" && checkRes.password !== ""){
      setLoading(true);
    }
    setEmail(checkRes.username);
    setPassword(checkRes.password);
    // setRememberMe(checkRes.rememberMe);
  }, [checkRes, navigate]);

  useEffect(() => {
    if(status.status == "success") {
      navigate("/home");
    } else {
      setEmailError('');
      setPasswordError('');
      setEmail('');
      setPassword('')
    }
    setLoading(false); // Reset loading if there's an error
  }, [status]);

  function handleRememberMeChange(e) {
    setRememberMe(e.target.checked);
  }

  // Update email state and clear its error message
  function handleEmailChange(e) {
    setEmail(e.target.value);
    setEmailError('');
  }

  // Update password state and clear its error message
  function handlePasswordChange(e) {
    setPassword(e.target.value);
    setPasswordError('');
  }

  return (
    <div className='flex h-screen'>
      {/* Left column for image */}
      <div className='w-1/2 bg-cover bg-center' style={{ backgroundImage: `url(${LoginBackground})` }}></div>

      {/* Right column for form */}
      <div className='w-1/2 flex flex-col items-center justify-center space-y-6'>
        {/* App Logo */}
        <img src={AppLogo} alt="App Logo" className="w-32 h-32" /> {/* Adjust size as needed */}

        {/* Login Text */}
        <h1 className='text-2xl font-bold text-gray-800'>Login to Play Downloader</h1>

        <div className='w-full max-w-xs'>
          <form className='space-y-4' onSubmit={(e) => e.preventDefault()}>
            <input
              id="email"
              type="email"
              value={email}
              onChange={handleEmailChange}
              placeholder="Email"
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            />
            {emailError && <div className="text-red-500">{emailError}</div>}
            <input
              id="password"
              type="password"
              value={password}
              onChange={handlePasswordChange}
              placeholder="Key"
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            />
            {passwordError && <div className="text-red-500">{passwordError}</div>}
            <button type="submit" onClick={login} className='bg-blue-500 text-white w-full px-4 py-2 rounded hover:bg-blue-600 focus:outline-none'>
              Login
            </button>
            {/* PropagateLoader below the login button */}
            <div className="flex justify-center mt-2">
              <PropagateLoader color="#3498db" loading={loading} size={15} />
            </div>
          </form>

        </div>
      </div>
    </div>
  );
}

export default Login;
