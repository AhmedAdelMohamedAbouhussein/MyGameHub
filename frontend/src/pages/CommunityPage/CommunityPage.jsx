import { useState, useContext, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import apiClient from "../../utils/apiClient.js";

import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/Footer";
import LoadingScreen from "../../components/LoadingScreen/LoadingScreen";
import AuthContext from "../../contexts/AuthContext.jsx";

import { FaSearch, FaGlobe, FaGamepad, FaHeart, FaBars, FaArrowRight } from "react-icons/fa";
import BackButton from "../../components/BackButton/BackButton";

function CommunityPage() {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [mobileAsideOpen, setMobileAsideOpen] = useState(false);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 2000); // 2 seconds debounce time
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const { data, isLoading, isFetching } = useQuery({
        queryKey: ["community", debouncedSearch],
        queryFn: async () => {
            const url = debouncedSearch ? `/users/community/all?search=${encodeURIComponent(debouncedSearch)}` : `/users/community/all`;
            const res = await apiClient.get(url);
            return res.data.users;
        },
        placeholderData: (previousData) => previousData,
    });

    const users = (data || []).filter(u => u.profileHandle !== user?.profileHandle);

    return (
        <div className="page-container flex flex-col lg:flex-row h-screen overflow-hidden">

            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                <Header />
                <BackButton />
                <main className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-8 lg:p-12 relative z-10">
                    <div className="max-w-7xl mx-auto">

                        <div className="flex items-center lg:hidden mb-4">
                            <button
                                onClick={() => setMobileAsideOpen(true)}
                                className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-midnight-600 transition-colors"
                            >
                                <FaBars size={20} />
                            </button>
                        </div>

                        <div className="mb-10 text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-accent/20 text-accent mb-4 border border-accent/20">
                                <FaGlobe size={32} />
                            </div>
                            <h1 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tighter mb-4">
                                Global <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-accent-glow">Community</span>
                            </h1>
                            <p className="text-text-secondary max-w-2xl mx-auto">
                                Discover top accounts, explore game collections, and connect with players around the world.
                            </p>
                        </div>

                        {/* Search Bar */}
                        <div className="max-w-2xl mx-auto mb-12">
                            <div className="flex items-center bg-midnight-800/80 backdrop-blur-xl border-2 border-white/10 rounded-3xl p-1.5 focus-within:border-accent/40 focus-within:ring-4 focus-within:ring-accent/10 transition-all shadow-2xl">
                                <div className="pl-5 text-text-muted">
                                    <FaSearch />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search by name or @publicID..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') setDebouncedSearch(searchQuery);
                                    }}
                                    className="flex-1 bg-transparent py-4 px-4 text-white placeholder-text-muted outline-none font-bold"
                                />
                                <button
                                    onClick={() => setDebouncedSearch(searchQuery)}
                                    className="hidden sm:flex items-center gap-2 px-8 h-14 bg-accent text-white font-black uppercase tracking-widest rounded-2xl hover:bg-accent-hover transition-all active:scale-95"
                                >
                                    Find <FaArrowRight size={12} />
                                </button>
                            </div>
                        </div>

                        {/* Users Grid */}
                        <div className="transition-opacity duration-500" style={{ opacity: isFetching && users.length > 0 ? 0.6 : 1 }}>
                            {isLoading && users.length === 0 ? (
                                <div className="py-20 flex justify-center">
                                    <LoadingScreen />
                                </div>
                            ) : users.length === 0 ? (
                                <div className="text-center py-20 bg-midnight-800/30 rounded-3xl border border-white/5 space-y-4">
                                    <p className="text-text-muted text-lg">No users found matching your request.</p>
                                    <button
                                        onClick={() => setSearchQuery("")}
                                        className="text-xs font-black text-accent uppercase tracking-widest hover:underline pt-2"
                                    >
                                        Clear Search
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {users.map(u => (
                                        <div key={u.profileHandle} onClick={() => navigate(`/profile/${encodeURIComponent(u.profileHandle)}`)} className="group bg-midnight-800/50 backdrop-blur-md rounded-3xl border border-white/5 p-6 hover:bg-midnight-700 hover:border-white/10 transition-all cursor-pointer hover:-translate-y-1 shadow-lg hover:shadow-accent/5">
                                            <div className="flex flex-col items-center text-center">
                                                <div className="w-24 h-24 rounded-full overflow-hidden bg-midnight-900 border-4 border-midnight-700 group-hover:border-accent/50 transition-colors mb-4 shadow-xl">
                                                    {u.profilePicture ? (
                                                        <img src={u.profilePicture} alt={u.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-2xl font-black text-text-muted uppercase">
                                                            {u.name.charAt(0)}
                                                        </div>
                                                    )}
                                                </div>
                                                <h3 className="text-lg font-black text-white truncate w-full">{u.name}</h3>
                                                {u.publicID ? (
                                                    <p className="text-[10px] font-bold text-accent uppercase tracking-widest mb-4">@{u.publicID}</p>
                                                ) : (
                                                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-4">Friend requests disabled</p>
                                                )}

                                                {u.bio && (
                                                    <p className="text-xs text-text-secondary line-clamp-2 mb-6 h-8">
                                                        {u.bio}
                                                    </p>
                                                )}

                                                <div className="flex items-center justify-center gap-4 w-full pt-4 border-t border-white/5">
                                                    <div className="flex items-center gap-1.5 text-text-muted group-hover:text-pink-400 transition-colors">
                                                        <FaHeart size={14} />
                                                        <span className="text-xs font-bold">{u.likesCount || 0}</span>
                                                    </div>
                                                    <div className="w-1 h-1 rounded-full bg-white/20" />
                                                    <div className="flex items-center gap-1.5 text-text-muted group-hover:text-purple-400 transition-colors">
                                                        <FaGamepad size={14} />
                                                        <span className="text-xs font-bold">{u.totalGames || 0}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}

export default CommunityPage;
