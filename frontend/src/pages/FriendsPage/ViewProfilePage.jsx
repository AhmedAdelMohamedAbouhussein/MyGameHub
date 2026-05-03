import { useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import apiClient from "../../utils/apiClient.js";

import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/Footer";
import AuthContext from "../../contexts/AuthContext";
import LoadingScreen from "../../components/LoadingScreen/LoadingScreen";

import { FaArrowLeft, FaHeart, FaRegHeart, FaUserPlus, FaUserMinus, FaCheck, FaClock, FaGamepad, FaUsers, FaTrophy, FaAward } from "react-icons/fa";
import BackButton from "../../components/BackButton/BackButton";

function ViewProfilePage() {
    const { publicID } = useParams();
    console.log(publicID);
    const { user: currentUser } = useContext(AuthContext);
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const { data, isLoading, isError } = useQuery({
        queryKey: ["profile", publicID],
        queryFn: async () => {
            const res = await apiClient.get(`/users/profile/${encodeURIComponent(publicID)}`);
            return res.data.profile;
        },
        enabled: !!publicID
    });

    const invalidateProfile = () => {
        queryClient.invalidateQueries({ queryKey: ["profile", publicID] });
    };

    const likeMutation = useMutation({
        mutationFn: () => apiClient.post(`/users/profile/${encodeURIComponent(publicID)}/like`),
        onSuccess: (res) => {
            toast.success(res.data.message);
            invalidateProfile();
        },
        onError: () => {
            if (!currentUser) navigate('/login');
        }
    });

    const friendMutation = useMutation({
        mutationFn: ({ action, id }) => apiClient.post(`/friends/${action}/${encodeURIComponent(id)}`),
        onSuccess: (res) => {
            toast.success(res.data.message);
            invalidateProfile();
            queryClient.invalidateQueries({ queryKey: ["friends"] });
        },
        onError: (err) => {
            if (!currentUser) navigate('/login');
            else toast.error(err.response?.data?.message || "Action failed");
        }
    });

    if (isLoading) return <LoadingScreen />;
    if (isError || !data) {
        return (
            <div className="page-container">
                <Header />
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                    <h2 className="text-xl font-bold text-text-primary mb-2">User Not Found</h2>
                    <p className="text-text-muted mb-6">The profile you are looking for doesn't exist or is private.</p>
                    <button onClick={() => navigate("/")} className="btn-primary">Go Home</button>
                </div>
                <Footer />
            </div>
        );
    }

    const {
        name, bio, profilePicture, likesCount, isLiked,
        friendsCount, totalGames, totalHours, topGames,
        completedGames, favoriteGames,
        friendshipStatus, allowPublicFriendRequests, profileBackground,
        themeSongId, masterpieceGame, signupDate
    } = data;

    const handleLike = () => {
        if (!currentUser) {
            toast("Please log in to like profiles");
            navigate('/login');
            return;
        }
        likeMutation.mutate();
    };

    const handleFriendAction = (action) => {
        if (!currentUser) {
            toast("Please log in to add friends");
            navigate('/login');
            return;
        }
        friendMutation.mutate({ action, id: publicID });
    };

    const renderFriendButton = () => {
        if (publicID === currentUser?.publicID) return null;

        switch (friendshipStatus) {
            case "accepted":
                return (
                    <button
                        className="btn-danger flex items-center gap-2"
                        onClick={() => handleFriendAction("remove")}
                    >
                        <FaUserMinus /> Remove Friend
                    </button>
                );
            case "pending":
                return (
                    <button className="btn-ghost flex items-center gap-2 cursor-default" disabled>
                        <FaClock /> Request Pending
                    </button>
                );
            case "requested_by_target":
                return (
                    <div className="flex gap-2">
                        <button
                            className="btn-primary flex items-center gap-2"
                            onClick={() => handleFriendAction("accept")}
                        >
                            <FaCheck /> Accept
                        </button>
                        <button
                            className="btn-danger flex items-center gap-2"
                            onClick={() => handleFriendAction("reject")}
                        >
                            Reject
                        </button>
                    </div>
                );
            default:
                if (!allowPublicFriendRequests) {
                    return (
                        <span className="text-xs sm:text-sm font-bold text-text-muted bg-midnight-800/80 px-4 py-2.5 rounded-xl border border-white/5 cursor-not-allowed">
                            Account doesn't allow for public friend requests
                        </span>
                    );
                }
                return (
                    <button
                        className="btn-primary flex items-center gap-2"
                        onClick={() => handleFriendAction("add")}
                    >
                        <FaUserPlus /> Add Friend
                    </button>
                );
        }
    };

    const badges = [];
    if (completedGames?.length >= 5) badges.push({ icon: <FaTrophy />, label: "Completionist", color: "text-amber-400", bg: "bg-amber-400/10" });
    if (likesCount >= 10) badges.push({ icon: <FaHeart />, label: "Social Star", color: "text-pink-400", bg: "bg-pink-400/10" });
    if (totalGames >= 50) badges.push({ icon: <FaGamepad />, label: "Collector", color: "text-accent", bg: "bg-accent/10" });
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    if (new Date(signupDate) < threeMonthsAgo) badges.push({ icon: <FaAward className="mb-0.5" />, label: "Veteran", color: "text-emerald-400", bg: "bg-emerald-400/10" });

    return (
        <div className="min-h-screen flex flex-col relative bg-midnight-900 overflow-x-hidden">
            {/* Dynamic Background */}
            {profileBackground && (
                <>
                    <div
                        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
                        style={{ backgroundImage: `url(${profileBackground})` }}
                    />
                    {/* Dark gradient overlay to ensure text is readable */}
                    {/* Crystal clear background overlay */}
                    <div className="fixed inset-0 z-0 bg-gradient-to-b from-midnight-900/40 via-midnight-900/10 to-midnight-900/60" />
                </>
            )}

            <div className="relative z-10 flex flex-col min-h-screen">
                <Header />
                <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8 sm:py-12 space-y-12">
                    <BackButton variant="static" />

                    {/* Hero Section */}
                    <div className="bg-midnight-800/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-10 flex flex-col sm:flex-row items-center sm:items-start gap-8 relative shadow-2xl">
                        {!profileBackground && (
                            <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                            </div>
                        )}

                        <div className="relative z-10 flex-shrink-0">
                            <img
                                src={profilePicture || "https://res.cloudinary.com/dvbmaonhc/image/upload/v1777487049/avatars/no_user.png"}
                                alt={name}
                                className="w-32 h-32 sm:w-40 sm:h-40 rounded-3xl object-cover ring-4 ring-midnight-500/50 shadow-2xl"
                            />
                        </div>

                        <div className="relative z-10 flex-1 text-center sm:text-left space-y-4">
                            <div>
                                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight drop-shadow-md flex flex-wrap items-center justify-center sm:justify-start gap-3">
                                    {name}
                                    <div className="flex gap-2 justify-center">
                                        {badges.map((badge, idx) => (
                                            <div key={idx} className="relative group/badge">
                                                <div className={`w-8 h-8 rounded-full ${badge.bg} ${badge.color} border border-current/20 flex items-center justify-center text-sm shadow-lg transform hover:scale-110 transition-transform cursor-pointer`}>
                                                    {badge.icon}
                                                </div>
                                                {/* Custom Tooltip */}
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 px-3 py-1.5 bg-midnight-950/95 backdrop-blur-md text-[10px] font-black uppercase tracking-widest text-white rounded-lg border border-white/10 opacity-0 scale-50 group-hover/badge:opacity-100 group-hover/badge:scale-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-[9999] shadow-2xl origin-bottom">
                                                    {badge.label}
                                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-midnight-950/95"></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </h1>
                                {(!allowPublicFriendRequests && friendshipStatus !== "accepted" && publicID !== currentUser?.publicID) ? null : (
                                    <p className="text-accent font-bold mt-1 tracking-widest text-sm uppercase">@{publicID}</p>
                                )}
                            </div>

                            <p className="text-text-secondary leading-relaxed max-w-xl text-sm sm:text-base">
                                {bio || "No bio yet. This gamer is a mystery!"}
                            </p>

                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-2">
                                <button
                                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all duration-300 font-bold shadow-lg ${isLiked ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30' : 'bg-midnight-700/80 text-white hover:bg-midnight-600 border border-white/10'}`}
                                    onClick={handleLike}
                                >
                                    {isLiked ? <FaHeart className="animate-pulse" /> : <FaRegHeart />}
                                    <span>{likesCount} Likes</span>
                                </button>
                                {renderFriendButton()}
                            </div>
                        </div>
                    </div>


                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 relative z-10">
                        <div className="bg-midnight-800/60 backdrop-blur-xl p-6 rounded-3xl border border-white/5 flex flex-col gap-4 shadow-xl hover:border-accent/30 transition-colors">
                            <div className="w-12 h-12 rounded-2xl bg-accent/20 flex items-center justify-center text-accent border border-accent/20">
                                <FaGamepad size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] text-text-muted uppercase font-black tracking-[0.2em]">Total Games</p>
                                <p className="text-3xl font-black text-white mt-1">{totalGames}</p>
                            </div>
                        </div>
                        <div className="bg-midnight-800/60 backdrop-blur-xl p-6 rounded-3xl border border-white/5 flex flex-col gap-4 shadow-xl hover:border-purple-500/30 transition-colors">
                            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center text-purple-400 border border-purple-500/20">
                                <FaClock size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] text-text-muted uppercase font-black tracking-[0.2em]">Playtime</p>
                                <p className="text-3xl font-black text-white mt-1">{Math.round(totalHours)}h</p>
                            </div>
                        </div>
                        <div className="bg-midnight-800/60 backdrop-blur-xl p-6 rounded-3xl border border-white/5 flex flex-col gap-4 shadow-xl hover:border-warning/30 transition-colors">
                            <div className="w-12 h-12 rounded-2xl bg-warning/20 flex items-center justify-center text-warning border border-warning/20">
                                <FaUsers size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] text-text-muted uppercase font-black tracking-[0.2em]">Friends</p>
                                <p className="text-3xl font-black text-white mt-1">{friendsCount}</p>
                            </div>
                        </div>
                    </div>

                    {/* Masterpiece Slot */}
                    {masterpieceGame && (
                        <div className="relative group animate-in fade-in slide-in-from-bottom-4 duration-1000">
                            <div className="absolute inset-0 bg-amber-400/10 blur-[120px] rounded-full scale-90 opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>

                            <div className="relative overflow-hidden rounded-[2.5rem] border border-amber-400/20 shadow-2xl shadow-black/40">
                                {/* Immersive Card Background */}
                                <div className="absolute inset-0 z-0">
                                    <img src={masterpieceGame.coverImage} className="w-full h-full object-cover blur-2xl opacity-10 scale-110" alt="" />
                                    <div className="absolute inset-0 bg-gradient-to-br from-midnight-900/90 via-midnight-900/60 to-midnight-900/95"></div>
                                </div>

                                <div className="relative z-10 p-6 sm:p-10 flex flex-col lg:flex-row gap-10 items-center">
                                    <div className="w-full lg:w-1/2 aspect-video rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex-shrink-0 group/img relative">
                                        <img src={masterpieceGame.coverImage} alt={masterpieceGame.gameName} className="w-full h-full object-cover transform group-hover/img:scale-105 transition-transform duration-1000" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity duration-500"></div>
                                    </div>

                                    <div className="flex-1 flex flex-col justify-center space-y-6 text-center lg:text-left">
                                        <div>
                                            <div className="flex items-center justify-center lg:justify-start gap-3 mb-3">
                                                <div className="h-px w-10 bg-amber-400/30"></div>
                                                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-amber-400 drop-shadow-glow">The Masterpiece</span>
                                                <div className="h-px w-10 bg-amber-400/30"></div>
                                            </div>
                                            <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-tight">{masterpieceGame.gameName}</h2>
                                            <p className="text-amber-400/90 font-bold text-sm uppercase tracking-[0.2em] mt-2 drop-shadow-md">{masterpieceGame.platform}</p>
                                        </div>

                                        <div className="relative px-4 sm:px-0">
                                            <span className="absolute -top-6 -left-2 text-6xl text-amber-400/10 font-serif">"</span>
                                            <p className="text-xl sm:text-2xl text-text-secondary italic font-medium leading-relaxed drop-shadow-sm">
                                                {masterpieceGame.quote || "A game that stays with you long after the credits roll."}
                                            </p>
                                        </div>

                                        <div className="flex items-center justify-center lg:justify-start gap-4">
                                            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-400">
                                                <FaTrophy className="text-sm" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Personal Legend</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Favorite Games Section */}
                    {favoriteGames && favoriteGames.filter(g => g.gameId !== masterpieceGame?.gameId || g.platform !== masterpieceGame?.platform).length > 0 && (
                        <div className="space-y-6 relative z-10">
                            <h2 className="text-xl font-black text-white flex items-center gap-3 tracking-wide uppercase">
                                <FaHeart className="text-pink-400" /> Favorites
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
                                {favoriteGames
                                    .filter(g => g.gameId !== masterpieceGame?.gameId || g.platform !== masterpieceGame?.platform)
                                    .map((game, idx) => (
                                        <div key={idx} className="bg-midnight-800/80 backdrop-blur-md rounded-2xl overflow-hidden group hover:border-pink-400/50 border border-white/5 transition-all shadow-xl">
                                            <div className="h-48 w-full relative">
                                                <img
                                                    src={game.coverImage || "/placeholder-game.jpg"}
                                                    alt={game.gameName}
                                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-midnight-900 to-transparent"></div>
                                                <div className="absolute bottom-4 left-4 right-4">
                                                    <p className="text-white font-bold truncate text-lg drop-shadow-lg">{game.gameName}</p>
                                                    <p className="text-pink-400 text-[10px] uppercase tracking-widest font-black">{game.platform}</p>
                                                </div>
                                            </div>
                                            <div className="p-5 flex justify-between items-center bg-midnight-800/50">
                                                <div className="text-xs font-bold text-text-muted">
                                                    {game.hoursPlayed} Hours
                                                </div>
                                                {game.progress > 0 && (
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-20 h-2 bg-midnight-900 rounded-full overflow-hidden border border-white/5">
                                                            <div className="h-full bg-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.5)]" style={{ width: `${game.progress}%` }}></div>
                                                        </div>
                                                        <span className="text-[10px] text-pink-400 font-black">{game.progress}%</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    )}

                    {/* Top Games Section (Wider Cards) */}
                    {topGames && topGames.length > 0 && (
                        <div className="space-y-6 relative z-10">
                            <h2 className="text-xl font-black text-white flex items-center gap-3 tracking-wide uppercase">
                                <FaGamepad className="text-accent" /> Most Played
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {topGames.map((game, idx) => (
                                    <div key={idx} className="bg-midnight-800/80 backdrop-blur-md rounded-2xl overflow-hidden group hover:border-accent/40 border border-white/5 transition-all shadow-xl">
                                        <div className="h-40 w-full relative">
                                            <img
                                                src={game.coverImage || "/placeholder-game.jpg"}
                                                alt={game.gameName}
                                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-midnight-900 to-transparent"></div>
                                            <div className="absolute bottom-4 left-4 right-4">
                                                <p className="text-white font-bold truncate text-lg drop-shadow-lg">{game.gameName}</p>
                                                <p className="text-accent text-[10px] uppercase tracking-widest font-black">{game.platform}</p>
                                            </div>
                                        </div>
                                        <div className="p-5 flex justify-between items-center bg-midnight-800/50">
                                            <div className="text-xs font-bold text-text-muted">
                                                {game.hoursPlayed} Hours
                                            </div>
                                            {game.progress > 0 && (
                                                <div className="flex items-center gap-3">
                                                    <div className="w-20 h-2 bg-midnight-900 rounded-full overflow-hidden border border-white/5">
                                                        <div className="h-full bg-accent shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{ width: `${game.progress}%` }}></div>
                                                    </div>
                                                    <span className="text-[10px] text-accent font-black">{game.progress}%</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Platinumed/Completed Games (Wider Cards, Uncapped) */}
                    {completedGames && completedGames.length > 0 && (
                        <div className="space-y-6 relative z-10">
                            <div className="flex items-center gap-3">
                                <h2 className="text-xl font-black text-white flex items-center gap-3 tracking-wide uppercase">
                                    <FaTrophy className="text-amber-400" /> Platinum Collection
                                </h2>
                                <span className="px-3 py-1 bg-amber-400/20 text-amber-400 rounded-lg text-xs font-black border border-amber-400/20">{completedGames.length}</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {completedGames.map((game, idx) => (
                                    <div key={idx} className="bg-midnight-800/80 backdrop-blur-md rounded-2xl overflow-hidden group hover:border-amber-400/40 border border-white/5 transition-all shadow-xl relative">
                                        <div className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-amber-400/20 backdrop-blur border border-amber-400/50 flex items-center justify-center text-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.4)]">
                                            <FaTrophy size={14} />
                                        </div>
                                        <div className="h-40 w-full relative">
                                            <img
                                                src={game.coverImage || "/placeholder-game.jpg"}
                                                alt={game.gameName}
                                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-midnight-900 via-midnight-900/40 to-transparent"></div>
                                            <div className="absolute bottom-4 left-4 right-4 z-10">
                                                <p className="text-white font-bold truncate text-lg drop-shadow-lg">{game.gameName}</p>
                                                <p className="text-amber-400 text-[10px] uppercase tracking-widest font-black">{game.platform}</p>
                                            </div>
                                        </div>
                                        <div className="p-5 flex justify-between items-center bg-midnight-800/50">
                                            <div className="text-xs font-bold text-text-muted">
                                                {game.hoursPlayed} Hours
                                            </div>
                                            <div className="flex items-center gap-2 text-amber-400 text-[10px] font-black uppercase tracking-wider">
                                                <FaCheck /> 100% Complete
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </main>
                <Footer />
            </div>

            {/* Spotify Theme Song Player */}
            {themeSongId && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 sm:left-6 sm:translate-x-0 z-50 w-[calc(100%-2rem)] max-w-[350px] sm:w-[350px] animate-slide-up">
                    <div className="bg-midnight-900/80 backdrop-blur-3xl border border-white/10 rounded-[1.2rem] overflow-hidden shadow-2xl shadow-black/60 group">
                        <iframe
                            src={`https://open.spotify.com/embed/track/${themeSongId}?utm_source=generator&theme=0`}
                            width="100%"
                            height="80"
                            frameBorder="0"
                            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                            loading="lazy"
                            className="opacity-90 group-hover:opacity-100 transition-opacity"
                        ></iframe>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ViewProfilePage;
