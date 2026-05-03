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
            console.log("Fetched user:", res.data.user);
        }
        catch (error) {
            const message = error.response?.data?.message || error.message || "Unknown error";
            console.log(message);
            setUser(null);
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
