import axios from 'axios';

export async function login(username, password, device_id) {
  const url = 'https://playdownloader.com/api/User/Login';
  const userData = {
    username: username,
    password: password,
    device_id: device_id
  };

  try {
    const response = await axios.post(url, userData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // console.log('User login successfully:', response.data);
    // return response.data; // This can be further processed or returned
    return { status: "success", token: response.data.token };
  } catch (error) {
    // console.error('Failed to login user:', error.response ? error.response.data : error.message);
    return {
      status: "error",
      message: error.response ? error.response.data : 'Network error or server is down'
    };
  }
}