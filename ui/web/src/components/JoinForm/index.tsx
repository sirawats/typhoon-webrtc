import { Camera } from 'lucide-react';
import styled from 'styled-components';

const Container = styled.div`
  max-width: 400px;
  margin: 80px auto 0;
  padding: 32px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
`;

const Title = styled.h1`
  margin-bottom: 8px;
  font-size: 24px;
  font-weight: 600;
  color: #262626;
  text-align: center;
`;

const Subtitle = styled.p`
  margin-bottom: 32px;
  font-size: 14px;
  color: #8e8e8e;
  text-align: center;
`;

const InputGroup = styled.div`
  margin-bottom: 16px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #262626;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #dbdbdb;
  border-radius: 8px;
  font-size: 14px;
  color: #262626;
  background-color: #fafafa;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #0095f6;
    background-color: white;
  }

  &::placeholder {
    color: #8e8e8e;
  }
`;

const Button = styled.button`
  width: 100%;
  padding: 12px;
  margin-top: 16px;
  background: #0095f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: #0081d6;
  }

  &:active {
    transform: scale(0.98);
  }
`;

interface JoinFormProps {
  roomId: string;
  email: string;
  onRoomIdChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onJoin: () => void;
}

const JoinForm = ({
  roomId,
  email,
  onRoomIdChange,
  onEmailChange,
  onJoin
}: JoinFormProps) => {
  return (
    <Container>
      <Title>Join Meeting</Title>
      <Subtitle>Connect with others through video chat</Subtitle>
      
      <InputGroup>
        <Label htmlFor="roomId">Room ID</Label>
        <Input
          id="roomId"
          type="text"
          placeholder="Enter room ID"
          value={roomId}
          onChange={(e) => onRoomIdChange(e.target.value)}
        />
      </InputGroup>

      <InputGroup>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
        />
      </InputGroup>

      <Button onClick={onJoin}>
        <Camera size={20} />
        Join Room
      </Button>
    </Container>
  );
};

export default JoinForm;