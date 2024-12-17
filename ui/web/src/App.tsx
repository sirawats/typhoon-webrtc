import { useState, useRef, useEffect, useCallback } from 'react';
import io from 'socket.io-client';
import styled from 'styled-components';
import { WebRTCUser } from './types';
import Video from './components/Video';
import JoinForm from './components/JoinForm';
import ControlBar from './components/ControlBar';

const Container = styled.div`
  min-height: 100vh;
  background-color: #fafafa;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica;
`;

const ContentWrapper = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px;
`;

const VideoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
`;

const pc_config = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

const SOCKET_SERVER_URL = 'http://localhost:8080';

function App() {
  // Socket and WebRTC refs
  const socketRef = useRef<SocketIOClient.Socket>();
  const pcsRef = useRef<{ [socketId: string]: RTCPeerConnection }>({});
  const localStreamRef = useRef<MediaStream>();

  // State management
  const [users, setUsers] = useState<WebRTCUser[]>([]);
  const [isJoined, setIsJoined] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [email, setEmail] = useState('');
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [error, setError] = useState<string>('');

  // Get local media stream
  const getLocalStream = useCallback(async () => {
    try {
      const localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: {
          width: 480,
          height: 480,
        },
      });
      localStreamRef.current = localStream;
      return localStream;
    } catch (e) {
      setError('Failed to access camera and microphone');
      console.error(`getUserMedia error: ${e}`);
      return null;
    }
  }, []);

  // Create peer connection for a user
  const createPeerConnection = useCallback((socketID: string, email: string) => {
    try {
      const pc = new RTCPeerConnection(pc_config);

      // Handle ICE candidate
      pc.onicecandidate = (e) => {
        if (!(socketRef.current && e.candidate)) return;
        socketRef.current.emit('candidate', {
          candidate: e.candidate,
          candidateSendID: socketRef.current.id,
          candidateReceiveID: socketID,
        });
      };

      // Handle ICE connection state changes
      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'disconnected') {
          console.log('Peer disconnected');
        }
      };

      // Handle incoming streams
      pc.ontrack = (e) => {
        setUsers((oldUsers) =>
          oldUsers
            .filter((user) => user.id !== socketID)
            .concat({
              id: socketID,
              email,
              stream: e.streams[0],
            }),
        );
      };

      // Add local tracks to peer connection
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          if (!localStreamRef.current) return;
          pc.addTrack(track, localStreamRef.current);
        });
      }

      return pc;
    } catch (e) {
      console.error(e);
      setError('Failed to create peer connection');
      return undefined;
    }
  }, []);

  // Room management functions
  const joinRoom = async () => {
    if (!roomId || !email) {
      setError('Room ID and email are required');
      return;
    }

    try {
      const stream = await getLocalStream();
      if (!stream) return;

      socketRef.current?.emit('join_room', {
        room: roomId,
        email: email,
      });
      setIsJoined(true);
      setError('');
    } catch (e) {
      setError('Failed to join room');
      console.error(e);
    }
  };

  const leaveRoom = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    
    // Stop all tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }

    // Close all peer connections
    Object.values(pcsRef.current).forEach(pc => pc.close());
    pcsRef.current = {};

    // Reset state
    setUsers([]);
    setIsJoined(false);
    setError('');
  };

  // Media controls
  const toggleAudio = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsAudioMuted(!isAudioMuted);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoMuted(!isVideoMuted);
    }
  };

  // WebRTC and Socket.io setup
  useEffect(() => {
    socketRef.current = io.connect(SOCKET_SERVER_URL);

    // Handle all users in room
    socketRef.current.on('all_users', (allUsers: Array<{ id: string; email: string }>) => {
      allUsers.forEach(async (user) => {
        if (!localStreamRef.current) return;
        const pc = createPeerConnection(user.id, user.email);
        if (!(pc && socketRef.current)) return;
        
        pcsRef.current = { ...pcsRef.current, [user.id]: pc };
        
        try {
          const localSdp = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
          });
          await pc.setLocalDescription(new RTCSessionDescription(localSdp));
          
          socketRef.current.emit('offer', {
            sdp: localSdp,
            offerSendID: socketRef.current.id,
            offerSendEmail: email,
            offerReceiveID: user.id,
          });
        } catch (e) {
          console.error(e);
          setError('Failed to create offer');
        }
      });
    });

    // Handle incoming offers
    socketRef.current.on(
      'getOffer',
      async (data: {
        sdp: RTCSessionDescription;
        offerSendID: string;
        offerSendEmail: string;
      }) => {
        const { sdp, offerSendID, offerSendEmail } = data;
        if (!localStreamRef.current) return;
        
        const pc = createPeerConnection(offerSendID, offerSendEmail);
        if (!(pc && socketRef.current)) return;
        
        pcsRef.current = { ...pcsRef.current, [offerSendID]: pc };
        
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          const localSdp = await pc.createAnswer({
            offerToReceiveVideo: true,
            offerToReceiveAudio: true,
          });
          await pc.setLocalDescription(new RTCSessionDescription(localSdp));
          
          socketRef.current.emit('answer', {
            sdp: localSdp,
            answerSendID: socketRef.current.id,
            answerReceiveID: offerSendID,
          });
        } catch (e) {
          console.error(e);
          setError('Failed to handle offer');
        }
      },
    );

    // Handle incoming answers
    socketRef.current.on(
      'getAnswer',
      (data: { sdp: RTCSessionDescription; answerSendID: string }) => {
        const { sdp, answerSendID } = data;
        const pc: RTCPeerConnection = pcsRef.current[answerSendID];
        if (!pc) return;
        pc.setRemoteDescription(new RTCSessionDescription(sdp));
      },
    );

    // Handle incoming ICE candidates
    socketRef.current.on(
      'getCandidate',
      async (data: { candidate: RTCIceCandidateInit; candidateSendID: string }) => {
        const pc: RTCPeerConnection = pcsRef.current[data.candidateSendID];
        if (!pc) return;
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      },
    );

    // Handle user disconnection
    socketRef.current.on('user_exit', (data: { id: string }) => {
      if (pcsRef.current[data.id]) {
        pcsRef.current[data.id].close();
        delete pcsRef.current[data.id];
      }
      setUsers((oldUsers) => oldUsers.filter((user) => user.id !== data.id));
    });

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      users.forEach((user) => {
        if (!pcsRef.current[user.id]) return;
        pcsRef.current[user.id].close();
        delete pcsRef.current[user.id];
      });
    };
  }, [createPeerConnection, email]);

  return (
    <Container>
      <ContentWrapper>
        {error && (
          <div style={{ 
            padding: '12px', 
            marginBottom: '16px', 
            backgroundColor: '#ffebee', 
            color: '#c62828', 
            borderRadius: '4px' 
          }}>
            {error}
          </div>
        )}
        
        {!isJoined ? (
          <JoinForm
            roomId={roomId}
            email={email}
            onRoomIdChange={setRoomId}
            onEmailChange={setEmail}
            onJoin={joinRoom}
          />
        ) : (
          <>
            <ControlBar
              roomId={roomId}
              isAudioMuted={isAudioMuted}
              isVideoMuted={isVideoMuted}
              onAudioToggle={toggleAudio}
              onVideoToggle={toggleVideo}
              onLeave={leaveRoom}
            />
            <VideoGrid>
              {localStreamRef.current && (
                <Video
                  stream={localStreamRef.current}
                  email={email}
                  muted={true}
                  isLocal={true}
                />
              )}
              {users.map((user, index) => (
                <Video
                  key={index}
                  stream={user.stream}
                  email={user.email}
                />
              ))}
            </VideoGrid>
          </>
        )}
      </ContentWrapper>
    </Container>
  );
}

export default App;