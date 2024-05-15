function Help() {
  return (
    <div className='flex h-full flex-col items-center justify-center'>
      {/* Adjusted max-w class for a narrower modal */}
      <div className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-lg p-8 border border-gray-200 shadow-md space-y-4 w-full max-w-md mx-auto">
        <p className='text-lg text-center text-gray-900 mb-8'>
          Save videos, audios and YouTube playlists to your PC
        </p>

        <a href="https://playdownloader.com/userguide.html"
          className='text-xl text-blue-500 hover:text-blue-700 underline block text-center'
          target="_blank"
          rel="noopener noreferrer">
          User Guide
        </a>

        <a href="https://playdownloader.com/contact.html"
          className='text-xl text-blue-500 hover:text-blue-700 underline block text-center'
          target="_blank"
          rel="noopener noreferrer">
          Contact Us
        </a>
      </div>
    </div>
  );
}

export default Help;
