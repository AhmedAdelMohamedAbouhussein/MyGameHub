import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import apiClient from "../../utils/apiClient.js";
import WishlistButton from "../../components/WishlistButton/WishlistButton.jsx";
import PriceHistoryChart from "../../components/PriceHistoryChart/PriceHistoryChart.jsx";

import LoadingScreen from "../../components/LoadingScreen/LoadingScreen.jsx";
import Header from "../../components/Header/Header.jsx";
import Footer from "../../components/Footer/Footer.jsx";
import { FaCalendarAlt, FaClock, FaStar, FaExternalLinkAlt, FaTag, FaTools, FaBuilding, FaArrowRight, FaGamepad } from "react-icons/fa";
import BackButton from "../../components/BackButton/BackButton";

const STORE_COLORS = {
    "Steam": "bg-blue-600/20 border-blue-500/30 text-blue-400 hover:bg-blue-600/30",
    "Epic Games": "bg-gray-600/20 border-gray-500/30 text-gray-300 hover:bg-gray-600/30",
    "PlayStation Store": "bg-blue-500/20 border-blue-400/30 text-blue-300 hover:bg-blue-500/30",
    "Microsoft Store": "bg-green-600/20 border-green-500/30 text-green-400 hover:bg-green-600/30",
    "Xbox Store": "bg-green-600/20 border-green-500/30 text-green-400 hover:bg-green-600/30",
    "Nintendo Store": "bg-red-600/20 border-red-400/30 text-red-400 hover:bg-red-600/30",
    "EA App (Origin)": "bg-orange-600/20 border-orange-400/30 text-orange-400 hover:bg-orange-600/30",
};

