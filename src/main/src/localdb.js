const Store = require('electron-store'); // Adjust this to your actual store import

// Clear stores before creating them
function clearStore(name) {
  const store = new Store({ name });
  store.clear();
}

// clearStore('videoList');
// clearStore('playList');
// clearStore('updateChk');
// clearStore('appInfo');

export const videoList = new Store({ name: 'videoList' });
export const playList = new Store({ name: 'playList' });
export const updateChk = new Store({ name: 'updateChk' });
export const appInfo = new Store({
  name: 'appInfo',
  defaults: {
    cookie: '',  // Default value for cookie
    playlistInterval: 20,  // Default value for playlistInterval
    rememberMe: false,
    username: '',
    password: '',
    deviceId: '',
    license: '',
    userId: ''
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

