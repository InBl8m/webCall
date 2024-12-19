import React, { useState, useRef } from 'react';
import axios from 'axios';

function WebRTCChat({ user, contact, isOpen, onClose }) {
    const [localOffer, setLocalOffer] = useState('');
    const [remoteOffer, setRemoteOfferState] = useState('');
    const [chat, setChat] = useState('');
    const [message, setMessage] = useState('');

    const peerConnectionRef = useRef(null);
    const dataChannelRef = useRef(null);

    const createPeerConnection = () => {
        const config = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
            ],
        };
        peerConnectionRef.current = new RTCPeerConnection(config);

        peerConnectionRef.current.onicecandidate = (event) => {
            if (event.candidate) return;
            const localDescription = JSON.stringify(peerConnectionRef.current.localDescription);
            setLocalOffer(localDescription);
            sendLocalOfferToServer(localDescription); // Отправка localOffer на сервер
        };

        peerConnectionRef.current.ondatachannel = (event) => {
            dataChannelRef.current = event.channel;
            setupDataChannel();
        };
    };

    const setupDataChannel = () => {
        dataChannelRef.current.onmessage = (event) => {
            setChat((prevChat) => `${prevChat}Peer: ${event.data}\n`);
        };

        dataChannelRef.current.onopen = () => {
            console.log('Data channel opened');
        };

        dataChannelRef.current.onclose = () => {
            console.log('Data channel closed');
        };
    };

    const createOffer = async () => {
        createPeerConnection();
        const dataChannel = peerConnectionRef.current.createDataChannel('chat');
        dataChannelRef.current = dataChannel;
        setupDataChannel();

        const offer = await peerConnectionRef.current.createOffer();
        await peerConnectionRef.current.setLocalDescription(offer);
    };

    const sendLocalOfferToServer = async (localOffer) => {
        const payload = {
            user_1: user.username,
            user_2: contact?.username,
            user_1_secret: localOffer,
        };

        try {
            const response = await axios.post('http://192.168.1.196:7000/chat/create_chat', payload);
            console.log('Server response:', response.data);
        } catch (error) {
            console.error('Error sending local offer to server:', error);
        }
    };

    const fetchLatestOffer = async () => {
        try {
            const response = await axios.get(`http://192.168.1.196:7000/chat/invited/${user.username}`);
            const chats = response.data;

            if (Array.isArray(chats)) {
                // Найти последний элемент, где "user_1" равен contact.username
                const latestChat = [...chats].reverse().find(chat => chat.user_1 === contact.username);

                if (latestChat) {
                    console.log('Latest Offer (user_1_secret):', latestChat.user_1_secret);
                } else {
                    console.log('No offers found from contact');
                }
            } else {
                console.log('Invalid response format:', response.data);
            }
        } catch (error) {
            console.error('Error fetching latest offer:', error);
        }
    };

    const handleSetRemoteOffer = async () => {
        if (!peerConnectionRef.current) {
            createPeerConnection();
        }

        try {
            const remoteDesc = new RTCSessionDescription(JSON.parse(remoteOffer));
            await peerConnectionRef.current.setRemoteDescription(remoteDesc);

            if (remoteDesc.type === 'offer') {
                const answer = await peerConnectionRef.current.createAnswer();
                await peerConnectionRef.current.setLocalDescription(answer);
                setLocalOffer(JSON.stringify(peerConnectionRef.current.localDescription));
            }
        } catch (error) {
            console.error('Error setting remote offer/answer:', error);
        }
    };

    const sendMessage = () => {
        if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
            dataChannelRef.current.send(message);
            setChat((prevChat) => `${prevChat}You: ${message}\n`);
            setMessage('');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal">
            <div className="modal-content">
                <h1>WebRTC {user.username} P2P {contact?.username}</h1>
                <button onClick={onClose}>Close Chat</button>
                <button onClick={fetchLatestOffer}>Fetch Latest Offer</button>
                <textarea
                    value={localOffer}
                    placeholder="Local Offer"
                    rows="2"
                    cols="50"
                    readOnly
                ></textarea>
                <br />
                <button onClick={createOffer}>Create Offer</button>
                <br />
                <br />
                <textarea
                    value={remoteOffer}
                    onChange={(e) => setRemoteOfferState(e.target.value)}
                    placeholder="Remote Offer/Answer"
                    rows="2"
                    cols="50"
                ></textarea>
                <br />
                <button onClick={handleSetRemoteOffer}>Set Remote Offer/Answer</button>
                <br />
                <br />
                <textarea
                    value={chat}
                    placeholder="Chat"
                    rows="2"
                    cols="50"
                    readOnly
                ></textarea>
                <br />
                <input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    type="text"
                    placeholder="Type your message here..."
                />
                <button onClick={sendMessage}>Send</button>
                <br />
            </div>
        </div>
    );
}

export default WebRTCChat;
