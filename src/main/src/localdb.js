const Store = require('electron-store'); // Adjust this to your actual store import

export const videoList = new Store({ name: 'videoList' });
export const playList = new Store({ name: 'playList' });
export const appInfo = new Store({
  name: 'appInfo',
  defaults: {
    cookie: '',  // Default value for cookie
    playlistInterval: 5,  // Default value for playlistInterval
    rememberMe: false,
    username: '',
    password: '',
    deviceId: ''
  }
});

// Wrapping the `set` method in a Promise
export function setStoreAsync(store, key, value) {
  return new Promise((resolve, reject) => {
    try {
      store.set(key, value);
      resolve();
    } catch (error) {
      reject(error);
    }
  });
};

// Wrapping the `get` method in a Promise
export function getStoreAsync(store, key) {
  return new Promise((resolve, reject) => {
    try {
      const result = store.get(key);
      resolve(result);
    } catch (error) {
      reject(error);
    }
  });
};

