const express = require('express');
const {
  applyForJob,
  getApplications,
  getApplicationsByJob,
  getApplicationsByCandidate,
  updateApplicationStatus,
  getApplicationResume,
} = require('../controllers/applicationController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', authMiddleware, applyForJob);
router.get('/', authMiddleware, getApplications);
router.get('/job/:jobId', authMiddleware, getApplicationsByJob);
router.get('/candidate/:candidateId', authMiddleware, getApplicationsByCandidate);
router.get('/:id/resume', authMiddleware, getApplicationResume);
router.put('/:id', authMiddleware, updateApplicationStatus);

module.exports = router;
