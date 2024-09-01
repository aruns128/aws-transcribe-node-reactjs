// Import necessary modules
const express = require('express');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const dotenv = require('dotenv');

dotenv.config();

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000;

// Initialize AWS S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Convert stream to a promise-based method
function streamToString(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', chunk => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    stream.on('error', reject);
  });
}

// Define API endpoint
app.get('/get-file', async (req, res) => {
  const bucketName = 'textractuipathindium';
  const objectKey = '1725169635065-IS_Intro.mp4.json';

  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: objectKey
    });

    const response = await s3Client.send(command);
    const data = await streamToString(response.Body);
    const jsonData = JSON.parse(data); // Parse the JSON content

    res.status(200).json(jsonData); // Send JSON response
  } catch (error) {
    console.error('Error fetching the file:', error);
    res.status(500).json({ error: 'Error fetching the file' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
