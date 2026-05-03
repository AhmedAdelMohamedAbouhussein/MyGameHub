import { useState, useContext } from "react";
import { useGoogleLogin } from '@react-oauth/google';
import { toast } from "sonner";
import apiClient from "../../utils/apiClient.js";
import { Link, useNavigate } from 'react-router-dom';
import { FiEye, FiEyeOff, FiRotateCcw, FiTrash } from "react-icons/fi";
import { FaUserAstronaut, FaCheck, FaTimes } from "react-icons/fa";

import Header from "../../components/Header/Header.jsx";
import Footer from "../../components/Footer/Footer.jsx";
import AuthContext from "../../contexts/AuthContext.jsx";
import LoadingScreen from "../../components/LoadingScreen/LoadingScreen.jsx";

function SignupPage() {
  const navigate = useNavigate();
  const { fetchUser } = useContext(AuthContext);

  const [formData, setFormData] = useState({ username: "", email: "", password: "" });
  const [feedback, setFeedback] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Password validation logic for real-time feedback
  const passwordChecks = {
    length: formData.password.length >= 8,
    uppercase: /[A-Z]/.test(formData.password),
    lowercase: /[a-z]/.test(formData.password),
    number: /\d/.test(formData.password),
  };

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  function validateForm({ username, email, password }) {
    const errors = [];
    if (username.length < 2 || username.length > 50) {
      errors.push("Name must be between 2 and 50 characters");
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      errors.push("Invalid email format");
    }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password)) {
      errors.push("Password should be at least 8 characters long and must contain at least 1 uppercase, 1 lowercase, and 1 number");
    }
    return errors;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { username, email, password } = formData;

    const errors = validateForm(formData);
    if (errors.length > 0) {
      toast.error(errors[0]);
      return;
    }

    try {
      setLoading(true);
      const response = await apiClient.post(`/users/adduser`, {
        name: username,
        email: email,
        password: password
      });

      const message = response.data.message;
      const userId = response.data.userId;

      toast.success(message || "Account created! Redirecting to verification...");
      navigate(`/verify?userId=${userId}&email=${encodeURIComponent(email)}&purpose=email_verification`);
    }
    catch (error) {
      if (error.response?.data) {
        const { message, restoreLink, permanentDelete } = error.response.data;
        if (restoreLink || permanentDelete) {
          setFeedback({ type: "error", message, restoreLink, permanentDelete });
        } else {
          toast.error(message || "Something went wrong");
        }
      }
      else {
        toast.error("Network error: Unable to reach server");
      }
    }
    finally {
      setLoading(false);
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: async ({ code }) => {
      try {
        setLoading(true);
        const response = await apiClient.post(`/auth/google/signup`, { code });
        const message = response.data.message;
        toast.success(message || "Account created and logged in!");
        await fetchUser();
        navigate('/');
      }
      catch (error) {
        if (error.response?.data) {
          const { message, restoreLink, permanentDelete } = error.response.data;
          if (restoreLink || permanentDelete) {
            setFeedback({ type: "error", message, restoreLink, permanentDelete });
          } else {
            toast.error(message || "Something went wrong");
          }
        }
        else {
          toast.error("Network error: Unable to reach server");
        }
      }
      finally {
        setLoading(false);
      }
    },
    flow: 'auth-code',
  });

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-midnight-900 flex flex-col relative overflow-hidden">
      {/* Premium ambient glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-accent/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-pink-500/10 blur-[120px] rounded-full pointer-events-none" />

      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-12 sm:py-16 relative z-10">
        <div className="w-full max-w-md animate-slide-up">
          <form
            className="bg-midnight-800/60 backdrop-blur-xl border border-white/10 shadow-2xl p-8 sm:p-10 rounded-[2.5rem] space-y-6"
            onSubmit={handleSubmit}
          >
            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-midnight-900 border border-white/5 mb-6 shadow-inner transform rotate-6 hover:rotate-0 transition-transform duration-500">
                <FaUserAstronaut className="text-3xl text-accent" />
              </div>
              <h2 className="text-3xl font-black text-text-primary uppercase tracking-tight slant-1">Create Account</h2>
              <p className="text-sm text-text-muted mt-2 font-medium">Join the ultimate GameHub</p>
            </div>

            <input
              type="text"
              name="username"
              placeholder="Username"
              className="input-field"
              value={formData.username}
              onChange={handleChange}
              required
              minLength={2}
              maxLength={50}
            />

            <input
              type="email"
              name="email"
              placeholder="Email"
              className="input-field"
              value={formData.email}
              onChange={handleChange}
              required
            />

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Password"
                className="input-field pr-12"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={8}
                maxLength={50}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors p-1"
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
              </button>
            </div>

            {/* Password Strength Indicator */}
            {formData.password.length > 0 && (
              <div className="grid grid-cols-2 gap-2 p-3 bg-midnight-950/40 rounded-2xl border border-white/5 animate-in fade-in slide-in-from-top-2 duration-300">
                <ValidationItem label="8+ Characters" valid={passwordChecks.length} />
                <ValidationItem label="Uppercase" valid={passwordChecks.uppercase} />
                <ValidationItem label="Lowercase" valid={passwordChecks.lowercase} />
                <ValidationItem label="One Number" valid={passwordChecks.number} />
              </div>
            )}

            {/* Inline action feedback for complex flows */}
            {feedback && (
              <div className="rounded-lg border border-danger/30 bg-danger/5 p-4 space-y-3 animate-slide-down">
                <p className="text-sm text-danger">{feedback.message}</p>
                <div className="flex flex-wrap gap-2">
                  {feedback.restoreLink && (
                    <button
                      type="button"
                      onClick={() => window.location.href = feedback.restoreLink}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent-glow transition-colors"
                    >
                      <FiRotateCcw size={14} /> Restore Account
                    </button>
                  )}
                  {feedback.permanentDelete && (
                    <button
                      type="button"
                      onClick={() => window.location.href = feedback.permanentDelete}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-danger hover:text-red-400 transition-colors"
                    >
                      <FiTrash size={14} /> Delete Permanently
                    </button>
                  )}
                </div>
              </div>
            )}

            <button type="submit" className="btn-primary w-full text-sm font-black uppercase tracking-widest py-4 rounded-2xl shadow-lg shadow-accent/20 hover:shadow-accent/40 transition-all active:scale-95">
              Create Account
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-midnight-500/30" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-midnight-700 px-3 text-text-muted">or</span>
              </div>
            </div>

            <button
              type="button"
              className="w-full h-[56px] flex items-center justify-center gap-3 text-sm font-black uppercase tracking-widest p-3 bg-white/5 text-white border border-white/10 rounded-2xl cursor-pointer transition-all duration-300 hover:bg-white/10 active:scale-[0.98]"
              onClick={() => googleLogin()}
            >
              <img src="https://res.cloudinary.com/dvbmaonhc/image/upload/site_assets/google_logo.webp" alt="Google" className="w-5 h-5 bg-white rounded-full p-0.5" />
              Sign up with Google
            </button>

            <p className="text-center text-sm text-text-muted">
              Already have an account?{' '}
              <Link to="/login" className="text-accent hover:text-accent-glow font-medium transition-colors">
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function ValidationItem({ label, valid }) {
  return (
    <div className={`flex items-center gap-2 text-[9px] font-black uppercase tracking-widest transition-colors duration-300 ${valid ? 'text-emerald-400' : 'text-text-muted opacity-50'}`}>
      {valid ? <FaCheck className="text-[7px]" /> : <FaTimes className="text-[7px]" />}
      {label}
    </div>
  );
}

export default SignupPage;