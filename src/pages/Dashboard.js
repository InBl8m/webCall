import React, { useState, useEffect } from "react";
import { getUserInfo, searchUsers, addContact, removeContact, getIncomingRequests } from "../services/api";

const Dashboard = () => {
    const [user, setUser] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [contacts, setContacts] = useState([]);
    const [incomingRequests, setIncomingRequests] = useState([]);
    const [isSearchVisible, setIsSearchVisible] = useState(false);
    const [isSearchPerformed, setIsSearchPerformed] = useState(false);  // Состояние, чтобы отслеживать, был ли выполнен поиск

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const userInfoResponse = await getUserInfo();
                setUser(userInfoResponse.data);
                setContacts(userInfoResponse.data.contacts || []);
            } catch (err) {
                console.error(err);
                window.location.href = "/login";
            }
        };

        const fetchIncomingRequests = async () => {
            try {
                const incomingResponse = await getIncomingRequests();
                console.log(incomingResponse.data);  // Выводим данные ответа
                setIncomingRequests(incomingResponse.data.pending_requests || []);
            } catch (err) {
                console.error("Error fetching incoming requests:", err);
            }
        };

        fetchUserData();
        fetchIncomingRequests();
    }, []);

    // Функция поиска пользователей
    const handleSearch = async () => {
        setIsSearchPerformed(true);  // Устанавливаем, что поиск был выполнен
        try {
            const { data } = await searchUsers(searchQuery);
            // Исключаем пользователей, которые уже есть в контактах
            const filteredResults = data.filter(user =>
                !contacts.some(contact => contact.username === user.username)
            );
            setSearchResults(filteredResults);
        } catch (err) {
            console.error("Error during search:", err);
        }
    };

    // Функция добавления контакта
    const handleAddContact = async (contactUsername) => {
        try {
            await addContact(contactUsername);

            // Убираем запрос из списка входящих
            setIncomingRequests(prevRequests =>
                prevRequests.filter(request => request.username !== contactUsername)
            );

            // Перезапрашиваем список контактов, чтобы синхронизироваться с сервером
            const updatedUserInfo = await getUserInfo();
            setContacts(updatedUserInfo.data.contacts || []);
        } catch (err) {
            console.error("Error accepting request:", err.response ? err.response.data : err);
            alert(err.response?.data?.detail || "An error occurred while accepting the request.");
        }
    };

    // Функция удаления контакта
    const handleRemoveContact = async (contactUsername) => {
        try {
            await removeContact(contactUsername);
            const updatedContacts = contacts.filter(contact => contact.username !== contactUsername);
            setContacts(updatedContacts);
            setSearchResults(prevResults => prevResults.filter(user => user.username !== contactUsername));
        } catch (err) {
            console.error("Error removing contact:", err.response ? err.response.data : err);
            alert(err.response?.data?.detail || "An error occurred while removing contact.");
        }
    };

    return (
        <div className="container">
            <h1>Dashboard</h1>
            {user ? (
                <>
                    <p>Welcome, {user.username}! Your role is {user.role}.</p>

                    <div>
                        <h2>Your Contacts</h2>
                        <ul>
                            {contacts.map((contact) => (
                                <li key={contact.id || contact.username}>
                                    {contact.username}
                                    {contact.confirmed === 0 ? (
                                        <span> 👋 </span>  // Статус "Ожидает подтверждения"
                                    ) : (
                                        <span> 🤜🤛 </span>  // Статус "Подтвержден"
                                    )}
                                    <button onClick={() => handleRemoveContact(contact.username)}>
                                        Remove
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h2>Incoming Requests</h2>
                        {incomingRequests.length === 0 ? (
                            <p>No incoming requests.</p>
                        ) : (
                            <ul>
                                {incomingRequests.map((request) => {
                                    return (
                                        <li key={request.id}>
                                            {request.username} 👋
                                            <button onClick={() => handleAddContact(request.username)}>
                                                Accept Request
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>

                    <button onClick={() => setIsSearchVisible(!isSearchVisible)}>
                        {isSearchVisible ? "Close Search" : "Add Contact"}
                    </button>

                    {isSearchVisible && (
                        <div>
                            <h2>Search Users</h2>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by username"
                                id="search-input"
                                name="searchQuery"
                            />
                            <button onClick={handleSearch}>Search</button>

                            <div>
                                <h3>Search Results</h3>
                                {isSearchPerformed && searchResults.length === 0 ? (
                                    <p>No results found or all users are already added.</p>
                                ) : (
                                    searchResults.map((user) => (
                                        <div key={user.id}>
                                            <p>{user.username}</p>
                                            <button onClick={() => handleAddContact(user.username)}>
                                                Add to Contacts
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <p>Loading...</p>
            )}
        </div>
    );
};

export default Dashboard;
