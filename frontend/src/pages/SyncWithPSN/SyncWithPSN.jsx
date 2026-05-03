import { useState } from "react";
import BackButton from "../../components/BackButton/BackButton";
import { toast } from "sonner";
import apiClient from "../../utils/apiClient.js";
import Header from "../../components/Header/Header";
import Aside from "../../components/Aside/Aside";
import Footer from "../../components/Footer/Footer";
import LoadingScreen from "../../components/LoadingScreen/LoadingScreen";
import { SiPlaystation } from "react-icons/si";
import { FaBars, FaExternalLinkAlt, FaKey, FaExclamationTriangle } from "react-icons/fa";

const STEPS = [
    {
        num: 1,
        title: "Log in to PlayStation Store",
        desc: "Make sure you're signed in to your PSN account in this browser.",
    },
    {
        num: 2,
        title: "Open the direct Sony link below",
        desc: 'Click "Get my NPSSO from Sony" — Sony will return a JSON response like { "npsso": "abc123..." }. Copy just the value inside the quotes.',
        warn: true,
    },
    {
        num: 3,
        title: "Paste it in the field and click Sync",
        desc: "Paste your 64-character NPSSO value below and hit Sync. We use it once to fetch your library and then discard it.",
    },
];

const SYNC_INFO = [
    { label: "Public Profile", status: "yes", desc: "Online ID and Avatar" },
    { label: "Game Library", status: "yes", desc: "Digital and physical library history" },
    { label: "Trophies & Progress", status: "yes", desc: "Level, rank, and individual trophies" },
    { label: "Friends List", status: "yes", desc: "Sync your PSN friends to GameHub" },
];

const NOTES = [
    "This is an unofficial, community-driven integration.",
    "Sony does not offer a public OAuth API for 3rd parties.",
    "The NPSSO token is a temporary session key used to access your public profile.",
    "We never store your NPSSO — it is used for a single sync and then forgotten.",
];

