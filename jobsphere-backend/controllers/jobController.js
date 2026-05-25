const Job = require('../models/Job');
const Application = require('../models/Application');
const { sendEmail } = require('../utils/emailService');

const compactChangedFields = (before, after, fields) => {
  return fields.filter((field) => {
    const beforeValue = Array.isArray(before[field]) ? before[field].join(',') : before[field];
    const afterValue = Array.isArray(after[field]) ? after[field].join(',') : after[field];
    return String(beforeValue ?? '') !== String(afterValue ?? '');
  });
};

const notifyJobUpdate = async ({ before, after, employer, action, changedFields = [] }) => {
  try {
    const fieldText = changedFields.length ? ` Changed fields: ${changedFields.join(', ')}.` : '';

    if (employer?.email) {
      await sendEmail({
        to: employer.email,
        subject: `Job ${action}: ${after?.title || before?.title || 'JobSphere job'}`,
        text: `Hi ${employer.name || 'there'},\n\nYour JobSphere job "${after?.title || before?.title}" was ${action}.${fieldText}`,
        html: `<p>Hi ${employer.name || 'there'},</p><p>Your JobSphere job <strong>${after?.title || before?.title}</strong> was ${action}.</p>${changedFields.length ? `<p><strong>Changed fields:</strong> ${changedFields.join(', ')}</p>` : ''}`,
      });
    }

    if (action !== 'updated') return;

    const applications = await Application.find({ jobId: after._id })
      .populate('candidateId', 'name email')
      .limit(200);

    const recipients = applications
      .map((application) => application.candidateId)
      .filter((candidate) => candidate?.email);

    await Promise.all(recipients.map((candidate) => sendEmail({
      to: candidate.email,
      subject: `Job update: ${after.title}`,
      text: `Hi ${candidate.name || 'there'},\n\nA job you applied for has been updated: ${after.title} at ${after.company}.${fieldText}\n\nLog in to JobSphere to view the latest details.`,
      html: `<p>Hi ${candidate.name || 'there'},</p><p>A job you applied for has been updated: <strong>${after.title}</strong> at <strong>${after.company}</strong>.</p>${changedFields.length ? `<p><strong>Changed fields:</strong> ${changedFields.join(', ')}</p>` : ''}<p>Log in to JobSphere to view the latest details.</p>`,
    })));
  } catch (emailError) {
    console.warn(`Job ${action} email notification failed`, emailError.message || emailError);
  }
};

const createJob = async (req, res) => {
  try {
    const { title, description, company, location, jobType, salaryMin, salaryMax, skills, requirements, benefits, industry } = req.body;

    if (!title || !description || !company || !location) {
      return res.status(400).json({ message: 'Title, description, company, and location are required' });
    }

    const job = await Job.create({
      title,
      description,
      company,
      location,
      jobType: jobType || 'full-time',
      salaryMin,
      salaryMax,
      skills: skills || [],
      requirements: requirements || '',
      benefits: benefits || '',
      industry: industry || '',
      postedBy: req.user._id,
    });

    await notifyJobUpdate({
      after: job,
      employer: req.user,
      action: 'created',
    });

    return res.status(201).json({ job });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getAllJobs = async (req, res) => {
  try {
    const { search, location, minSalary, maxSalary, jobType, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    let filter = { status: 'active' };

    if (search) {
      filter.$text = { $search: search };
    }

    if (location) {
      filter.location = { $regex: location, $options: 'i' };
    }

    if (minSalary || maxSalary) {
      filter.salaryMin = {};
      if (minSalary) filter.salaryMin.$gte = parseInt(minSalary);
      if (maxSalary) filter.salaryMin.$lte = parseInt(maxSalary);
    }

    if (jobType) {
      filter.jobType = jobType;
    }

    const jobs = await Job.find(filter)
      .populate('postedBy', 'name email company')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Job.countDocuments(filter);

    return res.json({
      jobs,
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

const getJobById = async (req, res) => {
  try {
    const { id } = req.params;

    const job = await Job.findById(id).populate('postedBy', 'name email company');

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    const applicationCount = await Application.countDocuments({ jobId: id });

    return res.json({
      job: {
        ...job.toObject(),
        applicationCount,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateJob = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, company, location, jobType, salaryMin, salaryMax, skills, requirements, benefits, industry, status } = req.body;

    const job = await Job.findById(id);

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    if (job.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this job' });
    }

    const before = job.toObject();

    const updatedJob = await Job.findByIdAndUpdate(
      id,
      {
        title: title || job.title,
        description: description || job.description,
        company: company || job.company,
        location: location || job.location,
        jobType: jobType || job.jobType,
        salaryMin: salaryMin !== undefined ? salaryMin : job.salaryMin,
        salaryMax: salaryMax !== undefined ? salaryMax : job.salaryMax,
        skills: skills || job.skills,
        requirements: requirements || job.requirements,
        benefits: benefits || job.benefits,
        industry: industry || job.industry,
        status: status || job.status,
      },
      { new: true }
    );

    const changedFields = compactChangedFields(before, updatedJob.toObject(), [
      'title',
      'description',
      'company',
      'location',
      'jobType',
      'salaryMin',
      'salaryMax',
      'skills',
      'requirements',
      'benefits',
      'industry',
      'status',
    ]);

    if (changedFields.length > 0) {
      await notifyJobUpdate({
        before,
        after: updatedJob,
        employer: req.user,
        action: 'updated',
        changedFields,
      });
    }

    return res.json({ job: updatedJob });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const deleteJob = async (req, res) => {
  try {
    const { id } = req.params;

    const job = await Job.findById(id);

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    if (job.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this job' });
    }

    await Job.findByIdAndDelete(id);

    await notifyJobUpdate({
      before: job,
      employer: req.user,
      action: 'deleted',
    });

    return res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getEmployerJobs = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const jobs = await Job.find({ postedBy: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Job.countDocuments({ postedBy: req.user._id });

    return res.json({
      jobs,
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

module.exports = {
  createJob,
  getAllJobs,
  getJobById,
  updateJob,
  deleteJob,
  getEmployerJobs,
};
