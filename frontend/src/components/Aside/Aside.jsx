import { useContext, useState } from 'react';
import { Link, useLocation } from "react-router-dom";
import { toast } from "sonner";
import AuthContext from "../../contexts/AuthContext";
import apiClient from "../../utils/apiClient.js";
import {
    FaCaretLeft, FaCaretRight, FaSteam, FaXbox, FaGamepad, FaHeart,
    FaComments, FaUserFriends, FaCog, FaSignOutAlt, FaChevronDown, FaChevronUp, FaTimes, FaGlobe, FaTrophy
} from "react-icons/fa";
import { SiEpicgames, SiGogdotcom, SiPlaystation } from 'react-icons/si';

function Aside({ isOpen: externalOpen, onClose }) {
    const { user, setUser } = useContext(AuthContext);
    const location = useLocation();
    const [isOpen, setIsOpen] = useState(true);
    const [isAccountOpen, setIsAccountOpen] = useState(false);

    // Use external open state if provided (for mobile drawer), otherwise internal
    const sidebarOpen = externalOpen !== undefined ? externalOpen : isOpen;

    const toggleSidebar = () => {
        if (externalOpen !== undefined && onClose) {
            onClose();
        } else {
            setIsOpen(!isOpen);
        }
    };

    const handleSidebarClick = () => {
        if (!sidebarOpen && externalOpen === undefined) {
            setIsOpen(true);
        }
    };

    const handleLogout = async () => {
        try {
            await apiClient.post(`/auth/logout`, {});
            toast.success("Logged out successfully");
            setUser(null);
        } catch (error) {
            toast.error(error.response?.data?.message || "Logout failed");
        }
    };

    const menuItems = [
        {
            section: "Library", items: [
                { icon: FaGamepad, label: "My Library", to: "/library" },
                { icon: FaGlobe, label: "View Public Profile", to: user ? `/profile/${encodeURIComponent(user.publicID)}` : "#" },
                { icon: FaCog, label: "Customize Public Profile", to: "/manage-profile" },
                { icon: FaHeart, label: "My Wishlist", to: "/wishlist" },
            ]
        },
        {
            section: "Community", items: [
                { icon: FaComments, label: "Friend Activity", to: "/friends" },
                { icon: FaUserFriends, label: "Manage Friends", to: "/managefriends" },
                { icon: FaGlobe, label: "Global Community", to: "/community" },
            ]
        },
        {
            section: "Platforms", items: [
                { icon: FaSteam, label: "Sync Steam", to: "/library/sync/steam" },
                { icon: SiEpicgames, label: "Sync Epic Games", to: "/library/sync/epic" },
                { icon: SiPlaystation, label: "Sync PlayStation", to: "/library/sync/psn" },
                { icon: FaXbox, label: "Sync Xbox Live", to: "/library/sync/xbox" },
            ]
        }
    ];

    const isActive = (path) => location.pathname === path;

    return (
        <>
            {/* Mobile overlay backdrop */}
            {externalOpen !== undefined && sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden animate-in fade-in duration-300"
                    onClick={onClose}
                />
            )}

            <aside
                className={`
                    ${externalOpen !== undefined
                        ? `fixed top-0 left-0 z-50 h-[100dvh] ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`
                        : 'relative hidden lg:block'
                    }
                    ${sidebarOpen ? 'w-72' : 'w-20'}
                    bg-midnight-800/80 backdrop-blur-2xl border-r border-white/5
                    transition-all duration-500 cubic-bezier(0.23, 1, 0.32, 1) flex-shrink-0
                    shadow-2xl shadow-black/50
                `}
                onClick={handleSidebarClick}
            >
                <div className="flex flex-col h-full">

                    {/* Top logo area */}
                    <div className="p-6 border-b border-white/5 h-20 flex items-center justify-between overflow-hidden">
                        {sidebarOpen && (
                            <Link to="/" className="flex items-center gap-3 min-w-0 animate-in fade-in slide-in-from-left-4 duration-500">
                                <img 
                                    src="https://res.cloudinary.com/dvbmaonhc/image/upload/v1778437307/My_GameHub_Logo_real_black_ccnq4t.png" 
                                    alt="Logo" 
                                    className="w-8 h-8 object-contain drop-shadow-[0_0_8px_rgba(59,130,246,0.3)]"
                                />
                                <span className="text-sm font-black tracking-tighter text-transparent bg-gradient-to-r from-accent to-accent-glow bg-clip-text uppercase truncate">
                                    My GameHub
                                </span>
                            </Link>
                        )}
                        <button
                            onClick={toggleSidebar}
                            className={`p-2 rounded-xl transition-all duration-300 ${sidebarOpen ? 'text-text-muted hover:bg-white/5' : 'mx-auto text-accent bg-accent/10'}`}
                        >
                            {externalOpen !== undefined
                                ? <FaTimes size={16} />
                                : sidebarOpen ? <FaCaretLeft size={18} /> : <FaCaretRight size={18} />
                            }
                        </button>
                    </div>

                    {/* Navigation Menu */}
                    <nav className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-6 pt-6">
                        {menuItems.map((group, groupIndex) => (
                            <div key={groupIndex} className="space-y-1">
                                {sidebarOpen && (
                                    <p className="text-[10px] uppercase font-black tracking-[0.2em] text-text-muted mb-4 px-3 flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-accent/40" />
                                        {group.section}
                                    </p>
                                )}
                                {group.items.map((item, i) => {
                                    const Icon = item.icon;
                                    const active = isActive(item.to);
                                    return (
                                        <Link
                                            key={i}
                                            to={item.to}
                                            className={`
                                                group relative flex items-center gap-3.5 px-3 py-3 rounded-xl text-sm font-bold transition-all duration-300
                                                ${active
                                                    ? 'bg-accent/10 text-accent translate-x-1 shadow-lg shadow-accent/5'
                                                    : 'text-text-secondary hover:text-text-primary hover:bg-white/5 hover:translate-x-1'
                                                }
                                                ${!sidebarOpen ? 'justify-center px-0' : ''}
                                            `}
                                            title={!sidebarOpen ? item.label : undefined}
                                        >
                                            {active && sidebarOpen && (
                                                <div className="absolute left-[-12px] w-1 h-6 bg-accent rounded-r-full shadow-[0_0_12px_rgba(59,130,246,0.5)]" />
                                            )}
                                            <Icon className={`flex-shrink-0 transition-colors ${active ? 'text-accent' : 'text-text-muted group-hover:text-accent/80'}`} size={18} />
                                            {sidebarOpen && <span className="truncate">{item.label}</span>}
                                        </Link>
                                    );
                                })}

                                {/* Interactive Profile Area - Positioned right under Platforms (the last group) */}
                                {groupIndex === menuItems.length - 1 && user && (
                                    <div className="pt-6 border-t border-white/5 mt-6 space-y-4 px-1">
                                        {sidebarOpen && (
                                            <p className="text-[10px] uppercase font-black tracking-[0.2em] text-text-muted mb-4 px-3 flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-accent/40" />
                                                Identity
                                            </p>
                                        )}
                                        <button
                                            onClick={() => setIsAccountOpen(!isAccountOpen)}
                                            className={`flex items-center gap-3 w-full p-2.5 rounded-xl transition-all duration-300 ${isAccountOpen ? 'bg-white/5' : 'hover:bg-white/5'} ${!sidebarOpen ? 'justify-center px-0' : ''}`}
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-midnight-700 border border-white/5 flex items-center justify-center flex-shrink-0 overflow-hidden shadow-inner">
                                                {user.profilePicture && user.profilePicture.trim() !== ""
                                                    ? <img src={user.profilePicture} alt="User" className="w-full h-full object-cover" />
                                                    : <FaCog className="text-text-muted/40" />
                                                }
                                            </div>
                                            {sidebarOpen && (
                                                <>
                                                    <div className="flex-1 min-w-0 text-left">
                                                        <p className="text-xs font-black text-text-primary uppercase tracking-tight truncate">{user.name}</p>
                                                        <p className="text-[10px] font-bold text-text-muted truncate">{user.email}</p>
                                                    </div>
                                                    <FaChevronUp className={`text-text-muted transition-transform duration-500 ${isAccountOpen ? 'rotate-180' : ''}`} size={10} />
                                                </>
                                            )}
                                        </button>

                                        {isAccountOpen && sidebarOpen && (
                                            <div className="mt-2 p-1 space-y-1 animate-in slide-in-from-bottom-2 duration-300">
                                                <Link
                                                    to="/settings"
                                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all ${isActive('/settings') ? 'bg-accent/10 text-accent' : 'text-text-secondary hover:text-white hover:bg-white/5'}`}
                                                >
                                                    <FaCog className={isActive('/settings') ? 'text-accent' : 'text-accent/60'} size={14} />
                                                    Settings
                                                </Link>
                                                <button
                                                    onClick={handleLogout}
                                                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-[11px] font-black uppercase tracking-wider text-text-secondary hover:text-red-400 hover:bg-red-500/5 transition-all"
                                                >
                                                    <FaSignOutAlt className="text-red-400" size={14} />
                                                    Logout
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </nav>

                    {/* Global footer inside aside */}
                    <div className="p-4 border-t border-white/5 flex justify-center opacity-40">
                        <p className="text-[8px] font-bold text-text-muted uppercase tracking-[0.3em]">GameHub v2.8.4</p>
                    </div>
                </div>
            </aside>
        </>
    );
}

export default Aside;
