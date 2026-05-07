import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import apiClient from "../../utils/apiClient.js";
import Header from "../../components/Header/Header.jsx";
import Footer from "../../components/Footer/Footer.jsx";
import LoadingScreen from "../../components/LoadingScreen/LoadingScreen.jsx";
import { FaSearch, FaArrowRight } from "react-icons/fa";
import { toast } from "sonner";
import { optimizeImage } from "../../utils/imageUtils.js";

const BrowseGamesPage = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    // Debounce search input
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 1000);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    const { data: games = [], isFetching: loading, isError } = useQuery({
        queryKey: ["browseGames", debouncedSearch],
        queryFn: async () => {
            const endpoint = debouncedSearch
                ? `/games/search?q=${encodeURIComponent(debouncedSearch)}`
                : `/games/landingpage`;

            const response = await apiClient.get(endpoint);

            return debouncedSearch
                ? response.data
                : response.data.map((game) => ({
                    image: game.background_image,
                    name: game.name,
                    id: game.id,
                    released: game.released ? game.released.split('-')[0] : 'N/A'
                }));
        },
        staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    });

    const handleGameClick = (game) => {
        const id = game.id;
        navigate(`/games/${id}`);
    };

    return (
        <div className="page-container bg-midnight-900 border-none">
            <Header />
            <div className="flex-1 flex min-h-0">

                <main className="flex-1 overflow-y-auto custom-scrollbar no-scrollbar">
                    {/* Discovery Dashboard */}
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">

                        {/* 1. Cinematic Search Header */}
                        <section className="relative rounded-[3rem] overflow-hidden bg-midnight-800/40 border border-white/5 p-8 sm:p-12 lg:p-16 text-center space-y-8 animate-in fade-in slide-in-from-top-4 duration-1000">
                            {/* Ambient Glows */}
                            <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-accent/10 rounded-full blur-[100px] pointer-events-none" />
                            <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-blue-500/5 rounded-full blur-[80px] pointer-events-none" />

                            <div className="relative space-y-6">
                                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white uppercase slant-1">
                                    Explore <span className="text-transparent bg-gradient-to-r from-accent via-blue-400 to-indigo-400 bg-clip-text">Everything</span>
                                </h1>
                                <p className="text-text-muted text-sm sm:text-base max-w-xl mx-auto font-medium">
                                    Discover over 500,000 titles. Compare prices, track achievements, and stay updated with your favorite gaming universes.
                                </p>

                                <div className="max-w-2xl mx-auto relative group pt-4">
                                    <div className="absolute -inset-1 bg-gradient-to-r from-accent/20 to-blue-500/20 rounded-3xl blur opacity-0 group-hover:opacity-100 transition duration-1000" />
                                    <div className="relative flex items-center bg-midnight-900/80 backdrop-blur-xl border border-white/10 rounded-2xl sm:rounded-3xl p-1.5 focus-within:border-accent/40 shadow-2xl transition-all">
                                        <div className="pl-6 text-text-muted group-focus-within:text-accent transition-colors">
                                            <FaSearch size={20} />
                                        </div>
                                        <input
                                            type="text"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') setDebouncedSearch(searchTerm);
                                            }}
                                            placeholder="Search games..."
                                            className="flex-1 h-14 bg-transparent pl-4 pr-6 text-base font-bold text-white placeholder:text-text-muted outline-none"
                                        />
                                        <button
                                            onClick={() => setDebouncedSearch(searchTerm)}
                                            className="hidden sm:flex items-center gap-2 px-8 h-14 bg-accent text-white font-black uppercase tracking-widest rounded-2xl hover:bg-accent-hover transition-all active:scale-95"
                                        >
                                            Find <FaArrowRight size={12} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* 2. Game Results Grid */}
                        <section className="space-y-8 animate-in fade-in duration-700 delay-200">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-black text-text-primary uppercase tracking-tight slant-1">
                                    {debouncedSearch ? `Search Results: ${debouncedSearch}` : `Top Trending Games`}
                                </h2>
                                <span className="text-[10px] font-black text-text-muted uppercase bg-midnight-800 px-3 py-1 rounded-full border border-white/5">
                                    {games.length} Titles
                                </span>
                            </div>

                            {loading ? (
                                <div className="py-32">
                                    <LoadingScreen />
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-8 pb-32">
                                    {games.length > 0 ? (
                                        games.map((game, index) => (
                                            <div
                                                key={game.id}
                                                onClick={() => handleGameClick(game)}
                                                className="group relative bg-midnight-800/40 backdrop-blur-md rounded-3xl border border-white/5 overflow-hidden cursor-pointer transition-all duration-500 hover:border-accent/40 hover:-translate-y-2 hover:bg-midnight-700 shadow-2xl shadow-black/20 animate-in fade-in slide-in-from-bottom-4"
                                                style={{ animationDelay: `${index * 40}ms` }}
                                            >
                                                {/* Portrait Aspect Ratio */}
                                                <div className="relative aspect-[3/4.2] overflow-hidden">
                                                    <img
                                                        src={optimizeImage(game.image, 420)}
                                                        alt={game.name}
                                                        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                                                    />

                                                    {/* Blur Overlay on Hover */}
                                                    <div className="absolute inset-0 bg-midnight-900/40 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-center justify-center">
                                                        <span className="px-5 py-2 rounded-xl bg-accent text-white text-[9px] font-black uppercase tracking-widest shadow-xl scale-75 group-hover:scale-100 transition-transform">
                                                            Details
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Info Area */}
                                                <div className="p-4 space-y-2">
                                                    <h3 className="text-xs font-black text-text-primary uppercase tracking-tight truncate group-hover:text-accent transition-colors leading-relaxed">
                                                        {game.name}
                                                    </h3>
                                                    <div className="flex items-center justify-between opacity-60">
                                                        <span className="text-[9px] font-bold text-text-muted uppercase">{game.released}</span>
                                                        <div className="w-1.5 h-1.5 rounded-full bg-accent/40" />
                                                    </div>
                                                </div>

                                                {/* Ambient Border Glow */}
                                                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                            </div>
                                        ))
                                    ) : (
                                        <div className="col-span-full py-40 text-center space-y-6">
                                            <div className="text-6xl text-text-muted/20">👾</div>
                                            <div className="space-y-2">
                                                <h3 className="text-2xl font-black text-white uppercase slant-1">Ghost Signal</h3>
                                                <p className="text-text-muted font-medium max-w-xs mx-auto">We couldn't find any games matching your request. Try adjusting your search term.</p>
                                            </div>
                                            <button
                                                onClick={() => setSearchTerm("")}
                                                className="text-xs font-black text-accent uppercase tracking-widest hover:underline pt-4"
                                            >
                                                Clear Search
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </section>

                    </div>
                </main>
            </div>
            <Footer />
        </div>
    );
};

export default BrowseGamesPage;
