const dotenv = require('dotenv');

dotenv.config();

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const jobRoutes = require('./routes/jobRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const { verifyTransporter } = require('./utils/emailService');

connectDB();
verifyTransporter();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
// Increase request body size limits to allow base64 resume uploads from the frontend.
// If large file uploads are expected, consider switching to multipart/form-data with multer.
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.get('/', (req, res) => {
  res.json({ message: 'JobSphere API is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
