import { useContext, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FaLock, FaUnlock, FaSteam, FaXbox, FaPlaystation, FaGamepad } from "react-icons/fa";
import { SiEpicgames } from "react-icons/si";
import apiClient from "../../utils/apiClient.js";

import AuthContext from "../../contexts/AuthContext";
import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/Footer";
import LoadingScreen from "../../components/LoadingScreen/LoadingScreen";
import BackButton from "../../components/BackButton/BackButton";

const bronzeIcon = "https://res.cloudinary.com/dvbmaonhc/image/upload/v1777400806/site_assets/bronze.webp";
const silverIcon = "https://res.cloudinary.com/dvbmaonhc/image/upload/v1777400819/site_assets/silver.webp";
const goldIcon = "https://res.cloudinary.com/dvbmaonhc/image/upload/v1777400810/site_assets/gold.webp";
const platinumIcon = "https://res.cloudinary.com/dvbmaonhc/image/upload/v1777400814/site_assets/plat.webp";

function getAchievementIcon(ach) {
  const iconSize = 45;

  switch (ach.type) {
    case "bronze":
      return <img src={bronzeIcon} alt="Bronze" width={iconSize + 5} height={iconSize + 20} />;
    case "silver":
      return <img src={silverIcon} alt="Silver" width={iconSize + 5} height={iconSize + 20} />;
    case "gold":
      return <img src={goldIcon} alt="Gold" width={iconSize + 5} height={iconSize + 20} />;
    case "platinum":
      return <img src={platinumIcon} alt="Platinum" width={iconSize + 5} height={iconSize + 20} />;
    default:
      break;
  }

  if (ach.unlocked) {
    return <FaUnlock color="#10b981" size={iconSize} />;
  } else {
    return <FaLock color="#ef4444" size={iconSize} />;
  }
}

const fetchOwnedGameDetails = async (platform, id) => {
  const res = await apiClient.post(`/users/ownedgames/${platform}/${id}`, {});
  return res.data.game;
};

