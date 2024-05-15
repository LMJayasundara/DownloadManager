const axios = require('axios');

async function registerUser() {
  const url = 'https://playdownloader.com/api/User/Register';
  const userData = {
    username: "shan",
    password: "password123",
    license_key: "ABC123",
    device_id: "DEVICE123"
  };

  try {
    const response = await axios.post(url, userData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('User registered successfully:', response.data);
    return response.data; // This can be further processed or returned
  } catch (error) {
    console.error('Failed to register user:', error.response ? error.response.data : error.message);
  }
}

async function login() {
  const url = 'https://playdownloader.com/api/User/Login';
  const userData = {
    username: "shan",
    password: "password123",
    device_id: "DEVICE123"
  };

  try {
    const response = await axios.post(url, userData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('User login successfully:', response.data);
    return response.data; // This can be further processed or returned
  } catch (error) {
    console.error('Failed to login user:', error.response ? error.response.data : error.message);
  }
}

// Call the function to execute the registration
login();

