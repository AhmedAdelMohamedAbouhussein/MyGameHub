import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { FaSteam, FaPlaystation, FaXbox, FaArrowRight, FaGamepad, FaInfoCircle } from "react-icons/fa";
import Header from "../../components/Header/Header.jsx";
import Footer from "../../components/Footer/Footer.jsx";
import AuthContext from "../../contexts/AuthContext.jsx";
import { useContext } from "react";
import apiClient from "../../utils/apiClient.js";
import LoadingScreen from "../../components/LoadingScreen/LoadingScreen.jsx";
import { optimizeImage } from "../../utils/imageUtils.js";

const fetchTopSellers = async () => {
  const response = await apiClient.get(`/games/landingpage`);
  return response.data;
};

function LandingPage() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const scrollRef = useRef(null);

  const {
    data: games = [],
    isLoading,
    isError,
    error
  } = useQuery({
    queryKey: ["landingGames"],
    queryFn: fetchTopSellers,
    staleTime: 1000 * 60 * 5,
    retry: 2
  });

  // Auto-scroll logic (never stops)
  useEffect(() => {
    const container = scrollRef.current;
    if (!container || games.length === 0) return;

    const scrollSpeed = 1;
    const interval = setInterval(() => {
      if (!container) return;

      if (container.scrollLeft + container.clientWidth >= container.scrollWidth - 1) {
        container.scrollLeft = 0;
      } else {
        container.scrollLeft += scrollSpeed;
      }
    }, 25);

    return () => clearInterval(interval);
  }, [games]);

  if (isLoading) return <LoadingScreen />;

  if (isError) {
    return (
      <div className="page-container bg-midnight-900">
        <Header />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="card-surface p-12 text-center max-w-md animate-in fade-in zoom-in duration-500">
            <div className="w-16 h-16 rounded-full bg-danger/10 flex items-center justify-center mx-auto mb-6 border border-danger/20">
              <FaInfoCircle className="text-danger text-2xl" />
            </div>
            <h2 className="text-xl font-bold text-text-primary mb-2">Connectivity Error</h2>
            <p className="text-text-secondary mb-6">
              {error?.message || "We couldn't reach the game servers. Please try again later."}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 bg-midnight-600 rounded-xl text-sm font-bold text-text-primary hover:bg-midnight-500 transition-all border border-midnight-500/30"
            >
              Reload Page
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Double the games array for a semi-infinite feel if the list is short
  const displayedGames = [...games, ...games];

  const formatTitle = (slug) => {
    try {
      // Decode URI components in case the slug contains encoded characters
      const decoded = decodeURIComponent(slug);
      return decoded
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ').split("/:").pop();
    } catch (e) {
      return slug.replace(/-/g, ' ');
    }
  };

  return (
    <div className="page-container bg-midnight-900 border-none">
      <Header />

      <main className="flex-1">

        {/* HERO SECTION - MODERN CAROUSEL */}
        <section className="relative pt-10 pb-20 overflow-hidden">
          {/* Ambient Glows */}
          <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-accent/10 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />

          <div className="max-w-[100vw] mx-auto overflow-hidden">
            {/* Header Hint */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8 flex items-center justify-between">
              <div>
                <h2 className="text-[10px] font-black tracking-[0.2em] text-accent uppercase mb-1">Trending Globally</h2>
                <p className="text-2xl font-black text-text-primary uppercase slant-1">Featured Collections</p>
              </div>
              <div className="hidden sm:flex gap-2 text-[10px] font-bold text-text-muted uppercase">
                <span>Scroll to Explore</span>
                <FaArrowRight className="animate-bounce-x" />
              </div>
            </div>

            {/* CAROUSEL CONTAINER */}
            <div
              ref={scrollRef}
              className="
                flex gap-4 sm:gap-6 md:gap-8
                overflow-x-auto overflow-y-hidden
                pb-12 pt-4 px-4 sm:px-8
                scrollbar-hide
                items-stretch
                cursor-grab active:cursor-grabbing
                no-scrollbar
              "
              style={{
                scrollbarWidth: "none",
                msOverflowStyle: "none",
                maskImage: "linear-gradient(to right, transparent, black 10%, black 90%, transparent)"
              }}
            >
              {displayedGames.map((game, index) => {
                const title = game.name;
                const src = game.background_image;
                const gameId = game.id;

                return (
                  <div
                    key={`${gameId}-${index}`}
                    onClick={() => navigate(`/games/${gameId}`)}
                    className="
                      group relative flex-shrink-0
                      w-[240px] sm:w-[280px] md:w-[320px] lg:w-[360px]
                      transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]
                      cursor-pointer
                      perspective-1000
                    "
                  >
                    {/* Shadow & Glow */}
                    <div
                      className="
                        absolute -inset-2 rounded-[2rem]
                        bg-gradient-to-br from-accent/20 via-transparent to-blue-500/10
                        opacity-0 group-hover:opacity-100
                        blur-xl transition-all duration-700
                        scale-95 group-hover:scale-105
                      "
                    />

                    {/* Main Card */}
                    <div
                      className="
                        relative h-full rounded-[1.8rem] overflow-hidden
                        border border-midnight-500/20
                        bg-midnight-800
                        transition-all duration-700
                        group-hover:border-accent/40
                        group-hover:-translate-y-4
                        group-hover:rotate-x-2
                        shadow-2xl shadow-black/40
                      "
                    >
                      {/* GAME IMAGE */}
                      <div className="h-[400px] sm:h-[550px] md:h-[550px] lg:h-[550px] w-full overflow-hidden relative">
                        <img
                          src={optimizeImage(src, 1280)}
                          alt={title}
                          className="
                            w-full h-full object-cover
                            transition-transform duration-1000 ease-out
                            group-hover:scale-110
                          "
                        />

                        {/* Overlay Gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t from-midnight-900 via-midnight-900/40 to-transparent opacity-90 transition-opacity duration-500 group-hover:opacity-100" />

                        {/* HOVER INFO (Glassmorphic) */}
                        <div className="absolute inset-0 p-6 flex flex-col justify-end translate-y-8 group-hover:translate-y-0 transition-all duration-500 opacity-0 group-hover:opacity-100">
                          <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-2 translate-y-4 group-hover:translate-y-0 transition-all delay-100 italic font-black">
                            <div className="flex items-center gap-2 mb-1">
                              <FaSteam className="text-white/60 hover:text-white transition-colors" />
                              <FaPlaystation className="text-white/60 hover:text-white transition-colors" />
                              <FaXbox className="text-white/60 hover:text-white transition-colors" />
                            </div>
                            <h3 className="text-lg sm:text-xl font-black text-white leading-tight uppercase tracking-tight line-clamp-2">
                              {title}
                            </h3>
                            <div className="flex items-center justify-between pt-2">
                              <span className="text-[10px] text-accent font-black uppercase tracking-widest">Global Top Seller</span>
                              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/20 border border-accent/40 text-[9px] font-black text-white uppercase">
                                Explore <FaArrowRight size={8} />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* WELCOME SECTION - SLICK & MINIMAL */}
        <section className="relative py-20 bg-midnight-800/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

              <div className="space-y-8 animate-in slide-in-from-left-4 duration-700">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-[10px] font-black text-accent uppercase tracking-widest">
                  <FaGamepad /> Level up your gaming
                </div>
                <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight text-text-primary uppercase leading-none">
                  Every game.<br />
                  <span className="text-transparent bg-gradient-to-r from-accent via-blue-400 to-indigo-400 bg-clip-text">One Unified Hub</span>
                </h1>
                <p className="text-lg text-text-secondary max-w-lg leading-relaxed font-medium">
                  Manage your library, discover deep deals, and grow your gaming circle across all platforms in our next-gen social ecosystem.
                </p>
                <div className="flex flex-wrap gap-4 pt-4">
                  {user ? (
                    <>
                      <button
                        onClick={() => navigate("/library")}
                        className="px-8 py-4 bg-accent text-white font-black uppercase tracking-widest rounded-2xl hover:bg-accent-hover active:scale-95 transition-all shadow-xl shadow-accent/20 flex items-center gap-3 group"
                      >
                        My Library <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
                      </button>
                      <button
                        onClick={() => navigate("/community")}
                        className="px-8 py-4 bg-indigo-500 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-indigo-400 active:scale-95 transition-all shadow-xl shadow-indigo-500/20"
                      >
                        Community Hub
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => navigate("/login")}
                      className="px-8 py-4 bg-accent text-white font-black uppercase tracking-widest rounded-2xl hover:bg-accent-hover active:scale-95 transition-all shadow-xl shadow-accent/20 flex items-center gap-3 group"
                    >
                      Login to GameHub <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
                    </button>
                  )}
                  <button
                    onClick={() => navigate("/games")}
                    className="px-8 py-4 bg-midnight-700/50 backdrop-blur-md border border-midnight-500/30 text-text-primary font-black uppercase tracking-widest rounded-2xl hover:bg-midnight-600 active:scale-95 transition-all"
                  >
                    Browse Games
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in slide-in-from-right-4 duration-700">
                {/* Library Feature */}
                <div
                  onClick={() => navigate("/library")}
                  className="group relative p-10 rounded-3xl bg-midnight-700/40 border border-midnight-500/20 hover:border-accent/40 transition-all duration-500 cursor-pointer overflow-hidden h-[280px] flex flex-col items-center justify-center text-center"
                >
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-accent/5 rounded-full blur-2xl group-hover:bg-accent/10 transition-all" />
                  <div className="w-20 h-20 rounded-3xl bg-midnight-800 flex items-center justify-center text-accent shadow-2xl text-4xl font-bold mb-6 group-hover:scale-110 group-hover:bg-accent group-hover:text-white transition-all">
                    📚
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white uppercase mb-2">My Library</h3>
                    <p className="text-xs text-text-muted font-medium max-w-[180px] mx-auto">Your collection, perfectly organized across all platforms.</p>
                  </div>
                </div>

                {/* Browse Feature */}
                <div
                  onClick={() => navigate("/games")}
                  className="group relative p-10 rounded-3xl bg-midnight-700/40 border border-midnight-500/20 hover:border-blue-400/40 transition-all duration-500 cursor-pointer overflow-hidden h-[280px] flex flex-col items-center justify-center text-center"
                >
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-400/5 rounded-full blur-2xl group-hover:bg-blue-400/10 transition-all" />
                  <div className="w-20 h-20 rounded-3xl bg-midnight-800 flex items-center justify-center text-blue-400 shadow-2xl text-4xl font-bold mb-6 group-hover:scale-110 group-hover:bg-blue-400 group-hover:text-white transition-all">
                    ⚡
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white uppercase mb-2">Deal Finder</h3>
                    <p className="text-xs text-text-muted font-medium max-w-[180px] mx-auto">Never pay full price again with global price tracking.</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}

export default LandingPage;