function formatDate(dateStr) {
    if (!dateStr) return "TBA";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

const fetchGame = async (id) => {
    const response = await apiClient.get(`/games/${id}`);
    return response.data;
};

const GamePage = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const {
        data: game,
        isLoading,
        isError,
        error
    } = useQuery({
        queryKey: ["game", id],
        queryFn: () => fetchGame(id),
        enabled: !!id,
        staleTime: 1000 * 60 * 5,
        retry: 2
    });

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [id]);

    if (isLoading) return <LoadingScreen />;

    if (isError) {
        return (
            <div className="page-container bg-midnight-900 px-0">
                <Header />
                <main className="flex-1 flex items-center justify-center px-4">
                    <div className="bg-midnight-800/40 backdrop-blur-xl border border-white/5 p-8 sm:p-10 rounded-[2.5rem] text-center space-y-6 max-w-md animate-in fade-in zoom-in duration-500">
                        <span className="text-6xl">😕</span>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-black text-text-primary uppercase tracking-tight">Signal Lost</h2>
                            <p className="text-sm text-text-secondary font-medium">
                                {error?.response?.data?.message || "We couldn't track down this title. It might be hidden in another sector."}
                            </p>
                        </div>
                        <button
                            className="px-8 py-3 bg-accent text-white font-black uppercase tracking-widest rounded-2xl hover:bg-accent-hover active:scale-95 transition-all"
                            onClick={() => navigate("/games")}
                        >
                            Return to Base
                        </button>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    if (!game) return null;

    return (
        <div className="page-container bg-midnight-900 border-none overflow-x-hidden">
            <Header />

            <main className="flex-1 relative">
                {/* Back Button */}
                <BackButton />

                {/* 1. Immersive Hero Section */}
                <section className="relative min-h-[50vh] sm:min-h-[60vh] lg:min-h-[70vh] flex items-end px-4 sm:px-0">
                    {/* Dynamic Ambient Backdrop */}
                    <div className="absolute inset-0 overflow-hidden">
                        {game.image && (
                            <img
                                className="w-full h-full object-cover opacity-20 blur-sm scale-105"
                                src={game.image}
                                alt=""
                            />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-midnight-900 via-midnight-900/60 to-transparent" />
                        <div className="absolute inset-0 bg-gradient-to-b from-midnight-900/40 via-transparent to-transparent" />
                    </div>

                    <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-20">
                        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-center lg:items-end text-center lg:text-left">
                            {/* Key Art Card */}
                            <div className="relative group flex-shrink-0 animate-in fade-in slide-in-from-left-8 duration-1000">
                                <div className="absolute -inset-2 bg-gradient-to-br from-accent/20 to-blue-500/20 rounded-[2.5rem] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                {game.image && (
                                    <img
                                        className="relative w-full max-w-[240px] sm:max-w-sm lg:max-w-md rounded-[2rem] shadow-2xl shadow-black/60 border border-white/5 transition-transform duration-700 group-hover:scale-[1.02]"
                                        src={game.image}
                                        alt={game.name}
                                    />
                                )}
                            </div>

                            {/* Game Info Overlay */}
                            <div className="flex-1 space-y-6 lg:space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
                                <div className="space-y-4">
                                    <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black tracking-tight text-white uppercase leading-tight sm:leading-none slant-1">
                                        {game.name}
                                    </h1>

                                    <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 sm:gap-3">
                                        <div className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-midnight-800/80 backdrop-blur-md border border-white/5 text-[10px] sm:text-[11px] font-black text-white uppercase tracking-widest whitespace-nowrap">
                                            <FaCalendarAlt className="text-accent" /> {formatDate(game.released)}
                                        </div>
                                        {game.playtime > 0 && (
                                            <div className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-midnight-800/80 backdrop-blur-md border border-white/5 text-[10px] sm:text-[11px] font-black text-white uppercase tracking-widest whitespace-nowrap">
                                                <FaClock className="text-accent" /> AVG {game.playtime}H
                                            </div>
                                        )}
                                        {game.metacritic && (
                                            <div className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-success/10 backdrop-blur-md border border-success/20 text-[10px] sm:text-[11px] font-black text-success uppercase tracking-widest whitespace-nowrap">
                                                <FaStar /> {game.metacritic} METASCORE
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {(game.youtubeTrailer || game.rawgTrailer) && (
                                    <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4">
                                        <button
                                            className="inline-flex px-8 py-4 sm:px-10 sm:py-5 bg-accent text-white font-black uppercase tracking-[0.2em] text-[10px] sm:text-xs rounded-2xl hover:bg-accent-hover transition-all active:scale-95 shadow-2xl shadow-accent/20 items-center justify-center gap-4 group"
                                            onClick={() => document.getElementById('trailers-section')?.scrollIntoView({ behavior: 'smooth' })}
                                        >
                                            Launch Trailer <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
                                        </button>
                                        <WishlistButton
                                            gameId={String(game.id)}
                                            gameName={game.name}
                                            itadId={game.itadId}
                                            initialStores={game.deals?.map(d => d.store)}
                                        />
                                    </div>
                                )}
                                {!(game.youtubeTrailer || game.rawgTrailer) && (
                                    <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4">
                                        <WishlistButton
                                            gameId={String(game.id)}
                                            gameName={game.name}
                                            itadId={game.itadId}
                                            initialStores={game.deals?.map(d => d.store)}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-12 sm:space-y-16">

                    {/* 2. Metadata Grid (Category & Developers FIRST) */}
                    <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
                        {game.genres?.length > 0 && (
                            <div className="bg-midnight-800/40 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-white/5 flex flex-col justify-center">
                                <h4 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                    <FaTag className="text-accent" /> Category
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {game.genres.map((genre, i) => (
                                        <span key={i} className="px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/20 text-accent text-[9px] font-black uppercase tracking-widest">{genre}</span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {game.developers?.length > 0 && (
                            <div className="bg-midnight-800/40 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-white/5 flex flex-col justify-center">
                                <h4 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                    <FaBuilding className="text-accent" /> Developer
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {game.developers.map((dev, i) => (
                                        <span key={i} className="px-3 py-1.5 rounded-lg bg-midnight-700 border border-white/5 text-text-secondary text-[9px] font-black uppercase tracking-widest">{dev}</span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {game.publishers?.length > 0 && (
                            <div className="bg-midnight-800/40 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-white/5 flex flex-col justify-center">
                                <h4 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                    <FaGamepad className="text-accent" /> Publisher
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {game.publishers.map((pub, i) => (
                                        <span key={i} className="px-3 py-1.5 rounded-lg bg-midnight-700 border border-white/5 text-text-secondary text-[9px] font-black uppercase tracking-widest">{pub}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </section>

                    {/* 3. Media & Trailer Section */}
                    {(game.youtubeTrailer || game.rawgTrailer) && (
                        <section id="trailers-section" className="animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-400">
                            <div className="flex items-center gap-4 mb-6 sm:mb-8">
                                <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight slant-1">Cinematic Content</h2>
                                <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
                            </div>

                            <div className={`grid gap-6 ${game.youtubeTrailer && game.rawgTrailer ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
                                {game.youtubeTrailer && (
                                    <div className="relative group p-1.5 rounded-[2rem] sm:rounded-[2.5rem] bg-midnight-800/40 border border-white/5 overflow-hidden shadow-2xl">
                                        <div className="relative aspect-video rounded-2xl sm:rounded-[2rem] overflow-hidden">
                                            <iframe
                                                className="absolute inset-0 w-full h-full"
                                                src={`${game.youtubeTrailer.embedUrl}?rel=0&modestbranding=1`}
                                                title={`${game.name} Official Trailer`}
                                                frameBorder="0"
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                allowFullScreen
                                            />
                                        </div>
                                    </div>
                                )}

                                {game.rawgTrailer && (
                                    <div className="relative group p-1.5 rounded-[2rem] sm:rounded-[2.5rem] bg-midnight-800/40 border border-white/5 overflow-hidden shadow-2xl">
                                        <div className="relative aspect-video rounded-2xl sm:rounded-[2rem] overflow-hidden">
                                            <video
                                                className="absolute inset-0 w-full h-full object-cover"
                                                controls
                                                autoPlay
                                                muted
                                                loop
                                            >
                                                <source src={game.rawgTrailer} type="video/mp4" />
                                                Your browser does not support the video tag.
                                            </video>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>
                    )}

                    {/* 4. Deals Hub Section */}
                    {(game.deals || game.historyLow) && (
                        <section className="animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500">
                            <div className="flex items-center gap-4 mb-8">
                                <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight slant-1">Best Tracking Prices</h2>
                                <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                                {/* FEATURED DEAL */}
                                <div className="group relative bg-midnight-800/40 backdrop-blur-xl rounded-[2.5rem] p-8 sm:p-10 border border-white/5 hover:border-accent/30 transition-all duration-500 overflow-hidden">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />

                                    {game.deals && game.deals.length > 0 ? (
                                        <div className="relative space-y-6 sm:space-y-8">
                                            <span className="inline-block px-4 py-1.5 rounded-lg bg-accent/10 text-accent text-[10px] font-black uppercase tracking-widest border border-accent/20">
                                                Active Tracker
                                            </span>

                                            <div className="space-y-1">
                                                <div className="text-5xl sm:text-6xl font-black text-accent tracking-tighter">${game.deals[0].price}</div>
                                                <p className="text-text-muted font-bold uppercase text-[10px] sm:text-xs tracking-widest">
                                                    On Sale at <span className="text-white">{game.deals[0].store}</span>
                                                </p>
                                            </div>

                                            {game.historyLow && (
                                                <div className="grid grid-cols-2 gap-4 py-6 border-y border-white/5">
                                                    <div className="space-y-1">
                                                        <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">Historic Low</span>
                                                        <p className="text-base sm:text-lg font-black text-success">${game.historyLow.all}</p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">1-Year Low</span>
                                                        <p className="text-base sm:text-lg font-black text-text-primary">${game.historyLow.y1}</p>
                                                    </div>
                                                </div>
                                            )}

                                            <a
                                                href={game.deals[0].url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="block w-full py-4 sm:py-5 bg-midnight-900 border border-white/5 text-center text-white font-black uppercase tracking-widest text-[10px] sm:text-xs rounded-2xl hover:bg-midnight-800 hover:border-accent/40 transition-all"
                                            >
                                                Secure Deal <FaExternalLinkAlt className="inline ml-3 opacity-40" size={10} />
                                            </a>
                                        </div>
                                    ) : (
                                        <div className="py-12 text-center space-y-4">
                                            <div className="text-4xl">🏷️</div>
                                            <p className="text-text-muted font-bold uppercase text-xs tracking-widest">No active deals found.</p>
                                        </div>
                                    )}
                                </div>

                                {/* OTHER STOREFRONT LINKS */}
                                {game.deals && game.deals.length > 1 && (
                                    <div className="bg-midnight-800/20 backdrop-blur-md rounded-[2.5rem] p-8 sm:p-10 border border-white/5 space-y-6">
                                        <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-4 flex items-center gap-3">
                                            <span className="w-2 h-2 rounded-full bg-accent" /> Store Comparison
                                        </h3>

                                        <div className="space-y-3 max-h-[350px] overflow-y-auto no-scrollbar pr-2">
                                            {game.deals.slice(1).map((deal, idx) => (
                                                <a
                                                    key={idx}
                                                    href={deal.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center justify-between p-4 sm:p-5 rounded-2xl bg-midnight-800/50 border border-white/5 hover:border-accent/30 hover:bg-midnight-700/80 transition-all group"
                                                >
                                                    <div className="space-y-1">
                                                        <span className="text-xs sm:text-sm font-black text-white uppercase tracking-tight group-hover:text-accent transition-colors">
                                                            {deal.store}
                                                        </span>
                                                        {deal.storeLow && (
                                                            <span className="block text-[8px] sm:text-[9px] font-bold text-text-muted uppercase tracking-widest">
                                                                Low: ${deal.storeLow}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="text-base sm:text-lg font-black text-white tracking-tight">
                                                        ${deal.price}
                                                    </div>
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>
                    )}

                    {/* Price History Chart */}
                    {game.itadId && (
                        <section className="animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-550">
                            <div className="flex items-center gap-4 mb-8">
                                <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight slant-1">Price History</h2>
                                <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
                            </div>
                            <PriceHistoryChart itadId={game.itadId} gameName={game.name} />
                        </section>
                    )}

                    {/* 5. Detailed Info & Requirements */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 sm:gap-12 animate-in fade-in delay-600 duration-1000">
                        {/* LEFT: REQUIREMENTS */}
                        <div className="lg:col-span-2 space-y-8">
                            {/* COMMENTED OUT: ABOUT SECTION */}
                            {/* 
                            {game.description && ( ... )}
                            */}

                            {(game.minimumreq || game.recommendedreq) && (
                                <div className="space-y-6">
                                    <div className="flex items-center gap-4">
                                        <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                                            <FaTools className="text-accent" /> Tech Specs
                                        </h2>
                                        <div className="flex-1 h-px bg-white/5" />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                        {game.minimumreq && (
                                            <div className="bg-midnight-800/40 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-white/5">
                                                <h3 className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                    Min Requirements
                                                </h3>
                                                <p className="text-[10px] sm:text-[11px] font-bold text-text-secondary leading-relaxed whitespace-pre-line">{game.minimumreq}</p>
                                            </div>
                                        )}
                                        {game.recommendedreq && (
                                            <div className="bg-midnight-800/40 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-white/5">
                                                <h3 className="text-[10px] font-black text-success uppercase tracking-widest mb-4 flex items-center gap-2">
                                                    Optimal Performance
                                                </h3>
                                                <p className="text-[10px] sm:text-[11px] font-bold text-text-secondary leading-relaxed whitespace-pre-line">{game.recommendedreq}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* RIGHT: OFFICIALLY HOSTED STORES & PLATFORMS */}
                        <div className="space-y-6">
                            {game.platforms?.length > 0 && (
                                <div className="bg-midnight-800/40 backdrop-blur-md rounded-[2.5rem] p-6 sm:p-8 border border-white/5">
                                    <h4 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-6">Playable Platforms</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {game.platforms.map((platform, idx) => (
                                            <span
                                                key={idx}
                                                className="px-3 md:px-4 py-2 rounded-xl bg-midnight-700/50 border border-white/5 text-text-primary text-[10px] sm:text-[11px] font-black uppercase tracking-widest whitespace-nowrap"
                                            >
                                                {platform}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {game.stores?.length > 0 && (
                                <div className="bg-midnight-800/40 backdrop-blur-md rounded-[2.5rem] p-6 sm:p-8 border border-white/5">
                                    <h4 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-6">Digital Distributors</h4>
                                    <div className="space-y-2">
                                        {game.stores.map((storeConfig, idx) => (
                                            <a
                                                key={idx}
                                                href={storeConfig.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={`flex items-center justify-between px-4 sm:px-5 py-3 sm:py-3.5 rounded-2xl border text-[10px] sm:text-[11px] font-black uppercase tracking-widest transition-all ${STORE_COLORS[storeConfig.name] || 'bg-midnight-700/50 border-white/5 hover:bg-midnight-600'}`}
                                            >
                                                <span>{storeConfig.name}</span>
                                                <FaExternalLinkAlt size={8} />
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Attribution */}
                    <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-[8px] sm:text-[9px] font-black text-text-muted uppercase tracking-[0.3em] pt-8 sm:pt-12 border-t border-white/5 opacity-40 text-center">
                        <span>Data: IsThereAnyDeal</span>
                        <div className="hidden sm:block w-1 h-1 rounded-full bg-white/20" />
                        <span>Visuals: RAWG.IO</span>
                        <div className="hidden sm:block w-1 h-1 rounded-full bg-white/20" />
                        <span>GameHub © 2024</span>
                    </div>

                </div>
            </main>

            <Footer />
        </div>
    );
};

export default GamePage;