import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useContext, useState, useRef, useEffect } from "react";
import AuthContext from "../../contexts/AuthContext.jsx";
import { toast } from "sonner";
import apiClient from "../../utils/apiClient.js";
import { FaHeart, FaChevronDown, FaCheck, FaSpinner } from "react-icons/fa";

const WishlistButton = ({ gameId, gameName, itadId, variant = "large", initialStores = null }) => {
    const { user } = useContext(AuthContext);
    const queryClient = useQueryClient();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [selectedStores, setSelectedStores] = useState([]);
    const menuRef = useRef(null);

    // Fetch wishlist status for this game
    const { data: statusData } = useQuery({
        queryKey: ["wishlistStatus", gameId],
        queryFn: async () => {
            const res = await apiClient.get(`/users/wishlist/status/${gameId}`);
            return res.data;
        },
        enabled: !!user
    });

    // Fetch available stores for this game (skipped if initialStores is provided)
    const { data: storesData, isLoading: isLoadingStores } = useQuery({
        queryKey: ["gameStores", itadId],
        queryFn: async () => {
            if (initialStores) return initialStores;
            const res = await apiClient.get(`/games/stores/${itadId}`);
            return res.data.stores || [];
        },
        enabled: isMenuOpen && !!itadId,
        initialData: initialStores
    });

    useEffect(() => {
        if (statusData?.targetStores) {
            setSelectedStores(statusData.targetStores);
        }
    }, [statusData]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleMutation = useMutation({
        mutationFn: ({ action = "update", targetStores = selectedStores } = {}) => {
            return apiClient.post("/users/wishlist/toggle", {
                gameId,
                gameName,
                targetStores,
                itadId,
                action
            });
        },
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: ["wishlistStatus", gameId] });
            queryClient.invalidateQueries({ queryKey: ["wishlist"] });
            toast.success(res.data.message);
            setIsMenuOpen(false);
        },
        onError: (err) => {
            toast.error("Failed to update wishlist");
        }
    });

    const handleMainAction = (e) => {
        if (e) e.stopPropagation();
        if (!user) {
            toast.error("Authentication required. Please log in to manage your wishlist.");
            return;
        }
        setIsMenuOpen(!isMenuOpen);
    };

    const inWishlist = statusData?.inWishlist;

    const toggleStore = (store) => {
        if (store === "All") {
            setSelectedStores([]);
        } else {
            setSelectedStores(prev =>
                prev.includes(store) ? prev.filter(s => s !== store) : [...prev, store]
            );
        }
    };

    const renderDropdown = () => {
        if (!isMenuOpen) return null;

        return (
            <div
                className={`
                    absolute z-[100] mt-3 w-72 p-4 bg-midnight-800/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-top-2 duration-300
                    ${variant === "icon" ? "right-0" : "left-0"}
                    max-sm:fixed max-sm:bottom-6 max-sm:left-4 max-sm:right-4 max-sm:w-auto max-sm:top-auto max-sm:mt-0
                `}
            >
                <div className="flex items-center justify-between mb-4">
                    <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Track Specific Stores</p>
                    {isLoadingStores && <FaSpinner className="animate-spin text-accent" size={10} />}
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                    {/* All Option */}
                    <div
                        onClick={() => toggleStore("All")}
                        className={`
                            flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all
                            ${selectedStores.length === 0 ? "bg-accent/10 text-accent" : "hover:bg-white/5 text-text-secondary"}
                        `}
                    >
                        <span className="text-xs font-bold">All Stores</span>
                        {selectedStores.length === 0 && <FaCheck size={10} />}
                    </div>

                    {/* Dynamic Stores */}
                    {storesData?.map(store => (
                        <div
                            key={store}
                            onClick={() => toggleStore(store)}
                            className={`
                                flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all
                                ${selectedStores.includes(store) ? "bg-accent/10 text-accent" : "hover:bg-white/5 text-text-secondary"}
                            `}
                        >
                            <span className="text-xs font-bold">{store}</span>
                            {selectedStores.includes(store) && <FaCheck size={10} />}
                        </div>
                    ))}

                    {!isLoadingStores && storesData?.length === 0 && (
                        <p className="text-[10px] text-text-muted text-center py-4">No specific stores found.</p>
                    )}
                </div>

                <div className="mt-4 pt-4 border-t border-white/5">
                    <p className="text-[9px] text-text-muted italic mb-3">
                        {selectedStores.length === 0 ? "Tracking all available stores." : `Tracking ${selectedStores.length} specific store(s).`}
                    </p>
                    <button
                        onClick={() => {
                            // When "All Stores" is selected (empty array), send every available store name
                            const effectiveTargetStores = selectedStores.length === 0
                                ? (storesData || [])
                                : selectedStores;
                            toggleMutation.mutate({ action: "update", targetStores: effectiveTargetStores });
                        }}
                        disabled={toggleMutation.isPending}
                        className="w-full py-2.5 bg-accent text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-accent-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {toggleMutation.isPending ? <FaSpinner className="animate-spin" /> : (inWishlist ? "Update Preferences" : "Add to Wishlist")}
                    </button>

                    {inWishlist && (
                        <button
                            onClick={() => toggleMutation.mutate({ action: "remove" })}
                            disabled={toggleMutation.isPending}
                            className="w-full mt-2 py-2.5 bg-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-500 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {toggleMutation.isPending ? <FaSpinner className="animate-spin" /> : "Remove from Wishlist"}
                        </button>
                    )}
                </div>
            </div>
        );
    };

    if (variant === "icon") {
        return (
            <div className="relative inline-block" ref={menuRef}>
                <button
                    onClick={handleMainAction}
                    disabled={toggleMutation.isPending}
                    className={`
                        p-2.5 rounded-xl backdrop-blur-md border transition-all active:scale-90 group
                        ${inWishlist
                            ? "bg-red-500/20 border-red-500/30 text-red-500"
                            : "bg-midnight-900/60 border-white/10 text-white/40 hover:text-white hover:border-white/20"}
                        ${isMenuOpen ? "border-accent/50 ring-2 ring-accent/20" : ""}
                    `}
                    title={inWishlist ? "Wishlist Options" : "Add to Wishlist"}
                >
                    <FaHeart className={`${inWishlist ? "fill-red-500" : ""} transition-colors`} size={14} />
                </button>
                {renderDropdown()}
            </div>
        );
    }

    return (
        <div className="relative inline-block" ref={menuRef}>
            <div className="flex items-center">
                <button
                    onClick={handleMainAction}
                    disabled={toggleMutation.isPending}
                    className={`
                        inline-flex px-8 py-4 sm:px-10 sm:py-5 font-black uppercase tracking-[0.2em] text-[10px] sm:text-xs rounded-l-2xl transition-all active:scale-95 items-center justify-center gap-4 group
                        ${inWishlist
                            ? "bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20"
                            : "bg-midnight-800/80 backdrop-blur-md border border-white/5 text-white hover:border-white/20"}
                    `}
                >
                    <FaHeart className={`${inWishlist ? "fill-red-500" : "text-white/40 group-hover:text-white"} transition-colors`} />
                    {inWishlist ? "Target Acquired" : "Add to Wishlist"}
                </button>

                <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className={`
                        px-4 py-4 sm:py-5 border-l border-white/5 rounded-r-2xl transition-all active:scale-95 flex items-center justify-center
                        ${inWishlist
                            ? "bg-red-500/10 border-y border-r border-red-500/20 text-red-500"
                            : "bg-midnight-800/80 backdrop-blur-md border-y border-r border-white/5 text-white"}
                    `}
                >
                    <FaChevronDown size={10} className={`transition-transform duration-300 ${isMenuOpen ? "rotate-180" : ""}`} />
                </button>
            </div>

            {renderDropdown()}
        </div>
    );
};

export default WishlistButton;
