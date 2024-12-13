import React, { useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const Navbar = () => {
    const { user, handleLogout } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleLogoutAndRedirect = () => {
        handleLogout();
        navigate("/login");
    };

    return (
        <nav>
            {user ? (
                <>
                    <span>Welcome, {user.username}</span>
                    <Link to="/dashboard">Dashboard</Link>
                    <button onClick={handleLogoutAndRedirect}>Logout</button>
                </>
            ) : (
                <>
                    <Link to="/register">Register</Link>
                    <Link to="/login">Login</Link>
                </>
            )}
        </nav>
    );
};

export default Navbar;
