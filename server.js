const express = require('express');
const multer = require('multer');
const fs = require('fs');
require('dotenv').config();

const { google } = require('googleapis');

const app = express();
const upload = multer({ dest: 'uploads/' });

/* ================= GOOGLE AUTH SETUP ================= */

const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  'http://localhost:3000/auth/callback'
);

// STEP 1: Get refresh token (run once)
app.get('/auth', (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/photoslibrary.appendonly'
    ]
  });

  res.redirect(url);
});

// STEP 2: Save refresh token
app.get('/auth/callback', async (req, res) => {
  const code = req.query.code;

  const { tokens } = await oauth2Client.getToken(code);

  console.log('YOUR REFRESH TOKEN:', tokens.refresh_token);

  res.send('Check your terminal and copy the refresh token!');
});

/* ================= AUTO AUTH (AFTER SETUP) ================= */

oauth2Client.setCredentials({
  refresh_token: process.env.REFRESH_TOKEN
});

/* ================= UPLOAD ROUTE ================= */

app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const filePath = req.file.path;
    const fileData = fs.readFileSync(filePath);

    const accessToken = await oauth2Client.getAccessToken();

    // Upload bytes
    const uploadToken = await fetch('https://photoslibrary.googleapis.com/v1/uploads', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken.token}`,
        'Content-type': 'application/octet-stream',
        'X-Goog-Upload-File-Name': 'photostrip.jpg',
        'X-Goog-Upload-Protocol': 'raw'
      },
      body: fileData
    }).then(res => res.text());

    // Create media item
    await fetch('https://photoslibrary.googleapis.com/v1/mediaItems:batchCreate', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        newMediaItems: [{
          simpleMediaItem: {
            uploadToken: uploadToken
          }
        }]
      })
    });

    fs.unlinkSync(filePath);

    res.send('✅ Uploaded to your Google Photos!');
  } catch (err) {
    console.error(err);
    res.status(500).send('Upload failed');
  }
});

/* ================= START SERVER ================= */

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
