import React, { useState } from "react";
import { register } from "../services/api"; // импортируем функцию register из api.js

const Register = () => {
    const [formData, setFormData] = useState({ username: "", email: "", password: "" });
    const [errorMessage, setErrorMessage] = useState("");  // для отображения ошибок

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Создаем новый объект FormData
        const form = new FormData();
        form.append("username", formData.username);
        form.append("email", formData.email);
        form.append("password", formData.password);

        // Логируем данные перед отправкой
        console.log("Form Data to be sent (FormData):", formData);

        try {
            // Отправляем данные на сервер с помощью axios, передаем как FormData
            const { data } = await register(form);

            // Логируем успешный ответ от сервера
            console.log("Registration successful, response data:", data);

            window.location.href = "/login";  // Редирект на страницу логина
        } catch (err) {
            // Логируем ошибку, если она произошла
            console.error("Error during registration:", err.response?.data || err);

            // Отображаем ошибку на странице
            setErrorMessage("Registration failed. Please try again.");
        }
    };

    const handleGoogleLogin = () => {
        // Перенаправление на сервер для авторизации через Google
        window.location.href = "http://192.168.1.196:8000/auth/google";  // Убедитесь, что URL соответствует вашему серверу
    };

    return (
        <div className="container">
            <form onSubmit={handleSubmit}>
                <h1>Register</h1>
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
                        type="email"
                        name="email"
                        placeholder="Email"
                        value={formData.email}
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
                {errorMessage && <div style={{color: "red"}}>{errorMessage}</div>} {/* Отображаем ошибку */}
                <button type="submit">Register</button>
            </form>
            <div>
                <h2> </h2>
                <button onClick={handleGoogleLogin}>Register with Google</button>
                {/* Кнопка для входа через Google */}
            </div>
        </div>
    );
};

export default Register;
