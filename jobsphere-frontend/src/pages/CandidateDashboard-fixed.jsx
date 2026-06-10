import { useState, useEffect } from 'react';
import '../styles/Dashboard.css';

export default function CandidateDashboard({ user, onLogout }) {
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
  const [coverLetter, setCoverLetter] = useState('');
  const [savedJobs, setSavedJobs] = useState([]);
  const [appliedIds, setAppliedIds] = useState([]);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://jobsphere-backend-exta.onrender.com';

  // Computed values
  const lastLogin = new Date().toLocaleDateString();
  const filteredJobs = jobs.filter(job =>
    searchQuery === '' ||
    job.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const savedJobDetails = jobs.filter(job => savedJobs.includes(job._id));
  const profileSkills = ['React', 'Node.js', 'MongoDB', 'JavaScript', 'CSS'];

  useEffect(() => {
    if (activeTab === 'explore') {
      fetchAllJobs();
    } else if (activeTab === 'applications') {
      fetchMyApplications();
    } else if (activeTab === 'overview') {
      fetchAllJobs();
      fetchMyApplications();
    }
  }, [activeTab]);

  const fetchAllJobs = async () => {
    try {
      setLoading(true);
      const query = searchQuery ? `?search=${searchQuery}` : '';
      const response = await fetch(`${API_BASE_URL}/api/jobs${query}`);
      const data = await response.json();
      if (response.ok) {
        setJobs(data.jobs || []);
      } else {
        setError(data.message || 'Failed to fetch jobs');
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
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/applications/candidate/${user._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setApplications(data.applications || []);
        setAppliedIds(data.applications?.map(app => app.jobId) || []);
      } else {
        setError(data.message || 'Failed to fetch applications');
      }
    } catch (err) {
      setError('Could not reach the backend.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (activeTab !== 'explore') setActiveTab('explore');
    fetchAllJobs();
  };

  const handleApplyJob = (jobId) => {
    setSelectedJob(jobs.find(j => j._id === jobId));
    setShowApplyModal(true);
  };

  const toggleSavedJob = (jobId) => {
    setSavedJobs(prev =>
      prev.includes(jobId) ? prev.filter(id => id !== jobId) : [...prev, jobId]
    );
  };

  const submitApplication = async (e) => {
    e.preventDefault();
    if (!resume) {
      setError('Please enter your resume URL');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          jobId: selectedJob._id,
          resume,
          coverLetter,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setSuccess('Application submitted successfully!');
        setShowApplyModal(false);
        setResume('');
        setCoverLetter('');
        setAppliedIds(prev => [...prev, selectedJob._id]);
        fetchMyApplications();
      } else {
        setError(data.message || 'Failed to apply for job');
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
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <section className="candidate-hero">
            <div>
              <p className="section-kicker">Candidate Workspace</p>
              <h1>Welcome back, {user.name}</h1>
              <p>Track applications, discover matched jobs, and keep your profile ready for recruiters.</p>
            </div>
            <div className="candidate-hero-panel">
              <span>Last login</span>
              <strong>{lastLogin}</strong>
              <small>Session saved locally</small>
            </div>
          </section>

          <section className="stats-section compact">
            <div className="stat-card">
              <div className="stat-number">{filteredJobs.length}</div>
              <div className="stat-label">Available Jobs</div>
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
              <div className="stat-number">100%</div>
              <div className="stat-label">Profile Ready</div>
            </div>
          </section>

          {activeTab === 'overview' && (
            <section className="candidate-grid">
              <article className="dashboard-panel">
                <div className="panel-header">
                  <h2>Recent Jobs</h2>
                  <button className="btn-small" type="button" onClick={() => setActiveTab('explore')}>
                    View all
                  </button>
                </div>
                <div className="jobs-list">
                  {jobs.slice(0, 2).map((job) => (
                    <JobListItem
                      key={job._id}
                      job={job}
                      isApplied={appliedIds.includes(job._id)}
                      isSaved={savedJobs.includes(job._id)}
                      onApply={handleApplyJob}
                      onSave={toggleSavedJob}
                    />
                  ))}
                  {jobs.length === 0 && <p className="empty-text">No jobs available</p>}
                </div>
              </article>

              <article className="dashboard-panel">
                <div className="panel-header">
                  <h2>Your Applications</h2>
                </div>
                <div className="pipeline-list">
                  {applications.length === 0 ? (
                    <p className="empty-text">No applications yet</p>
                  ) : (
                    applications.slice(0, 5).map((app) => (
                      <div key={app._id} className="pipeline-row">
                        <span>{app.status || 'Applied'}</span>
                        <strong>{app._id.substring(0, 8)}...</strong>
                      </div>
                    ))
                  )}
                </div>
              </article>
            </section>
          )}

          {activeTab === 'explore' && (
            <>
              <section className="search-section">
                <form onSubmit={handleSearch}>
                  <input
                    className="search-input"
                    type="search"
                    placeholder="Search title, company, location, or skill"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                  />
                  <button type="submit">Search</button>
                </form>
              </section>

              <section className="jobs-section">
                <h2>Available Jobs {loading && '...'}</h2>
                {filteredJobs.length === 0 ? (
                  <p className="empty-text">No jobs found</p>
                ) : (
                  <div className="jobs-list">
                    {filteredJobs.map((job) => (
                      <JobListItem
                        key={job._id}
                        job={job}
                        isApplied={appliedIds.includes(job._id)}
                        isSaved={savedJobs.includes(job._id)}
                        onApply={handleApplyJob}
                        onSave={toggleSavedJob}
                      />
                    ))}
                  </div>
                )}
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
              ) : (
                <div className="jobs-list">
                  {applications.map((app) => (
                    <div key={app._id} className="job-list-item">
                      <div className="job-info">
                        <h3>{app.jobTitle || 'Job Title'}</h3>
                        <p className="company-name">{app.company || 'Company'}</p>
                        <div className="job-details">
                          <span>{app.location || 'Location'}</span>
                          <span>Status: {app.status}</span>
                        </div>
                      </div>
                      <span className="status-badge">{app.status}</span>
                    </div>
                  ))}
                </div>
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
                      key={job._id}
                      job={job}
                      isApplied={appliedIds.includes(job._id)}
                      isSaved={savedJobs.includes(job._id)}
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
                    <p className="profile-role">Open to job opportunities</p>
                  </div>
                </div>

                <div className="profile-sections grid">
                  <div className="profile-section-item">
                    <h3>Professional Summary</h3>
                    <p>Candidate profile ready for recruiters, applications, and saved jobs.</p>
                  </div>
                  <div className="profile-section-item">
                    <h3>Skills</h3>
                    <div className="skill-row">
                      {profileSkills.map((skill) => (
                        <span key={skill}>{skill}</span>
                      ))}
                    </div>
                  </div>
                  <div className="profile-section-item">
                    <h3>Resume</h3>
                    <p className="empty-text">Resume upload available through applications.</p>
                  </div>
                  <div className="profile-section-item">
                    <h3>Account Activity</h3>
                    <p>Last login: {lastLogin}</p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {showApplyModal && selectedJob && (
            <div className="modal-overlay" onClick={() => setShowApplyModal(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h2>Apply for {selectedJob.title}</h2>
                <form onSubmit={submitApplication}>
                  <div className="form-group">
                    <label>Resume URL *</label>
                    <input
                      type="text"
                      value={resume}
                      onChange={(e) => setResume(e.target.value)}
                      placeholder="https://example.com/resume.pdf"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Cover Letter</label>
                    <textarea
                      value={coverLetter}
                      onChange={(e) => setCoverLetter(e.target.value)}
                      placeholder="Tell us why you're interested in this role..."
                      rows="4"
                    />
                  </div>
                  <div className="modal-actions">
                    <button type="button" onClick={() => setShowApplyModal(false)}>
                      Cancel
                    </button>
                    <button type="submit" disabled={loading}>
                      {loading ? 'Submitting...' : 'Submit Application'}
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
        </div>
        <p className="company-name">{job.company}</p>
        <div className="job-details">
          <span>📍 {job.location}</span>
          <span>💼 {job.jobType || 'Full-time'}</span>
          <span>💰 ${job.salaryMin?.toLocaleString()}-${job.salaryMax?.toLocaleString()}</span>
        </div>
        <p className="job-description">{job.description?.substring(0, 150)}...</p>
        {job.skills && job.skills.length > 0 && (
          <div className="skill-row">
            {job.skills.slice(0, 3).map((skill) => (
              <span key={skill}>{skill}</span>
            ))}
          </div>
        )}
      </div>
      <div className="candidate-actions">
        <button className="btn-small" type="button" onClick={() => onSave(job._id)}>
          {isSaved ? '❤️ Saved' : '🤍 Save'}
        </button>
        <button
          className={`btn-apply ${isApplied ? 'applied' : ''}`}
          type="button"
          onClick={() => onApply(job._id)}
          disabled={isApplied}
        >
          {isApplied ? '✓ Applied' : 'Apply Now'}
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
