const path = require('path');
const express = require('express');
// const fileUpload = require('express-fileupload');
const morgan = require('morgan');

// const { AUTH_TOKEN } = require('./config');

const app = express();

const PORT = 3030;
const FILES_STORE = path.join(__dirname, 'files/');

// app.use(fileUpload());
app.use('/updates', express.static(path.join(__dirname, 'files')));
app.use(morgan('dev'));

app.get('/updates/ping', (req, res) => {
  // const authToken = req.get('Authorization');
  // if (!authToken || authToken !== AUTH_TOKEN) {
  //   return res.status(401).json({ message: 'Unauthorized' });
  // }
  return res.status(200).json({ message: 'Server is up!' });
});

app.post('/updates/upload', (req, res) => {
  // const authToken = req.get('Authorization');
  // if (!authToken || authToken !== AUTH_TOKEN) {
  //   return res.status(401).json({ message: 'Unauthorized' });
  // }

  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).json({ message: 'No files were uploaded.' });
  }

  const files = req.files.File;

  if (Array.isArray(files)) {
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const path = `${FILES_STORE}${file.name}`;
      file.mv(path, (err) => {
        if (err) {
          console.log(err);
          return res.status(500).json({ message: 'An error occured during upload, please try again' });
        }
      });
    }
  } else {
    const path = `${FILES_STORE}${files.name}`;
    files.mv(path, (err) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ message: 'An error occured during upload, please try again' });
      }
    });
  }

  return res.status(200).json({ message: 'Files were uploaded' });
});

app.listen(PORT, () => {
  console.log(`Express server listening on port ${PORT}`);
});