import { useContext, useEffect, useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import apiClient from "../../utils/apiClient.js";
import { FaSyncAlt, FaBars, FaTrophy, FaClock, FaGamepad, FaSearch, FaFilter, FaSortAmountDown, FaSteam, FaXbox, FaPlaystation, FaExclamationTriangle, FaTimes } from "react-icons/fa";
import { SiEpicgames } from "react-icons/si";

import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/Footer";
import Aside from "../../components/Aside/Aside";
import Card from "../../components/Card/Card";
import LoadingScreen from "../../components/LoadingScreen/LoadingScreen";
import AuthContext from "../../contexts/AuthContext";
import Fuse from "fuse.js";

const fetchOwnedGames = async () => {
  const res = await apiClient.post(`/users/ownedgames`, {});
  return res.data.ownedGames;
};

const refreshOwnedGames = async () => {
  const res = await apiClient.post(`/refresh/refreshOwnedGames`, {});
  return res.data;
};

function LibraryPage() {
  const { user } = useContext(AuthContext);
  const [mobileAsideOpen, setMobileAsideOpen] = useState(false);
  const [reauthErrors, setReauthErrors] = useState([]); // platforms needing re-sync

  const [sortBy, setSortBy] = useState("progress");
  const [filterPlatform, setFilterPlatform] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: ownedGames,
    isLoading,
    refetch
  } = useQuery({
    queryKey: ["ownedGames"],
    queryFn: fetchOwnedGames,
    enabled: !!user,
    staleTime: 1000 * 60 * 5
  });

  const {
    mutate: refreshLibrary,
    isPending: refreshing
  } = useMutation({
    mutationFn: refreshOwnedGames,
    onSuccess: (data) => {
      // Surface any requiresReauth errors as persistent banners
      const authErrors = (data?.errors || []).filter(e => e.requiresReauth);
      if (authErrors.length > 0) {
        setReauthErrors(authErrors);
        toast.warning(`${authErrors.map(e => e.platform).join(' & ')} session${authErrors.length > 1 ? 's' : ''} expired — re-sync required.`);
      } else {
        toast.success("Library refreshed successfully!");
      }
      refetch();
    },
    onError: () => {
      toast.error("Failed to refresh library");
    }
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Compute Statistics
  const stats = useMemo(() => {
    if (!ownedGames) return { count: 0, hours: "0h", avgProgress: 0 };

    const allGamesOnAllPlatforms = Object.values(ownedGames).flatMap(platformGames => Object.values(platformGames));
    const count = allGamesOnAllPlatforms.length;

    let totalSecs = 0;
    let totalProgress = 0;

    allGamesOnAllPlatforms.forEach(g => {
      // Use maxProgress for average
      totalProgress += (g.maxProgress || 0);

      // Calculate total seconds across all owners
      (g.owners || []).forEach(owner => {
        if (owner.hoursPlayed) {
          const match = owner.hoursPlayed.match(/(\d+)h\s*(\d+)m\s*(\d+)s/);
          if (match) {
            const [, h, m, s] = match.map(Number);
            totalSecs += (h * 3600 + m * 60 + s);
          }
        }
      });
    });

    const hours = Math.floor(totalSecs / 3600);
    const avgProgress = count > 0 ? Math.round(totalProgress / count) : 0;

    return { count, hours: `${hours}h`, avgProgress };
  }, [ownedGames]);

  const filteredAndSortedGames = useMemo(() => {
    if (!ownedGames) return [];

    // 1. Flatten into per-platform records
    let baseGames = Object.entries(ownedGames || {}).flatMap(([platform, games]) =>
      Object.entries(games || {}).map(([gameId, game]) => ({
        ...game,
        platform,
        gameId
      }))
    );

    // 2. Unify cross-platform (e.g. Steam + PSN) if it's the same game
    // Note: We use gameName for now as a simple key.
    const unifiedMap = new Map();
    baseGames.forEach(g => {
      const key = g.gameName?.toLowerCase().trim() || "unknown";
      const ownersList = g.owners || [];

      if (unifiedMap.has(key)) {
        const existing = unifiedMap.get(key);
        // Merge owners and platforms
        existing.allOwners = [...existing.allOwners, ...ownersList.map(o => ({ ...o, platform: g.platform }))];
        existing.allPlatforms = Array.from(new Set([...existing.allPlatforms, g.platform]));
        existing.maxProgress = Math.max(existing.maxProgress, g.maxProgress || 0);
        // Sum hours (could be refined)
        existing.totalHoursNum += parseTime(g.totalHours);
      } else {
        unifiedMap.set(key, {
          ...g,
          allOwners: ownersList.map(o => ({ ...o, platform: g.platform })),
          allPlatforms: [g.platform],
          totalHoursNum: parseTime(g.totalHours || "0h 0m 0s")
        });
      }
    });

    let allGames = Array.from(unifiedMap.values());

    // 3. Filter
    if (filterPlatform !== "all") {
      allGames = allGames.filter(game => game.allPlatforms?.some(p => p?.toLowerCase() === filterPlatform.toLowerCase()));
    }

    if (searchQuery.trim() !== "") {
      const fuse = new Fuse(allGames, {
        keys: ["gameName"],
        threshold: 0.4,
      });
      const results = fuse.search(searchQuery);
      allGames = results.map(r => r.item);
    }

    function parseTime(str) {
      if (!str) return 0;
      const match = str.match(/(\d+)h\s*(\d+)m\s*(\d+)s/);
      if (!match) return 0;
      const [, h, m, s] = match.map(Number);
      return h * 3600 + m * 60 + s;
    }

    // 4. Sort
    if (sortBy === "progress") {
      allGames.sort((a, b) => b.maxProgress - a.maxProgress);
    }
    else if (sortBy === "alphabet") {
      allGames.sort((a, b) => a.gameName.localeCompare(b.gameName));
    }
    else if (sortBy === "hoursPlayed") {
      allGames.sort((a, b) => b.totalHoursNum - a.totalHoursNum);
    } else if (sortBy === "lastPlayed") {
      allGames.sort((a, b) => {
        // Use latest lastPlayed across all owners
        const dateA = a.allOwners.reduce((max, o) => {
          const d = o.lastPlayed ? new Date(o.lastPlayed) : new Date(0);
          return d > max ? d : max;
        }, new Date(0));
        const dateB = b.allOwners.reduce((max, o) => {
          const d = o.lastPlayed ? new Date(o.lastPlayed) : new Date(0);
          return d > max ? d : max;
        }, new Date(0));
        return dateB - dateA;
      });
    }

    return allGames;
  }, [ownedGames, filterPlatform, searchQuery, sortBy]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="page-container bg-midnight-900 border-none">
      <Header />
      <div className="flex-1 flex min-h-0">
        <Aside />
        <Aside isOpen={mobileAsideOpen} onClose={() => setMobileAsideOpen(false)} />

        <main className="flex-1 overflow-y-auto custom-scrollbar no-scrollbar">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">

            {/* 1. Header & Stats Section */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 animate-in fade-in slide-in-from-top-4 duration-700">
              <div className="space-y-2">
                <div className="flex items-center gap-3 text-accent mb-3">
                  <button
                    onClick={() => setMobileAsideOpen(true)}
                    className="lg:hidden p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-midnight-600 transition-colors"
                  >
                    <FaBars size={18} />
                  </button>
                  <div className="p-3 rounded-2xl bg-accent/10 border border-accent/20">
                    <FaGamepad size={24} />
                  </div>
                  <h1 className="text-4xl font-black tracking-tight text-text-primary uppercase slant-2">My Library</h1>
                </div>
                <p className="text-text-muted text-sm max-w-lg font-medium">
                  Your entire gaming legacy, unified across all platforms. View achievements, track progress, and organize your collection.
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-midnight-800/40 border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center text-center min-w-[100px] hover:border-accent/30 transition-all group">
                  <span className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-1 group-hover:text-accent">Games</span>
                  <span className="text-xl font-black text-text-primary">{stats.count}</span>
                </div>
                <div className="bg-midnight-800/40 border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center text-center min-w-[100px] hover:border-accent/30 transition-all group">
                  <span className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-1 group-hover:text-accent">Playtime</span>
                  <span className="text-xl font-black text-text-primary">{stats.hours}</span>
                </div>
                <div className="bg-midnight-800/40 border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center text-center min-w-[100px] hover:border-accent/30 transition-all group">
                  <span className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-1 group-hover:text-accent">Avg %</span>
                  <span className="text-xl font-black text-text-primary">{stats.avgProgress}%</span>
                </div>
              </div>
            </div>

            {/* Re-auth Alert Banners */}
            {reauthErrors.length > 0 && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-500">
                {reauthErrors.map((err) => {
                  const isPSN = err.platform === 'PSN';
                  return (
                    <div
                      key={err.platform}
                      className={`flex items-center justify-between gap-4 px-5 py-4 rounded-2xl border ${
                        isPSN
                          ? 'bg-blue-900/20 border-blue-500/30 text-blue-300'
                          : 'bg-green-900/20 border-green-500/30 text-green-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <FaExclamationTriangle className="shrink-0" size={16} />
                        <span className="text-sm font-bold">
                          Your {err.platform === 'PSN' ? 'PlayStation' : 'Xbox'} session has expired.
                        </span>
                        <Link
                          to={err.resyncUrl}
                          className={`text-sm font-black uppercase tracking-widest underline underline-offset-4 hover:opacity-80 transition-opacity`}
                        >
                          Re-sync {err.platform} →
                        </Link>
                      </div>
                      <button
                        onClick={() => setReauthErrors(prev => prev.filter(e => e.platform !== err.platform))}
                        className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
                        aria-label="Dismiss"
                      >
                        <FaTimes size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 2. Control Bar (Filters & Search) */}
            <div className="flex flex-col gap-6 bg-midnight-800/30 p-4 rounded-[2.5rem] border border-white/5 animate-in fade-in duration-700 delay-100">

              {/* Platform Selector (Pills) */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2 px-1 border-b border-white/5 pb-4">
                {[
                  { key: "all", label: "All Games", icon: FaGamepad, color: "from-accent to-accent-glow" },
                  { key: "steam", label: "Steam", icon: FaSteam, color: "from-slate-700 to-slate-900" },
                  { key: "xbox", label: "Xbox", icon: FaXbox, color: "from-green-600 to-emerald-800" },
                  { key: "psn", label: "PlayStation", icon: FaPlaystation, color: "from-blue-600 to-blue-800" },
                  { key: "epic", label: "Epic", icon: SiEpicgames, color: "from-gray-800 to-black" },
                ].map((platform) => {
                  const Icon = platform.icon;
                  const active = filterPlatform === platform.key;
                  return (
                    <button
                      key={platform.key}
                      onClick={() => setFilterPlatform(platform.key)}
                      className={`
                        flex items-center gap-2.5 px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap
                        ${active
                          ? `bg-gradient-to-br ${platform.color} text-white shadow-lg shadow-black/20 scale-105`
                          : 'bg-midnight-800/50 text-text-muted hover:text-text-primary hover:bg-midnight-700'
                        }
                      `}
                    >
                      <Icon size={14} />
                      {platform.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                  <FaSearch className="absolute left-6 top-1/2 -translate-y-1/2 text-text-muted text-sm" />
                  <input
                    type="text"
                    placeholder="Search your library..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-14 bg-midnight-800/80 rounded-[1.6rem] pl-14 pr-6 text-sm font-bold text-text-primary placeholder:text-text-muted border border-transparent focus:border-accent/40 focus:ring-4 focus:ring-accent/10 outline-none transition-all"
                  />
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                  <div className="relative group flex-1 md:flex-none">
                    <FaSortAmountDown className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full md:w-auto h-12 pl-10 pr-10 bg-midnight-800/80 rounded-2xl text-[11px] font-black uppercase tracking-widest text-text-secondary border border-transparent hover:border-white/10 outline-none cursor-pointer appearance-none transition-all"
                    >
                      <option value="progress">Sort: Progress</option>
                      <option value="hoursPlayed">Sort: Playtime</option>
                      <option value="alphabet">Sort: Alphabet</option>
                      <option value="lastPlayed">Sort: Recent</option>
                    </select>
                  </div>

                  <button
                    onClick={() => refreshLibrary()}
                    disabled={refreshing}
                    className="h-12 w-12 flex items-center justify-center rounded-2xl bg-accent text-white shadow-lg shadow-accent/20 hover:bg-accent-hover active:scale-95 transition-all disabled:opacity-50"
                  >
                    <FaSyncAlt className={refreshing ? "animate-spin" : ""} />
                  </button>
                </div>
              </div>
            </div>

            {/* 3. Game Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 sm:gap-8 pb-20">
              {filteredAndSortedGames.length > 0 ? (
                filteredAndSortedGames.map((game, index) => (
                  <div
                    key={`${game.platform}-${game.gameId}`}
                    className="animate-in fade-in slide-in-from-bottom-4 duration-700"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <Card
                      id={game.gameId}
                      platform={game.platform}
                      platforms={game.allPlatforms}
                      owners={game.allOwners}
                      image={game.coverImage}
                      title={game.gameName}
                      progress={game.maxProgress}
                      totalHoursNum={game.totalHoursNum}
                    />
                  </div>
                ))
              ) : (
                <div className="col-span-full py-24 flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in zoom-in duration-500">
                  <div className="relative">
                    <div className="absolute inset-0 bg-accent/20 blur-3xl rounded-full" />
                    <div className="relative w-28 h-28 rounded-3xl bg-midnight-800/80 backdrop-blur-xl border border-white/10 flex items-center justify-center text-5xl shadow-2xl">
                      👾
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black text-text-primary uppercase tracking-tight">Library Empty</h3>
                    <p className="text-base text-text-muted font-medium max-w-sm mx-auto">
                      Your collection is waiting to be built. Sync your accounts or adjust your filters to see games here.
                    </p>
                  </div>
                  <div className="flex items-center gap-4 pt-4">
                    <button
                      onClick={() => { setSearchQuery(""); setFilterPlatform("all"); }}
                      className="px-6 py-3 rounded-2xl bg-midnight-800 hover:bg-midnight-700 text-xs font-black text-white uppercase tracking-widest transition-all border border-white/5 hover:border-white/10"
                    >
                      Clear Filters
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}

export default LibraryPage;