function SyncWithPSN() {
    const [loading, setLoading] = useState(false);
    const [mobileAsideOpen, setMobileAsideOpen] = useState(false);
    const [npsso, setNpsso] = useState("");

    // Manual flow — user pastes NPSSO from the Sony direct link
    const syncManual = async () => {
        if (!npsso.trim()) {
            toast.error("Please paste your NPSSO value first.");
            return;
        }
        setLoading(true);
        try {
            await apiClient.post(`/sync/psn`, { npsso: npsso.trim() });
            toast.success("PlayStation synced successfully!");
            window.location.href = "/library";
        } catch (err) {
            toast.error(err.response?.data?.error || "Sync failed. Double-check your NPSSO value.");
            console.error(err.response?.data?.error || err.message);
        } finally {
            setLoading(false);
        }
    };

    // Chrome Extension flow — original working logic, unchanged
    const syncWithExtension = () => {
        setLoading(true);
        toast.info("Syncing with PlayStation...");

        const handleMessage = async (event) => {
            if (event.data.type === "NPSSO_RESPONSE") {
                if (event.data.npsso) {
                    try {
                        const npsso = event.data.npsso;
                        await apiClient.post(`/sync/psn`, { npsso });
                        toast.success("PlayStation synced successfully!");
                        window.location.href = "/MyGameHub/library";
                    } catch (err) {
                        toast.error("Sync failed");
                        console.error(err.response?.data?.error || err.message);
                    }
                } else {
                    toast.error("NPSSO not found. Please log in to PSN.");
                }
                setLoading(false);
                window.removeEventListener("message", handleMessage);
            }
        };

        window.addEventListener("message", handleMessage);
        window.postMessage({ type: "REQUEST_NPSSO" });
    };

    return (
        <div className="page-container">
            {loading && <LoadingScreen />}
            <Header />
            <div className="flex-1 flex">
                <Aside />
                <Aside isOpen={mobileAsideOpen} onClose={() => setMobileAsideOpen(false)} />
                <main className="flex-1 px-4 py-12">
                    <button
                        onClick={() => setMobileAsideOpen(true)}
                        className="lg:hidden fixed top-20 left-4 z-10 p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-midnight-600 transition-colors"
                    >
                        <FaBars size={18} />
                    </button>

                    <div className="max-w-2xl mx-auto space-y-6 animate-slide-up">
                        <BackButton variant="static" />

                        {/* Hero */}
                        <div className="card-surface p-8 text-center space-y-4 relative overflow-hidden">
                            <div className="absolute top-4 right-4">
                                <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[10px] font-black uppercase tracking-widest border border-amber-500/20">
                                    Unofficial
                                </span>
                            </div>
                            <div className="w-20 h-20 rounded-2xl bg-blue-900/30 border border-blue-500/20 flex items-center justify-center mx-auto">
                                <SiPlaystation className="text-blue-300" size={42} />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-text-primary">Connect PlayStation</h1>
                                <p className="text-sm text-text-secondary mt-1">
                                    Sync your PSN library, trophies, and friends via the unofficial community API method.
                                </p>
                            </div>
                        </div>

                        {/* Why NPSSO */}
                        <div className="flex gap-3 items-start bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4">
                            <FaExclamationTriangle className="text-amber-400 mt-0.5 flex-shrink-0" size={13} />
                            <p className="text-xs text-amber-300 leading-relaxed">
                                <strong>Unofficial Integration Notice:</strong> Sony does not provide a public API for third-party apps. This integration uses a community-developed method (NPSSO) to sync your profile. It is secure and we never store your credentials.
                            </p>
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

                        {/* Why NPSSO */}
                        <div className="flex gap-3 items-start bg-blue-500/5 border border-blue-500/20 rounded-2xl p-4">
                            <FaKey className="text-blue-400 mt-0.5 flex-shrink-0" size={13} />
                            <p className="text-xs text-blue-300 leading-relaxed">
                                <strong>Why do we need this?</strong> Sony doesn't offer a public OAuth API for 3rd parties. The NPSSO token is a temporary session key that lets us read your library on your behalf. We do not store it — it is used once and discarded immediately.
                            </p>
                        </div>

                        {/* Steps */}
                        <div className="card-surface p-6 space-y-5">
                            <h2 className="text-xs font-black uppercase tracking-widest text-text-muted">How to get your NPSSO</h2>
                            {STEPS.map(s => (
                                <div key={s.num} className="flex gap-4">
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm ${s.warn ? 'bg-amber-500/15 text-amber-400' : 'bg-accent/10 text-accent'}`}>
                                        {s.num}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-text-primary flex items-center gap-2">
                                            {s.title}
                                            {s.warn && <FaExclamationTriangle className="text-amber-400" size={12} />}
                                        </p>
                                        <p className="text-xs text-text-muted mt-0.5 leading-relaxed">{s.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* YouTube tutorial */}
                        <div className="card-surface p-5 space-y-3">
                            <h2 className="text-xs font-black uppercase tracking-widest text-text-muted">Video tutorial — finding your NPSSO</h2>
                            <div className="relative w-full rounded-xl overflow-hidden" style={{ paddingTop: '56.25%' }}>
                                <iframe
                                    className="absolute inset-0 w-full h-full"
                                    src="https://www.youtube.com/embed/FMQbJKGTFLs"
                                    title="How to get PlayStation NPSSO"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                />
                            </div>
                        </div>

                        {/* Direct Sony link */}
                        <div className="card-surface p-5 space-y-3">
                            <h2 className="text-xs font-black uppercase tracking-widest text-text-muted">Quickest way — direct Sony link</h2>
                            <p className="text-xs text-text-muted leading-relaxed">
                                Make sure you're already logged in to PlayStation, then open the link below. Sony returns your NPSSO as plain JSON — copy the value and paste it in the field below.
                            </p>
                            <a
                                href="https://ca.account.sony.com/api/v1/ssocookie"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 hover:bg-blue-500/20 transition-all text-sm font-semibold"
                            >
                                <FaExternalLinkAlt size={11} /> Get my NPSSO from Sony
                            </a>
                            <a
                                href="https://store.playstation.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 py-2 px-5 rounded-xl border border-white/10 text-text-secondary hover:text-text-primary hover:bg-white/5 transition-all text-xs"
                            >
                                <FaExternalLinkAlt size={10} /> Not logged in? Open PlayStation Store first
                            </a>
                        </div>

                        {/* Manual NPSSO input */}
                        <div className="card-surface p-6 space-y-4">
                            <label className="block text-xs font-black uppercase tracking-widest text-text-muted">
                                Paste your NPSSO value
                            </label>
                            <input
                                type="text"
                                value={npsso}
                                onChange={e => setNpsso(e.target.value)}
                                placeholder="64-character NPSSO value..."
                                className="input-field font-mono text-sm"
                            />
                            <button
                                onClick={syncManual}
                                disabled={loading}
                                className="btn-primary w-full py-4 text-base flex items-center justify-center gap-3"
                            >
                                <SiPlaystation size={20} />
                                {loading ? "Syncing..." : "Sync with PlayStation"}
                            </button>
                        </div>

                        {/* Chrome Extension */}
                        <div className="card-surface p-5 space-y-3">
                            <h2 className="text-xs font-black uppercase tracking-widest text-text-muted">Or use the GameHub Chrome Extension</h2>
                            <p className="text-xs text-text-muted leading-relaxed">
                                If you have the GameHub extension installed, it will automatically retrieve your NPSSO — no copy-pasting needed. Make sure you're logged in to PSN first.
                            </p>
                            <button
                                onClick={syncWithExtension}
                                disabled={loading}
                                className="w-full py-3 rounded-xl border border-white/10 text-text-secondary hover:text-text-primary hover:bg-white/5 transition-all text-sm flex items-center justify-center gap-2"
                            >
                                <SiPlaystation size={16} />
                                {loading ? "Waiting for extension..." : "Sync via Extension"}
                            </button>
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

                    </div>
                </main>
            </div>
            <Footer />
        </div>
    );
}

export default SyncWithPSN;
