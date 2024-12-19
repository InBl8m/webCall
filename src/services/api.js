import axios from "axios";

const API = axios.create({
    baseURL: "http://192.168.1.196:8000",
    withCredentials: true,
});

API.interceptors.request.use((config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const register = (data) => API.post("/register", data);
export const login = (data) => API.post("/login", data);
export const getUserInfo = () => API.get("/user-info");
export const searchUsers = (query) => API.get(`/search-user?query=${query}`);
export const addContact = (contactUsername) =>
    API.post("/add-contact", { contact_username: contactUsername });
export const getIncomingRequests = () => API.get("/pending-requests");
export const removeContact = (contactUsername) =>
    API.delete(`/remove-contact?contact_username=${contactUsername}`);
export const logout = () => API.get("/logout");
export const refreshToken = () => API.post("/refresh-token");

export default API;
