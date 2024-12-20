import React, { useState, useRef } from 'react';
import apiRoutes from "./services/apiRoutes";
import axios from 'axios';


function WebRTCShareScreen({ user, contact, isOpen, onClose }) {
    const [connectionStatus, setConnectionStatus] = useState('Disconnected');
    const peerConnectionRef = useRef(null);
    const dataChannelRef = useRef(null);

    // Функция для создания WebRTC соединения
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
            sendLocalOfferToServer(localDescription);
        };

        peerConnectionRef.current.ondatachannel = (event) => {
            dataChannelRef.current = event.channel;
            setupDataChannel();
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

    // Функция для настроек data channel
    const setupDataChannel = () => {
        dataChannelRef.current.onopen = () => {
            setConnectionStatus('Connected');
            console.log('Data channel opened');
        };

        dataChannelRef.current.onclose = () => {
            setConnectionStatus('Disconnected');
            console.log('Data channel closed');
        };
    };

    // Функция для создания и отправки предложения
    const createOffer = async () => {
        createPeerConnection();
        const dataChannel = peerConnectionRef.current.createDataChannel('chat');
        dataChannelRef.current = dataChannel;
        setupDataChannel();

        const offer = await peerConnectionRef.current.createOffer();
        await peerConnectionRef.current.setLocalDescription(offer);
    };

    // Функция для отправки локального предложения на сервер
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

    // Функция для обработки предложений
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

    // Функция для установки удаленного предложения
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
            }
        } catch (error) {
            console.error('Error setting remote offer/answer:', error);
        }
    };

    // Функция для расшаривания экрана
    const startScreenSharing = async () => {
        try {
            // Запрашиваем доступ к экрану
            const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            const videoTrack = stream.getTracks()[0];

            // Добавляем видео-трек в WebRTC соединение
            if (peerConnectionRef.current) {
                const sender = peerConnectionRef.current.getSenders().find(sender => sender.track.kind === videoTrack.kind);
                if (sender) {
                    sender.replaceTrack(videoTrack);
                } else {
                    peerConnectionRef.current.addTrack(videoTrack, stream);
                }
            }

            // Отображаем видео на странице
            const videoElement = document.getElementById('localVideo');
            if (videoElement) {
                videoElement.srcObject = stream;
            }

            console.log('Screen sharing started');

            // Остановка экрана при завершении
            stream.getTracks().forEach(track => {
                track.onended = () => {
                    console.log('Screen sharing stopped');
                    if (peerConnectionRef.current) {
                        const sender = peerConnectionRef.current.getSenders().find(sender => sender.track.kind === videoTrack.kind);
                        if (sender) {
                            sender.replaceTrack(null);
                        }
                    }
                };
            });
        } catch (error) {
            console.error('Error starting screen sharing:', error);
        }
    };

    // Если модальное окно закрыто, ничего не рендерим
    if (!isOpen) return null;

    return (
        <div className="modal">
            <div className="modal-content">
                <h1>WebRTC P2P from {user.username} to {contact?.username}</h1>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px' }}>
                    <button onClick={handleOffers}>Connect</button>
                    <button onClick={onClose}>Close Chat</button>
                    <button onClick={startScreenSharing}>Start Screen Sharing</button>
                </div>
                <video id="localVideo" autoPlay muted />
                <p>Status: {connectionStatus}</p>
            </div>
        </div>
    );
}

export default WebRTCShareScreen;
