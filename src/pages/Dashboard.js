import React, { useState, useEffect } from "react";
import { getUserInfo, searchUsers, addContact, removeContact, getIncomingRequests } from "../services/api";
import WebRTCChat from "../WebRTCChat";
import WebRTCShareScreen from "../WebRTCShareScreen";

const Dashboard = () => {
    const [user, setUser] = useState(null);
    const [contacts, setContacts] = useState([]);
    const [incomingRequests, setIncomingRequests] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [isSearchVisible, setIsSearchVisible] = useState(false);
    const [isSearchPerformed, setIsSearchPerformed] = useState(false);

    const [isChatModalOpen, setIsChatModalOpen] = useState(false);
    const [isScreenSharingModalOpen, setIsScreenSharingModalOpen] = useState(false);
    const [selectedContact, setSelectedContact] = useState(null);

    const openChatModal = (contact) => {
        setSelectedContact(contact);
        setIsChatModalOpen(true);
    };

    const openScreenSharingModal = (contact) => {
        setSelectedContact(contact);
        setIsScreenSharingModalOpen(true);
    };

    const closeModals = () => {
        setIsChatModalOpen(false);
        setIsScreenSharingModalOpen(false);
        setSelectedContact(null);
    };

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
                setIncomingRequests(incomingResponse.data.pending_requests || []);
            } catch (err) {
                console.error("Error fetching incoming requests:", err);
            }
        };

        fetchUserData();
        fetchIncomingRequests();
    }, []);

    const handleSearch = async () => {
        setIsSearchPerformed(true);
        try {
            const { data } = await searchUsers(searchQuery);
            const filteredResults = data.filter(user =>
                !contacts.some(contact => contact.username === user.username)
            );
            setSearchResults(filteredResults);
        } catch (err) {
            console.error("Error during search:", err);
        }
    };

    const handleAddContact = async (contactUsername) => {
        try {
            await addContact(contactUsername);
            setSearchResults(prevResults =>
                prevResults.filter(user => user.username !== contactUsername)
            );
            setIsSearchVisible(false);
            const updatedUserInfo = await getUserInfo();
            setContacts(updatedUserInfo.data.contacts || []);
        } catch (err) {
            console.error("Error adding contact:", err);
        }
    };

    const handleRemoveContact = async (contactUsername) => {
        try {
            await removeContact(contactUsername);
            const updatedContacts = contacts.filter(contact => contact.username !== contactUsername);
            setContacts(updatedContacts);
            setSearchResults(prevResults => prevResults.filter(user => user.username !== contactUsername));
        } catch (err) {
            console.error("Error removing contact:", err);
        }
    };

    return (
        <div className="container">
            {user ? (
                <>
                    <div>
                        <h2>Your Contacts:</h2>
                        <ul>
                            {contacts.map((contact) => (
                                <li key={contact.id || contact.username}>
                                    {contact.username}
                                    {contact.confirmed === 0 ? (
                                        <span> 👋 </span>
                                    ) : (
                                        <span> 🤜🤛 </span>
                                    )}
                                    <button onClick={() => handleRemoveContact(contact.username)}>
                                        Remove
                                    </button>
                                    <button onClick={() => openChatModal(contact)}>Open Chat</button>
                                    <button onClick={() => openScreenSharingModal(contact)}>Start Screen Sharing</button>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h2>Incoming Requests:</h2>
                        {incomingRequests.length === 0 ? (
                            <p>No incoming requests.</p>
                        ) : (
                            <ul>
                                {incomingRequests.map((request) => (
                                    <li key={request.id}>
                                        {request.username} 👋
                                        <button onClick={() => handleAddContact(request.username)}>
                                            Accept Request
                                        </button>
                                    </li>
                                ))}
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

                    {isChatModalOpen && (
                        <WebRTCChat
                            user={user}
                            contact={selectedContact}
                            isOpen={isChatModalOpen}
                            onClose={closeModals}
                        />
                    )}

                    {isScreenSharingModalOpen && (
                        <WebRTCShareScreen
                            user={user}
                            contact={selectedContact}
                            isOpen={isScreenSharingModalOpen}
                            onClose={closeModals}
                        />
                    )}
                </>
            ) : (
                <p>Loading...</p>
            )}
        </div>
    );
};

export default Dashboard;
