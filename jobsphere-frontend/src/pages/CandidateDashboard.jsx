import { useState, useEffect } from 'react';
import '../styles/Dashboard.css';

const currencySymbols = {
  USD: '$',
  INR: '₹',
  EUR: '€',
  GBP: '£',
  CAD: 'CA$',
  AUD: 'A$',
  JPY: '¥',
};

const getSalaryDisplay = (job) => {
  if (job.salary) return job.salary;
  const symbol = currencySymbols[job.currency] || job.currency || '$';
  if (job.salaryMin && job.salaryMax) {
    return `${symbol} ${job.salaryMin.toLocaleString()} - ${symbol} ${job.salaryMax.toLocaleString()}`;
  }
  if (job.salaryMin) {
    return `${symbol} ${job.salaryMin.toLocaleString()}+`;
  }
  return 'Salary not listed';
};

export default function CandidateDashboard({ user, onLogout, onProfileSave, onBackToHome }) {
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [resume, setResume] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeFileName, setResumeFileName] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [savedJobs, setSavedJobs] = useState([]);
  const [appliedIds, setAppliedIds] = useState([]);
  const [profileName, setProfileName] = useState(user.name || '');
  const [profileSummary, setProfileSummary] = useState(user.summary || '');
  const [profileResumeUrl, setProfileResumeUrl] = useState(user.resume || '');
  const [profileSkillsInput, setProfileSkillsInput] = useState((user.skills || []).join(', '));
  const [profileLocation, setProfileLocation] = useState(user.location || '');
  const [profileSaveSuccess, setProfileSaveSuccess] = useState('');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);

  const API_BASE_URL = (import.meta.env.VITE_API_URL || 'https://jobsphere-backend-exta.onrender.com').trim() || 'https://jobsphere-backend-exta.onrender.com';
  const userId = user._id || user.id;

  const parseResponse = async (response) => {
    const text = await response.text();
    try {
      return { ok: response.ok, data: JSON.parse(text) };
    } catch {
      return { ok: response.ok, data: text, parseError: true };
    }
  };

  // Computed values
  const lastLogin = new Date().toLocaleDateString();
  const filteredJobs = jobs.filter(job =>
    searchQuery === '' ||
    job.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const savedJobDetails = jobs.filter((job) => savedJobs.includes(job._id || job.id));
  const profileSkills = profileSkillsInput ? profileSkillsInput.split(',').map((skill) => skill.trim()).filter(Boolean) : ['React', 'Node.js', 'MongoDB', 'JavaScript', 'CSS'];

  const activeApplications = applications.filter((app) => !['rejected', 'accepted'].includes(app.status));
  const completedApplicationsCount = applications.length - activeApplications.length;

  useEffect(() => {
    setProfileName(user.name || '');
    setProfileSummary(user.summary || '');
    setProfileResumeUrl(user.resume || '');
    setProfileSkillsInput((user.skills || []).join(', '));
    setProfileLocation(user.location || '');
  }, [user]);

  const cancelEditProfile = () => {
    setIsEditingProfile(false);
    setProfileName(user.name || '');
    setProfileSummary(user.summary || '');
    setProfileResumeUrl(user.resume || '');
    setProfileSkillsInput((user.skills || []).join(', '));
    setProfileLocation(user.location || '');
    setProfileSaveSuccess('');
    setError('');
  };

  useEffect(() => {
    if (activeTab === 'jobs' || activeTab === 'explore') {
      fetchAllJobs();
    } else if (activeTab === 'applications') {
      fetchMyApplications();
    } else if (activeTab === 'overview') {
      fetchAllJobs();
      fetchMyApplications();
    }
  }, [activeTab]);

  // Fetch notifications periodically so status updates from employers appear in candidate profile
  const fetchNotifications = async () => {
    try {
      const storedSession = JSON.parse(localStorage.getItem('jobsphere_session') || '{}');
      const token = user.token || storedSession.token;
      if (!token) return;
      const resp = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) return;
      const data = await resp.json();
      setNotifications(data.user.notifications || []);
    } catch (err) {
      // ignore polling errors silently
      // console.warn('notif fetch failed', err.message);
    }
  };

  useEffect(() => {
    if (user.role !== 'candidate') return;
    fetchNotifications();
    const id = setInterval(fetchNotifications, 8000);
    return () => clearInterval(id);
  }, [user]);

  const fetchAllJobs = async () => {
    try {
      setLoading(true);
      const query = searchQuery ? `?search=${searchQuery}` : '';
      const response = await fetch(`${API_BASE_URL}/api/jobs${query}`);
      const { ok, data } = await parseResponse(response);
      if (ok) {
        setJobs(data.jobs || []);
      } else {
        setError(typeof data === 'string' ? data : data.message || 'Failed to fetch jobs');
      }
    } catch (err) {
      setError('Could not reach the backend. Make sure the server is running.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyApplications = async () => {
    try {
      setLoading(true);
      const storedSession = JSON.parse(localStorage.getItem('jobsphere_session') || '{}');
      const token = user.token || storedSession.token;
      if (!token) {
        setError('You must be logged in to view applications. Please refresh and log in again.');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/applications/candidate/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const { ok, data } = await parseResponse(response);
      if (ok) {
        setApplications(data.applications || []);
        setAppliedIds(data.applications?.map((app) => app.jobId?._id || app.jobId) || []);
      } else {
        setError(typeof data === 'string' ? data : data.message || 'Failed to fetch applications');
      }
    } catch (err) {
      setError(`Could not reach the backend: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleResumeFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) {
      setResumeFile(null);
      setResumeFileName('');
      setResume('');
      return;
    }

    setResumeFile(file);
    setResumeFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => setResume(reader.result);
    reader.readAsDataURL(file);
  };


  const openProfileEditor = () => {
    setActiveTab('profile');
    setIsEditingProfile(true);
  };

  const handleApplyJob = (jobId) => {
    const job = typeof jobId === 'object'
      ? jobId
      : jobs.find((j) => j._id === jobId || j.id === jobId);

    if (!job) {
      setError('Selected job could not be found. Please refresh and try again.');
      return;
    }

    setSelectedJob(job);
    setShowApplyModal(true);
  };

  const toggleSavedJob = (jobId) => {
    setSavedJobs(prev =>
      prev.includes(jobId) ? prev.filter(id => id !== jobId) : [...prev, jobId]
    );
  };

  const submitApplication = async (e) => {
    e.preventDefault();
    const resumeValue = resume || profileResumeUrl || user.resume || '';
    if (!resumeValue) {
      setError('Please upload a resume file or provide a resume URL, or save a resume link in your profile first.');
      return;
    }

    try {
      setLoading(true);
      const storedSession = JSON.parse(localStorage.getItem('jobsphere_session') || '{}');
      const token = user.token || storedSession.token;
      if (!token) {
        setError('You must be logged in to apply. Please refresh and log in again.');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          jobId: selectedJob?._id || selectedJob?.id,
          resume: resumeValue,
          coverLetter,
        }),
      });
      const { ok, data } = await parseResponse(response);
      if (ok) {
        setSuccess('Application submitted successfully!');
        setShowApplyModal(false);
        setResume('');
        setResumeFile(null);
        setResumeFileName('');
        setCoverLetter('');
        setAppliedIds((prev) => [...prev, selectedJob?._id || selectedJob?.id]);
        fetchMyApplications();
      } else {
        setError(typeof data === 'string' ? data : data.message || 'Failed to apply for job');
      }
    } catch (err) {
      setError(`Could not reach the backend: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setProfileSaveSuccess('');

    try {
      setLoading(true);
      const token = user.token;
      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: profileName,
          summary: profileSummary,
          resume: profileResumeUrl,
          skills: profileSkillsInput,
          location: profileLocation,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        const updatedUser = { ...user, ...data.user, token: user.token };
        localStorage.setItem('jobsphere_session', JSON.stringify(updatedUser));
        if (onProfileSave) onProfileSave(updatedUser);
        setProfileSaveSuccess('Profile updated successfully.');
        setIsEditingProfile(false);
        setTimeout(() => setProfileSaveSuccess(''), 3000);
      } else {
        setError(data.message || 'Failed to update profile');
      }
    } catch (err) {
      setError('Could not reach the backend.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-container seeker-dashboard">
      <nav className="dashboard-navbar">
        <div className="dashboard-brand">
          Job<span>Sphere</span>
        </div>
        <div className="dashboard-nav-section">
          <span className="user-role">Job Seeker</span>
          <span className="user-name">{user.name}</span>
          <button className="logout-btn" type="button" onClick={onBackToHome}>
            Back to Home
          </button>
          <button className="logout-btn" type="button" onClick={onLogout}>
            Log out
          </button>
        </div>
      </nav>

      <div className="dashboard-layout">
        <aside className="sidebar">
          <div className="sidebar-profile">
            <div className="profile-avatar small">{user.name.charAt(0).toUpperCase()}</div>
            <strong>{user.name}</strong>
            <span>{user.email}</span>
          </div>

          <div className="sidebar-menu">
            {[
              ['overview', 'Overview'],
              ['explore', 'Explore Jobs'],
              ['applications', `Applications (${applications.length})`],
              ['saved', `Saved Jobs (${savedJobs.length})`],
              ['profile', 'Profile'],
            ].map(([tab, label]) => (
              <button
                key={tab}
                className={`menu-item ${activeTab === tab ? 'active' : ''}`}
                type="button"
                onClick={() => setActiveTab(tab)}
              >
                {label}
              </button>
            ))}
          </div>
        </aside>

        <main className="dashboard-main">
          <section className="candidate-hero">
            <div>
              <p className="section-kicker">Candidate Workspace</p>
              <div className="hero-header-row">
                <h1>Welcome back, {user.name}</h1>
                <button type="button" className="icon-button edit-profile-btn" onClick={openProfileEditor}>
                  ✎ Edit Profile
                </button>
              </div>
              <p>Track applications, discover matched jobs, and keep your profile ready for recruiters.</p>
            </div>
            <div className="candidate-hero-panel">
              <span>Last login</span>
              <strong>{lastLogin}</strong>
              <small>{user.loginCount ? `${user.loginCount} total sign-ins` : 'Session saved locally'}</small>
            </div>
          </section>

          {(error || success) && (
            <section className="notification-row">
              {error && <div className="message error">{error}</div>}
              {success && <div className="message success">{success}</div>}
            </section>
          )}

          {/* Notifications from employers (application status updates) */}
          {notifications.length > 0 && (
            <section className="notifications-panel">
              <div className="panel-header">
                <h3>Notifications</h3>
                <button className="btn-small" onClick={() => setNotifications([])}>Clear</button>
              </div>
              <div className="notifications-list">
                {notifications.slice().reverse().map((n, idx) => (
                  <div key={idx} className={`notification-item ${n.type}`}>
                    <div className="notification-message">{n.message}</div>
                    <div className="notification-meta">{new Date(n.createdAt).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="stats-section compact">
            <div className="stat-card">
              <div className="stat-number">{filteredJobs.length}</div>
              <div className="stat-label">Matching Jobs</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{applications.length}</div>
              <div className="stat-label">Applications</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{savedJobs.length}</div>
              <div className="stat-label">Saved Jobs</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">86%</div>
              <div className="stat-label">Profile Strength</div>
            </div>
          </section>

          {activeTab === 'overview' && (
            <section className="candidate-grid">
              <article className="dashboard-panel">
                <div className="panel-header">
                  <h2>Recommended Jobs</h2>
                  <button className="btn-small" type="button" onClick={() => setActiveTab('explore')}>
                    View all
                  </button>
                </div>
                <div className="jobs-list">
                  {jobs.slice(0, 2).map((job) => (
                    <JobListItem
                      key={job._id || job.id}
                      job={job}
                      isApplied={appliedIds.includes(job._id || job.id)}
                      isSaved={savedJobs.includes(job._id || job.id)}
                      onApply={handleApplyJob}
                      onSave={toggleSavedJob}
                    />
                  ))}
                </div>
              </article>

              <article className="dashboard-panel">
                <div className="panel-header">
                  <h2>Application Pipeline</h2>
                </div>
                <div className="pipeline-list">
                  {['Applied', 'Under Review', 'Interview', 'Offer'].map((stage, index) => (
                    <div className="pipeline-row" key={stage}>
                      <span>{stage}</span>
                      <strong>{index === 1 ? applications.length : index === 0 ? applications.length : 0}</strong>
                    </div>
                  ))}
                </div>
              </article>
            </section>
          )}

          {activeTab === 'explore' && (
            <>
              <section className="search-section">
                <input
                  className="search-input"
                  type="search"
                  placeholder="Search title, company, location, or skill"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </section>

              <section className="jobs-section">
                <h2>Available Jobs</h2>
                <div className="jobs-list">
                  {filteredJobs.map((job) => (
                    <JobListItem
                      key={job._id || job.id}
                      job={job}
                      isApplied={appliedIds.includes(job._id || job.id)}
                      isSaved={savedJobs.includes(job._id || job.id)}
                      onApply={handleApplyJob}
                      onSave={toggleSavedJob}
                    />
                  ))}
                </div>
              </section>
            </>
          )}

          {activeTab === 'applications' && (
            <section className="jobs-section">
              <h2>My Applications</h2>
              {applications.length === 0 ? (
                <EmptyState
                  text="You have not applied to any jobs yet."
                  action="Explore Jobs"
                  onAction={() => setActiveTab('explore')}
                />
              ) : activeApplications.length === 0 ? (
                <div className="empty-state">
                  <p>All of your applications are complete.</p>
                  <p>Check your email for the final status updates and next steps.</p>
                  {completedApplicationsCount > 0 && (
                    <p>{completedApplicationsCount} completed application(s) have been moved from your active dashboard.</p>
                  )}
                </div>
              ) : (
                <>
                  {completedApplicationsCount > 0 && (
                    <div className="info-note">
                      {completedApplicationsCount} completed application(s) were removed from active view.
                    </div>
                  )}
                  <div className="jobs-list">
                    {activeApplications.map((application) => {
                      const job = application.jobId || {};
                      const appliedDate = new Date(application.appliedAt || application.createdAt || Date.now()).toLocaleDateString();
                      return (
                        <div key={application._id} className="job-list-item">
                          <div className="job-info">
                            <h3>{job.title || 'Applied Job'}</h3>
                            <p className="company-name">{job.company || 'Unknown Company'}</p>
                            <div className="job-details">
                              <span>{job.location || 'Location not available'}</span>
                              <span>Applied {appliedDate}</span>
                            </div>
                          </div>
                          <span className="status-badge">{application.status}</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </section>
          )}

          {activeTab === 'saved' && (
            <section className="jobs-section">
              <h2>Saved Jobs</h2>
              {savedJobDetails.length === 0 ? (
                <EmptyState
                  text="Save jobs you want to revisit later."
                  action="Browse Jobs"
                  onAction={() => setActiveTab('explore')}
                />
              ) : (
                <div className="jobs-list">
                  {savedJobDetails.map((job) => (
                    <JobListItem
                      key={job._id || job.id}
                      job={job}
                      isApplied={appliedIds.includes(job._id || job.id)}
                      isSaved={savedJobs.includes(job._id || job.id)}
                      onApply={handleApplyJob}
                      onSave={toggleSavedJob}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {activeTab === 'profile' && (
            <section className="profile-section">
              <div className="profile-card wide">
                <div className="profile-header">
                  <div className="profile-avatar">{user.name.charAt(0).toUpperCase()}</div>
                  <div className="profile-info">
                    <h2>{user.name}</h2>
                    <p>{user.email}</p>
                    <p className="profile-role">Open to frontend, backend, and product roles</p>
                  </div>
                  <div className="profile-actions">
                    <button
                      type="button"
                      className="icon-button edit-profile-btn"
                      onClick={() => setIsEditingProfile(true)}
                    >
                      ✎ Edit Profile
                    </button>
                  </div>
                </div>

                {isEditingProfile ? (
                  <div className="profile-edit-panel">
                    <form className="profile-form" onSubmit={handleProfileUpdate}>
                      <div className="form-row">
                        <div className="form-group">
                          <label>Full Name</label>
                          <input value={profileName} onChange={(e) => setProfileName(e.target.value)} />
                        </div>
                        <div className="form-group">
                          <label>Location</label>
                          <input value={profileLocation} onChange={(e) => setProfileLocation(e.target.value)} />
                        </div>
                      </div>
                      <div className="form-group">
                        <label>Resume URL</label>
                        <input
                          type="url"
                          value={profileResumeUrl}
                          onChange={(e) => setProfileResumeUrl(e.target.value)}
                          placeholder="https://example.com/resume.pdf"
                        />
                      </div>
                      <div className="form-group">
                        <label>Skills (comma separated)</label>
                        <input
                          value={profileSkillsInput}
                          onChange={(e) => setProfileSkillsInput(e.target.value)}
                          placeholder="React, Node.js, MongoDB"
                        />
                      </div>
                      <div className="form-group">
                        <label>Summary</label>
                        <textarea
                          rows="5"
                          value={profileSummary}
                          onChange={(e) => setProfileSummary(e.target.value)}
                          placeholder="Tell recruiters about your experience"
                        />
                      </div>
                      <div className="form-actions">
                        <button type="button" className="btn-secondary" onClick={cancelEditProfile}>
                          Cancel
                        </button>
                        <button type="submit" className="btn-submit">
                          Save Profile
                        </button>
                        {profileSaveSuccess && <span className="profile-save-success">{profileSaveSuccess}</span>}
                      </div>
                    </form>
                  </div>
                ) : (
                  <div className="profile-sections grid">
                    <div className="profile-section-item">
                      <h3>Professional Summary</h3>
                      <p>{profileSummary || 'Share your experience and what kind of roles you are looking for.'}</p>
                    </div>
                    <div className="profile-section-item">
                      <h3>Resume</h3>
                      {profileResumeUrl ? (
                        <a href={profileResumeUrl} target="_blank" rel="noopener noreferrer" className="resume-link">
                          View resume
                        </a>
                      ) : (
                        <p className="empty-text">Add your resume link by clicking Edit Profile.</p>
                      )}
                    </div>
                    <div className="profile-section-item">
                      <h3>Location</h3>
                      <p>{profileLocation || 'Not specified'}</p>
                    </div>
                    <div className="profile-section-item">
                      <h3>Skills</h3>
                      <p>{profileSkills.length > 0 ? profileSkills.join(', ') : 'Add skills to make your profile stronger.'}</p>
                    </div>
                    <div className="profile-section-item">
                      <h3>Account Activity</h3>
                      <p>Last login: {lastLogin}</p>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {showApplyModal && selectedJob && (
            <div className="modal-overlay" onClick={() => setShowApplyModal(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <div>
                    <h2>Apply for {selectedJob.title}</h2>
                    <p className="modal-subtitle">{selectedJob.company} • {selectedJob.location}</p>
                  </div>
                  <button type="button" className="modal-close" onClick={() => setShowApplyModal(false)}>×</button>
                </div>
                <form className="apply-form" onSubmit={submitApplication}>
                  <div className="form-group">
                    <label htmlFor="resumeFile">Upload resume *</label>
                    <input
                      id="resumeFile"
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleResumeFileChange}
                    />
                    <p className="file-hint">
                      Upload your resume file, or paste a shareable resume URL below.
                      {resumeFileName ? ` Selected: ${resumeFileName}` : ''}
                    </p>
                  </div>

                  <div className="form-group">
                    <label htmlFor="resumeUrl">Resume link</label>
                    <input
                      id="resumeUrl"
                      type="url"
                      value={resumeFileName ? '' : resume}
                      disabled={!!resumeFileName}
                      onChange={(e) => {
                        setResumeFile(null);
                        setResumeFileName('');
                        setResume(e.target.value);
                      }}
                      placeholder="https://example.com/resume.pdf"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="coverLetter">Cover letter</label>
                    <textarea
                      id="coverLetter"
                      rows="5"
                      value={coverLetter}
                      onChange={(e) => setCoverLetter(e.target.value)}
                      placeholder="Write a short cover letter for this role"
                    />
                  </div>

                  <div className="modal-actions">
                    <button type="button" className="btn-secondary" onClick={() => setShowApplyModal(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn-submit">
                      Submit Application
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function JobListItem({ job, isApplied, isSaved, onApply, onSave }) {
  return (
    <div className="job-list-item candidate-job">
      <div className="job-info">
        <div className="job-title-row">
          <h3>{job.title}</h3>
          <span className="match-badge">{job.match}% match</span>
        </div>
        <p className="company-name">{job.company}</p>
        <div className="job-details">
          <span>{job.location}</span>
          <span>{job.jobType || job.type}</span>
          <span>{getSalaryDisplay(job)}</span>
          <span>{job.postedDate}</span>
        </div>
        <p className="job-description">{job.description}</p>
        <div className="skill-row">
          {job.skills.map((skill) => (
            <span key={skill}>{skill}</span>
          ))}
        </div>
      </div>
      <div className="candidate-actions">
        <button className="btn-small" type="button" onClick={() => onSave(job._id || job.id)}>
          {isSaved ? 'Saved' : 'Save'}
        </button>
        <button
          className={`btn-apply ${isApplied ? 'applied' : ''}`}
          type="button"
          onClick={() => onApply(job._id || job.id)}
          disabled={isApplied}
        >
          {isApplied ? 'Applied' : 'Apply Now'}
        </button>
      </div>
    </div>
  );
}

function EmptyState({ text, action, onAction }) {
  return (
    <div className="empty-state">
      <p>{text}</p>
      <button className="btn-secondary" type="button" onClick={onAction}>
        {action}
      </button>
    </div>
  );
}
