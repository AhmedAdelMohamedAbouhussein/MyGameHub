import PropTypes from "prop-types";
import { useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from "react";
import ProgressCircle from "../ProgressCircle/ProgressCircle";
import { FaSteam, FaXbox, FaPlaystation, FaGamepad } from "react-icons/fa";
import { SiEpicgames } from "react-icons/si";

function Card(props) {
    const id = props.id;
    const platforms = props.platforms || [props.platform];
    const owners = props.owners || [];
    const title = props.title;
    const image = props.image?.trim() !== "" && props.image?.trim() !== null
        ? props.image : "https://static.vecteezy.com/system/resources/previews/008/255/804/non_2x/page-not-found-error-404-system-updates-uploading-computing-operation-installation-programs-system-maintenance-gross-sprayed-page-not-found-error-404-isolated-on-white-background-vector.jpg";
    const progress = props.progress || 0;
    const totalHoursNum = props.totalHoursNum || 0;

    const navigate = useNavigate();
    const cardRef = useRef(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setIsVisible(true);
                        observer.disconnect();
                    }
                });
            },
            { threshold: 0.1 }
        );

        if (cardRef.current) {
            observer.observe(cardRef.current);
        }

        return () => {
            if (cardRef.current) observer.unobserve(cardRef.current);
        };
    }, []);

    const platformIcon = {
        steam: <FaSteam />,
        epic: <SiEpicgames />,
        xbox: <FaXbox />,
        psn: <FaPlaystation />,
        playstation: <FaPlaystation />,
    };

    const formatHours = (seconds) => {
        const h = Math.floor(seconds / 3600);
        return `${h}h`;
    };

    // Use the first platform for the primary click-through (legacy support)
    const primaryPlatform = platforms[0]?.toLowerCase() || 'unknown';

    return (
        <div
            ref={cardRef}
            className={`
                group relative h-full flex flex-col bg-midnight-700/40 backdrop-blur-sm rounded-2xl border border-midnight-500/20 overflow-hidden cursor-pointer
                transition-all duration-500 ease-out
                hover:-translate-y-2 hover:bg-midnight-700/60
                hover:shadow-[0_10px_30px_-10px_rgba(59,130,246,0.3)] hover:border-accent/50
                shadow-xl shadow-black/20
            `}
            onClick={() => navigate(`/ownedgamedetails?platform=${primaryPlatform}&id=${id}`)}
        >
            {isVisible ? (
                <>
                    {/* Landscape Image Container */}
                    <div className="relative aspect-video overflow-hidden flex-shrink-0">
                        <img
                            src={image}
                            alt={title + " cover"}
                            loading="lazy"
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />

                        {/* Overlay Gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t from-midnight-900/90 via-midnight-900/20 to-transparent opacity-60 group-hover:opacity-100 transition-opacity" />

                        {/* Top Left Badge (Platforms) */}
                        <div className="absolute top-3 left-3 flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-midnight-900/80 backdrop-blur-md border border-white/10 text-white shadow-lg">
                            <div className="flex -space-x-1.5">
                                {platforms.map((p, i) => (
                                    <span key={i} className="text-accent bg-midnight-900 rounded-full p-0.5 border border-white/5 ring-2 ring-midnight-900/50" title={p}>
                                        {platformIcon[p.toLowerCase()] || <FaGamepad size={10} />}
                                    </span>
                                ))}
                            </div>
                            {owners.length > 1 && (
                                <span className="text-[8px] font-black uppercase tracking-tighter ml-1 text-white/60">
                                    {owners.length} Accounts
                                </span>
                            )}
                        </div>

                        {/* Progress overlay on hover */}
                        <div className="absolute inset-0 flex items-center justify-center bg-midnight-900/30 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-500">
                            <div className="scale-75 group-hover:scale-90 transition-transform duration-500">
                                <ProgressCircle progress={progress} />
                            </div>
                        </div>
                    </div>

                    {/* Content Section */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                        <div className="space-y-3">
                            <h3 className="text-sm font-black text-text-primary uppercase tracking-tight line-clamp-2 group-hover:text-accent transition-colors leading-snug">
                                {title}
                            </h3>

                            <div className="space-y-2">
                                {/* Mini Progress Bar */}
                                <div className="h-1 w-full bg-midnight-600/50 rounded-full overflow-hidden text-accent">
                                    <div
                                        className="h-full bg-current transition-all duration-1000 ease-out"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>

                                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-text-muted">
                                    <span>{progress}% Mastery</span>
                                    {totalHoursNum > 0 && <span className="text-text-secondary">{formatHours(totalHoursNum)}</span>}
                                </div>
                            </div>
                        </div>

                        {/* Unified Ownership Badge */}
                        <div className="pt-2 border-t border-white/5 flex items-center gap-2 overflow-x-auto no-scrollbar">
                            {owners.slice(0, 3).map((owner, i) => (
                                <div key={i} className="flex-shrink-0 w-5 h-5 rounded-md bg-midnight-800 border border-white/5 flex items-center justify-center overflow-hidden" title={owner.accountName}>
                                    {owner.avatar ? <img src={owner.avatar} className="w-full h-full object-cover" /> : <div className="text-[7px] font-black">{owner.accountName?.charAt(0)}</div>}
                                </div>
                            ))}
                            {owners.length > 3 && <span className="text-[8px] text-text-muted font-black">+{owners.length - 3}</span>}
                        </div>
                    </div>
                </>
            ) : (
                <div className="aspect-video flex items-center justify-center bg-midnight-800 animate-pulse h-full">
                    <div className="w-8 h-8 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
                </div>
            )}
        </div>
    );
}

Card.propTypes = {
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    image: PropTypes.string,
    platform: PropTypes.string,
    platforms: PropTypes.array,
    owners: PropTypes.array,
    progress: PropTypes.number,
    totalHoursNum: PropTypes.number
};

export default Card;