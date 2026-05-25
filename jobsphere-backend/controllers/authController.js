const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendEmail } = require('../utils/emailService');

const createToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET || 'jobsphere_dev_secret', {
    expiresIn: '7d',
  });
};

const userResponse = (user) => ({
  _id: user._id,
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  provider: user.provider,
  lastLoginAt: user.lastLoginAt,
  loginCount: user.loginCount,
  summary: user.summary || '',
  resume: user.resume || '',
  skills: user.skills || [],
  location: user.location || '',
  notifications: (user.notifications || []).slice(-10).map((n) => ({
    type: n.type,
    message: n.message,
    meta: n.meta,
    read: n.read,
    createdAt: n.createdAt,
  })),
});

const recordLogin = async (user, req, action) => {
  user.lastLoginAt = new Date();
  user.loginCount = (user.loginCount || 0) + 1;
  user.loginHistory = user.loginHistory || [];
  user.loginHistory.push({
    action,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  await user.save();
};

const registerUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role === 'employer' ? 'employer' : 'candidate',
    });
    await recordLogin(user, req, 'register');

    return res.status(201).json({
      user: userResponse(user),
      token: createToken(user._id),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email, provider: 'local' });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    await recordLogin(user, req, 'login');

    return res.json({
      user: userResponse(user),
      token: createToken(user._id),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getMe = async (req, res) => {
  return res.json({ user: userResponse(req.user) });
};

const updateMe = async (req, res) => {
  try {
    const { name, summary, resume, skills, location } = req.body;
    const previousUser = {
      name: req.user.name,
      summary: req.user.summary || '',
      resume: req.user.resume || '',
      skills: req.user.skills || [],
      location: req.user.location || '',
    };

    if (name) req.user.name = name;
    if (typeof summary === 'string') req.user.summary = summary;
    if (typeof resume === 'string') req.user.resume = resume;
    if (typeof location === 'string') req.user.location = location;
    if (skills) {
      req.user.skills = Array.isArray(skills)
        ? skills.map((skill) => skill.trim()).filter(Boolean)
        : String(skills)
            .split(',')
            .map((skill) => skill.trim())
            .filter(Boolean);
    }

    await req.user.save();

    try {
      const changedFields = [];
      if (previousUser.name !== req.user.name) changedFields.push('name');
      if (previousUser.summary !== (req.user.summary || '')) changedFields.push('summary');
      if (previousUser.resume !== (req.user.resume || '')) changedFields.push('resume');
      if (previousUser.location !== (req.user.location || '')) changedFields.push('location');
      if (previousUser.skills.join(',') !== (req.user.skills || []).join(',')) changedFields.push('skills');

      if (req.user.email && changedFields.length > 0) {
        await sendEmail({
          to: req.user.email,
          subject: 'Your JobSphere profile was updated',
          text: `Hi ${req.user.name || 'there'},\n\nYour JobSphere profile was updated. Changed fields: ${changedFields.join(', ')}.\n\nIf you made this change, no action is needed.`,
          html: `<p>Hi ${req.user.name || 'there'},</p><p>Your JobSphere profile was updated.</p><p><strong>Changed fields:</strong> ${changedFields.join(', ')}</p><p>If you made this change, no action is needed.</p>`,
        });
      }
    } catch (emailError) {
      console.warn('Profile update email failed', emailError.message || emailError);
    }

    return res.json({ user: userResponse(req.user) });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
  updateMe,
};
