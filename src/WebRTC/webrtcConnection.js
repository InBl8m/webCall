import { useRef, useState } from 'react';

export const useWebRTCConnection = () => {
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

    // Функция для настройки data channel
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

    // Функция для отправки локального предложения на сервер
    const sendLocalOfferToServer = async (localOffer) => {
        // Логика отправки предложения на сервер
        console.log('Sending local offer to server:', localOffer);
    };

    return {
        createPeerConnection,
        connectionStatus,
    };
};
