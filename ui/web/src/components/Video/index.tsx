import { useEffect, useRef } from 'react';
import styled from 'styled-components';
import { Mic, MicOff } from 'lucide-react';

const VideoContainer = styled.div`
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  background: #f6f6f6;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  aspect-ratio: 16/9;
`;

const VideoElement = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
  background-color: #262626;
`;

const UserInfo = styled.div`
  position: absolute;
  bottom: 12px;
  left: 12px;
  right: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  border-radius: 8px;
  color: white;
  font-size: 14px;
  z-index: 1;
  max-width: calc(100% - 24px);  /* Account for left and right spacing */
`;

const UserLabel = styled.span`
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: calc(100% - 30px);  /* Leave space for mic icon if present */
`;

const MuteIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  color: #ff5757;
  flex-shrink: 0;  /* Prevent mic icon from shrinking */
`;

interface VideoProps {
  stream: MediaStream;
  email: string;
  muted?: boolean;
  isLocal?: boolean;
  audioEnabled?: boolean;
}

const Video = ({ 
  stream, 
  email, 
  muted = false, 
  isLocal = false,
  audioEnabled = true
}: VideoProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const displayName = isLocal ? `You (${email})` : email;

  return (
    <VideoContainer>
      <VideoElement 
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
      />
      <UserInfo>
        <UserLabel title={displayName}>
          {displayName}
        </UserLabel>
        {!audioEnabled && (
          <MuteIndicator>
            <MicOff size={16} />
          </MuteIndicator>
        )}
      </UserInfo>
    </VideoContainer>
  );
};

export default Video;