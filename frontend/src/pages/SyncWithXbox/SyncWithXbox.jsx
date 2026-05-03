import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/Footer";
import Aside from "../../components/Aside/Aside";
import { FaXbox, FaBars, FaExclamationTriangle } from "react-icons/fa";
import { useState } from "react";
import BackButton from "../../components/BackButton/BackButton";

const STEPS = [
    {
        num: 1,
        title: "Sign in with Microsoft",
        desc: "Click the button below to be redirected to Microsoft's official secure login page.",
    },
    {
        num: 2,
        title: "Authorise Profile Access",
        desc: "Allow GameHub to see your Xbox profile, game library, and friends list.",
    },
    {
        num: 3,
        title: "Automatic Import",
        desc: "You'll be redirected back and your Xbox data will be imported automatically.",
    },
];

const SYNC_INFO = [
    { label: "Xbox Profile", status: "yes", desc: "Gamertag, Gamerscore, and Avatar" },
    { label: "Game Library", status: "yes", desc: "Import your Xbox digital collection" },
    { label: "Achievements", status: "yes", desc: "Sync your unlocked trophies and progress" },
    { label: "Friends List", status: "yes", desc: "Sync your Xbox friends to GameHub" },
];

const NOTES = [
    "Xbox sync uses official Microsoft OAuth 2.0 — we never see your password.",
    "Ensure your 'Privacy & Online Safety' settings are set to Public for Game History.",
    "Digital games and Game Pass titles are included in the sync.",
];

function SyncWithXbox() {
    const BACKEND_URL = import.meta.env.VITE_REACT_APP_BACKEND_URL;
    const [mobileAsideOpen, setMobileAsideOpen] = useState(false);

    const SyncWithxbox = () => {
        window.location.href = `${BACKEND_URL}/api/sync/xbox`;
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
                            <div className="w-20 h-20 rounded-2xl bg-green-900/30 border border-green-500/20 flex items-center justify-center mx-auto">
                                <FaXbox className="text-green-400" size={42} />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-text-primary">Connect Xbox</h1>
                                <p className="text-sm text-text-secondary mt-1">Link your Microsoft account to sync your Xbox library, achievements, and friends.</p>
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
                                <strong>Privacy Notice:</strong> Ensure your Xbox "Game & App History" is set to <strong>Public</strong> in your Xbox Privacy settings, otherwise your library will appear empty.
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
                            onClick={SyncWithxbox}
                            className="btn-primary w-full py-4 text-base flex items-center justify-center gap-3"
                        >
                            <FaXbox size={20} />
                            Connect with Xbox
                        </button>

                    </div>
                </main>
            </div>
            <Footer />
        </div>
    );
}

export default SyncWithXbox;