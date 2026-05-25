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

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    if (activeTab === 'jobs') {
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
      const response = await fetch(`${API_BASE_URL}/api/applications`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setApplications(data.applications || []);
      } else {
        setError(data.message || 'Failed to fetch applications');
      }
    } catch (err) {
      setError('Could not reach the backend. Make sure the server is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyForJob = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!resume) {
      setError('Resume URL is required');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
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
        setResume('');
        setCoverLetter('');
        setShowApplyModal(false);
        setSelectedJob(null);
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

  const handleSearch = (e) => {
    e.preventDefault();
    if (activeTab !== 'jobs') setActiveTab('jobs');
    fetchAllJobs();
  };

  return (
    <div className="dashboard-container">
      <nav className="dashboard-navbar">
        <div className="dashboard-brand">
          Job<span>Sphere</span>
        </div>
        <div className="dashboard-nav-section">
          <span className="user-role">Job Seeker</span>
          <span className="user-name">{user.name}</span>
          <button className="logout-btn" onClick={onLogout}>
            Log out
          </button>
        </div>
      </nav>

      <div className="dashboard-layout">
        <aside className="sidebar">
          <div className="sidebar-menu">
            <button
              className={`menu-item ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              📊 Overview
            </button>
            <button
              className={`menu-item ${activeTab === 'jobs' ? 'active' : ''}`}
              onClick={() => setActiveTab('jobs')}
            >
              💼 Browse Jobs
            </button>
            <button
              className={`menu-item ${activeTab === 'applications' ? 'active' : ''}`}
              onClick={() => setActiveTab('applications')}
            >
              📄 My Applications
            </button>
            <button
              className={`menu-item ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              👤 Profile
            </button>
          </div>
        </aside>

        <main className="dashboard-main">
          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          {activeTab === 'overview' && (
            <>
              <section className="dashboard-header">
                <div>
                  <h1>Welcome, {user.name}!</h1>
                  <p>Find and apply for your next opportunity</p>
                </div>
              </section>

              <section className="stats-section">
                <div className="stat-card">
                  <div className="stat-number">{jobs.length}</div>
                  <div className="stat-label">Jobs Available</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">{applications.length}</div>
                  <div className="stat-label">Applications</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">
                    {applications.filter((a) => a.status === 'accepted').length}
                  </div>
                  <div className="stat-label">Accepted</div>
                </div>
              </section>

              <section className="recent-jobs-section">
                <h2>Recent Job Listings</h2>
                {loading ? (
                  <div className="loading">Loading jobs...</div>
                ) : jobs.length === 0 ? (
                  <div className="empty-state">
                    <p>No jobs available right now. Check back later!</p>
                  </div>
                ) : (
                  <div className="jobs-grid">
                    {jobs.slice(0, 3).map((job) => (
                      <div key={job._id} className="job-card">
                        <div className="job-header">
                          <h3>{job.title}</h3>
                        </div>
                        <p className="job-company">🏢 {job.company}</p>
                        <p className="job-location">📍 {job.location}</p>
                        {job.salaryMin && job.salaryMax && (
                          <p className="job-salary">
                            💰 ${job.salaryMin.toLocaleString()} - ${job.salaryMax.toLocaleString()}
                          </p>
                        )}
                        <p className="job-type">📌 {job.jobType}</p>
                        <button
                          className="btn-small"
                          onClick={() => {
                            setSelectedJob(job);
                            setShowApplyModal(true);
                          }}
                        >
                          View & Apply
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button className="btn-secondary" onClick={() => setActiveTab('jobs')}>
                  Browse All Jobs
                </button>
              </section>
            </>
          )}

          {activeTab === 'jobs' && (
            <>
              <section className="search-section">
                <h1>Browse Jobs</h1>
                <form onSubmit={handleSearch} className="search-form">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search job title, company..."
                  />
                  <button type="submit" className="btn-search">
                    🔍 Search
                  </button>
                </form>
              </section>

              <section className="jobs-section">
                {loading ? (
                  <div className="loading">Loading jobs...</div>
                ) : jobs.length === 0 ? (
                  <div className="empty-state">
                    <p>No jobs found. Try a different search.</p>
                  </div>
                ) : (
                  <div className="jobs-list">
                    {jobs.map((job) => (
                      <div key={job._id} className="job-item">
                        <div className="job-info">
                          <h3>{job.title}</h3>
                          <p className="job-company">{job.company}</p>
                          <div className="job-meta">
                            <span>📍 {job.location}</span>
                            <span>📌 {job.jobType}</span>
                            {job.salaryMin && job.salaryMax && (
                              <span>💰 ${job.salaryMin.toLocaleString()} - ${job.salaryMax.toLocaleString()}</span>
                            )}
                          </div>
                          {job.skills && job.skills.length > 0 && (
                            <div className="job-skills">
                              {job.skills.map((skill, idx) => (
                                <span key={idx} className="skill-tag">
                                  {skill}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <button
                          className="btn-primary"
                          onClick={() => {
                            setSelectedJob(job);
                            setShowApplyModal(true);
                          }}
                        >
                          Apply
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}

          {activeTab === 'applications' && (
            <section className="applications-section">
              <h1>My Applications</h1>
              {loading ? (
                <div className="loading">Loading applications...</div>
              ) : applications.length === 0 ? (
                <div className="empty-state">
                  <p>You haven't applied for any jobs yet.</p>
                  <button className="btn-secondary" onClick={() => setActiveTab('jobs')}>
                    Browse Jobs
                  </button>
                </div>
              ) : (
                <div className="applications-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Job Title</th>
                        <th>Company</th>
                        <th>Location</th>
                        <th>Status</th>
                        <th>Applied Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {applications.map((app) => (
                        <tr key={app._id}>
                          <td>{app.jobId?.title || 'Unknown Job'}</td>
                          <td>{app.jobId?.company || '-'}</td>
                          <td>{app.jobId?.location || '-'}</td>
                          <td>
                            <span className={`status-badge status-${app.status}`}>
                              {app.status}
                            </span>
                          </td>
                          <td>{new Date(app.appliedAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {activeTab === 'profile' && (
            <section className="profile-section">
              <h1>My Profile</h1>
              <div className="profile-card">
                <div className="profile-header">
                  <h2>{user.name}</h2>
                  <p>{user.email}</p>
                </div>
                <div className="profile-info">
                  <h3>Account Type</h3>
                  <p>Job Seeker</p>
                </div>
              </div>
            </section>
          )}
        </main>
      </div>

      {showApplyModal && selectedJob && (
        <div className="modal-overlay" onClick={() => setShowApplyModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowApplyModal(false)}>
              ✕
            </button>

            <div className="job-details">
              <h2>{selectedJob.title}</h2>
              <p className="job-company">{selectedJob.company}</p>
              <p className="job-location">📍 {selectedJob.location}</p>
              {selectedJob.salaryMin && selectedJob.salaryMax && (
                <p className="job-salary">
                  💰 ${selectedJob.salaryMin.toLocaleString()} - ${selectedJob.salaryMax.toLocaleString()}
                </p>
              )}
              <div className="job-description">
                <h3>Description</h3>
                <p>{selectedJob.description}</p>
              </div>
              {selectedJob.skills && selectedJob.skills.length > 0 && (
                <div className="job-skills">
                  <h3>Required Skills</h3>
                  <div className="skills-list">
                    {selectedJob.skills.map((skill, idx) => (
                      <span key={idx} className="skill-tag">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleApplyForJob} className="apply-form">
              <h3>Apply for This Job</h3>

              <div className="form-group">
                <label>Resume URL *</label>
                <input
                  type="url"
                  value={resume}
                  onChange={(e) => setResume(e.target.value)}
                  placeholder="https://example.com/resume.pdf"
                  required
                />
              </div>

              <div className="form-group">
                <label>Cover Letter (Optional)</label>
                <textarea
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  placeholder="Tell us why you're a great fit for this role..."
                  rows="4"
                />
              </div>

              <button type="submit" className="btn-submit" disabled={loading}>
                {loading ? 'Submitting...' : 'Submit Application'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
