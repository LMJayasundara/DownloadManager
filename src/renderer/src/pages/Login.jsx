import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import LoginBackground from "../assets/login-background.jpg";
import AppLogo from "../assets/icon.png"; // Make sure this points to your logo's path
const ipcRenderer = electron.ipcRenderer;

// Email validation function
function isValidEmail(email) {
  const regex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
  return regex.test(email) && email.trim() !== '';
}

function Login() {
  const navigate = useNavigate();
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // Reset error messages
    setEmailError('');
    setPasswordError('');

    if (!isValidEmail(email)) {
      setEmailError("Please enter a valid email address.");
      return;
    }

    if (password.trim() === '') {
      setPasswordError("Password cannot be empty.");
      return;
    }

    ipcRenderer.send('page', { page: 'Login', email: email, password: password });
  }

  useEffect(() => {
    ipcRenderer.on('status', (data) => {
      // console.log(data);
      if(data == "success") {
        navigate("/home");
      } else{
        // Reset error messages
        setEmailError('');
        setPasswordError('');
        setEmail('');
        setPassword('')
      }
    });
  
    return () => {
      ipcRenderer.removeAllListeners('status');
    };
  }, []);

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
        <h1 className='text-2xl font-bold text-gray-800'>Login Play Downloader</h1>

        <div className='w-full max-w-xs'>
          {/* test */}
          {/* <form className='space-y-4'>
            <input
              id="email"
              type="email"
              placeholder="Email"
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            />
            <input
              id="password"
              type="password"
              placeholder="Password"
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            />
            <button type="button" onClick={login} className='bg-blue-500 text-white w-full px-4 py-2 rounded hover:bg-blue-600 focus:outline-none'>
              Login
            </button>
          </form> */}

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
              placeholder="Password"
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            />
            {passwordError && <div className="text-red-500">{passwordError}</div>}
            <button type="button" onClick={login} className='bg-blue-500 text-white w-full px-4 py-2 rounded hover:bg-blue-600 focus:outline-none'>
              Login
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}

export default Login;
