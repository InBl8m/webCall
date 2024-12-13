import React, { createContext, useState, useEffect } from "react";
import { getUserInfo, logout } from "../services/api";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);

    const fetchUser = async () => {
        try {
            const response = await getUserInfo();
            setUser({ username: response.data.username, role: response.data.role });
        } catch (err) {
            console.error("Failed to fetch user", err);
            setUser(null);
        }
    };

    const handleLogout = async () => {
        await logout();
        setUser(null);
    };

    useEffect(() => {
        fetchUser();
    }, []);

    return (
        <AuthContext.Provider value={{ user, setUser, handleLogout }}>
            {children}
        </AuthContext.Provider>
    );
};
