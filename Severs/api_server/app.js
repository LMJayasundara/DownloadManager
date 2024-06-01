require('dotenv').config();
const express = require('express');
const mysql = require('mysql');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const port = 3000;
const hostname = '127.0.0.1';

const app = express();
app.use(express.json());
app.use(cors());

const db = mysql.createConnection({
  host: 'playdownloader.com',
  user: 'playdwl_PlayDownloader',
  password: 'D0=PVSdDK9LP',
  database: 'playdwl_PlayDownloader'
});

db.connect(function (err) {
  if (err) throw err;
  console.log("Connected!");
});

// app.get('/api/users', async (req, res) => {
//   res.status(200).send('Hello World! NodeJS \n');
// });

// Create a new user
app.post('/api/User/Register', async (req, res) => {
  const { username, password, license_key, device_id } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = { username, password: hashedPassword, license_key, device_id, is_active: true };
  db.query('INSERT INTO Users SET ?', newUser, (err, result) => {
    if (err) {
      res.status(500).send('Failed to create user');
      return;
    }
    res.status(201).send({ user_id: result.insertId });
  });
});

app.get('/api/User/GetUserId', (req, res) => {
  const { username } = req.body;

  if (!username) {
    res.status(400).send('Username is required');
    return;
  }

  const query = 'SELECT user_id FROM Users WHERE username = ?';
  db.query(query, [username], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      res.status(500).send('Server error');
      return;
    }

    if (results.length > 0) {
      res.json({ user_id: results[0].user_id });
    } else {
      res.status(404).send('User not found');
    }
  });
});

// Delete a user
app.delete('/api/User/Remove', (req, res) => {
  const { user_id } = req.body;
  db.query('DELETE FROM Users WHERE user_id = ?', [user_id], (err, result) => {
    if (err) {
      res.status(500).send('Failed to delete user');
      return;
    }
    if (result.affectedRows === 0) {
      res.status(404).send('User not found');
      return;
    }
    res.status(200).send('User deleted');
  });
});

// Update user details
app.put('/api/User/Update', async (req, res) => {
  const { user_id, username, password, license_key, device_id, is_active } = req.body;
  const hashedPassword = password ? await bcrypt.hash(password, 10) : undefined;
  let query = 'UPDATE Users SET ';
  let fields = [];
  let data = [];
  if (username) {
    fields.push('username = ?');
    data.push(username);
  }
  if (password) {
    fields.push('password = ?');
    data.push(hashedPassword);
  }
  if (license_key) {
    fields.push('license_key = ?');
    data.push(license_key);
  }
  if (device_id) {
    fields.push('device_id = ?');
    data.push(device_id);
  }
  if (is_active !== undefined) {
    fields.push('is_active = ?');
    data.push(is_active);
  }
  if (fields.length === 0) {
    res.status(400).send('No update fields provided');
    return;
  }
  query += fields.join(', ') + ' WHERE user_id = ?';
  data.push(user_id);

  db.query(query, data, (err, result) => {
    if (err) {
      res.status(500).send('Failed to update user');
      return;
    }
    if (result.affectedRows === 0) {
      res.status(404).send('User not found');
      return;
    }
    res.status(200).send('User updated');
  });
});

function maskString(s, visibleCount = 3) {
  if (s.length <= visibleCount * 2) return s;  // Return original if too short to mask meaningfully
  return s.substr(0, visibleCount) + '*'.repeat(s.length - visibleCount * 2) + s.substr(-visibleCount);
};

