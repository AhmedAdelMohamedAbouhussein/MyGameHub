import { useState } from "react";
import { FaGamepad, FaEnvelope, FaYoutube, FaCheck } from "react-icons/fa";

function Footer() {
    const currentYear = new Date().getFullYear();
    const [copied, setCopied] = useState(false);
    const email = "aa5913372@gmail.com";

    const handleEmailClick = (e) => {
        // Copy to clipboard
        navigator.clipboard.writeText(email);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);

        // Still try to open mailto in the background (no target blank)
        window.location.href = `mailto:${email}`;
    };

    return (
        <footer className="mt-auto border-t border-white/5 bg-midnight-950/40 backdrop-blur-xl">
            <div className="max-w-7xl mx-auto px-6 py-12">
                <div className="flex flex-col md:flex-row items-center justify-between gap-8">

                    {/* Brand & Rights */}
                    <div className="flex flex-col items-center md:items-start gap-2">
                        <div className="flex items-center gap-2 mb-1">
                            <FaGamepad className="text-accent" size={16} />
                            <span className="text-sm font-black text-white uppercase tracking-tighter">GameHub</span>
                        </div>
                        <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                            &copy; {currentYear} All Rights Reserved
                        </p>
                    </div>

                    {/* Developer & API Credits */}
                    <div className="flex flex-col items-center gap-4">
                        <div className="flex items-center gap-6">
                            <a href="https://rawg.io" target="_blank" rel="noopener noreferrer" className="text-xs font-black text-text-muted hover:text-accent uppercase tracking-widest transition-colors">
                                RAWG DATA
                            </a>
                            <a href="https://isthereanydeal.com" target="_blank" rel="noopener noreferrer" className="text-xs font-black text-text-muted hover:text-accent uppercase tracking-widest transition-colors">
                                ITAD MARKET
                            </a>
                        </div>
                        <p className="text-[11px] font-black text-white/40 uppercase tracking-[0.2em]">
                            Built by <span className="text-white">Ahmed Adel</span>
                        </p>
                    </div>

                    {/* Socials & Contact */}
                    <div className="flex items-center gap-5">
                        <button
                            onClick={handleEmailClick}
                            className="relative p-2.5 rounded-xl bg-white/5 text-text-muted hover:text-white hover:bg-white/10 transition-all duration-300 group"
                            title="Copy Email / Contact"
                        >
                            {copied ? <FaCheck className="text-success" size={18} /> : <FaEnvelope size={18} />}

                            {/* Floating Tooltip */}
                            {copied && (
                                <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1 bg-success text-white text-[10px] font-black uppercase tracking-widest rounded-lg animate-in fade-in slide-in-from-bottom-2">
                                    Copied!
                                </span>
                            )}
                        </button>
                        <a
                            href="https://www.youtube.com/@My-GameHub-b8s"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2.5 rounded-xl bg-white/5 text-text-muted hover:text-red-500 hover:bg-red-500/10 transition-all duration-300"
                            title="YouTube Channel"
                        >
                            <FaYoutube size={20} />
                        </a>
                    </div>

                </div>
            </div>
        </footer>
    );
}

export default Footer;
