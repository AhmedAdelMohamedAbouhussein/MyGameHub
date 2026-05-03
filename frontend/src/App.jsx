import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useContext, lazy, Suspense } from "react";
import AuthContext from "./contexts/AuthContext";

// Public pages
import LandingPage from "./pages/LandingPage/LandingPage";
import LoginPage from "./pages/LoginPage/LoginPage";
import SignupPage from "./pages/SignupPage/SignupPage";
import Verify from './pages/OTPPage/OTPPage';
import ResetPassword from './pages/ResetPassword/ResetPassword';
import ManagePublicProfile from './pages/ManagePublicProfile/ManagePublicProfile.jsx';
import LoadingScreen from "./components/LoadingScreen/LoadingScreen";
import CommunityPage from './pages/CommunityPage/CommunityPage.jsx';
import SetPassword from './pages/SetPassword/SetPassword.jsx';

// Private pages (lazy loaded)
const SyncWithSteam = lazy(() => import("./pages/SyncWithSteam/SyncWithSteam"));
const SyncWithXbox = lazy(() => import("./pages/SyncWithXbox/SyncWithXbox"));
const SyncWithEpic = lazy(() => import("./pages/SyncWithEpic/SyncWithEpic.jsx"));
const SyncWithPSN = lazy(() => import("./pages/SyncWithPSN/SyncWithPSN.jsx"));

const GamePage = lazy(() => import("./pages/GamePage/gamePage"));
const LibraryPage = lazy(() => import("./pages/LibraryPage/LibraryPage"));
const OwnedGamesDetails = lazy(() => import("./pages/OwnedGamesDetails/OwnedGamesDetails"));
const FriendsPage = lazy(() => import('./pages/FriendsPage/FriendsPage'));
const AddFriendPage = lazy(() => import('./pages/ManageFriendsPage/ManageFriendsPage.jsx'));
const SettingsPage = lazy(() => import(`./pages/SettingsPage/SettingsPage.jsx`));
const BrowseGamesPage = lazy(() => import("./pages/BrowsePage/BrowsePage"));
const ViewProfilePage = lazy(() => import("./pages/FriendsPage/ViewProfilePage"));
const WishlistPage = lazy(() => import("./pages/WishlistPage/WishlistPage"));

function App() {
    const { user } = useContext(AuthContext);
    const location = useLocation(); // 🔑 current location

    // Force Google users without a password to set one before proceeding
    if (user && user.hasPassword === false && location.pathname !== "/set-password") {
        return <Navigate to="/set-password" replace />;
    }

    return (
        <Suspense fallback={<LoadingScreen />}>
            <Routes>
                {/* Public pages */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/games/:id" element={<GamePage />} />
                <Route path="/games" element={<BrowseGamesPage />} />
                <Route path="/verify" element={<Verify />} />
                <Route path="/resetpassword" element={<ResetPassword />} />
                <Route path="/profile/:publicID" element={<ViewProfilePage />} />
                <Route path="/community" element={<CommunityPage />} />
                <Route path="/set-password" element={user && !user.hasPassword ? <SetPassword /> : <Navigate to="/" replace />} />

                {/* Auth pages */}
                <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" replace />} />
                <Route path="/signup" element={!user ? <SignupPage /> : <Navigate to="/" replace />} />

                {/* Private pages */}
                <Route path="/library" element={user ? <LibraryPage /> : <Navigate to="/login" replace state={{ from: location }} />} />
                <Route path="/library/sync/steam" element={user ? <SyncWithSteam /> : <Navigate to="/login" replace state={{ from: location }} />} />
                <Route path="/library/sync/xbox" element={user ? <SyncWithXbox /> : <Navigate to="/login" replace state={{ from: location }} />} />
                <Route path="/library/sync/epic" element={user ? <SyncWithEpic /> : <Navigate to="/login" replace state={{ from: location }} />} />
                <Route path="/library/sync/psn" element={user ? <SyncWithPSN /> : <Navigate to="/login" replace state={{ from: location }} />} />

                <Route path="/ownedgamedetails" element={user ? <OwnedGamesDetails /> : <Navigate to="/login" replace state={{ from: location }} />} />
                <Route path="/friends" element={user ? <FriendsPage /> : <Navigate to="/login" replace state={{ from: location }} />} />
                <Route path="/manage-profile" element={user ? <ManagePublicProfile /> : <Navigate to="/login" replace state={{ from: location }} />} />
                <Route path="/wishlist" element={user ? <WishlistPage /> : <Navigate to="/login" replace state={{ from: location }} />} />
                <Route path="/managefriends" element={user ? <AddFriendPage /> : <Navigate to="/login" replace state={{ from: location }} />} />
                <Route path="/settings" element={user ? <SettingsPage /> : <Navigate to="/login" replace state={{ from: location }} />} />
            </Routes>
        </Suspense>
    );
}

export default App;