app.post('/api/User/Login', async (req, res) => {
  const { username, password, device_id } = req.body;
  db.query('SELECT * FROM Users WHERE username = ?', [username], async (err, results) => {
    if (err) {
      console.error('Database error:', err);
      res.status(500).send('Server error');
      return;
    }
    if (results.length === 0) {
      res.status(404).send('User not found');
      return;
    }

    const user = results[0];
    if (!user.is_active) {
      res.status(403).send('User account is disabled');
      return;
    }

    let mediaData = null;
    if (user.device_id.trim() === "") {
      // Fetch videos and playlists for the user
      mediaData = await new Promise((resolve, reject) => {
        db.query('SELECT videos, playlists FROM UserMedia WHERE user_id = ?', [user.user_id], (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      });
    }

    // Check if device_id in database is empty and update if necessary
    if (user.device_id.trim() === "" && device_id) {
      await new Promise((resolve, reject) => {
        db.query('UPDATE Users SET device_id = ? WHERE user_id = ?', [device_id, user.user_id], (err, result) => {
          if (err) {
            reject(err);
          } else {
            user.device_id = device_id;
            resolve(result);
          }
        });
      });
    }

    try {
      const passwordIsValid = await bcrypt.compare(password, user.password);
      if (!passwordIsValid) {
        res.status(401).send('Invalid credentials');
        return;
      }

      const deviceIsValid = user.device_id === device_id;
      if (!deviceIsValid) {
        res.status(403).send(`User registered on another device, reset your license`);
        return;
      }

      const licenseIsValid = await checkLicense(user.license_key); // Assuming checkLicense is an async function
      if (!licenseIsValid) {
        res.status(403).send('License invalid or expired');
        return;
      }

      if (!process.env.JWT_SECRET) {
        console.error('JWT_SECRET is not defined');
        res.status(500).send('JWT secret is not set');
        return;
      }

      const token = jwt.sign({ user_id: user.user_id }, process.env.JWT_SECRET, { expiresIn: '1h' });
      const newSessionTime = { created_at: new Date(), expires_at: new Date(Date.now() + 3600 * 1000) };
      const maskedLicenseKey = maskString(user.license_key);
      
      // Check for existing session
      db.query('SELECT * FROM Session WHERE user_id = ? AND is_valid = true', [user.user_id], (err, sessionResults) => {
        if (err) {
          console.error('Session check error:', err);
          res.status(500).send('Error checking existing session');
          return;
        }
        
        if (sessionResults.length > 0) {
          // // Update existing session
          // db.query('UPDATE Session SET ? WHERE user_id = ?', [newSessionTime, user.user_id], (err, updateResult) => {
          //   if (err) {
          //     console.error('Session update error:', err);
          //     res.status(500).send('Failed to update session');
          //     return;
          //   }
          //   res.json({ token: token, license: maskedLicenseKey });
          // });

          // Valid session exists, so return an error
          res.status(409).send('User already logged in');
          return;
        } 
        // else {
        //   // Insert new session
        //   const sessionData = { user_id: user.user_id, ...newSessionTime, is_valid: true };
        //   db.query('INSERT INTO Session SET ?', sessionData, (err, insertResult) => {
        //     if (err) {
        //       console.error('Session creation error:', err);
        //       res.status(500).send('Failed to create session');
        //       return;
        //     }
        //     res.json({ token: token, license: maskedLicenseKey });
        //   });
        // }
        else {
          // Define session data
          const sessionData = { user_id: user.user_id, ...newSessionTime, is_valid: true };
        
          // Check if a session already exists for the user_id
          db.query('SELECT * FROM Session WHERE user_id = ?', [user.user_id], (err, existingSessions) => {
            if (err) {
              console.error('Error checking for existing session:', err);
              res.status(500).send('Failed to check for existing session');
              return;
            }
        
            if (existingSessions.length > 0) {
              // Session exists, update it
              db.query('UPDATE Session SET ? WHERE user_id = ?', [sessionData, user.user_id], (err, updateResult) => {
                if (err) {
                  console.error('Error updating session:', err);
                  res.status(500).send('Failed to update session');
                  return;
                }
                res.json({ token: token, license: maskedLicenseKey, id: user.user_id, mediaData: mediaData });
              });
            } else {
              // No session exists, insert new one
              db.query('INSERT INTO Session SET ?', sessionData, (err, insertResult) => {
                if (err) {
                  console.error('Error creating new session:', err);
                  res.status(500).send('Failed to create session');
                  return;
                }
                res.json({ token: token, license: maskedLicenseKey, id: user.user_id, mediaData: mediaData });
              });
            }
          });
        }        
      });
    } catch (bcryptErr) {
      console.error('Bcrypt error:', bcryptErr);
      res.status(500).send('Error processing password validation');
    }
  });
});

// Utility to check license validity
function checkLicense(licenseKey) {
  return new Promise((resolve, reject) => {
    db.query('SELECT * FROM License WHERE license_key = ?', [licenseKey], (err, results) => {
      if (err || results.length === 0) {
        resolve(false);  // Resolve with false if there's an error or no result
        return;
      }
      const license = results[0];
      resolve(license.is_active && new Date(license.expiry_date) > new Date());
    });
  });
};

// API to check the license key
app.post('/api/license/check', async (req, res) => {
  const { user_id } = req.body;

  try {
    const userResults = await new Promise((resolve, reject) => {
      db.query('SELECT license_key FROM Users WHERE user_id = ?', [user_id], (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });

    if (userResults.length === 0) {
      res.status(404).send('User not found');
      return;
    }

    const { license_key } = userResults[0];
    const licenseIsValid = await checkLicense(license_key);

    if (!licenseIsValid) {
      res.status(403).send('License invalid or expired');
      return;
    }

    res.send('License is valid');
  } catch (err) {
    console.error('Error checking license:', err);
    res.status(500).send('Server error');
  }
});

// User logout
app.post('/api/User/Logout', (req, res) => {
  // const { user_id } = parseInt(req.body);
  const user_id = parseInt(req.body.user_id);
  if (isNaN(user_id)) {
    res.status(400).send("Invalid user_id");
    return;
  }
  // db.query('UPDATE Session SET is_valid = 0 WHERE user_id = ?', [user_id], (err, result) => {
  //   if (err) {
  //     res.status(500).send(`Failed to logout ${err}`);
  //     return;
  //   }
  //   res.status(200).send('Logged out successfully');
  // });

  db.query('UPDATE Session SET is_valid = 0 WHERE user_id = ?', [user_id], (err, result) => {
    if (err) {
      console.error("Error in logout process:", err.message);
      res.status(500).send(`Failed to logout: ${err.message}`);
      return;
    }
    if (result.affectedRows === 0) {
      res.status(404).send("User not found or already logged out");
      return;
    }
    res.status(200).send('Logged out successfully');
  });
});

// Deactivate a user
app.post('/api/User/Invoke', (req, res) => {
  const { user_id } = req.body;
  db.query('UPDATE Users SET is_active = false WHERE user_id = ?', [user_id], (err, result) => {
    if (err) {
      res.status(500).send('Failed to deactivate user');
      return;
    }
    res.status(200).send('User deactivated');
  });
});

// Assign a license to a user
app.post('/api/License/Assign', (req, res) => {
  const { user_id, license_key } = req.body;
  db.query('UPDATE Users SET license_key = ? WHERE user_id = ?', [license_key, user_id], (err, result) => {
    if (err) {
      res.status(500).send('Failed to assign license');
      return;
    }
    if (result.affectedRows === 0) {
      res.status(404).send('User not found');
      return;
    }
    res.status(200).send('License assigned successfully');
  });
});

// Validate a license key
app.post('/api/License/Validate', (req, res) => {
  const { license_key } = req.body;
  db.query('SELECT * FROM License WHERE license_key = ?', [license_key], (err, results) => {
    if (err) {
      res.status(500).send('Server error');
      return;
    }
    if (results.length === 0 || !results[0].is_active || new Date(results[0].expiry_date) < new Date()) {
      res.status(401).send('Invalid or expired license');
      return;
    }
    res.status(200).send('License is valid');
  });
});

// Check the current session status
app.get('/api/Session/Check', (req, res) => {
  const { user_id } = req.body;
  db.query('SELECT * FROM Session WHERE user_id = ? AND is_valid = true', [user_id], (err, results) => {
    if (err) {
      res.status(500).send('Failed to check session');
      return;
    }
    if (results.length === 0) {
      res.status(404).send('No active sessions found');
      return;
    }
    res.status(200).send({ session: results[0] });
  });
});

// Insert or update videos and playlists for a user
app.post('/api/UserMedia/Update', async (req, res) => {
  const { user_id, videos, playlists } = req.body;

  // Check for existing record
  db.query('SELECT user_id FROM UserMedia WHERE user_id = ?', [user_id], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      res.status(500).send('Server error');
      return;
    }

    let sql;
    if (results.length > 0) {
      // Update existing record
      sql = 'UPDATE UserMedia SET videos = ?, playlists = ? WHERE user_id = ?';
      db.query(sql, [JSON.stringify(videos), JSON.stringify(playlists), user_id], (err, result) => {
        if (err) {
          res.status(500).send('Failed to update user media');
          return;
        }
        res.status(200).send('User media updated successfully');
      });
    } else {
      // Insert new record
      sql = 'INSERT INTO UserMedia (user_id, videos, playlists) VALUES (?, ?, ?)';
      db.query(sql, [user_id, JSON.stringify(videos), JSON.stringify(playlists)], (err, result) => {
        if (err) {
          res.status(500).send('Failed to create user media');
          return;
        }
        res.status(201).send('User media created successfully');
      });
    }
  });
});

// Get videos and playlists for a user
app.get('/api/UserMedia/Get', (req, res) => {
  const { user_id } = req.query; // Assuming user_id is passed as a query parameter

  if (!user_id) {
    res.status(400).send('User ID is required');
    return;
  }

  const query = 'SELECT videos, playlists FROM UserMedia WHERE user_id = ?';
  db.query(query, [user_id], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      res.status(500).send('Server error');
      return;
    }

    if (results.length === 0) {
      res.status(404).send('No data found for this user');
    } else {
      const { videos, playlists } = results[0];
      res.json({ videos: JSON.parse(videos), playlists: JSON.parse(playlists) });
    }
  });
});

app.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});