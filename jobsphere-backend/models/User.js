const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      minlength: 6,
      required() {
        return this.provider === 'local';
      },
    },
    provider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local',
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    role: {
      type: String,
      enum: ['candidate', 'employer'],
      default: 'candidate',
    },
    lastLoginAt: {
      type: Date,
    },
    loginCount: {
      type: Number,
      default: 0,
    },
    loginHistory: [
      {
        action: {
          type: String,
          enum: ['register', 'login', 'google'],
          required: true,
        },
        loggedAt: {
          type: Date,
          default: Date.now,
        },
        ipAddress: String,
        userAgent: String,
      },
    ],
    summary: {
      type: String,
      default: '',
    },
    resume: {
      type: String,
      default: '',
    },
    skills: [String],
    location: {
      type: String,
      default: '',
    },
    notifications: [
      {
        type: { type: String, default: 'info' },
        message: String,
        meta: mongoose.Schema.Types.Mixed,
        read: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
