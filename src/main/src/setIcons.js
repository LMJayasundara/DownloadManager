// Function to dynamically import the icon based on the platform
export const getIcon = async () => {
  if (process.platform === 'win32') {
    const module = await import('../../../resources/icon.ico?asset');
    return module.default;
  } else {
    const module = await import('../../../resources/icon.png?asset');
    return module.default;
  }
};

// Function to get the tray icon path based on the platform
export const getTrayIcon = () => {
  if (process.platform === 'win32') {
    return '../../resources/icon.ico';
  } else {
    return '../../resources/icon.png';
  }
};

// Function to dynamically load the default thumbnail image
export async function loadDefaultThumbnail() {
  const module = await import('../../../resources/default-thumbnail.jpg');
  return module.default;
}

// Function to dynamically load the default author photo
export async function loadDefaultAuthor() {
  const module = await import('../../../resources/default-author-photo.jpg');
  return module.default;
}