import { useState, useEffect, useRef } from 'react';
import { SignallingClient } from '@metered-ca/realtime';
import { User, WSEvent } from '../types';

export function useWebRTC(currentUser: User | null, sendMessage: (event: WSEvent) => void) {
  const [callActive, setCallActive] = useState(false);
  const [incomingCall, setIncomingCall] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  
  const meteredSignallingRef = useRef<SignallingClient | null>(null);

  useEffect(() => {
    if (!currentUser?.coupleId) return;

    const meteredSignalling = new SignallingClient({
      apiKey: import.meta.env.VITE_METERED_REALTIME_API_KEY || ''
    });
    meteredSignallingRef.current = meteredSignalling;

    meteredSignalling.on('connected', () => {
      meteredSignalling.subscribe(`couple_${currentUser.coupleId}`);
    });

    meteredSignalling.on('message', (msgEvent) => {
      const payload = msgEvent.data as any;
      if (payload.senderUserId === currentUser.id) return;
      // Handle WebRTC signals here (SDP, ICE)
    });

    meteredSignalling.connect();

    return () => {
      meteredSignalling.close();
    };
  }, [currentUser]);

  const startCall = async (type: 'voice' | 'video') => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' });
    setLocalStream(stream);
    setCallActive(true);
    sendMessage({ type: 'call:dial', userId: currentUser!.id, mode: type } as any);
  };

  const endCall = () => {
    localStream?.getTracks().forEach(t => t.stop());
    setLocalStream(null);
    setRemoteStream(null);
    setCallActive(false);
    setIncomingCall(false);
  };

  return { 
    callActive, setCallActive, 
    incomingCall, setIncomingCall, 
    localStream, setLocalStream, 
    remoteStream, setRemoteStream, 
    startCall, endCall 
  };
}
