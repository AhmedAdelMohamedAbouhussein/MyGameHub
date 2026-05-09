import { useRef, useState, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import apiClient from "../../utils/apiClient.js";

const STORE_COLORS = {
    "Steam": "#4A9EFF",
    "Epic Games": "#A78BFA",
    "GOG": "#F59E0B",
    "Fanatical": "#F472B6",
    "Humble Store": "#34D399",
    "GreenManGaming": "#60A5FA",
};
const COLOR_FALLBACKS = ["#4A9EFF", "#A78BFA", "#F59E0B", "#F472B6", "#34D399", "#60A5FA", "#FB923C"];

function getStoreColor(store, idx) {
    if (!store) return COLOR_FALLBACKS[idx % COLOR_FALLBACKS.length];
    const s = store.toLowerCase();
    if (s.includes("steam")) return "#4A9EFF";
    if (s.includes("epic")) return "#A78BFA";
    if (s.includes("gog")) return "#F59E0B";
    if (s.includes("fanatical")) return "#F472B6";
    if (s.includes("humble")) return "#34D399";
    if (s.includes("greenman") || s.includes("gmg")) return "#f61010ff";
    return STORE_COLORS[store] || COLOR_FALLBACKS[idx % COLOR_FALLBACKS.length];
}

function formatDate(ms) {
    return new Date(ms).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function buildPath(points, minT, maxT, minP, maxP, W, H, PAD) {
    const w = W - PAD.left - PAD.right;
    const h = H - PAD.top - PAD.bottom;
    return points.map((p, i) => {
        const x = PAD.left + ((p.t - minT) / (maxT - minT || 1)) * w;
        const y = PAD.top + h - ((p.price - minP) / (maxP - minP || 1)) * h;
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
}

function buildArea(points, minT, maxT, minP, maxP, W, H, PAD) {
    const w = W - PAD.left - PAD.right;
    const h = H - PAD.top - PAD.bottom;
    const bottom = PAD.top + h;
    const pts = points.map(p => ({
        x: PAD.left + ((p.t - minT) / (maxT - minT || 1)) * w,
        y: PAD.top + h - ((p.price - minP) / (maxP - minP || 1)) * h
    }));
    if (pts.length === 0) return "";
    const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    return `${path} L${pts[pts.length - 1].x.toFixed(1)},${bottom} L${pts[0].x.toFixed(1)},${bottom} Z`;
}

export default function PriceHistoryChart({ itadId, gameName }) {
    const svgRef = useRef(null);
    const [tooltip, setTooltip] = useState(null);
    const [activeStores, setActiveStores] = useState(null); // null = all active

    const { data, isLoading, isError } = useQuery({
        queryKey: ["pricehistory", itadId],
        queryFn: async () => {
            const res = await apiClient.get(`/games/pricehistory/${itadId}`);
            return res.data;
        },
        enabled: !!itadId,
        staleTime: 1000 * 60 * 60 * 2,
    });

    useEffect(() => {
        if (data?.series && activeStores === null) {
            const all = Object.keys(data.series);
            const defaults = all.filter(s => {
                const lower = s.toLowerCase();
                return lower.includes('steam') || lower.includes('epic') || lower.includes('gog');
            });
            setActiveStores(defaults.length > 0 ? defaults : all.slice(0, 3));
        }
    }, [data, activeStores]);

    const W = 780, H = 280;
    const PAD = { top: 20, right: 20, bottom: 48, left: 54 };

    const handleMouseMove = useCallback((e) => {
        if (!data?.series || !svgRef.current) return;

        const stores = Object.keys(data.series);
        const globalPoints = stores.flatMap(s => (data.series[s] || []));
        if (globalPoints.length === 0) return;

        const visible = activeStores ?? stores;
        const allPoints = visible.flatMap(s => (data.series[s] || []).map(p => ({ ...p, store: s })));

        if (allPoints.length === 0) {
            setTooltip(null);
            return;
        }

        const rect = svgRef.current.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const scaleX = W / rect.width;
        const svgX = mx * scaleX;

        const minT = Math.min(...globalPoints.map(p => p.t));
        const maxT = Math.max(...globalPoints.map(p => p.t));
        const w = W - PAD.left - PAD.right;
        const h = H - PAD.top - PAD.bottom;

        const tAtX = minT + ((svgX - PAD.left) / w) * (maxT - minT);

        const my = e.clientY - rect.top;
        const svgY = my * scaleX; // Assuming uniform scaling or recalculate
        const scaleY = H / rect.height;
        const actualSvgY = my * scaleY;
        const minP = Math.floor(Math.min(...globalPoints.map(p => p.price)));
        const maxP = Math.ceil(Math.max(...globalPoints.map(p => p.price)));

        const priceAtY = minP + ((PAD.top + h - actualSvgY) / h) * (maxP - minP || 1);

        // Find closest point by 2D distance (normalized)
        let closest = null;
        let minDist = Infinity;
        for (const p of allPoints) {
            const dx = (p.t - tAtX) / (maxT - minT || 1);
            const dy = (p.price - priceAtY) / (maxP - minP || 1);
            // Weight X distance less so it snaps to nodes horizontally, but prefers the correct Y line
            const d = (dx * dx) * 0.5 + (dy * dy);
            if (d < minDist) { minDist = d; closest = p; }
        }
        if (!closest) return;

        const cx = PAD.left + ((closest.t - minT) / (maxT - minT || 1)) * w;
        const cy = PAD.top + h - ((closest.price - minP) / (maxP - minP || 1)) * h;

        setTooltip({ x: cx, y: cy, price: closest.price, store: closest.store, t: closest.t, regular: closest.regular });
    }, [data, activeStores]);

    if (!itadId) return null;

    if (isLoading) {
        return (
            <div className="bg-midnight-800/40 backdrop-blur-md rounded-3xl p-8 border border-white/5 flex items-center justify-center h-48">
                <div className="flex items-center gap-3 text-text-muted">
                    <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-bold uppercase tracking-widest">Loading price history…</span>
                </div>
            </div>
        );
    }

    if (isError || !data?.history?.length) {
        return (
            <div className="bg-midnight-800/40 backdrop-blur-md rounded-3xl p-8 border border-white/5 flex flex-col items-center justify-center gap-3 h-48">
                <span className="text-3xl">📉</span>
                <p className="text-text-muted text-xs font-bold uppercase tracking-widest">No price history available yet</p>
            </div>
        );
    }

    const stores = Object.keys(data.series);
    const globalPoints = stores.flatMap(s => (data.series[s] || []));
    if (globalPoints.length === 0) return null;

    const visible = activeStores ?? stores;
    const allPoints = visible.flatMap(s => (data.series[s] || []).map(p => ({ ...p, store: s })));

    const minT = Math.min(...globalPoints.map(p => p.t));
    const maxT = Math.max(...globalPoints.map(p => p.t));
    const minP = Math.floor(Math.min(...globalPoints.map(p => p.price)));
    const maxP = Math.ceil(Math.max(...globalPoints.map(p => p.price)));
    const w = W - PAD.left - PAD.right;
    const h = H - PAD.top - PAD.bottom;

    // Y grid lines
    const yTicks = 5;
    const yGridLines = Array.from({ length: yTicks }, (_, i) => {
        const val = minP + ((maxP - minP) / (yTicks - 1)) * i;
        const y = PAD.top + h - ((val - minP) / (maxP - minP || 1)) * h;
        return { val, y };
    });

    // X grid labels (sample ~5 dates)
    const xTicks = 5;
    const xLabels = Array.from({ length: xTicks }, (_, i) => {
        const t = minT + ((maxT - minT) / (xTicks - 1)) * i;
        const x = PAD.left + ((t - minT) / (maxT - minT || 1)) * w;
        return { t, x, label: formatDate(t) };
    });

    const toggleStore = (s) => {
        setActiveStores(prev => {
            const current = prev ?? stores;
            return current.includes(s) ? current.filter(x => x !== s) : [...current, s];
        });
    };

    return (
        <div className="bg-midnight-800/40 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-white/5 space-y-5">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                        <span className="text-accent">📊</span> Price History
                    </h3>
                    <p className="text-[10px] text-text-muted mt-1 font-bold uppercase tracking-wider">
                        Powered by IsThereAnyDeal
                    </p>
                </div>
                {/* Store Legend / Filter */}
                <div className="flex flex-wrap gap-2">
                    {stores.map((s, i) => {
                        const color = getStoreColor(s, i);
                        const isActive = (activeStores ?? stores).includes(s);
                        return (
                            <button
                                key={s}
                                onClick={() => toggleStore(s)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${isActive ? 'border-white/10 bg-midnight-700/60' : 'border-white/5 bg-midnight-900/40 opacity-40'}`}
                            >
                                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                                <span style={{ color: isActive ? color : '#666' }}>{s}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Chart */}
            <div className="relative w-full">
                <svg
                    ref={svgRef}
                    viewBox={`0 0 ${W} ${H}`}
                    className="w-full drop-shadow-xl"
                    style={{ minWidth: 300, height: 'auto', cursor: 'crosshair' }}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={() => setTooltip(null)}
                >
                    <defs>
                        {stores.map((s, i) => (
                            <linearGradient key={s} id={`area-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={getStoreColor(s, i)} stopOpacity="0.18" />
                                <stop offset="100%" stopColor={getStoreColor(s, i)} stopOpacity="0" />
                            </linearGradient>
                        ))}
                    </defs>

                    {/* Y grid */}
                    {yGridLines.map(({ val, y }, i) => (
                        <g key={i}>
                            <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y}
                                stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="4 4" />
                            <text x={PAD.left - 6} y={y + 4} textAnchor="end"
                                fill="rgba(255,255,255,0.35)" fontSize="9" fontWeight="700" fontFamily="monospace">
                                ${val.toFixed(0)}
                            </text>
                        </g>
                    ))}

                    {/* X labels */}
                    {xLabels.map(({ x, label }, i) => (
                        <text key={i} x={x} y={H - 6} textAnchor="middle"
                            fill="rgba(255,255,255,0.3)" fontSize="9" fontWeight="700">
                            {label}
                        </text>
                    ))}

                    {/* Area fills */}
                    {stores.map((s, i) => {
                        if (!(activeStores ?? stores).includes(s)) return null;
                        const pts = data.series[s] || [];
                        if (pts.length < 2) return null;
                        return (
                            <path key={`area-${s}`}
                                d={buildArea(pts, minT, maxT, minP, maxP, W, H, PAD)}
                                fill={`url(#area-grad-${i})`}
                            />
                        );
                    })}

                    {/* Lines */}
                    {stores.map((s, i) => {
                        if (!(activeStores ?? stores).includes(s)) return null;
                        const pts = data.series[s] || [];
                        if (pts.length < 2) return null;
                        const color = getStoreColor(s, i);
                        return (
                            <path key={`line-${s}`}
                                d={buildPath(pts, minT, maxT, minP, maxP, W, H, PAD)}
                                fill="none" stroke={color} strokeWidth="2"
                                strokeLinejoin="round" strokeLinecap="round"
                            />
                        );
                    })}

                    {/* Dots on tooltip */}
                    {tooltip && (
                        <>
                            <line x1={tooltip.x} y1={PAD.top} x2={tooltip.x} y2={PAD.top + h}
                                stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="3 3" />
                            <circle cx={tooltip.x} cy={tooltip.y} r="5"
                                fill={getStoreColor(tooltip.store, stores.indexOf(tooltip.store))}
                                stroke="white" strokeWidth="2" />
                        </>
                    )}
                </svg>

                {/* Tooltip */}
                {tooltip && (() => {
                    const svgRect = svgRef.current?.getBoundingClientRect();
                    const scaleX = svgRect ? svgRect.width / W : 1;
                    const scaleY = svgRect ? svgRect.height / H : 1;
                    const leftPx = tooltip.x * scaleX;
                    const topPx = tooltip.y * scaleY;
                    const flipX = leftPx > (svgRect?.width || W) * 0.65;

                    return (
                        <div
                            className="absolute pointer-events-none z-10 bg-midnight-900/95 border border-white/10 rounded-xl px-3 py-2.5 shadow-xl backdrop-blur-md"
                            style={{
                                left: flipX ? leftPx - 120 : leftPx + 12,
                                top: Math.max(0, topPx - 30),
                                minWidth: 110
                            }}
                        >
                            <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: getStoreColor(tooltip.store, stores.indexOf(tooltip.store)) }}>
                                {tooltip.store}
                            </p>
                            <p className="text-lg font-black" style={{ color: getStoreColor(tooltip.store, stores.indexOf(tooltip.store)) }}>
                                ${tooltip.price.toFixed(2)}
                            </p>
                            {tooltip.regular != null && (
                                <p className="text-[9px] text-text-muted">
                                    Regular: <span className="line-through text-text-muted">${tooltip.regular.toFixed(2)}</span>
                                </p>
                            )}
                            <p className="text-[9px] text-text-muted mt-0.5">{new Date(tooltip.t).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                        </div>
                    );
                })()}
            </div>
        </div>
    );
}
