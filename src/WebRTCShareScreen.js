import React, { useState, useRef } from 'react';
import axios from 'axios';
import apiRoutes from './services/apiRoutes';

function WebRTCShareScreen({ user, contact, isOpen, onClose }) {
    const [localOffer, setLocalOffer] = useState('');
    const [remoteOffer, setRemoteOfferState] = useState('');
    const [connectionStatus, setConnectionStatus] = useState('Disconnected');
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const peerConnectionRef = useRef(null);

    const createPeerConnection = () => {
        const config = {
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        };
        peerConnectionRef.current = new RTCPeerConnection(config);

        peerConnectionRef.current.onicecandidate = (event) => {
            if (event.candidate) return;
            const localDescription = JSON.stringify(peerConnectionRef.current.localDescription);
            setLocalOffer(localDescription);
            sendLocalOfferToServer(localDescription);
        };

        peerConnectionRef.current.ontrack = (event) => {
            remoteVideoRef.current.srcObject = event.streams[0];
        };

        peerConnectionRef.current.oniceconnectionstatechange = () => {
            switch (peerConnectionRef.current.iceConnectionState) {
                case 'connected':
                    setConnectionStatus('Connected');
                    break;
                case 'disconnected':
                    setConnectionStatus('Disconnected');
                    break;
                case 'failed':
                    setConnectionStatus('Failed');
                    break;
                case 'new':
                case 'checking':
                    setConnectionStatus('Connecting...');
                    break;
                default:
                    setConnectionStatus('Unknown');
                    break;
            }
        };
    };

    const shareScreen = async () => {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            localVideoRef.current.srcObject = stream;

            stream.getTracks().forEach(track => {
                peerConnectionRef.current.addTrack(track, stream);
            });
        } catch (error) {
            console.error('Error sharing screen:', error);
        }
    };

    const createOffer = async () => {
        createPeerConnection();
        await shareScreen();

        const offer = await peerConnectionRef.current.createOffer();
        await peerConnectionRef.current.setLocalDescription(offer);
    };

    const sendLocalOfferToServer = async (localOffer) => {
        const payload = {
            user_1: user.username,
            user_2: contact?.username,
            offer: localOffer,
        };

        try {
            const response = await axios.post(`${apiRoutes.CHAT_URL}${apiRoutes.chat.createChat}`, payload);
            console.log('Server response:', response.data);
        } catch (error) {
            console.error('Error sending local offer to server:', error);
        }
    };

    const handleOffers = async () => {
        let offerAccepted = false;
        let offerCreated = false;
        let retryCount = 0;
        const maxRetries = 10;
        const retryDelay = 5000;

        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        while (!offerAccepted && retryCount < maxRetries) {
            try {
                console.log('Attempt #', retryCount + 1);

                const response = await axios.get(`${apiRoutes.CHAT_URL}${apiRoutes.chat.invitedChats(user.username)}`);
                const chats = response.data;

                if (Array.isArray(chats)) {
                    const latestChat = chats.find(chat => chat.user_1 === contact.username);

                    if (latestChat) {
                        console.log('Found latest offer:', latestChat.offer);
                        setRemoteOfferState(latestChat.offer);
                        await handleSetRemoteOffer(latestChat.offer);
                        await axios.post(`${apiRoutes.CHAT_URL}${apiRoutes.chat.acceptInvitation(latestChat.id)}`);
                        offerAccepted = true;
                    } else {
                        if (!offerCreated) {
                            console.log('No offers found from contact');
                            await createOffer();
                            offerCreated = true;
                        } else {
                            console.log('Waiting for offer...');
                        }

                        await delay(retryDelay);
                    }
                } else {
                    console.log('Invalid response format:', response.data);
                    offerCreated = true;
                }

                retryCount++;

            } catch (error) {
                console.error('Error handling offers:', error);

                if (error.response && error.response.status === 404) {
                    console.log('No offer found, creating new offer...');
                    if (!offerCreated) {
                        await createOffer();
                        offerCreated = true;
                    }
                } else {
                    console.log('Other error occurred, ending process.');
                    offerAccepted = true;
                }

                await delay(retryDelay);
                retryCount++;
            }
        }

        if (!offerAccepted) {
            console.log('Max retries reached. Ending process.');
        }
    };

    const handleSetRemoteOffer = async (remoteOffer) => {
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

    if (!isOpen) return null;

    return (
        <div className="modal">
            <div className="modal-content">
                <h1>WebRTC P2P from {user.username} to {contact?.username}</h1>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px' }}>
                    <button onClick={handleOffers}>Start sharing/Accept sharing</button>
                    <button onClick={onClose} className="button remove-button">Close</button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px' }}>
                    <video ref={localVideoRef} autoPlay muted style={{ width: '45%' }} />
                    <video ref={remoteVideoRef} autoPlay style={{ width: '45%' }} />
                </div>
                <p>Status: {connectionStatus}</p>
            </div>
        </div>
    );
}

export default WebRTCShareScreen;
