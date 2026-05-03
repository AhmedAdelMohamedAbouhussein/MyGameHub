import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { FaLock, FaCheck, FaTimes, FaShieldAlt } from "react-icons/fa";
import AuthContext from "../../contexts/AuthContext";
import apiClient from "../../utils/apiClient";
import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/Footer";

function SetPassword() {
    const { user, fetchUser } = useContext(AuthContext);
    const navigate = useNavigate();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);

    // Password validation logic (same as signup)
    const checks = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /\d/.test(password),
        match: password === confirmPassword && password !== ""
    };

    const isAllValid = Object.values(checks).every(Boolean);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isAllValid) {
            toast.error("Please meet all password requirements");
            return;
        }

        setLoading(true);
        try {
            await apiClient.post("/users/set-initial-password", { password });
            toast.success("Password set successfully!");
            await fetchUser(); // Refresh user state
            navigate("/library"); // Redirect to library
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to set password");
        } finally {
            setLoading(false);
        }
    };

    if (!user || user.hasPassword) {
        return null; // Should be handled by router redirect
    }

    return (
        <div className="min-h-screen flex flex-col bg-midnight-950 text-white">
            <Header />
            
            <main className="flex-1 flex items-center justify-center p-4 relative overflow-hidden">
                {/* Decorative background blobs */}
                <div className="absolute top-1/4 -left-20 w-96 h-96 bg-accent/10 rounded-full blur-[120px] pointer-events-none"></div>
                <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] pointer-events-none"></div>

                <div className="w-full max-w-md relative z-10">
                    <div className="bg-midnight-900/50 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 sm:p-10 shadow-2xl">
                        <div className="text-center space-y-3 mb-10">
                            <div className="w-16 h-16 bg-accent/20 rounded-3xl flex items-center justify-center text-accent mx-auto mb-6 border border-accent/20 shadow-lg shadow-accent/10">
                                <FaShieldAlt size={32} />
                            </div>
                            <h1 className="text-3xl font-black tracking-tight">Secure Your Account</h1>
                            <p className="text-text-secondary text-sm leading-relaxed">
                                Since you signed up with Google, you haven't set a password yet. Setting one adds an extra layer of security to your profile.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-text-muted ml-1">New Password</label>
                                <div className="relative">
                                    <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                                    <input
                                        type="password"
                                        placeholder="Min. 8 chars, 1 Upper, 1 Number"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="input-field w-full pl-12 bg-midnight-800/50 border-white/5 focus:border-accent/50 transition-all rounded-2xl h-14"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-text-muted ml-1">Confirm Password</label>
                                <div className="relative">
                                    <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                                    <input
                                        type="password"
                                        placeholder="Repeat your password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="input-field w-full pl-12 bg-midnight-800/50 border-white/5 focus:border-accent/50 transition-all rounded-2xl h-14"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Validation Checklist */}
                            <div className="grid grid-cols-2 gap-3 p-4 bg-midnight-950/50 rounded-2xl border border-white/5">
                                <ValidationItem label="8+ Characters" valid={checks.length} />
                                <ValidationItem label="Uppercase" valid={checks.uppercase} />
                                <ValidationItem label="Lowercase" valid={checks.lowercase} />
                                <ValidationItem label="One Number" valid={checks.number} />
                                <div className="col-span-2 pt-2 border-t border-white/5">
                                    <ValidationItem label="Passwords Match" valid={checks.match} />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={!isAllValid || loading}
                                className={`w-full h-14 rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition-all duration-300 shadow-xl ${
                                    isAllValid && !loading 
                                    ? 'bg-gradient-to-r from-accent to-accent-hover text-white shadow-accent/20 hover:scale-[1.02] active:scale-95' 
                                    : 'bg-midnight-700 text-text-muted cursor-not-allowed opacity-50'
                                }`}
                            >
                                {loading ? "Securing..." : "Set Password"}
                            </button>
                        </form>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}

function ValidationItem({ label, valid }) {
    return (
        <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider transition-colors duration-300 ${valid ? 'text-emerald-400' : 'text-text-muted opacity-50'}`}>
            {valid ? <FaCheck className="text-[8px]" /> : <FaTimes className="text-[8px]" />}
            {label}
        </div>
    );
}

export default SetPassword;
