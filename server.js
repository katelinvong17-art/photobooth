const express = require('express');
const multer = require('multer');
const fs = require('fs');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const upload = multer({ dest: 'uploads/' });

app.post('/upload', upload.single('file'), async (req, res) => {
  const filePath = req.file.path;

  const fileData = fs.readFileSync(filePath);

  // STEP 1: Upload bytes to Google Photos
  const uploadToken = await fetch('https://photoslibrary.googleapis.com/v1/uploads', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.ACCESS_TOKEN}`,
      'Content-type': 'application/octet-stream',
      'X-Goog-Upload-File-Name': 'photostrip.jpg',
      'X-Goog-Upload-Protocol': 'raw'
    },
    body: fileData
  }).then(res => res.text());

  // STEP 2: Create media item
  await fetch('https://photoslibrary.googleapis.com/v1/mediaItems:batchCreate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.ACCESS_TOKEN}`,
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
  res.send('Uploaded to Google Photos');
});

app.listen(3000, () => console.log('Server running on port 3000'));

------------------------------------------------------

2. Install dependencies:

npm init -y
npm install express multer node-fetch dotenv

3. Create .env file:

ACCESS_TOKEN=YOUR_GOOGLE_OAUTH_TOKEN

4. IMPORTANT:
- You must implement OAuth2 to get ACCESS_TOKEN
- Use Google Cloud Console to enable Photos Library API

====================================================== */
