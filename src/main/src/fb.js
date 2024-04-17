const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
// const { getDatabase, ref, set, onValue, remove, update, get } = require("firebase/database");
const { ref, set, getDatabase, child, update, get } = require('firebase/database');

require('dotenv').config();

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.APIKEY,
  authDomain: process.env.AUTHDOMAIN,
  databaseURL: process.env.DATABASEURL,
  projectId: process.env.PROJECTID,
  storageBucket: process.env.STORAGEBUCKET,
  messagingSenderId: process.env.MESSAGINGSENDERID,
  appId: process.env.APPID
};

// Initialize Firebase
const fbapp = initializeApp(firebaseConfig);
// Initialize Realtime Database and get a reference to the service
const db = getDatabase(fbapp);
// Initialize Firebase Authentication
const auth = getAuth(fbapp);

export function appendToDB(path, userID, data) {
  return new Promise((resolve, reject) => {
    // Validate input
    if (!userID || !data || !data.id || !data.title) {
      reject(new Error("Invalid data provided"));
      return;
    }

    let dataRef = null
    switch (path) {
      case 'videos':
        dataRef = ref(db, `Data/${userID}/videos/${data.id}`);
        break;

      case 'playlists':
        dataRef = ref(db, `Data/${userID}/playlists/${data.id}`);
        break;
    
      default:
        break;
    }

    // Construct the path to the specific video under the user's data
    // const dataRef = ref(db, `Data/${userID}/videos/${video.id}`);

    // Check if the video ID already exists for the user
    get(dataRef).then((snapshot) => {
      if (snapshot.exists()) {
        // Video already exists, so we resolve without setting new data
        resolve({ status: "info", message: `Data already exists, not appending` });
      } else {
        // Video does not exist, proceed to set the video data
        // set(videoRef, {
        //   id: video.id,
        //   title: video.title,
        //   thumbnailUrl: video.thumbnailUrl // Include this if you're handling thumbnail URLs
        // })

        set(dataRef, data)
          .then(() => resolve({ status: "success", message: `Data appended successfully` }))
          .catch(error => reject(new Error(`Failed to append data: ${error.message}`)));
      }
    }).catch(error => {
      reject(new Error("Failed to check video existence: " + error.message));
    });
  });
}

export function readFromDB(path, userID) {
  return new Promise((resolve, reject) => {
    if (!userID) {
      reject(new Error("User ID must be provided"));
      return;
    }

    const dataRef = ref(db, `Data/${userID}/${path}`);

    get(dataRef).then((snapshot) => {
      const data = snapshot.val();
      if (data) {
        resolve({ status: "success", message: "Data read succeeded", data: data });
      } else {
        resolve({ status: "error", message: "No data available", data: null });
      }
    }).catch((error) => {
      reject(new Error("Failed to read data: " + error.message));
    });
  });
}

export function login(email, password) {
  return new Promise((resolve, reject) => {
    signInWithEmailAndPassword(auth, email, password)
      .then(userCredential => {
        const userId = userCredential.user.uid;
        resolve({ status: "success", message: "Login succeeded", userId: userId });
      })
      .catch(error => {
        console.log(error);
        let customMessage;
        switch (error.code) {
          case 'auth/user-not-found':
            customMessage = "User not found.";
            break;
          case 'auth/wrong-password':
            customMessage = "Incorrect password.";
            break;
          case 'auth/user-disabled':
            customMessage = "This account has been disabled.";
            break;
          case 'auth/network-request-failed':
            customMessage = "No connection.";
            break;
          default:
            customMessage = "An unknown error occurred. Please try again.";
        }

        resolve({ status: "error", message: customMessage, userId: null });
        return;
      });
  })
};