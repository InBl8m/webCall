const apiRoutes = {
    // BASE_URL: "http://192.168.1.196:8000",
    // CHAT_URL: "http://192.168.1.196:7000",
    BASE_URL: "http://localhost:8000",
    CHAT_URL: "http://localhost:7000",
    auth: {
        register: "/register",
        login: "/login",
        logout: "/logout",
        refreshToken: "/refresh-token",
    },
    user: {
        info: "/user-info",
        search: "/search-user",
        addContact: "/add-contact",
        removeContact: "/remove-contact",
        incomingRequests: "/pending-requests",
    },
    chat: {
        createChat: "/chat/create_chat",
        invitedChats: (username) => `/chat/invited/${username}`,
        acceptInvitation: (chatId) => `/chat/accept_invitation/${chatId}`,
    },
};

export default apiRoutes;
