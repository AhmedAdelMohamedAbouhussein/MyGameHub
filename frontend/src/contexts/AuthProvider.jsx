import { useState, useEffect } from "react";
import apiClient from "../utils/apiClient.js";

import LoadingScreen from "../components/LoadingScreen/LoadingScreen";
import AuthContext from "./AuthContext";

function AuthProvider({ children }) {


    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchUser = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get(`/auth/authUser`, { withCredentials: true });
            setUser(res.data.user);
        }
        catch (error) {
            setUser(null);
            console.error("Error fetching user:", error.response?.data?.message || error.message || "Unknown error");
        }
        finally {
            setLoading(false);
        }
    };

    // Run once on mount
    useEffect(() => {
        const loadUser = async () => {
            try {
                await fetchUser();
            }
            catch (err) {
                console.error(err);
            }
        };
        loadUser();
    }, []);

    if (loading) {
        return <LoadingScreen />;
    }

    return (
        <AuthContext.Provider value={{ user, setUser, fetchUser, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export default AuthProvider;