function OwnedGamesDetails() {
  const [searchParams] = useSearchParams();
  const platformQuery = searchParams.get("platform");
  const id = searchParams.get("id");

  const { user } = useContext(AuthContext);
  const [selectedOwnerId, setSelectedOwnerId] = useState(null);

  const {
    data: game,
    isLoading
  } = useQuery({
    queryKey: ["ownedGame", platformQuery, id, user?.id],
    queryFn: () => fetchOwnedGameDetails(platformQuery, id),
    enabled: !!user && !!platformQuery && !!id,
    staleTime: 1000 * 60 * 5
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Set default selected owner when game data loads
  useEffect(() => {
    if (game?.owners?.length && !selectedOwnerId) {
      setSelectedOwnerId(game.owners[0].accountId);
    }
  }, [game, selectedOwnerId]);

  const selectedOwner = game?.owners?.find(o => o.accountId === selectedOwnerId) || game?.owners?.[0];

  function formatDate(dateUnlocked) {
    if (!dateUnlocked) return null;
    const date = new Date(dateUnlocked);
    if (!isNaN(date.getTime())) {
      return date.toLocaleString("en-GB", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit", hour12: true,
      });
    }
    return null;
  }

  function renderAchievements() {
    const list = selectedOwner?.achievements || [];

    if (!list.length) {
      return (
        <div className="col-span-full flex flex-col items-center justify-center py-12 text-text-muted">
          <span className="text-4xl mb-3">🏆</span>
          <p>No achievements available for this account.</p>
        </div>
      );
    }

    return list.map((ach, index) => {
      const isUnlocked = ach.unlocked || false;
      const dateUnlocked = ach.dateUnlocked;

      let formattedDate = "Locked";
      if (isUnlocked && dateUnlocked) {
        formattedDate = formatDate(dateUnlocked);
      }

      return (
        <div
          className={`group relative flex items-start gap-4 p-4 rounded-2xl transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl overflow-hidden ${isUnlocked
            ? 'bg-success/10 border border-success/30 shadow-success/10'
            : 'bg-red-950/40 border border-red-500/40 shadow-red-500/5'
            }`}
          key={index}
        >
          {/* Subtle Glow for unlocked */}
          {isUnlocked && (
            <div className="absolute inset-0 bg-gradient-to-br from-success/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          )}

          <div className="flex-shrink-0 relative z-10 filter drop-shadow-[0_0_8px_rgba(255,255,255,0.2)] group-hover:drop-shadow-[0_0_12px_rgba(255,255,255,0.4)] transition-all">
            {getAchievementIcon(ach)}
          </div>
          <div className="min-w-0 space-y-1 relative z-10">
            <h3 className={`font-black text-xs sm:text-sm uppercase tracking-tight truncate ${isUnlocked ? 'text-white' : 'text-red-50'}`}>
              {ach.title}
            </h3>
            <p className={`text-[10px] sm:text-[11px] leading-snug line-clamp-2 font-medium decoration-inherit ${isUnlocked ? 'text-text-primary' : 'text-red-100/90'}`}>
              {ach.description}
            </p>
            <div className="flex items-center gap-2 pt-1">
              <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${isUnlocked ? 'bg-success/20 text-success' : 'bg-red-600 text-white px-3'}`}>
                {isUnlocked ? 'Completed' : 'Locked'}
              </span>
              {isUnlocked && (
                <p className="text-[9px] text-text-muted font-bold">
                  {formattedDate}
                </p>
              )}
            </div>
          </div>
        </div>
      );
    });
  }

  if (isLoading) return <LoadingScreen />;

  if (!game) {
    return (
      <div className="page-container">
        <Header /><div className="flex-1 flex items-center justify-center"><p className="text-text-muted text-lg uppercase font-black tracking-widest">Game data unavailable</p></div><Footer />
      </div>
    );
  }

  const lastPlayed = selectedOwner?.lastPlayed
    ? formatDate(selectedOwner.lastPlayed)
    : "Game hasn't been played on this account";

  const storeLinks = {
    steam: [
      { label: "Steam App", href: `steam://store/${id}`, onClick: true },
      { label: "Steam Web", href: `https://store.steampowered.com/app/${id}` },
    ],
    psn: [{ label: "PSN Store", href: `https://store.playstation.com/en-us/search/${encodeURIComponent(game.gameName)}` }],
    xbox: [{ label: "Xbox Store", href: `https://www.microsoft.com/en-us/p/${encodeURIComponent(game.gameName)}` }],
    epic: [{ label: "Epic Store", href: `https://www.epicgames.com/store/en-US/browse?q=${encodeURIComponent(game.gameName)}` }],
  };

  const normalizedPlatform = platformQuery?.toLowerCase();

  return (
    <div className="page-container relative overflow-hidden bg-midnight-950">
      <Header />

      {/* Immersive Background Layer */}
      <div className="fixed inset-0 z-0 select-none pointer-events-none overflow-hidden">
        <img
          src={game.coverImage}
          className="w-full h-full object-cover scale-110 blur-[100px] opacity-[0.25]"
          alt=""
        />
        <div className="absolute inset-0 bg-gradient-to-b from-midnight-950/40 via-midnight-950/80 to-midnight-950" />
      </div>

      <main className="flex-1 relative z-10">
        <BackButton />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">

          {/* Hero Section */}
          <div className="relative group p-px rounded-[2.5rem] bg-gradient-to-br from-white/10 via-transparent to-transparent animate-in fade-in slide-in-from-top-4 duration-1000 overflow-hidden shadow-2xl shadow-black/60">
            <div className="absolute inset-0 bg-midnight-900/60 backdrop-blur-3xl rounded-[2.5rem]" />

            <div className="relative p-6 sm:p-10 flex flex-col md:flex-row gap-10">
              <div className="flex-shrink-0">
                <div className="relative overflow-hidden rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/5 group-hover:scale-[1.02] transition-transform duration-700">
                  <img src={game.coverImage} alt={game.gameName} className="w-full md:w-64 lg:w-80" />
                  <div className="absolute inset-0 bg-gradient-to-t from-midnight-900/40 to-transparent" />
                </div>
              </div>

              <div className="flex-1 flex flex-col justify-between py-2">
                <div className="space-y-8">
                  <div className="space-y-3">
                    <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-text-primary via-text-primary to-accent uppercase drop-shadow-sm leading-none">
                      {game.gameName}
                    </h1>
                    <div className="flex flex-wrap gap-3 pt-2">
                      {storeLinks[normalizedPlatform] && storeLinks[normalizedPlatform].map((link, i) => (
                        <a
                          key={i}
                          className="px-4 py-2 rounded-xl bg-accent/10 hover:bg-accent/20 border border-accent/20 text-accent text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 group/link"
                          href={link.onClick ? undefined : link.href} onClick={link.onClick ? () => (window.location.href = link.href) : undefined}
                          target={link.onClick ? undefined : "_blank"} rel="noopener noreferrer"
                        >
                          {link.label} <span className="group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform">↗</span>
                        </a>
                      ))}
                    </div>
                  </div>

                  {/* Account Switcher */}
                  <div className="space-y-5">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-accent">Active Syncs</span>
                      <div className="h-px flex-1 bg-gradient-to-r from-accent/30 to-transparent" />
                    </div>
                    <div className="flex flex-wrap gap-4">
                      {game.owners.map(owner => {
                        const platformIcons = {
                          steam: <FaSteam />,
                          epic: <SiEpicgames />,
                          xbox: <FaXbox />,
                          psn: <FaPlaystation />,
                          playstation: <FaPlaystation />,
                        };
                        const plt = owner.platform?.toLowerCase() || 'unknown';
                        const isActive = selectedOwnerId === owner.accountId;

                        return (
                          <button
                            key={`${owner.platform}-${owner.accountId}`}
                            onClick={() => setSelectedOwnerId(owner.accountId)}
                            className={`
                              group/btn relative flex items-center gap-4 p-2 pr-6 rounded-2xl transition-all duration-500 border
                              ${isActive
                                ? 'bg-accent/20 border-accent shadow-[0_0_20px_rgba(59,130,246,0.2)] text-white'
                                : 'bg-white/5 border-white/5 text-text-muted hover:bg-white/10 hover:text-text-primary hover:border-white/10'}
                            `}
                          >
                            <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-midnight-900 border border-white/10 shadow-lg">
                              {owner.avatar ? (
                                <img src={owner.avatar} className="w-full h-full object-cover transition-transform group-hover/btn:scale-110" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center font-black text-sm uppercase bg-accent/10">{owner.accountName?.charAt(0)}</div>
                              )}
                              <div className={`absolute -bottom-1 -right-1 p-1 bg-midnight-900 rounded-tl-lg border-l border-t border-white/10 ${isActive ? 'text-accent' : 'text-text-muted'}`}>
                                <div className="text-[10px]">
                                  {platformIcons[plt] || <FaGamepad />}
                                </div>
                              </div>
                            </div>
                            <div className="text-left">
                              <p className="text-[11px] font-black uppercase tracking-[0.1em]">{owner.accountName || owner.accountId}</p>
                              <p className={`text-[9px] font-bold ${isActive ? 'text-accent' : 'opacity-60'} uppercase tracking-widest`}>{owner.platform}</p>
                            </div>
                            {isActive && <div className="absolute inset-0 rounded-2xl ring-2 ring-accent ring-inset animate-pulse-glow pointer-events-none" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mt-12 pt-8 border-t border-white/5">
                  <div className="space-y-1.5 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                    <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.15em]">Main Platform</p>
                    <p className="font-black text-accent uppercase text-base tracking-tight">{platformQuery}</p>
                  </div>
                  <div className="space-y-1.5 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                    <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.15em]">Time Devoted</p>
                    <p className="font-black text-text-primary text-base tracking-tight">{selectedOwner?.hoursPlayed || "0h"}</p>
                  </div>
                  <div className="space-y-1.5 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 lg:col-span-2 transition-colors">
                    <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.15em]">Latest Activity</p>
                    <p className="font-black text-text-primary text-base tracking-tight truncate">{lastPlayed}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Achievements Section */}
          <div className="relative group p-px rounded-[2.5rem] bg-gradient-to-br from-white/5 via-transparent to-transparent overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-150">
            <div className="absolute inset-0 bg-midnight-900/40 backdrop-blur-2xl rounded-[2.5rem]" />

            <div className="relative p-6 sm:p-10">
              <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between mb-12 pb-6 border-b border-white/10 gap-6">
                <h2 className="text-2xl sm:text-3xl font-black text-text-primary uppercase tracking-tighter flex items-center gap-4">
                  <div className="p-3 bg-accent/20 rounded-2xl text-accent shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                    <FaGamepad size={20} />
                  </div>
                  Achievement Logs
                </h2>
                {selectedOwner && (
                  <div className="text-center sm:text-right flex flex-col items-center sm:items-end">
                    <p className="text-[10px] sm:text-[11px] font-black text-accent uppercase tracking-[0.3em] mb-1">Completion Index</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-text-primary tabular-nums">{(selectedOwner.achievements?.filter(a => a.unlocked).length || 0)}</span>
                      <span className="text-text-muted font-bold">/ {selectedOwner.achievements?.length || 0}</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {renderAchievements()}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default OwnedGamesDetails;
