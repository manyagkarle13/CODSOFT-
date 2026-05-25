const Application = require('../models/Application');
const Job = require('../models/Job');
const User = require('../models/User');
const { sendEmail, sendEmailDetailed } = require('../utils/emailService');

const applyForJob = async (req, res) => {
  try {
    const { jobId, resume, coverLetter } = req.body;

    if (!jobId || !resume) {
      return res.status(400).json({ message: 'Job ID and resume are required' });
    }

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    const existingApplication = await Application.findOne({
      jobId,
      candidateId: req.user._id,
    });

    if (existingApplication) {
      return res.status(409).json({ message: 'You have already applied for this job' });
    }

    const application = await Application.create({
      jobId,
      candidateId: req.user._id,
      resume,
      coverLetter: coverLetter || '',
    });

    await Job.findByIdAndUpdate(jobId, { $inc: { applicationsCount: 1 } });

    // Send confirmation email to the candidate and notification to the employer
    try {
      const jobWithEmployer = await Job.findById(jobId).populate('postedBy', 'name email');
      const candidate = req.user;
      if (candidate?.email) {
        await sendEmail({
          to: candidate.email,
          subject: `Application submitted for ${jobWithEmployer.title}`,
          text: `Hi ${candidate.name},\n\nYour application for ${jobWithEmployer.title} at ${jobWithEmployer.company} has been submitted successfully. We will notify you when the employer updates your application status.\n\nThank you for using JobSphere.`,
          html: `<p>Hi ${candidate.name},</p><p>Your application for <strong>${jobWithEmployer.title}</strong> at <strong>${jobWithEmployer.company}</strong> has been submitted successfully.</p><p>We will notify you when the employer updates your application status.</p><p>Thank you for using JobSphere.</p>`,
        });
      }

      if (jobWithEmployer?.postedBy?.email) {
        await sendEmail({
          to: jobWithEmployer.postedBy.email,
          subject: `New application for ${jobWithEmployer.title}`,
          text: `Hi ${jobWithEmployer.postedBy.name},\n\n${candidate.name} has applied to ${jobWithEmployer.title}. Log in to review the application and update the status.`,
          html: `<p>Hi ${jobWithEmployer.postedBy.name},</p><p><strong>${candidate.name}</strong> has applied for <strong>${jobWithEmployer.title}</strong>.</p><p>Log in to your employer dashboard to review the application and update the status.</p>`,
        });
      }
    } catch (emailError) {
      console.warn('Email notification failed for application submission', emailError.message || emailError);
    }

    return res.status(201).json({ application });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getApplications = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    let filter = {};

    if (req.user.role === 'candidate') {
      filter.candidateId = req.user._id;
    } else if (req.user.role === 'employer') {
      const jobs = await Job.find({ postedBy: req.user._id }).select('_id');
      const jobIds = jobs.map((job) => job._id);
      filter.jobId = { $in: jobIds };
    }

    const applications = await Application.find(filter)
      .populate('jobId', 'title company location')
      .populate('candidateId', 'name email')
      .sort({ appliedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Application.countDocuments(filter);

    return res.json({
      applications,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getApplicationsByJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    if (job.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view these applications' });
    }

    const applications = await Application.find({ jobId })
      .populate('candidateId', 'name email')
      .sort({ appliedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Application.countDocuments({ jobId });

    return res.json({
      applications,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getApplicationsByCandidate = async (req, res) => {
  try {
    const { candidateId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    if (req.user._id.toString() !== candidateId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to view these applications' });
    }

    const applications = await Application.find({ candidateId })
      .populate('jobId', 'title company location')
      .sort({ appliedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Application.countDocuments({ candidateId });

    return res.json({
      applications,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    let notificationEmailSent = false;
    let notificationEmailRecipient = '';
    let notificationEmailError = '';

    if (!['applied', 'reviewing', 'rejected', 'accepted'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const application = await Application.findById(id).populate('jobId');

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    if (application.jobId.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this application' });
    }

    const updatedApplication = await Application.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    ).populate('jobId', 'title company').populate('candidateId', 'name email');

    // Push a notification to the candidate so they see status changes in their profile
    try {
      const candidateId = updatedApplication.candidateId && (updatedApplication.candidateId._id || updatedApplication.candidateId);
      if (candidateId) {
        const candidate = await User.findById(candidateId);
        if (candidate) {
          candidate.notifications = candidate.notifications || [];
          candidate.notifications.push({
            type: 'application_status',
            message: `Your application for ${updatedApplication.jobId?.title || 'the job'} is now ${status}`,
            meta: { applicationId: updatedApplication._id, jobId: updatedApplication.jobId?._id, status },
            read: false,
          });
          if (candidate.notifications.length > 50) candidate.notifications = candidate.notifications.slice(-50);
          await candidate.save();

          if (candidate.email) {
            notificationEmailRecipient = candidate.email;
            const emailResult = await sendEmailDetailed({
              to: candidate.email,
              subject: `Application status updated for ${updatedApplication.jobId?.title}`,
              text: `Hi ${candidate.name || 'Candidate'},\n\nYour application for ${updatedApplication.jobId?.title} has been updated to ${status}.\n\nLog in to JobSphere to view the latest details.`,
              html: `<p>Hi ${candidate.name || 'Candidate'},</p><p>Your application for <strong>${updatedApplication.jobId?.title}</strong> has been updated to <strong>${status}</strong>.</p><p>Log in to JobSphere to view the latest details.</p>`,
            });
            notificationEmailSent = emailResult.sent;
            notificationEmailError = emailResult.error;
          }
        }
      }
    } catch (notifyErr) {
      console.warn('Failed to add candidate notification or send email', notifyErr.message || notifyErr);
    }

    return res.json({
      application: updatedApplication,
      notificationEmailSent,
      notificationEmailRecipient,
      notificationEmailError,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getApplicationResume = async (req, res) => {
  try {
    const { id } = req.params;

    const application = await Application.findById(id).populate('jobId');
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // Authorization: candidate who applied or employer who posted the job (or admin)
    if (
      req.user.role === 'candidate' &&
      application.candidateId.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'Not authorized to view this resume' });
    }

    if (
      req.user.role === 'employer' &&
      application.jobId.postedBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'Not authorized to view this resume' });
    }

    const resume = application.resume;
    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }

    // If resume is a data URL (base64), parse and send as file
    if (typeof resume === 'string' && resume.startsWith('data:')) {
      const match = resume.match(/^data:(.+);base64,(.+)$/);
      if (!match) {
        return res.status(400).json({ message: 'Invalid resume data' });
      }
      const mime = match[1];
      const b64 = match[2];
      const buffer = Buffer.from(b64, 'base64');
      res.set('Content-Type', mime);
      // Suggest a filename based on candidate or job
      const filename = `${application.candidateId || 'resume'}.pdf`;
      res.set('Content-Disposition', `inline; filename="${filename}"`);
      return res.send(buffer);
    }

    // If resume is an HTTP(S) URL, redirect the client
    if (typeof resume === 'string' && /^https?:\/\//i.test(resume)) {
      return res.redirect(resume);
    }

    // Otherwise assume plain base64 without data prefix
    try {
      const buffer = Buffer.from(resume, 'base64');
      res.set('Content-Type', 'application/pdf');
      res.set('Content-Disposition', 'inline; filename="resume.pdf"');
      return res.send(buffer);
    } catch (err) {
      return res.status(400).json({ message: 'Unsupported resume format' });
    }
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  applyForJob,
  getApplications,
  getApplicationsByJob,
  getApplicationsByCandidate,
  updateApplicationStatus,
  getApplicationResume,
};
