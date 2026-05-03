import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import apiClient from "../../utils/apiClient.js";
import Header from "../../components/Header/Header.jsx";
import Footer from "../../components/Footer/Footer.jsx";
import LoadingScreen from "../../components/LoadingScreen/LoadingScreen.jsx";
import { FaTag, FaTrash, FaExternalLinkAlt, FaHeart, FaArrowRight, FaClock, FaStore } from "react-icons/fa";
import { toast } from "sonner";
import { optimizeImage } from "../../utils/imageUtils.js";

const WishlistPage = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const { data, isLoading, isError } = useQuery({
        queryKey: ["wishlist"],
        queryFn: async () => {
            const res = await apiClient.get("/users/wishlist/view");
            return res.data.wishlist;
        }
    });

    const toggleWishlistMutation = useMutation({
        mutationFn: (gameId) => apiClient.post("/users/wishlist/toggle", { gameId, action: "remove" }),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["wishlist"] });
            toast.success(data.data.message);
        },
        onError: () => toast.error("Failed to update wishlist")
    });

    if (isLoading) return <LoadingScreen />;

    return (
        <div className="page-container bg-midnight-900 border-none">
            <Header />
            <main className="flex-1 overflow-y-auto custom-scrollbar no-scrollbar">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-12">

                    {/* Header Section */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 animate-in fade-in slide-in-from-top-4 duration-700">
                        <div className="space-y-4">
                            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white uppercase slant-1">
                                Tactical <span className="text-accent">Wishlist</span>
                            </h1>
                            <p className="text-text-muted font-medium max-w-lg">
                                Tracking {data?.length || 0} high-priority targets. Our systems check prices daily and will alert you the moment a drop is detected.
                            </p>
                        </div>

                        <div className="flex items-center gap-4 bg-midnight-800/40 backdrop-blur-md border border-white/5 p-4 rounded-3xl">
                            <div className="text-right">
                                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Active Trackers</p>
                                <p className="text-2xl font-black text-white">{data?.length || 0}</p>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
                                <FaTag size={20} />
                            </div>
                        </div>
                    </div>

                    {/* Wishlist Grid */}
                    {data && data.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {data.map((game, index) => (
                                <div
                                    key={game.id}
                                    className="group relative bg-midnight-800/40 backdrop-blur-xl rounded-[2.5rem] border border-white/5 overflow-hidden hover:border-accent/30 transition-all duration-500 shadow-2xl shadow-black/40 flex flex-col animate-in fade-in slide-in-from-bottom-4"
                                    style={{ animationDelay: `${index * 50}ms` }}
                                >
                                    {/* Image Section */}
                                    <div className="relative aspect-video overflow-hidden">
                                        <img
                                            src={optimizeImage(game.image, 420)}
                                            alt={game.name}
                                            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-midnight-900 via-transparent to-transparent opacity-60" />

                                        {/* Remove Button */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleWishlistMutation.mutate(game.id);
                                            }}
                                            className="absolute top-4 right-4 p-3 rounded-2xl bg-red-500/10 backdrop-blur-md border border-red-500/20 text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                                            title="Remove from Wishlist"
                                        >
                                            <FaTrash size={14} />
                                        </button>

                                        {/* Metacritic Badge */}
                                        {game.metacritic && (
                                            <div className="absolute bottom-4 left-4 px-3 py-1 rounded-lg bg-success/10 backdrop-blur-md border border-success/20 text-success text-[10px] font-black uppercase tracking-widest">
                                                {game.metacritic} Score
                                            </div>
                                        )}
                                    </div>

                                    {/* Content Section */}
                                    <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between space-y-6">
                                        <div className="space-y-4">
                                            <h3
                                                onClick={() => navigate(`/games/${game.id}`)}
                                                className="text-lg font-black text-white uppercase tracking-tight line-clamp-1 group-hover:text-accent transition-colors cursor-pointer"
                                            >
                                                {game.name}
                                            </h3>

                                            {/* Store Performance Matrix */}
                                            <div className="space-y-3">
                                                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest px-1">Tactical Analysis</p>
                                                {game.storePrices?.length > 0 ? (
                                                    <div className="space-y-2">
                                                        {game.storePrices.map((store) => {
                                                            const diff = store.currentPrice && store.initialPrice ? store.currentPrice - store.initialPrice : 0;
                                                            const colorClass = diff < 0 ? 'text-green-500' : diff > 0 ? 'text-red-500' : 'text-white';
                                                            const statusIcon = diff < 0 ? '↓' : diff > 0 ? '↑' : '';

                                                            return (
                                                                <div key={store.storeName} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 group/row hover:bg-white/[0.07] transition-all">
                                                                    <div className="space-y-1.5">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">{store.storeName}</span>
                                                                            {store.isHistoryLow && (
                                                                                <span className="px-1.5 py-0.5 rounded bg-accent/20 text-accent text-[7px] font-black uppercase animate-pulse">History Low</span>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex items-center gap-3">
                                                                            <span className={`text-base font-black ${colorClass}`}>
                                                                                ${store.currentPrice || 'N/A'} {statusIcon}
                                                                            </span>
                                                                            {store.initialPrice && (
                                                                                <div className="flex flex-col">
                                                                                    <span className="text-[8px] font-bold text-text-muted uppercase tracking-tighter opacity-40">Baseline</span>
                                                                                    <span className="text-[10px] text-text-muted font-bold line-through opacity-40">${store.initialPrice}</span>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    {store.url && (
                                                                        <a
                                                                            href={store.url}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="p-2.5 rounded-xl bg-white/5 text-text-muted hover:text-accent hover:bg-accent/10 transition-all border border-transparent hover:border-accent/20"
                                                                            title={`Secure Deal at ${store.storeName}`}
                                                                        >
                                                                            <FaExternalLinkAlt size={12} />
                                                                        </a>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    /* Fallback for "All Stores" tracking */
                                                    <div className="p-5 rounded-3xl bg-accent/5 border border-accent/10 space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <div className="space-y-1">
                                                                <p className="text-[9px] font-black text-accent uppercase tracking-widest">Global Best Price</p>
                                                                <p className="text-2xl font-black text-white">${game.currentPrice || 'N/A'}</p>
                                                            </div>
                                                            <div className="px-3 py-1 rounded-full bg-accent/10 text-accent text-[8px] font-black uppercase tracking-widest">Tracking All</div>
                                                        </div>
                                                        {game.url && (
                                                            <a
                                                                href={game.url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-accent text-white text-[9px] font-black uppercase tracking-widest hover:bg-accent-hover transition-all"
                                                            >
                                                                Secure Best Deal <FaExternalLinkAlt size={8} />
                                                            </a>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => navigate(`/games/${game.id}`)}
                                            className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl bg-midnight-900 border border-white/5 text-[10px] font-black text-text-muted uppercase tracking-[0.2em] hover:text-white hover:bg-midnight-800 hover:border-accent/40 transition-all group/link shadow-inner"
                                        >
                                            View game Intel <FaArrowRight className="group-hover/link:translate-x-1 transition-transform text-accent" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-32 text-center space-y-8 animate-in fade-in zoom-in duration-1000">
                            <div className="relative inline-block">
                                <div className="absolute -inset-8 bg-accent/10 rounded-full blur-3xl animate-pulse" />
                                <span className="text-8xl relative">📉</span>
                            </div>
                            <div className="space-y-4">
                                <h2 className="text-3xl font-black text-white uppercase slant-1">Zero Assets Found</h2>
                                <p className="text-text-muted font-medium max-w-sm mx-auto">
                                    Your wishlist is currently empty. Start tracking your favorite titles to get the best prices across the digital frontier.
                                </p>
                            </div>
                            <button
                                onClick={() => navigate("/games")}
                                className="px-10 py-4 bg-accent text-white font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-accent-hover transition-all active:scale-95 shadow-xl shadow-accent/20"
                            >
                                Browse Command Center
                            </button>
                        </div>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default WishlistPage;
