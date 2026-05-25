const nodemailer = require('nodemailer');

let transporter;
let transporterVerified = false;

const getEmailConfig = () => ({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT, 10) : undefined,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: process.env.EMAIL_USER && process.env.EMAIL_PASS ? {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  } : undefined,
});

const getTransporter = () => {
  if (transporter) return transporter;

  const emailConfig = getEmailConfig();
  if (!emailConfig.host || !emailConfig.port || !emailConfig.auth) {
    return null;
  }

  transporter = nodemailer.createTransport(emailConfig);
  return transporter;
};

const verifyTransporter = () => {
  const activeTransporter = getTransporter();
  if (!activeTransporter || transporterVerified) return;

  transporterVerified = true;
  activeTransporter.verify((error) => {
    if (error) {
      console.warn('Email transporter verification failed:', error.message || error);
    } else {
      console.log('Email transporter is configured and ready.');
    }
  });
};

const buildMailOptions = ({ to, subject, text, html, from }) => {
  const emailFrom = from || process.env.EMAIL_FROM || 'no-reply@jobsphere.app';

  return {
    from: emailFrom,
    to,
    subject,
    text,
    html,
  };
};

const sendEmailDetailed = async ({ to, subject, text, html, from }) => {
  const activeTransporter = getTransporter();

  if (!activeTransporter) {
    console.warn('Email transporter is not configured. Skipping email send.');
    console.info({ to, subject, text, html });
    return {
      sent: false,
      error: 'Email transporter is not configured',
    };
  }

  const mailOptions = buildMailOptions({ to, subject, text, html, from });

  try {
    await activeTransporter.sendMail(mailOptions);
    return {
      sent: true,
      error: '',
    };
  } catch (error) {
    console.error('Email send failed:', error);
    return {
      sent: false,
      error: error.message || 'Email send failed',
    };
  }
};

const sendEmail = async (mailOptions) => {
  const result = await sendEmailDetailed(mailOptions);
  return result.sent;
};

module.exports = {
  sendEmail,
  sendEmailDetailed,
  verifyTransporter,
};
