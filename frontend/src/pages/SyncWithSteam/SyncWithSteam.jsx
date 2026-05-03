import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/Footer";
import Aside from "../../components/Aside/Aside";
import { FaSteam, FaExternalLinkAlt, FaCheckCircle, FaExclamationTriangle, FaBars } from "react-icons/fa";
import { useState } from "react";
import BackButton from "../../components/BackButton/BackButton";

const STEPS = [
    {
        num: 1,
        title: "Sign in with Steam",
        desc: "Click the button below to be redirected to Steam's official secure login page.",
    },
    {
        num: 2,
        title: "Authorise Profile Access",
        desc: "Allow GameHub to see your public profile, game library, and friends list.",
    },
    {
        num: 3,
        title: "You're done!",
        desc: "You'll be redirected back and your Steam library will sync automatically.",
    },
];

const SYNC_INFO = [
    { label: "Steam Profile", status: "yes", desc: "Persona Name and Avatar" },
    { label: "Game Library", status: "yes", desc: "Sync your entire Steam collection" },
    { label: "Achievements", status: "yes", desc: "Sync your unlocked trophies and progress" },
    { label: "Friends List", status: "yes", desc: "Sync your Steam friends to GameHub" },
];

const NOTES = [
    "Steam sync uses official OpenID — we never see or store your password.",
    "Only games in your Steam library are imported.",
    "Ensure your 'Game details' are set to Public in Steam Privacy Settings.",
];

function SyncWithSteam() {
    const BACKEND_URL = import.meta.env.VITE_REACT_APP_BACKEND_URL;
    const [mobileAsideOpen, setMobileAsideOpen] = useState(false);

    const syncwithsteam = () => {
        window.location.href = `${BACKEND_URL}/api/sync/steam`;
    };

    return (
        <div className="page-container">
            <Header />
            <div className="flex-1 flex">
                <Aside />
                <Aside isOpen={mobileAsideOpen} onClose={() => setMobileAsideOpen(false)} />
                <main className="flex-1 px-4 py-12">
                    <div className="max-w-2xl mx-auto space-y-6 animate-slide-up">
                        <BackButton variant="static" />

                        <div className="flex items-center lg:hidden mb-4">
                            <button
                                onClick={() => setMobileAsideOpen(true)}
                                className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-midnight-600 transition-colors"
                            >
                                <FaBars size={20} />
                            </button>
                        </div>

                        {/* Hero card */}
                        <div className="card-surface p-8 text-center space-y-4">
                            <div className="w-20 h-20 rounded-2xl bg-blue-900/30 border border-blue-500/20 flex items-center justify-center mx-auto">
                                <FaSteam className="text-blue-400" size={42} />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-text-primary">Connect Steam</h1>
                                <p className="text-sm text-text-secondary mt-1">Sync your Steam library, achievements, and friends via the official secure login.</p>
                            </div>
                        </div>

                        {/* Sync capabilities */}
                        <div className="card-surface p-6 space-y-4">
                            <h2 className="text-xs font-black uppercase tracking-widest text-text-muted">What's being synced</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {SYNC_INFO.map((item, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-midnight-900/40 border border-white/5">
                                        <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 bg-green-500/10 text-green-500">
                                            ✓
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-bold text-text-primary leading-none">{item.label}</p>
                                            <p className="text-[10px] text-text-muted mt-1">{item.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Privacy warning */}
                        <div className="flex gap-3 items-start bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4">
                            <FaExclamationTriangle className="text-amber-400 mt-0.5 flex-shrink-0" size={14} />
                            <p className="text-xs text-amber-300 leading-relaxed">
                                <strong>Privacy Notice:</strong> Ensure your Steam "Game details" are set to <strong>Public</strong> in your Steam Privacy settings, otherwise Steam will not share your library data.
                            </p>
                        </div>

                        {/* Steps */}
                        <div className="card-surface p-6 space-y-5">
                            <h2 className="text-xs font-black uppercase tracking-widest text-text-muted">How it works</h2>
                            {STEPS.map(s => (
                                <div key={s.num} className="flex gap-4">
                                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm bg-accent/10 text-accent">
                                        {s.num}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-text-primary">{s.title}</p>
                                        <p className="text-xs text-text-muted mt-0.5 leading-relaxed">{s.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Privacy settings link */}
                        <a
                            href="https://store.steampowered.com/account/edit"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 py-3 px-5 rounded-xl border border-white/10 text-text-secondary hover:text-text-primary hover:bg-white/5 transition-all text-sm"
                        >
                            <FaExternalLinkAlt size={11} /> Open Steam Privacy Settings
                        </a>

                        {/* How to find privacy settings - YouTube */}
                        <div className="card-surface p-5 space-y-3">
                            <h2 className="text-xs font-black uppercase tracking-widest text-text-muted">How to make your Steam profile public</h2>
                            <div className="relative w-full rounded-xl overflow-hidden" style={{ paddingTop: '56.25%' }}>
                                <iframe
                                    className="absolute inset-0 w-full h-full"
                                    src="https://www.youtube.com/embed/t7I0XdA6U2k"
                                    title="How to make Steam profile public"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                />
                            </div>
                        </div>

                        {/* Notes */}
                        <div className="card-surface p-5 space-y-3">
                            <h2 className="text-xs font-black uppercase tracking-widest text-text-muted">Good to know</h2>
                            <ul className="space-y-2">
                                {NOTES.map((note, i) => (
                                    <li key={i} className="flex items-start gap-2 text-xs text-text-muted leading-relaxed">
                                        <span className="text-accent mt-0.5 flex-shrink-0">•</span>
                                        {note}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* CTA */}
                        <button
                            onClick={syncwithsteam}
                            className="btn-primary w-full py-4 text-base flex items-center justify-center gap-3"
                        >
                            <FaSteam size={20} />
                            Connect with Steam
                        </button>

                    </div>
                </main>
            </div>
            <Footer />
        </div>
    );
}

export default SyncWithSteam;