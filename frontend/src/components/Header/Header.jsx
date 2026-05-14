import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useContext, useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import apiClient from "../../utils/apiClient.js";
import AuthContext from "../../contexts/AuthContext";
import { FaCog, FaSignOutAlt, FaBars, FaTimes, FaCopy, FaBell } from "react-icons/fa";

function Header() {
    const { user, setUser } = useContext(AuthContext);
    const [isAccountOpen, setIsAccountOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const dropdownRef = useRef(null);
    const notifRef = useRef(null);
    const location = useLocation();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const prevPathRef = useRef(location.pathname);

    // Fetch notifications with polling (60 seconds)
    const { data: notifData } = useQuery({
        queryKey: ["notifications"],
        queryFn: async () => {
            const res = await apiClient.get("/notifications");
            return res.data;
        },
        enabled: !!user,
    });

    const markReadMutation = useMutation({
        mutationFn: (id) => apiClient.patch(`/notifications/${id}/read`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] })
    });

    const markAllReadMutation = useMutation({
        mutationFn: () => apiClient.post("/notifications/read-all"),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
            toast.success("All notifications marked as read");
        }
    });

    const notifications = notifData?.notifications || [];
    const unreadCount = notifData?.unreadCount || 0;

    const navLinks = [
        { to: "/", label: "Home" },
        { to: "/games", label: "Browse" },
        { to: "/community", label: "Community" },
    ];

    const isActive = (path) => location.pathname === path;

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsAccountOpen(false);
            }
            if (notifRef.current && !notifRef.current.contains(e.target)) {
                setIsNotificationsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (prevPathRef.current !== location.pathname) {
            setIsMobileMenuOpen(false);
        }
        prevPathRef.current = location.pathname;
    }, [location.pathname]);

    useEffect(() => {
        document.body.style.overflow = isMobileMenuOpen ? "hidden" : "";
        return () => (document.body.style.overflow = "");
    }, [isMobileMenuOpen]);

    const handleLogout = async () => {
        try {
            await apiClient.post(`/auth/logout`, {});
            toast.success("Logged out successfully");
            setUser(null);
            setIsMobileMenuOpen(false);
            navigate('/login');
        } catch (error) {
            toast.error(error.response?.data?.message || "Logout failed");
        }
    };

    return (
        <>
            {/* HEADER */}
            <header className="sticky top-0 z-50 bg-midnight-700/95 backdrop-blur-md border-b border-midnight-500/30 shadow-lg">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">

                        {/* Logo */}
                        <Link to="/" className="text-xl font-bold text-transparent bg-gradient-to-r from-accent to-accent-glow bg-clip-text">
                            My GameHub
                        </Link>

                        {/* Desktop Nav */}
                        <nav className="hidden lg:flex items-center gap-1">
                            {navLinks.map(link => (
                                <Link
                                    key={link.to}
                                    to={link.to}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${isActive(link.to)
                                        ? "bg-accent/10 text-accent font-semibold"
                                        : "text-text-secondary hover:text-white hover:bg-midnight-600"
                                        }`}
                                >
                                    {link.label}
                                </Link>
                            ))}

                            {user && (
                                <>
                                    <div className="w-px h-4 bg-midnight-500/30 mx-2" />
                                    <Link
                                        to="/library"
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${isActive('/library')
                                            ? "bg-accent/10 text-accent font-semibold"
                                            : "text-text-secondary hover:text-white hover:bg-midnight-600"
                                            }`}
                                    >
                                        Library
                                    </Link>
                                    <Link
                                        to="/wishlist"
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${isActive('/wishlist')
                                            ? "bg-accent/10 text-accent font-semibold"
                                            : "text-text-secondary hover:text-white hover:bg-midnight-600"
                                            }`}
                                    >
                                        Wishlist
                                    </Link>
                                    <Link
                                        to="/friends"
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${isActive('/friends')
                                            ? "bg-accent/10 text-accent font-semibold"
                                            : "text-text-secondary hover:text-white hover:bg-midnight-600"
                                            }`}
                                    >
                                        Friends
                                    </Link>
                                </>
                            )}
                        </nav>

                        {/* User Actions */}
                        <div className="flex items-center gap-2 sm:gap-3">
                            {user ? (
                                <>
                                    {/* Notification Center */}
                                    <div className="relative" ref={notifRef}>
                                        <button
                                            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                                            className={`relative p-2.5 rounded-xl transition-all duration-300 border ${isNotificationsOpen
                                                ? "bg-accent/10 border-accent/40 text-accent"
                                                : "bg-midnight-600/50 border-midnight-500/30 text-text-secondary hover:text-white hover:border-midnight-500/50"
                                                }`}
                                        >
                                            <FaBell size={18} />
                                            {unreadCount > 0 && (
                                                <span
                                                    className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-black flex items-center justify-center rounded-full border-2 border-midnight-700 shadow-lg animate-in fade-in zoom-in duration-300"
                                                >
                                                    {unreadCount > 9 ? '9+' : unreadCount}
                                                </span>
                                            )}
                                        </button>

                                        {/* Notifications Dropdown */}
                                        <div className={`
                                            fixed lg:absolute left-4 right-4 lg:left-auto lg:right-0 top-20 lg:top-full mt-3 lg:w-80 p-2
                                            bg-midnight-700/95 backdrop-blur-xl border border-midnight-500/30
                                            rounded-2xl shadow-2xl shadow-black/50
                                            transition-all duration-300 origin-top lg:origin-top-right z-50
                                            ${isNotificationsOpen ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 -translate-y-2 pointer-events-none"}
                                        `}>
                                            <div className="px-3 py-2 border-b border-midnight-500/20 mb-1 flex items-center justify-between">
                                                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Notifications</p>
                                                {unreadCount > 0 && (
                                                    <button
                                                        onClick={() => markAllReadMutation.mutate()}
                                                        className="text-[10px] font-bold text-accent hover:text-accent-glow transition-colors"
                                                    >
                                                        Mark all as read
                                                    </button>
                                                )}
                                            </div>

                                            <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                                                {notifications.length > 0 ? (
                                                    notifications.map((notif) => (
                                                        <div
                                                            key={notif._id}
                                                            onClick={() => {
                                                                if (!notif.isRead) markReadMutation.mutate(notif._id);
                                                                navigate(notif.link);
                                                                setIsNotificationsOpen(false);
                                                            }}
                                                            className={`
                                                                flex items-start gap-3 p-3 rounded-xl transition-all cursor-pointer group mb-1
                                                                ${notif.isRead ? "opacity-60 hover:bg-white/5" : "bg-accent/5 hover:bg-accent/10"}
                                                            `}
                                                        >
                                                            <div className={`
                                                                w-2 h-2 rounded-full mt-2 flex-shrink-0
                                                                ${notif.isRead ? "bg-transparent" : "bg-accent shadow-[0_0_8px_rgba(59,130,246,0.5)]"}
                                                            `} />
                                                            <div className="flex-1 min-w-0">
                                                                <p className={`text-sm leading-tight mb-1 ${notif.isRead ? "text-text-secondary" : "text-text-primary font-medium"}`}>
                                                                    {notif.message}
                                                                </p>
                                                                <p className="text-[10px] text-text-muted">
                                                                    {new Date(notif.createdAt).toLocaleDateString()}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="py-8 text-center text-text-muted italic text-sm">
                                                        No new notifications
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Account Center (Desktop Only) */}
                                    <div className="hidden lg:block relative" ref={dropdownRef}>
                                        <button
                                            onClick={() => setIsAccountOpen(!isAccountOpen)}
                                            className={`flex items-center gap-3 px-3 py-2 rounded-2xl transition-all duration-300 border ${isAccountOpen
                                                ? "bg-accent/10 border-accent/40 text-accent"
                                                : "bg-midnight-600/50 border-midnight-500/30 text-text-secondary hover:text-white hover:border-midnight-500/50"
                                                }`}
                                        >
                                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-accent-glow flex items-center justify-center text-midnight-900 shadow-lg overflow-hidden flex-shrink-0">
                                                {user.profilePicture && user.profilePicture.trim() !== "" ? (
                                                    <img
                                                        src={user.profilePicture}
                                                        alt="Profile"
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <span className="text-xs font-black uppercase text-white">{user.name?.charAt(0) || 'U'}</span>
                                                )}
                                            </div>

                                            <div className="flex flex-col items-start pr-1 max-w-[120px]">
                                                <span className="text-sm font-bold tracking-tight truncate w-full">{user.name}</span>
                                                <div
                                                    className="flex items-center gap-1.5 cursor-pointer group/copy"
                                                    title="Click to copy ID"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigator.clipboard.writeText(user.publicID);
                                                        toast.success("PublicID copied to clipboard!");
                                                    }}
                                                >
                                                    <span className="text-[10px] font-medium leading-tight text-text-muted group-hover/copy:text-accent transition-colors">
                                                        {user.publicID}
                                                    </span>
                                                    <FaCopy size={10} className="text-text-muted/50 group-hover/copy:text-accent transition-colors" />
                                                </div>
                                            </div>

                                            <svg
                                                className={`w-4 h-4 transition-transform duration-500 ${isAccountOpen ? 'rotate-180' : ''}`}
                                                fill="none" viewBox="0 0 24 24" stroke="currentColor"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>

                                        {/* Dropdown Menu */}
                                        <div className={`
                                            absolute right-0 top-full mt-3 w-56 p-2
                                            bg-midnight-700/90 backdrop-blur-xl border border-midnight-500/30
                                            rounded-2xl shadow-2xl shadow-black/50
                                            transition-all duration-300 origin-top-right z-50
                                            ${isAccountOpen ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 -translate-y-2 pointer-events-none"}
                                        `}>
                                            <div className="px-3 py-2 border-b border-midnight-500/20 mb-1">
                                                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Account</p>
                                                <p className="text-xs font-medium text-text-primary truncate">{user.email}</p>
                                            </div>

                                            <Link
                                                to="/settings"
                                                onClick={() => setIsAccountOpen(false)}
                                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-text-secondary hover:text-white hover:bg-white/5 transition-all group"
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-midnight-600 flex items-center justify-center group-hover:bg-accent/10 group-hover:text-accent transition-colors">
                                                    <FaCog size={14} />
                                                </div>
                                                <span className="font-medium">Settings</span>
                                            </Link>

                                            <button
                                                onClick={() => {
                                                    handleLogout();
                                                    setIsAccountOpen(false);
                                                }}
                                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400/80 hover:text-red-400 hover:bg-red-500/5 transition-all group"
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-midnight-600 flex items-center justify-center group-hover:bg-red-500/10 transition-colors">
                                                    <FaSignOutAlt size={14} />
                                                </div>
                                                <span className="font-medium">Logout</span>
                                            </button>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <Link to="/login" className="btn-primary px-5 py-2 text-sm">
                                    Sign In
                                </Link>
                            )}
                            
                            {/* Mobile Menu Toggle (closer to user actions) */}
                            <button
                                onClick={() => setIsMobileMenuOpen(true)}
                                className="lg:hidden text-white p-2 hover:bg-midnight-600 rounded-lg transition-all active:scale-90"
                            >
                                <FaBars size={22} />
                            </button>
                        </div>


                    </div>
                </div>
            </header>

            {/* ================= MOBILE BACKDROP ================= */}
            <div
                className={`fixed inset-0 z-40 lg:hidden transition-opacity duration-300
                ${isMobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"}
                bg-black/40 backdrop-blur-sm`}
                onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* ================= MOBILE DRAWER ================= */}
            <div
                className={`
                    fixed top-0 left-0 z-50 h-full w-72 lg:hidden
                    bg-midnight-800/70 backdrop-blur-2xl
                    border-r border-white/10
                    shadow-2xl shadow-black/50
                    text-white
                    transform transition-all duration-500
                    ease-[cubic-bezier(0.22,1,0.36,1)]
                    ${isMobileMenuOpen ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0"}
                `}
            >
                {/* TOP BAR */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                    <span className="text-white font-semibold text-lg">
                        Menu
                    </span>

                    <button
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="text-white/70 hover:text-white transition"
                    >
                        <FaTimes size={18} />
                    </button>
                </div>

                {/* NAV LINKS */}
                <nav className="flex flex-col p-5 gap-2">
                    {navLinks.map(link => (
                        <Link
                            key={link.to}
                            to={link.to}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={`px-4 py-3 rounded-xl text-sm font-medium transition-all
                                ${isActive(link.to)
                                    ? "bg-white/10 text-white"
                                    : "text-white/70 hover:text-white hover:bg-white/5"
                                }
                            `}
                        >
                            {link.label}
                        </Link>
                    ))}

                    <div className="border-t border-white/10 my-3" />

                    {/* AUTH SECTION */}
                    {user ? (
                        <>
                            <Link
                                to="/library"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="px-4 py-3 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/5"
                            >
                                My Library
                            </Link>

                            <Link
                                to="/wishlist"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="px-4 py-3 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/5"
                            >
                                My Wishlist
                            </Link>

                            <Link
                                to="/friends"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="px-4 py-3 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/5"
                            >
                                Friends
                            </Link>

                            <Link
                                to="/settings"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="px-4 py-3 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/5 flex items-center gap-2"
                            >
                                <FaCog className="text-accent" />
                                Settings
                            </Link>

                            <button
                                onClick={handleLogout}
                                className="px-4 py-3 rounded-xl text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                            >
                                <FaSignOutAlt />
                                Logout
                            </button>
                        </>
                    ) : (
                        <Link
                            to="/login"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="btn-primary text-center mt-2"
                        >
                            Sign In
                        </Link>
                    )}
                </nav>
            </div>
        </>
    );
}

export default Header;