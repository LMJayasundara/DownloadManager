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
    return { status: "success", token: response.data.token, license: response.data.license, userId: response.data.id, mediaData: response.data.mediaData };
  } catch (error) {
    // console.error('Failed to login user:', error.response ? error.response.data : error.message);
    return {
      status: "error",
      message: error.response ? error.response.data : 'Network error! Check your connection'
    };
  }
}

export async function checkLicense(userId) {
  const url = 'https://playdownloader.com/api/license/check';
  const bodyData = {
    user_id: userId
  };

  try {
    const response = await axios.post(url, bodyData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    return {
      status: "success",
      message: "License is valid"
    };
  } catch (error) {
    return {
      status: "error",
      message: error.response ? error.response.data : 'Network error! Check your connection'
    };
  }
}

export async function userMediaUpdate(user_id, videos, playlists) {
  const url = 'https://playdownloader.com/api/UserMedia/Update';
  const mediaData = {
    user_id: user_id,
    videos: videos,
    playlists: playlists
  };

  try {
    const response = await axios.post(url, mediaData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    return { status: "success", response: response.data };
  } catch (error) {
    return {
      status: "error",
      message: error.response ? error.response.data : 'User Media Update Error'
    };
  }
}

export async function logoutApi(user_id) {
  try {
    const response = await axios.post('https://playdownloader.com/api/User/Logout', {
      user_id: user_id
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    return { status: "success", response: response.data };
  } catch (error) {
    // console.error('Failed to update user status on disconnect:', error.message);
    return {
      status: "error",
      message: error.response ? error.response.data : 'Logout Failed'
    };
  }
}
