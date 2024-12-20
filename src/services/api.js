import axios from "axios";
import apiRoutes from "./apiRoutes";

const API = axios.create({
    baseURL: apiRoutes.BASE_URL,
    withCredentials: true,
});

API.interceptors.request.use((config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const register = (data) => API.post(apiRoutes.auth.register, data);
export const login = (data) => API.post(apiRoutes.auth.login, data);
export const getUserInfo = () => API.get(apiRoutes.user.info);
export const searchUsers = (query) => API.get(`${apiRoutes.user.search}?query=${query}`);
export const addContact = (contactUsername) =>
    API.post(apiRoutes.user.addContact, { contact_username: contactUsername });
export const getIncomingRequests = () => API.get(apiRoutes.user.incomingRequests);
export const removeContact = (contactUsername) =>
    API.delete(`${apiRoutes.user.removeContact}?contact_username=${contactUsername}`);
export const logout = () => API.get(apiRoutes.auth.logout);
export const refreshToken = () => API.post(apiRoutes.auth.refreshToken);

export default API;
