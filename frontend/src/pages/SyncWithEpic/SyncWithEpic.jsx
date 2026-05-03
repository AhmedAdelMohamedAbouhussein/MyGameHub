import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/Footer";
import Aside from "../../components/Aside/Aside";
import { SiEpicgames } from "react-icons/si";
import { FaBars, FaExclamationTriangle } from "react-icons/fa";
import { useState } from "react";
import BackButton from "../../components/BackButton/BackButton";

const STEPS = [
    {
        num: 1,
        title: "Sign in with Epic",
        desc: "Click the button below to be redirected to Epic Games' official secure login page.",
    },
    {
        num: 2,
        title: "Authorise Profile Access",
        desc: "Allow GameHub to see your basic profile (Display Name) and your Friends list.",
    },
    {
        num: 3,
        title: "Social Sync",
        desc: "You'll be redirected back and your Epic friends will appear in your GameHub friends list.",
    },
];

const SYNC_INFO = [
    { label: "Public Profile", status: "yes", desc: "Display Name only" },
    { label: "Friends List", status: "yes", desc: "Sync your Epic friends to GameHub" },
    { label: "Avatars", status: "no", desc: "Restricted by Epic Games API" },
    { label: "Game Library", status: "no", desc: "Full library sync is restricted by Epic" },
];

const NOTES = [
    "Epic Games uses official OAuth 2.0 — we never see or store your password.",
    "This sync focuses on social features and profile linking.",
    "Full library sync is currently restricted by Epic Games for all third-party applications.",
];

function SyncWithEpic() {
    const BACKEND_URL = import.meta.env.VITE_REACT_APP_BACKEND_URL;
    const [mobileAsideOpen, setMobileAsideOpen] = useState(false);

    const syncwithepic = () => {
        window.location.href = `${BACKEND_URL}/api/sync/epic`;
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
                            <div className="w-20 h-20 rounded-2xl bg-gray-800/60 border border-white/10 flex items-center justify-center mx-auto">
                                <SiEpicgames className="text-gray-200" size={42} />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-text-primary">Connect Epic Games</h1>
                                <p className="text-sm text-text-secondary mt-1">Link your Epic Games account to sync your social profile and friends list.</p>
                            </div>
                        </div>

                        {/* Sync capabilities */}
                        <div className="card-surface p-6 space-y-4">
                            <h2 className="text-xs font-black uppercase tracking-widest text-text-muted">What's being synced</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {SYNC_INFO.map((item, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-midnight-900/40 border border-white/5">
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${item.status === 'yes' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                            {item.status === 'yes' ? '✓' : '✕'}
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-bold text-text-primary leading-none">{item.label}</p>
                                            <p className="text-[10px] text-text-muted mt-1">{item.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
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
                            onClick={syncwithepic}
                            className="btn-primary w-full py-4 text-base flex items-center justify-center gap-3"
                        >
                            <SiEpicgames size={20} />
                            Connect with Epic Games
                        </button>

                    </div>
                </main>
            </div>
            <Footer />
        </div>
    );
}

export default SyncWithEpic;