# JobSphere

JobSphere is a full-stack job board web application where employers can post job openings and manage applicants, while job seekers can browse jobs, apply with a resume, and track application updates from a candidate dashboard.

## Live Deployment

- Frontend: https://jobsphereweb.netlify.app/
- Backend API: https://jobsphere-backend-exta.onrender.com
- Database: MongoDB Atlas

## Project Overview

JobSphere was built as a MERN-style job board using React, Node.js, Express, and MongoDB. The application supports separate candidate and employer workflows, secure email/password authentication, job posting, job search, resume-based applications, employer review actions, and email notifications for important updates.

The hero image featuring the girl on the website is AI-generated and is used as a visual design asset for the web application.

## Features

- Home page with a professional landing experience
- User authentication with secure email/password signup and login
- Candidate and employer account types
- Employer dashboard for posting and managing jobs
- Candidate dashboard for job discovery, profile management, and applications
- Job listings with search and filtering support
- Job details and application flow
- Resume upload/link support during job application
- Employer application review and status updates
- Email notifications for successful applications and application status updates
- Profile update email notifications
- Responsive layout for desktop, tablet, and mobile screens
- MongoDB Atlas database integration
- Backend deployed on Render
- Frontend deployed on Netlify

## Tech Stack

### Frontend

- React
- Vite
- CSS
- Netlify deployment

### Backend

- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT authentication
- bcrypt password hashing
- Nodemailer email notifications
- Render deployment

### Database

- MongoDB Atlas

## Folder Structure

```text
Jobsphere-main/
+-- jobsphere-backend/
|   +-- config/
|   +-- controllers/
|   +-- middleware/
|   +-- models/
|   +-- routes/
|   +-- utils/
|   +-- server.js
|   +-- package.json
+-- jobsphere-frontend/
|   +-- public/
|   +-- src/
|   |   +-- assets/
|   |   +-- pages/
|   |   +-- styles/
|   |   +-- App.jsx
|   |   +-- main.jsx
|   +-- package.json
+-- README.md
```

## Main Workflows

### Candidate

1. Create a candidate account or log in.
2. Search and browse available jobs.
3. Apply for a job with resume information.
4. Track submitted applications from the candidate dashboard.
5. Receive email notifications when an employer updates application status.

### Employer

1. Create an employer account or log in.
2. Post job openings with details such as title, company, location, type, salary, skills, and description.
3. View applications received for posted jobs.
4. Review candidate information and resumes.
5. Update application status such as Applied, Reviewing, Rejected, or Accepted.
6. Trigger email notifications to candidates.

## API Highlights

### Authentication

- `POST /api/auth/register` - Register a candidate or employer
- `POST /api/auth/login` - Log in with email and password
- `GET /api/auth/me` - Get current authenticated user
- `PUT /api/auth/me` - Update profile details

### Jobs

- `GET /api/jobs` - Get active job listings
- `GET /api/jobs/:id` - Get job details
- `POST /api/jobs` - Create a job
- `PUT /api/jobs/:id` - Update a job
- `DELETE /api/jobs/:id` - Delete a job
- `GET /api/jobs/employer/my-jobs` - Get jobs posted by the logged-in employer

### Applications

- `POST /api/applications` - Apply for a job
- `GET /api/applications` - Get applications based on logged-in user role
- `GET /api/applications/job/:jobId` - Get applications for a specific job
- `GET /api/applications/candidate/:candidateId` - Get candidate applications
- `PUT /api/applications/:id` - Update application status
- `GET /api/applications/:id/resume` - View submitted resume

## Environment Variables

Create a `.env` file inside `jobsphere-backend`.

```env
PORT=5000
MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_jwt_secret

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_app_password
EMAIL_FROM=JobSphere <your_email@gmail.com>
```

Create a `.env` file inside `jobsphere-frontend`.

```env
VITE_API_URL=http://localhost:5000
```

For the deployed frontend, `VITE_API_URL` should point to:

```env
VITE_API_URL=https://jobsphere-backend-exta.onrender.com
```

## Local Setup

### Backend

```bash
cd jobsphere-backend
npm install
npm run start
```

The backend runs on:

```text
http://localhost:5000
```

### Frontend

```bash
cd jobsphere-frontend
npm install
npm run dev
```

The frontend runs on:

```text
http://localhost:5173
```

## Deployment

### Backend on Render

The backend is deployed on Render:

```text
https://jobsphere-backend-exta.onrender.com
```

Render environment variables should include the MongoDB Atlas URI, JWT secret, and email SMTP credentials.

### Frontend on Netlify

The frontend is deployed on Netlify:

```text
https://jobsphereweb.netlify.app/
```

The Netlify environment variable `VITE_API_URL` should point to the deployed Render backend.

### Database on MongoDB Atlas

MongoDB Atlas is used as the cloud database for users, jobs, and applications.

## Email Notifications

JobSphere uses Nodemailer for email notifications. Emails are sent for:

- Successful job applications
- New applications received by employers
- Application status updates such as Accepted or Rejected
- Candidate profile updates
- Employer job updates where relevant

Gmail SMTP requires an app password when two-step verification is enabled.

## Mobile Responsiveness

The application includes responsive layouts for:

- Landing page sections
- Authentication modal
- Employer dashboard
- Candidate dashboard
- Job cards and lists
- Application tables

On smaller screens, dashboard navigation adapts into a horizontal menu and wide application tables support horizontal scrolling for usability.

## Notes

- Google login was removed to keep authentication stable and focused on email/password login.
- The girl shown in the web app hero section is AI-generated and not a real person.
- Sensitive values such as MongoDB URI, JWT secret, and email password should never be committed to GitHub.

## Author

Developed by Manya G Karle.
