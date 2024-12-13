import React, { useState } from "react";
import { login } from "../services/api";

const Login = () => {
    const [formData, setFormData] = useState({ username: "", password: "" });
    const [errorMessage, setErrorMessage] = useState("");  // для отображения ошибок

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Создаем новый объект FormData
        const form = new FormData();
        form.append("username", formData.username);
        form.append("password", formData.password);

        try {
            // Отправляем данные на сервер с помощью axios, передаем как FormData
            const { data } = await login(form);

            // Сохраняем токены в localStorage
            localStorage.setItem("access_token", data.access_token);
            localStorage.setItem("refresh_token", data.refresh_token);

            window.location.href = "/dashboard";  // Редирект на /dashboard
        } catch (err) {
            // Логируем ошибку, если она произошла
            console.error("Error during login:", err.response?.data || err);

            // Отображаем ошибку на странице
            setErrorMessage("Login failed. Please try again.");
        }
    };

    return (
        <div className="container">
        <form onSubmit={handleSubmit}>
            <h1>Login</h1>
            <div>
                <input
                    type="text"
                    name="username"
                    placeholder="Username"
                    value={formData.username}
                    onChange={handleChange}
                />
            </div>
            <div>
                <input
                    type="password"
                    name="password"
                    placeholder="Password"
                    value={formData.password}
                    onChange={handleChange}
                />
            </div>
            {errorMessage && <div style={{ color: "red" }}>{errorMessage}</div>}  {/* Отображаем ошибку */}
            <button type="submit">Login</button>
        </form>
        </div>
    );
};

export default Login;