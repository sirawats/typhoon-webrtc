import { Mic, MicOff, Video as VideoIcon, VideoOff, LogOut, Users } from 'lucide-react';
import styled from 'styled-components';

const Container = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  margin-bottom: 24px;
`;

const RoomInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const Title = styled.h2`
  font-size: 18px;
  font-weight: 600;
  color: #262626;
`;

const ParticipantCount = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: #f6f6f6;
  border-radius: 20px;
  font-size: 14px;
  color: #666;
`;

const Controls = styled.div`
  display: flex;
  gap: 8px;
`;

const ControlButton = styled.button<{ $danger?: boolean; $active?: boolean }>`
  padding: 10px;
  background: ${props => {
    if (props.$danger) return '#ed4956';
    if (props.$active) return '#262626';
    return '#f6f6f6';
  }};
  color: ${props => (props.$danger || props.$active ? 'white' : '#262626')};
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => {
      if (props.$danger) return '#dc2c3c';
      if (props.$active) return '#404040';
      return '#ebebeb';
    }};
  }

  &:active {
    transform: scale(0.95);
  }
`;

interface ControlBarProps {
  roomId: string;
  isAudioMuted: boolean;
  isVideoMuted: boolean;
  participantCount: number;
  onAudioToggle: () => void;
  onVideoToggle: () => void;
  onLeave: () => void;
}

const ControlBar = ({
  roomId,
  isAudioMuted,
  isVideoMuted,
  participantCount = 1,
  onAudioToggle,
  onVideoToggle,
  onLeave
}: ControlBarProps) => {
  return (
    <Container>
      <RoomInfo>
        <Title>Room: {roomId}</Title>
        <ParticipantCount>
          <Users size={16} />
          {participantCount} {participantCount === 1 ? 'participant' : 'participants'}
        </ParticipantCount>
      </RoomInfo>
      <Controls>
        <ControlButton 
          onClick={onAudioToggle} 
          $active={!isAudioMuted}
          title={isAudioMuted ? 'Unmute' : 'Mute'}
        >
          {isAudioMuted ? <MicOff size={20} /> : <Mic size={20} />}
        </ControlButton>
        <ControlButton 
          onClick={onVideoToggle} 
          $active={!isVideoMuted}
          title={isVideoMuted ? 'Turn on camera' : 'Turn off camera'}
        >
          {isVideoMuted ? <VideoOff size={20} /> : <VideoIcon size={20} />}
        </ControlButton>
        <ControlButton 
          onClick={onLeave} 
          $danger
          title="Leave room"
        >
          <LogOut size={20} />
        </ControlButton>
      </Controls>
    </Container>
  );
};

export default ControlBar;