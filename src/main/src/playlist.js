const { initializeApp } = require('firebase/app');
const { getAuth, onAuthStateChanged } = require('firebase/auth');

const APIKEY="AIzaSyD9fp5tiCqZ5N9AN_shVaEj9Ql4p1jEDcA"
const AUTHDOMAIN="playdownloader-c09a8.firebaseapp.com"
const DATABASEURL="https://playdownloader-c09a8-default-rtdb.europe-west1.firebasedatabase.app"
const PROJECTID="playdownloader-c09a8"
const STORAGEBUCKET="playdownloader-c09a8.appspot.com"
const MESSAGINGSENDERID="942938326356"
const APPID="1:942938326356:web:93c9c6d3c1dced8e68b4c1"
const API_URL="http://167.172.183.235:5000"
const GOOG_OAUTH2_CLIENT_ID="513077233559-8a9tcs107ft5q6tjiu7u6bm6eldgi9if.apps.googleusercontent.com"

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: APIKEY,
  authDomain: AUTHDOMAIN,
  databaseURL: DATABASEURL,
  projectId: PROJECTID,
  storageBucket: STORAGEBUCKET,
  messagingSenderId: MESSAGINGSENDERID,
  appId: APPID
};

// Initialize Firebase
const fbapp = initializeApp(firebaseConfig);
// Initialize Firebase Authentication
const auth = getAuth(fbapp);

// async function getPlaylist(playlistUrl) {
//   const playlistId = playlistUrl.split("list=")[1];
//   console.log(auth.currentUser?.getIdToken());
//   fetch(API_URL + "/get-playlist?playlistId=" + playlistId, {
//     method: "GET",
//     headers: {
//       "Content-Type": "application/json",
//       Authorization: "Bearer " + (await auth.currentUser?.getIdToken()),
//     },
//   })
//     .then((response) => response.json())
//     .then((data) => {
//       console.log("data", data);
//     });
// }

function getPlaylist(playlistUrl) {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      // User is signed in, now you can get the ID token
      user.getIdToken().then((idToken) => {
        const playlistId = playlistUrl.split("list=")[1];
        fetch(API_URL + "/get-playlist?playlistId=" + playlistId, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + idToken,
          },
        })
        .then((response) => response.json())
        .then((data) => {
          console.log("data", data);
        });
      });
    } else {
      // No user is signed in.
      console.log('No user logged in.');
    }
  });
}

getPlaylist("https://www.youtube.com/watch?v=ZzI9JE0i6Lc&list=PL0vfts4VzfNjdPuyk9SJDIvpsOjNgU1bs");