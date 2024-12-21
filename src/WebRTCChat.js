import React, { useState, useRef } from 'react';
import axios from 'axios';
import apiRoutes from "./services/apiRoutes";

function WebRTCChat({ user, contact, isOpen, onClose }) {
    const [localOffer, setLocalOffer] = useState('');
    const [remoteOffer, setRemoteOfferState] = useState('');
    const [chat, setChat] = useState('');
    const [message, setMessage] = useState('');
    const [connectionStatus, setConnectionStatus] = useState('Disconnected');
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

    const setupDataChannel = () => {
        dataChannelRef.current.onmessage = (event) => {
            setChat((prevChat) => `${prevChat}Peer: ${event.data}\n`);
        };

        dataChannelRef.current.onopen = () => {
            setConnectionStatus('Connected');
            console.log('Data channel opened');
        };

        dataChannelRef.current.onclose = () => {
            setConnectionStatus('Disconnected');
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
        let offerAccepted = false; // Флаг для отслеживания, когда предложение принято
        let offerCreated = false;  // Флаг для отслеживания, было ли создано предложение
        let retryCount = 0;        // Счётчик попыток
        const maxRetries = 10;      // Максимальное количество попыток
        const retryDelay = 5000;   // Задержка между попытками в миллисекундах (5 секунд)

        // Функция для задержки
        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        while (!offerAccepted && retryCount < maxRetries) {
            try {
                console.log('Attempt #', retryCount + 1); // Логируем номер текущей попытки
                console.log('Offer Created:', offerCreated);  // Логируем значение offerCreated в начале цикла

                // Получаем последние предложения с сервера
                const response = await axios.get(`${apiRoutes.CHAT_URL}${apiRoutes.chat.invitedChats(user.username)}`);
                const chats = response.data;

                if (Array.isArray(chats)) {
                    const latestChat = chats.find(chat => chat.user_1 === contact.username);

                    if (latestChat) {
                        console.log('Found latest offer:', latestChat.offer);
                        setRemoteOfferState(latestChat.offer); // Устанавливаем состояние удалённого предложения
                        await handleSetRemoteOffer(latestChat.offer); // Устанавливаем удалённое предложение/ответ
                        await axios.post(`${apiRoutes.CHAT_URL}${apiRoutes.chat.acceptInvitation(latestChat.id)}`);
                        offerAccepted = true; // Если предложение найдено и принято, завершаем цикл
                    } else {
                        if (!offerCreated) {
                            console.log('No offers found from contact');
                            await createOffer(); // Создаем новое предложение
                            offerCreated = true;  // Обновляем флаг после создания предложения
                        } else {
                            console.log('Waiting for offer...');
                        }

                        // Если предложения нет, ждем перед повторной попыткой
                        await delay(retryDelay);  // Таймаут между попытками
                    }
                } else {
                    console.log('Invalid response format:', response.data);
                    offerCreated = true; // В случае некорректного ответа также завершаем цикл
                }

                retryCount++; // Увеличиваем счётчик попыток

            } catch (error) {
                console.error('Error handling offers:', error);
                // Если ошибка при запросе (например, 404), пытаемся создать новое предложение
                if (error.response && error.response.status === 404) {
                    console.log('No offer found, creating new offer...');
                    if (!offerCreated) {
                        await createOffer(); // Создаем новое предложение при 404
                        offerCreated = true; // Устанавливаем флаг после попытки создать предложение
                    }
                } else {
                    console.log('Other error occurred, ending process.');
                    offerAccepted = true; // Завершаем цикл при других ошибках
                }

                // Ждем перед повторной попыткой после ошибки
                await delay(retryDelay);  // Таймаут между попытками
                retryCount++; // Увеличиваем счётчик попыток
            }
        }

        // Если попытки исчерпаны
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
                <h1>WebRTC P2P from {user.username} to {contact?.username}</h1>
                <div style={{display: 'flex', justifyContent: 'space-between', padding: '10px'}}>
                    <button onClick={handleOffers}>Connect</button>
                    <button onClick={onClose} className="button remove-button">Close</button>
                </div>
                {/*<textarea*/}
                {/*    value={localOffer}*/}
                {/*    placeholder="Local Offer"*/}
                {/*    rows="2"*/}
                {/*    cols="50"*/}
                {/*    readOnly*/}
                {/*></textarea>*/}
                {/*<br />*/}
                {/*<button onClick={createOffer}>Create Offer</button>*/}
                {/*<br />*/}
                {/*<br />*/}
                {/*<textarea*/}
                {/*    value={remoteOffer}*/}
                {/*    onChange={(e) => setRemoteOfferState(e.target.value)}*/}
                {/*    placeholder="Remote Offer/Answer"*/}
                {/*    rows="2"*/}
                {/*    cols="50"*/}
                {/*></textarea>*/}
                {/*<br />*/}
                {/*<button onClick={handleSetRemoteOffer}>Set Remote Offer/Answer</button>*/}
                {/*<br />*/}
                {/*<br />*/}
                <textarea
                    value={chat}
                    placeholder="Chat"
                    rows="15"
                    cols="50"
                    readOnly
                ></textarea>
                <br/>
                <input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    type="text"
                    placeholder="Type your message here..."
                />
                <button onClick={sendMessage}>Send</button>
                <br/>
                <p>Status: {connectionStatus}</p>
            </div>
        </div>
    );
}

export default WebRTCChat;
