import { useContext, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { 
    FaUserPlus, FaUserCheck, FaUserTimes, FaUserMinus, 
    FaArrowLeft, FaCopy, FaEye, FaSearch, FaGhost 
} from "react-icons/fa";
import apiClient from "../../utils/apiClient.js";

import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/Footer";
import AuthContext from "../../contexts/AuthContext";
import LoadingScreen from "../../components/LoadingScreen/LoadingScreen";

function ManageFriendsPage() {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [activeTab, setActiveTab] = useState("add");
    const [recieverid, setrecieverid] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    const {
        data: friends,
        isLoading,
        isError
    } = useQuery({
        queryKey: ["friends", user?.publicID],
        queryFn: () => fetchFriends(),
        enabled: !!user?.publicID,
        staleTime: 1000 * 60 * 5
    });

    const fetchFriends = async () => {
        const res = await apiClient.post(`/users/friendlist`, {
            publicID: user.publicID,
        });

        const allFriends = { ...res.data.friends };

        const userFriendRecords = allFriends.User || [];
        if (userFriendRecords.length > 0) {
            try {
                const publicIDs = userFriendRecords.map(f => f.user);
                const response = await apiClient.post(`/users/batch`, { publicIDs });
                const userProfiles = response.data.users || [];
                
                allFriends.User = userFriendRecords.map(friend => {
                    const profile = userProfiles.find(p => p.publicID === friend.user);
                    return profile ? { ...friend, ...profile } : friend;
                });
            } catch (e) {
                console.error("Batch fetch failed:", e);
            }
        }
        return allFriends;
    };

    const allFriendsList = friends
        ? Object.values(friends).flat().filter(f => f.source === "User")
        : [];

    const invalidateFriends = () => {
        queryClient.invalidateQueries({ queryKey: ["friends"] });
    };

    const sendRequestMutation = useMutation({
        mutationFn: (id) =>
            apiClient.post(`/friends/add/${encodeURIComponent(id)}`),
        onSuccess: (res) => {
            toast.success(res.data.message || "Request sent!");
            setrecieverid(""); // Clear input
            invalidateFriends();
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || "Something went wrong.");
        }
    });

    const acceptMutation = useMutation({
        mutationFn: (id) =>
            apiClient.post(`/friends/accept/${encodeURIComponent(id)}`),
        onSuccess: (res) => {
            toast.success(res.data.message || "Request accepted!");
            invalidateFriends();
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || "Failed to accept request.");
        }
    });

    const rejectMutation = useMutation({
        mutationFn: (id) =>
            apiClient.post(`/friends/reject/${encodeURIComponent(id)}`),
        onSuccess: (res) => {
            toast.success(res.data.message || "Request rejected!");
            invalidateFriends();
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || "Failed to reject request.");
        }
    });

    const removeMutation = useMutation({
        mutationFn: (id) =>
            apiClient.post(`/friends/remove/${encodeURIComponent(id)}`),
        onSuccess: (res) => {
            toast.success(res.data.message || "Friend removed!");
            invalidateFriends();
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || "Failed to remove friend.");
        }
    });

    if (isLoading) return <LoadingScreen />;

    if (isError) {
        return (
            <div className="page-container">
                <Header />
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                    <FaGhost size={48} className="text-text-muted mb-4 opacity-50" />
                    <p className="text-danger font-semibold">Failed to load friends.</p>
                    <button onClick={() => invalidateFriends()} className="mt-4 text-accent hover:underline">Try Again</button>
                </div>
                <Footer />
            </div>
        );
    }

    const copyPublicID = () => {
        navigator.clipboard.writeText(user.publicID);
        toast.success("PublicID copied to clipboard!");
    };

    const filteredFriends = allFriendsList.filter(f => 
        (f.displayName || f.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (f.publicID || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderEmptyState = (message) => (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-in fade-in zoom-in duration-500">
            <div className="w-16 h-16 rounded-3xl bg-midnight-600/50 flex items-center justify-center mb-4 border border-midnight-500/30">
                <FaGhost size={32} className="text-text-muted opacity-20" />
            </div>
            <p className="text-text-muted font-medium mb-1">{message}</p>
            <p className="text-xs text-text-muted/60">Try checking another tab or adding a new friend.</p>
        </div>
    );

    const renderFriendItem = (friend, buttons) => (
        <div 
            key={friend.user} 
            className="group flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-midnight-700/60 backdrop-blur-sm border border-midnight-500/20 hover:border-accent/30 hover:bg-midnight-700/80 transition-all duration-300"
        >
            <div className="relative">
                <img
                    src={friend.avatar || friend.profilePicture || "https://res.cloudinary.com/dvbmaonhc/image/upload/v1777487049/avatars/no_user.png"}
                    alt={friend.displayName}
                    className="w-14 h-14 rounded-2xl object-cover ring-2 ring-midnight-600 group-hover:ring-accent/40 shadow-xl transition-all"
                />
                {friend.status === "accepted" && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-midnight-700 rounded-full" />
                )}
            </div>

            <div className="flex-1 text-center sm:text-left min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                    <p className="text-base font-bold text-text-primary truncate">
                        {friend.displayName || friend.name || "Unknown"}
                    </p>
                    {friend.status === "pending" && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-accent/20 text-accent border border-accent/30 w-fit mx-auto sm:mx-0">
                            {friend.requestedByMe ? "Sent" : "Received"}
                        </span>
                    )}
                </div>
                <div className="flex items-center justify-center sm:justify-start gap-2 text-xs text-text-muted">
                    <span className="truncate">@{friend.publicID}</span>
                    <button 
                        onClick={() => {
                            navigator.clipboard.writeText(friend.publicID);
                            toast.success("Friend's PublicID copied!");
                        }}
                        className="hover:text-accent transition-colors"
                    >
                        <FaCopy size={10} />
                    </button>
                    <Link to={`/friends/viewprofile/${encodeURIComponent(friend.publicID)}`} className="hover:text-accent transition-colors">
                        <FaEye size={12} />
                    </Link>
                </div>
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
                {buttons}
            </div>
        </div>
    );

    const tabs = [
        { key: "add", label: "Add Friend", icon: <FaUserPlus /> },
        { key: "received", label: "Received", icon: <FaUserCheck />, count: allFriendsList.filter(f => f.status === "pending" && !f.requestedByMe).length },
        { key: "sent", label: "Sent", icon: <FaSearch />, count: allFriendsList.filter(f => f.status === "pending" && f.requestedByMe).length },
        { key: "remove", label: "Friend List", icon: <FaUserMinus /> },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case "add":
                return (
                    <div className="space-y-6 py-2 animate-in slide-in-from-bottom-2 duration-400">
                        <div className="p-5 rounded-2xl bg-accent/5 border border-accent/20 space-y-3">
                            <h3 className="text-sm font-bold text-accent uppercase tracking-widest flex items-center gap-2">
                                <FaUserPlus /> Step 1: Find Public ID
                            </h3>
                            <p className="text-sm text-text-secondary leading-relaxed">
                                Search for your friends using their unique Public ID (e.g., User#1234).
                            </p>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <div className="relative flex-1">
                                    <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                                    <input
                                        type="text"
                                        placeholder="Enter Friend's Public ID"
                                        value={recieverid}
                                        className="input-field pl-11 h-12"
                                        onChange={(e) => setrecieverid(e.target.value)}
                                    />
                                </div>
                                <button
                                    className="btn-primary h-12 px-8 flex items-center justify-center gap-2 whitespace-nowrap shadow-lg shadow-accent/20"
                                    onClick={() => sendRequestMutation.mutate(recieverid)}
                                    disabled={sendRequestMutation.isPending}
                                >
                                    {sendRequestMutation.isPending ? "Sending..." : "Send Request"}
                                </button>
                            </div>
                        </div>

                        <div className="p-5 rounded-2xl bg-midnight-600/30 border border-midnight-500/20 space-y-3">
                            <h3 className="text-sm font-bold text-text-muted uppercase tracking-widest">
                                Tip: Sharing ID
                            </h3>
                            <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-midnight-900/50 border border-midnight-500/10">
                                <div>
                                    <p className="text-[10px] text-text-muted uppercase font-black">Your Public ID</p>
                                    <p className="text-base font-mono font-bold text-text-primary">{user.publicID}</p>
                                </div>
                                <button 
                                    onClick={copyPublicID}
                                    className="p-3 rounded-xl bg-midnight-600 hover:bg-accent hover:text-white text-text-secondary transition-all"
                                >
                                    <FaCopy />
                                </button>
                            </div>
                        </div>
                    </div>
                );

            case "sent":
                const sentRequests = filteredFriends.filter(f => f.status === "pending" && f.requestedByMe);
                return (
                    <div className="space-y-3 py-2 animate-in fade-in duration-300">
                        {sentRequests.length > 0 && (
                            <div className="relative mb-4">
                                <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted text-xs" />
                                <input 
                                    type="text" 
                                    placeholder="Search sent requests..." 
                                    className="w-full bg-midnight-900/50 border border-midnight-500/20 rounded-xl py-2 pl-10 pr-4 text-xs focus:ring-1 focus:ring-accent outline-none"
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        )}
                        {sentRequests.length > 0 ? (
                            sentRequests.map(friend =>
                                renderFriendItem(
                                    friend,
                                    <button 
                                        className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-danger/10 text-danger hover:bg-danger hover:text-white transition-all text-xs font-bold" 
                                        onClick={() => rejectMutation.mutate(friend.user)}
                                    >
                                        Cancel
                                    </button>
                                )
                            )
                        ) : renderEmptyState("No pending requests sent")}
                    </div>
                );

            case "received":
                const pendingRequests = filteredFriends.filter(f => f.status === "pending" && !f.requestedByMe);
                return (
                    <div className="space-y-3 py-2 animate-in fade-in duration-300">
                        {pendingRequests.length > 0 && (
                            <div className="relative mb-4">
                                <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted text-xs" />
                                <input 
                                    type="text" 
                                    placeholder="Search incoming requests..." 
                                    className="w-full bg-midnight-900/50 border border-midnight-500/20 rounded-xl py-2 pl-10 pr-4 text-xs focus:ring-1 focus:ring-accent outline-none"
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        )}
                        {pendingRequests.length > 0 ? (
                            pendingRequests.map(friend =>
                                renderFriendItem(
                                    friend,
                                    <>
                                        <button 
                                            className="flex-1 px-4 py-2 rounded-xl bg-accent text-white hover:bg-accent-hover transition-all text-xs font-bold shadow-lg shadow-accent/20" 
                                            onClick={() => acceptMutation.mutate(friend.user)}
                                        >
                                            Accept
                                        </button>
                                        <button 
                                            className="flex-1 px-4 py-2 rounded-xl bg-midnight-600 text-text-secondary hover:bg-danger hover:text-white transition-all text-xs font-bold" 
                                            onClick={() => rejectMutation.mutate(friend.user)}
                                        >
                                            Reject
                                        </button>
                                    </>
                                )
                            )
                        ) : renderEmptyState("No pending requests received")}
                    </div>
                );

            case "remove":
                const acceptedFriends = filteredFriends.filter(f => f.status === "accepted");
                return (
                    <div className="space-y-3 py-2 animate-in fade-in duration-300">
                        <div className="relative mb-4">
                            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted text-xs" />
                            <input 
                                type="text" 
                                placeholder="Search friends list..." 
                                className="w-full bg-midnight-900/50 border border-midnight-500/20 rounded-xl py-2 pl-10 pr-4 text-xs focus:ring-1 focus:ring-accent outline-none"
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        {acceptedFriends.length > 0 ? (
                            acceptedFriends.map(friend =>
                                renderFriendItem(
                                    friend,
                                    <button 
                                        className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-midnight-600 text-text-secondary hover:bg-danger hover:text-white transition-all text-xs font-bold" 
                                        onClick={() => {
                                            if (window.confirm(`Are you sure you want to remove ${friend.displayName}?`)) {
                                                removeMutation.mutate(friend.user);
                                            }
                                        }}
                                    >
                                        Remove
                                    </button>
                                )
                            )
                        ) : renderEmptyState("Your friend list is empty")}
                    </div>
                );
        }
    };

    return (
        <div className="page-container bg-midnight-900">
            <Header />
            <main className="flex-1 selection:bg-accent selection:text-white">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16 space-y-10">
                    
                    {/* Page Header */}
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-3 text-accent mb-2">
                                <div className="p-2.5 rounded-2xl bg-accent/10 border border-accent/20">
                                    <FaUserPlus size={24} />
                                </div>
                                <h1 className="text-3xl font-black tracking-tight text-text-primary uppercase slant-2">Manage Friends</h1>
                            </div>
                            <p className="text-text-muted text-sm max-w-md">
                                Build your community. Manage requests, find new allies, and organize your friend list in one place.
                            </p>
                        </div>
                        <button
                            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-midnight-800 border border-midnight-500/20 text-text-secondary hover:text-white hover:border-midnight-500/50 transition-all text-sm font-bold group"
                            onClick={() => navigate("/friends")}
                        >
                            <FaArrowLeft className="group-hover:-translate-x-1 transition-transform" />
                            Back to Friends
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Tab Switcher - Vertical Sidebar style on larger screens */}
                        <div className="lg:col-span-4 space-y-2">
                            <div className="p-1.5 bg-midnight-800/80 backdrop-blur-xl rounded-3xl border border-midnight-500/30 shadow-2xl flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible custom-scrollbar">
                                {tabs.map(tab => (
                                    <button
                                        key={tab.key}
                                        className={`
                                            relative flex-1 lg:flex-none flex items-center justify-center lg:justify-start gap-3 px-5 py-4 rounded-2xl text-sm font-bold transition-all duration-300 whitespace-nowrap
                                            ${activeTab === tab.key
                                                ? 'bg-accent text-white shadow-xl shadow-accent/20 translate-x-1 lg:translate-x-2'
                                                : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                                            }
                                        `}
                                        onClick={() => {
                                            setActiveTab(tab.key);
                                            setSearchQuery(""); // Clear search on tab change
                                        }}
                                    >
                                        <span className="text-lg">{tab.icon}</span>
                                        <span className="hidden sm:inline-block">{tab.label}</span>
                                        {tab.count > 0 && (
                                            <span 
                                                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-midnight-700 shadow-lg animate-in fade-in zoom-in duration-300"
                                            >
                                                {tab.count > 9 ? '9+' : tab.count}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="lg:col-span-8">
                            <div className="min-h-[500px] p-1 bg-midnight-800/50 rounded-[2rem] border border-midnight-500/20">
                                <div className="h-full w-full bg-midnight-800 rounded-[1.8rem] p-6 shadow-inner">
                                    <div className="flex items-center justify-between mb-8">
                                        <h2 className="text-lg font-black text-text-primary uppercase tracking-widest pl-2 border-l-4 border-accent">
                                            {tabs.find(t => t.key === activeTab)?.label}
                                        </h2>
                                    </div>
                                    {renderContent()}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}

export default ManageFriendsPage;