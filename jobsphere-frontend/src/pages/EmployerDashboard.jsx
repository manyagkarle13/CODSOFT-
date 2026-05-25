import { useState, useEffect } from 'react';
import '../styles/Dashboard.css';

export default function EmployerDashboard({ user, onLogout, onBackToHome }) {
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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
    const symbol = currencySymbols[job.currency] || job.currency || '$';
    if (job.salaryMin && job.salaryMax) {
      return `${symbol} ${job.salaryMin.toLocaleString()} - ${symbol} ${job.salaryMax.toLocaleString()}`;
    }
    if (job.salaryMin) {
      return `${symbol} ${job.salaryMin.toLocaleString()}+`;
    }
    return '';
  };

  const [newJob, setNewJob] = useState({
    title: '',
    description: '',
    company: '',
    location: '',
    jobType: 'full-time',
    currency: 'USD',
    salaryMin: '',
    salaryMax: '',
    skills: '',
    requirements: '',
    benefits: '',
  });
  const [showJobForm, setShowJobForm] = useState(false);

  const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').trim() || 'http://localhost:5000';

  const [summary, setSummary] = useState({ jobsCount: 0, applicationsCount: 0, recentApplicants: [] });

  async function fetchDashboardSummary() {
    try {
      setLoading(true);
      // fetch jobs and applications in parallel
      const [jobsResp, appsResp] = await Promise.all([
        fetch(`${API_BASE_URL}/api/jobs/employer/my-jobs`, { headers: { Authorization: `Bearer ${user.token}` } }),
        fetch(`${API_BASE_URL}/api/applications`, { headers: { Authorization: `Bearer ${user.token}` } }),
      ]);
      const jobsData = await jobsResp.json();
      const appsData = await appsResp.json();
      const jobsList = jobsResp.ok ? jobsData.jobs || [] : [];
      const appsList = appsResp.ok ? appsData.applications || [] : [];
      setSummary({ jobsCount: jobsList.length, applicationsCount: appsList.length, recentApplicants: appsList.slice(0, 6) });
    } catch {
      setError('Could not reach the backend.');
    } finally {
      setLoading(false);
    }
  }

  // Auto-clear alerts after a short delay
  useEffect(() => {
    if (!error && !success) return;
    const id = setTimeout(() => {
      setError('');
      setSuccess('');
    }, 4000);
    return () => clearTimeout(id);
  }, [error, success]);

  async function fetchEmployerJobs() {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/jobs/employer/my-jobs`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setJobs(data.jobs || []);
      } else {
        setError(data.message || 'Failed to fetch jobs');
      }
    } catch {
      setError('Could not reach the backend. Make sure the server is running.');
    } finally {
      setLoading(false);
    }
  }

  async function fetchApplications() {
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
    } catch {
      setError('Could not reach the backend. Make sure the server is running.');
    } finally {
      setLoading(false);
    }
  }

  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    if (activeTab === 'jobs') {
      fetchEmployerJobs();
    } else if (activeTab === 'applications') {
      fetchApplications();
    } else if (activeTab === 'dashboard') {
      fetchDashboardSummary();
    }
  }, [activeTab]);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  const handleJobSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!newJob.title || !newJob.description || !newJob.company || !newJob.location) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          ...newJob,
          skills: newJob.skills.split(',').map((s) => s.trim()).filter(Boolean),
          salaryMin: newJob.salaryMin ? parseInt(newJob.salaryMin) : null,
          salaryMax: newJob.salaryMax ? parseInt(newJob.salaryMax) : null,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setSuccess('Job posted successfully!');
        setNewJob({
          title: '',
          description: '',
          company: '',
          location: '',
          jobType: 'full-time',
          currency: 'USD',
          salaryMin: '',
          salaryMax: '',
          skills: '',
          requirements: '',
          benefits: '',
        });
        setShowJobForm(false);
        fetchEmployerJobs();
      } else {
        setError(data.message || 'Failed to post job');
      }
    } catch {
      setError('Could not reach the backend.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteJob = async (jobId) => {
    if (window.confirm('Are you sure you want to delete this job?')) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/jobs/${jobId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${user.token}` },
        });

        if (response.ok) {
          setSuccess('Job deleted successfully!');
          fetchEmployerJobs();
        } else {
          setError('Failed to delete job');
        }
      } catch {
        setError('Could not reach the backend.');
      }
    }
  };

  const handleUpdateApplicationStatus = async (applicationId, status) => {
    // Optimistic UI update: update locally first
    setError('');
    setSuccess('');
    setApplications((prev) => prev.map((app) => (app._id === applicationId ? { ...app, status } : app)));
    try {
      const response = await fetch(`${API_BASE_URL}/api/applications/${applicationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ status }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        setSuccess(
          data.notificationEmailSent
            ? `Application status updated to ${status}. Email sent to ${data.notificationEmailRecipient}.`
            : `Application status updated to ${status}, but email was not sent: ${data.notificationEmailError || 'check backend email settings'}.`
        );
        // ensure server state is reflected
        fetchApplications();
      } else {
        setError(data.message || 'Failed to update application status');
        // revert optimistic change
        fetchApplications();
      }
    } catch {
      setError('Could not reach the backend.');
      fetchApplications();
    }
  };

  const handleSendStatusEmail = async (application) => {
    await handleUpdateApplicationStatus(application._id, application.status);
  };

  const viewResume = async (applicationId) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/applications/${applicationId}/resume`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });

      if (!response.ok) {
        const text = await response.text();
        setError(text || 'Failed to fetch resume');
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      // revoke after a short delay
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      setError('Could not reach the backend.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewJob((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="dashboard-container">
      <nav className="dashboard-navbar">
        <div className="dashboard-brand">
          Job<span>Sphere</span>
        </div>
        <div className="dashboard-nav-section">
          <span className="user-role">Employer</span>
          <span className="user-name">{user.name}</span>
          <button className="logout-btn" onClick={onBackToHome}>
            Back to Home
          </button>
          <button className="logout-btn" onClick={onLogout}>
            Log out
          </button>
        </div>
      </nav>

      <div className="dashboard-layout">
        <aside className="sidebar">
          <div className="sidebar-menu">
            <button
              className={`menu-item ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              📊 Dashboard
            </button>
            <button
              className={`menu-item ${activeTab === 'jobs' ? 'active' : ''}`}
              onClick={() => setActiveTab('jobs')}
            >
              💼 My Jobs
            </button>
            <button
              className={`menu-item ${activeTab === 'applications' ? 'active' : ''}`}
              onClick={() => setActiveTab('applications')}
            >
              👥 Applications
            </button>
          </div>
        </aside>

        <main className="dashboard-main">
          {error && (
            <div className="alert alert-error">
              <span>{error}</span>
              <button className="alert-close" onClick={() => setError('')}>×</button>
            </div>
          )}
          {success && (
            <div className="alert alert-success">
              <span>{success}</span>
              <button className="alert-close" onClick={() => setSuccess('')}>×</button>
            </div>
          )}

          {activeTab === 'dashboard' && (
            <>
              <section className="dashboard-header">
                <div>
                  <h1>Employer Dashboard</h1>
                  <p>Welcome back, {user.name}! Manage your job postings and applications.</p>

                  <div className="stats-row" style={{ marginTop: 16, display: 'flex', gap: 12 }}>
                    <div className="stat-card">
                      <div className="stat-number">{summary.jobsCount}</div>
                      <div className="stat-label">Jobs</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-number">{summary.applicationsCount}</div>
                      <div className="stat-label">Applications</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-number">{summary.recentApplicants.length}</div>
                      <div className="stat-label">Recent Applicants</div>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button className="btn-primary" onClick={() => setActiveTab('jobs')}>View My Jobs</button>
                  <button className="btn-secondary" onClick={() => setActiveTab('applications')}>View Applications</button>
                </div>
              </section>

              {summary.recentApplicants && summary.recentApplicants.length > 0 && (
                <section className="dashboard-panel">
                  <div className="panel-header">
                    <h2>Recent Applicants</h2>
                    <button className="btn-small" onClick={() => setActiveTab('applications')}>Manage All</button>
                  </div>

                  <div className="applications-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Candidate</th>
                          <th>Job</th>
                          <th>Status</th>
                          <th>Applied</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summary.recentApplicants.map((app) => (
                          <tr key={app._id}>
                            <td>{app.candidateId?.name || 'Unknown'}</td>
                            <td>{app.jobId?.title || '-'}</td>
                            <td>{app.status}</td>
                            <td>{new Date(app.appliedAt).toLocaleDateString()}</td>
                            <td>
                              {app.resume && (
                                <button className="btn-small btn-outline" onClick={() => viewResume(app._id)}>View Resume</button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </>
          )}

          {activeTab === 'jobs' && (
            <>
              <section className="dashboard-header">
                <div>
                  <h1>My Job Postings</h1>
                  <p>Manage all your active job listings</p>
                </div>
                <button
                  className="btn-primary"
                  onClick={() => setShowJobForm(!showJobForm)}
                >
                  {showJobForm ? '✕ Close' : '+ Post New Job'}
                </button>
              </section>

              {showJobForm && (
                <section className="job-form-section">
                  <h2>Post a New Job</h2>
                  <form onSubmit={handleJobSubmit} className="job-form">
                    <div className="form-group">
                      <label>Job Title *</label>
                      <input
                        type="text"
                        name="title"
                        value={newJob.title}
                        onChange={handleInputChange}
                        placeholder="e.g., Senior Frontend Developer"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Company *</label>
                      <input
                        type="text"
                        name="company"
                        value={newJob.company}
                        onChange={handleInputChange}
                        placeholder="Company name"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Description *</label>
                      <textarea
                        name="description"
                        value={newJob.description}
                        onChange={handleInputChange}
                        placeholder="Job description, responsibilities, and requirements..."
                        rows="5"
                        required
                      />
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Location *</label>
                        <input
                          type="text"
                          name="location"
                          value={newJob.location}
                          onChange={handleInputChange}
                          placeholder="e.g., Remote, New York"
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label>Job Type</label>
                        <select name="jobType" value={newJob.jobType} onChange={handleInputChange}>
                          <option value="full-time">Full Time</option>
                          <option value="part-time">Part Time</option>
                          <option value="contract">Contract</option>
                          <option value="internship">Internship</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Salary Min</label>
                        <input
                          type="number"
                          name="salaryMin"
                          value={newJob.salaryMin}
                          onChange={handleInputChange}
                          placeholder="e.g., 100000"
                        />
                      </div>

                      <div className="form-group">
                        <label>Salary Max</label>
                        <input
                          type="number"
                          name="salaryMax"
                          value={newJob.salaryMax}
                          onChange={handleInputChange}
                          placeholder="e.g., 150000"
                        />
                      </div>

                      <div className="form-group">
                        <label>Currency</label>
                        <select name="currency" value={newJob.currency} onChange={handleInputChange}>
                          <option value="USD">USD</option>
                          <option value="INR">INR</option>
                          <option value="EUR">EUR</option>
                          <option value="GBP">GBP</option>
                          <option value="CAD">CAD</option>
                          <option value="AUD">AUD</option>
                          <option value="JPY">JPY</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Skills (comma-separated)</label>
                      <input
                        type="text"
                        name="skills"
                        value={newJob.skills}
                        onChange={handleInputChange}
                        placeholder="e.g., React, Node.js, MongoDB"
                      />
                    </div>

                    <div className="form-group">
                      <label>Requirements</label>
                      <textarea
                        name="requirements"
                        value={newJob.requirements}
                        onChange={handleInputChange}
                        placeholder="Specific requirements for this position..."
                        rows="3"
                      />
                    </div>

                    <div className="form-group">
                      <label>Benefits</label>
                      <textarea
                        name="benefits"
                        value={newJob.benefits}
                        onChange={handleInputChange}
                        placeholder="Benefits offered..."
                        rows="3"
                      />
                    </div>

                    <button type="submit" className="btn-submit" disabled={loading}>
                      {loading ? 'Publishing...' : 'Publish Job'}
                    </button>
                  </form>
                </section>
              )}

              <section className="jobs-section">
                {loading ? (
                  <div className="loading">Loading jobs...</div>
                ) : jobs.length === 0 ? (
                  <div className="empty-state">
                    <p>No jobs posted yet.</p>
                    <button
                      className="btn-secondary"
                      onClick={() => setShowJobForm(true)}
                    >
                      Post your first job
                    </button>
                  </div>
                ) : (
                  <div className="jobs-grid">
                    {jobs.map((job) => (
                      <div key={job._id} className="job-card">
                        <div className="job-header">
                          <h3>{job.title}</h3>
                          <span className={`job-status ${job.status}`}>{job.status}</span>
                        </div>
                        <p className="job-company">🏢 {job.company}</p>
                        <p className="job-location">📍 {job.location}</p>
                        {getSalaryDisplay(job) && (
                          <p className="job-salary">
                            💰 {getSalaryDisplay(job)}
                          </p>
                        )}
                        <p className="job-type">📌 {job.jobType}</p>
                        <div className="job-footer">
                          <span className="applicant-count">
                            {job.applicationsCount || 0} Applicants
                          </span>
                          <div className="job-actions">
                            <button
                              className="btn-small btn-danger"
                              onClick={() => handleDeleteJob(job._id)}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}

          {activeTab === 'applications' && (
            <section className="applications-section">
              <h1>Applications Received</h1>
              {loading ? (
                <div className="loading">Loading applications...</div>
              ) : applications.length === 0 ? (
                <div className="empty-state">
                  <p>No applications received yet.</p>
                </div>
              ) : (
                <div className="applications-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Candidate</th>
                        <th>Job Title</th>
                        <th>Email</th>
                        <th>Status</th>
                        <th>Applied Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {applications.map((app) => (
                        <tr key={app._id}>
                          <td>{app.candidateId?.name || 'Unknown'}</td>
                          <td>{app.jobId?.title || 'Unknown'}</td>
                          <td>{app.candidateId?.email || '-'}</td>
                          <td>
                            <select
                              value={app.status}
                              onChange={(e) => handleUpdateApplicationStatus(app._id, e.target.value)}
                              className={`status-select status-${app.status}`}
                            >
                              <option value="applied">Applied</option>
                              <option value="reviewing">Reviewing</option>
                              <option value="rejected">Rejected</option>
                              <option value="accepted">Accepted</option>
                            </select>
                          </td>
                          <td>{new Date(app.appliedAt).toLocaleDateString()}</td>
                          <td>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              <button className="btn-small" type="button" onClick={() => handleSendStatusEmail(app)}>
                                Send Email
                              </button>
                              {app.resume && (
                                <button className="btn-small btn-outline" type="button" onClick={() => viewResume(app._id)}>
                                  View Resume
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
