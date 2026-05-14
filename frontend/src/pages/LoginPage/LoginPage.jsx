import { useState, useContext } from "react";
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { toast } from "sonner";
import apiClient from "../../utils/apiClient.js";

import { FiEye, FiEyeOff, FiRotateCcw, FiTrash, FiMail } from "react-icons/fi";
import { FaGamepad } from "react-icons/fa";

import Header from "../../components/Header/Header.jsx";
import Footer from "../../components/Footer/Footer.jsx";
import AuthContext from "../../contexts/AuthContext.jsx";
import LoadingScreen from "../../components/LoadingScreen/LoadingScreen.jsx";
import SEO from "../../components/SEO/SEO.jsx";

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname;
  const redirectTo = (!from || ["/login", "/signup"].includes(from)) ? "/" : from;

  const { fetchUser } = useContext(AuthContext);

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [isChecked, setIsChecked] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleLoginSuccess = async (message) => {
    toast.success(message || "Logged in successfully");
    await fetchUser();
    navigate(redirectTo, { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { email, password } = formData;

    try {
      setLoading(true);
      const response = await apiClient.post(`/users/login`,
        { email: email.trim(), password: password, rememberMe: isChecked }
      );
      handleLoginSuccess(response.data.message);
    }
    catch (error) {
      if (error.response?.data) {
        const { message, verifyLink, restoreLink, permanentDelete } = error.response.data;

        if (verifyLink) {
          setFeedback({ type: "error", message: message || "Something went wrong", verifyLink });
        }
        else if (restoreLink && permanentDelete) {
          setFeedback({ type: "error", message: message || "Something went wrong", restoreLink, permanentDelete });
        }
        else {
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

  const resetPassword = async () => {
    try {
      const { email } = formData;
      if (!email.trim()) {
        toast.error("Please enter your email first");
        return;
      }
      setLoading(true);
      const response = await apiClient.post(`/users/getuseridbyemail`, { email });
      const userId = response.data.userId;
      await apiClient.post(`/mail/sendotp`, { userId, email, purpose: "password_reset" });
      toast.success("OTP sent to your email");
      navigate(`/verify?userId=${userId}&email=${encodeURIComponent(email)}&purpose=password_reset`);
    }
    catch (error) {
      toast.error(error.response?.data?.message || "Something went wrong");
    }
    finally {
      setLoading(false);
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: async ({ code }) => {
      try {
        setLoading(true);
        const response = await apiClient.post(`/auth/google/login`,
          { code, rememberMe: isChecked },
          { withCredentials: true }
        );
        handleLoginSuccess(response.data.message);
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

  const redirectActions = async (purpose) => {
    try {
      const { email } = formData;
      setLoading(true);
      const response = await apiClient.post(`/users/getuseridbyemail`, { email });
      const userId = response.data.userId;
      await apiClient.post(`/mail/sendotp`, { userId, email, purpose });
      navigate(`/verify?userId=${userId}&email=${encodeURIComponent(email)}&purpose=${purpose}`);
    }
    catch (error) {
      toast.error(error.response?.data?.message || "Something went wrong");
    }
    finally {
      setLoading(false);
    }
  };

  const rememberCheckBox = (e) => {
    setIsChecked(e.target.checked);
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-midnight-900 flex flex-col relative overflow-hidden">
      <SEO 
        title="Sign In" 
        description="Log in to your GameHub account to access your unified gaming library, track achievement progress, and manage your wishlist."
      />
      {/* Premium ambient glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-accent/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 blur-[120px] rounded-full pointer-events-none" />
      
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-12 sm:py-16 relative z-10">
        <div className="w-full max-w-md animate-slide-up">
          <form
            className="bg-midnight-800/60 backdrop-blur-xl border border-white/10 shadow-2xl p-8 sm:p-10 rounded-[2.5rem] space-y-6"
            onSubmit={handleSubmit}
          >
            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-midnight-900 border border-white/5 mb-6 shadow-inner transform -rotate-6 hover:rotate-0 transition-transform duration-500">
                <FaGamepad className="text-3xl text-accent" />
              </div>
              <h2 className="text-3xl font-black text-text-primary uppercase tracking-tight slant-1">Welcome Back</h2>
              <p className="text-sm text-text-muted mt-2 font-medium">Access your gaming universe</p>
            </div>

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
                maxLength={50}
                minLength={8}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors p-1"
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={rememberCheckBox}
                  className="w-4 h-4 rounded border-midnight-500 bg-midnight-800 text-accent focus:ring-accent/50"
                />
                <span className="text-sm text-text-secondary">Remember Me</span>
              </label>
              <button
                type="button"
                className="text-sm text-accent hover:text-accent-glow transition-colors"
                onClick={resetPassword}
              >
                Forgot password?
              </button>
            </div>

            {/* Inline action feedback for complex flows */}
            {feedback && (
              <div className="rounded-lg border border-danger/30 bg-danger/5 p-4 space-y-3 animate-slide-down">
                <p className="text-sm text-danger">{feedback.message}</p>
                <div className="flex flex-wrap gap-2">
                  {feedback.verifyLink && (
                    <button
                      type="button"
                      onClick={() => redirectActions("email_verification")}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent-glow transition-colors"
                    >
                      <FiMail size={14} /> Verify Account
                    </button>
                  )}
                  {feedback.restoreLink && (
                    <button
                      type="button"
                      onClick={() => redirectActions("restore_account")}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent-glow transition-colors"
                    >
                      <FiRotateCcw size={14} /> Restore Account
                    </button>
                  )}
                  {feedback.permanentDelete && (
                    <button
                      type="button"
                      onClick={() => redirectActions("permanently_delete_account")}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-danger hover:text-red-400 transition-colors"
                    >
                      <FiTrash size={14} /> Delete Permanently
                    </button>
                  )}
                </div>
              </div>
            )}

            <button type="submit" className="btn-primary w-full text-sm font-black uppercase tracking-widest py-4 rounded-2xl shadow-lg shadow-accent/20 hover:shadow-accent/40 transition-all active:scale-95">
              Sign In
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
              Sign in with Google
            </button>

            <p className="text-center text-sm text-text-muted">
              Don't have an account?{' '}
              <Link to="/signup" className="text-accent hover:text-accent-glow font-medium transition-colors">
                Sign up
              </Link>
            </p>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default LoginPage;
