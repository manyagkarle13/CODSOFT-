import { useMemo, useState } from 'react';
import EmployerDashboard from './pages/EmployerDashboard';
import CandidateDashboard from './pages/CandidateDashboard';
import './App.css';
import heroPhoto from './assets/job-hero-photo.png';

const steps = [
  {
    icon: '01',
    title: 'Create Your Account',
    text: 'Choose a candidate or employer account and set up your workspace.',
  },
  {
    icon: '02',
    title: 'Post Or Find Jobs',
    text: 'Employers publish openings while candidates search matching roles.',
  },
  {
    icon: '03',
    title: 'Apply And Manage',
    text: 'Candidates upload resumes and employers review applications.',
  },
  {
    icon: '04',
    title: 'Hire Or Get Hired',
    text: 'Track progress, send updates, and keep every job action organized.',
  },
];

const initialAuthForm = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  role: 'candidate',
};

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').trim() || 'http://localhost:5000';

function App() {
  const [authMode, setAuthMode] = useState(null);
  const [authForm, setAuthForm] = useState(initialAuthForm);
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [currentUser, setCurrentUser] = useState(() => {
    const savedSession = localStorage.getItem('jobsphere_session');
    return savedSession ? JSON.parse(savedSession) : null;
  });
  const [currentView, setCurrentView] = useState('landing');

  const isSignup = authMode === 'signup';
  const modalTitle = isSignup ? 'Create your JobSphere account' : 'Welcome back to JobSphere';

  const modalSubtitle = useMemo(() => {
    if (isSignup) {
      return 'Sign up as a candidate to apply for jobs or as an employer to post openings.';
    }

    return 'Log in to continue managing jobs, applications, and your profile.';
  }, [isSignup]);

  const openAuth = (mode) => {
    setAuthMode(mode);
    setAuthForm(initialAuthForm);
    setAuthError('');
    setAuthSuccess('');
  };

  const closeAuth = () => {
    setAuthMode(null);
    setAuthError('');
    setAuthSuccess('');
  };

  const updateAuthForm = (event) => {
    const { name, value } = event.target;
    setAuthForm((form) => ({ ...form, [name]: value }));
  };

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    const email = authForm.email.trim().toLowerCase();
    const name = authForm.name.trim();

    if (!email.includes('@') || !email.includes('.')) {
      setAuthError('Please enter a valid email address.');
      return;
    }

    if (authForm.password.length < 6) {
      setAuthError('Password must be at least 6 characters.');
      return;
    }

    if (isSignup) {
      if (name.length < 2) {
        setAuthError('Please enter your full name.');
        return;
      }

      if (authForm.password !== authForm.confirmPassword) {
        setAuthError('Passwords do not match.');
        return;
      }
    }

    try {
      const endpoint = isSignup ? '/api/auth/register' : '/api/auth/login';
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password: authForm.password,
          role: authForm.role,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setAuthError(data.message || 'Authentication failed.');
        return;
      }

      const sessionUser = {
        ...data.user,
        token: data.token,
      };

      localStorage.setItem('jobsphere_session', JSON.stringify(sessionUser));
      setCurrentUser(sessionUser);
      setAuthSuccess(isSignup ? 'Account created successfully.' : 'Logged in successfully.');
      setTimeout(() => {
        closeAuth();
        setCurrentView('dashboard');
      }, 600);
    } catch {
      setAuthError('Could not reach the backend. Make sure the backend server is running.');
    }
  };

  const logout = () => {
    localStorage.removeItem('jobsphere_session');
    setCurrentUser(null);
    setCurrentView('landing');
  };

  // Show dashboard if logged in and viewing dashboard
  if (currentView === 'dashboard' && currentUser) {
    return currentUser.role === 'employer' ? (
      <EmployerDashboard user={currentUser} onLogout={logout} onBackToHome={() => setCurrentView('landing')} />
    ) : (
      <CandidateDashboard user={currentUser} onLogout={logout} onBackToHome={() => setCurrentView('landing')} />
    );
  }

  // Show landing page
  return (
    <main className="page-shell">
      <div className="site-card">
        <nav className="navbar" aria-label="Main navigation">
          <a className="brand" href="/">
            Job<span>Sphere</span>
          </a>

          <div className="nav-links">
            <a className="active" href="/">Home</a>
            <a href="#roles">For Users</a>
            <a href="#steps">How It Works</a>
            <a href="#about">About Us</a>
          </div>

          <div className="nav-actions">
            {currentUser ? (
              <>
                <span className="user-pill">{currentUser.name}</span>
                <button className="login-button" type="button" onClick={() => setCurrentView('dashboard')}>Go to Dashboard</button>
                <button className="login-button" type="button" onClick={logout}>Log out</button>
              </>
            ) : (
              <>
                <button className="login-button" type="button" onClick={() => openAuth('login')}>Log in</button>
                <button className="signup-button" type="button" onClick={() => openAuth('signup')}>Sign Up</button>
              </>
            )}
          </div>
        </nav>

        <section className="hero-section" id="home">
          <img className="hero-photo-bg" src={heroPhoto} alt="" aria-hidden="true" />

          <div className="hero-copy">
            <p className="eyebrow">One platform for hiring and job search</p>
            <h1>
              Find Jobs And <span>Post Jobs</span> With JobSphere
            </h1>
            <p className="hero-description">
              Job seekers can search, apply, and manage applications while employers post openings, review candidates, and hire faster.
            </p>

            <div className="hero-cta-row">
              <button className="primary-button" type="button" onClick={() => openAuth('signup')}>Apply Now</button>
              <button className="secondary-button" type="button" onClick={() => openAuth('signup')}>Post a Job</button>
              <div className="mini-stat">
                <strong>20k+</strong>
                <span>candidates and employers</span>
              </div>
            </div>
          </div>

          <div className="hero-visual" aria-label="Professional using a laptop">
            <div className="job-badge">
              <strong>250+</strong>
              <span>Jobs Post Daily</span>
            </div>
          </div>
        </section>

        {currentUser && (
          <section className="session-banner" aria-label="Logged in account">
            <div>
              <span>{currentUser.role === 'employer' ? 'Employer Dashboard' : 'Candidate Dashboard'}</span>
              <strong>Welcome, {currentUser.name}</strong>
            </div>
            <p>
              {currentUser.role === 'employer'
                ? 'You can now post jobs and review applicants.'
                : 'You can now search jobs and track your applications.'}
            </p>
          </section>
        )}

        <section className="roles-section" id="roles">
          <article className="role-panel">
            <p className="section-kicker">For Job Seekers</p>
            <h2>Search, Apply, And Track Your Applications</h2>
            <p>
              Create your profile, upload your resume, save jobs, and apply to openings from one clean candidate dashboard.
            </p>
          </article>

          <article className="role-panel employer-panel">
            <p className="section-kicker">For Employers</p>
            <h2>Post Jobs And Manage Applicants</h2>
            <p>
              Add job openings, manage company details, review resumes, and follow every candidate from application to hire.
            </p>
          </article>
        </section>

        <section className="steps-section" id="steps">
          <p className="section-kicker">How it Works</p>
          <h2>Easy Steps For Candidates And Employers</h2>

          <div className="steps-grid">
            {steps.map((step) => (
              <article className="step-card" key={step.title}>
                <div className="step-icon">{step.icon}</div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="about-section" id="about">
          <div className="about-image" aria-label="JobSphere dashboard preview">
            <div className="dashboard-card dashboard-jobs">
              <span className="dashboard-label">Job Listings</span>
              <strong>Frontend Developer</strong>
              <p>Remote - Full Time</p>
              <button type="button" onClick={() => openAuth('signup')}>Apply</button>
            </div>
            <div className="dashboard-card dashboard-applicants">
              <span className="dashboard-label">Applicants</span>
              <strong>24 New Profiles</strong>
              <p>Resume review ready</p>
              <button type="button" onClick={() => openAuth('signup')}>Review</button>
            </div>
          </div>
          <div className="about-copy">
            <p className="section-kicker">Our Services</p>
            <h2>A Complete Job Board For Applying And Hiring</h2>
            <p>
              JobSphere brings job listings, employer posting, resume upload, application tracking, and secure accounts into one responsive platform.
            </p>
          </div>
        </section>
      </div>

      {authMode && (
        <div className="auth-overlay" role="dialog" aria-modal="true" aria-labelledby="auth-title">
          <div className="auth-modal">
            <button className="auth-close" type="button" onClick={closeAuth} aria-label="Close authentication form">x</button>
            <p className="section-kicker">{isSignup ? 'Sign Up' : 'Log In'}</p>
            <h2 id="auth-title">{modalTitle}</h2>
            <p className="auth-subtitle">{modalSubtitle}</p>

            <form className="auth-form" onSubmit={handleAuthSubmit}>
              {isSignup && (
                <>
                  <label>
                    Full Name
                    <input name="name" value={authForm.name} onChange={updateAuthForm} autoComplete="name" placeholder="Enter your name" />
                  </label>

                  <label>
                    Account Type
                    <select name="role" value={authForm.role} onChange={updateAuthForm}>
                      <option value="candidate">Job Seeker</option>
                      <option value="employer">Employer</option>
                    </select>
                  </label>
                </>
              )}

              <label>
                Email
                <input name="email" type="email" value={authForm.email} onChange={updateAuthForm} autoComplete="email" placeholder="you@example.com" />
              </label>

              <label>
                Password
                <input name="password" type="password" value={authForm.password} onChange={updateAuthForm} autoComplete={isSignup ? 'new-password' : 'current-password'} placeholder="Minimum 6 characters" />
              </label>

              {isSignup && (
                <label>
                  Confirm Password
                  <input name="confirmPassword" type="password" value={authForm.confirmPassword} onChange={updateAuthForm} autoComplete="new-password" placeholder="Re-enter password" />
                </label>
              )}

              {authError && <p className="auth-message error">{authError}</p>}
              {authSuccess && <p className="auth-message success">{authSuccess}</p>}

              <button className="auth-submit" type="submit">{isSignup ? 'Create Account' : 'Log In'}</button>
            </form>

            <button className="auth-switch" type="button" onClick={() => openAuth(isSignup ? 'login' : 'signup')}>
              {isSignup ? 'Already have an account? Log in' : 'New to JobSphere? Create an account'}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

export default App;
