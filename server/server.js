const express = require('express');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { TranscribeClient, StartTranscriptionJobCommand, GetTranscriptionJobCommand } = require('@aws-sdk/client-transcribe');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const axios = require('axios');

dotenv.config();

const app = express();
app.use(cors());
const upload = multer({ dest: 'uploads/' });

const awsConfig = {
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
};

const s3Client = new S3Client(awsConfig);
const transcribeClient = new TranscribeClient(awsConfig);

async function getPresignedUrl(bucketName, objectKey) {
  const command = new GetObjectCommand({ Bucket: bucketName, Key: objectKey });
  return getSignedUrl(s3Client, command, { expiresIn: 3600 });
}

app.post('/transcribe', upload.single('file'), async (req, res) => {
  const file = req.file;
  const filePath = path.resolve(file.path);
  const fileName = `${Date.now()}-${file.originalname}`;

  try {
    // Upload file to S3
    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: fileName,
      Body: fs.createReadStream(filePath),
    }));

    const mediaFileUri = `s3://${process.env.S3_BUCKET_NAME}/${fileName}`;

    // Start transcription job
    await transcribeClient.send(new StartTranscriptionJobCommand({
      TranscriptionJobName: fileName,
      LanguageCode: 'en-US',
      Media: { MediaFileUri: mediaFileUri },
      OutputBucketName: process.env.S3_BUCKET_NAME,
    }));

    // Polling for transcription job completion
    let transcriptionJobCompleted = false;
    while (!transcriptionJobCompleted) {
      const { TranscriptionJob } = await transcribeClient.send(new GetTranscriptionJobCommand({ TranscriptionJobName: fileName }));

      if (TranscriptionJob.TranscriptionJobStatus === 'COMPLETED') {
        const transcriptUri = await getPresignedUrl(process.env.S3_BUCKET_NAME, `${fileName}.json`);
        const transcriptResponse = await axios.get(transcriptUri);

        res.status(200).json(transcriptResponse.data);
        transcriptionJobCompleted = true;
      } else if (TranscriptionJob.TranscriptionJobStatus === 'FAILED') {
        res.status(500).json({ message: 'Transcription job failed' });
        return;
      } else {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      }
    }
  } catch (error) {
    console.error('Error processing file:', error);
    res.status(500).send('Error processing file');
  } finally {
    fs.unlinkSync(filePath);
  }
});

app.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});

