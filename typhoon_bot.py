import asyncio
import numpy as np
from aiortc import (
    VideoStreamTrack,
    RTCPeerConnection,
    RTCSessionDescription,
    RTCIceCandidate,
)
from av.video.frame import VideoFrame
import socketio
from fractions import Fraction


class BlueVideoStreamTrack(VideoStreamTrack):
    def __init__(self):
        super().__init__()
        # Create blue frame with proper size for video
        self.img = np.zeros((720, 1280, 3), dtype=np.uint8)
        self.img[:, :] = [0, 0, 255]  # RGB format - bright blue
        self.pts = 0
        self.time_base = Fraction(1, 30)  # 30 fps

    async def recv(self):
        pts, time_base = await self.next_timestamp()
        frame = VideoFrame.from_ndarray(self.img, format="rgb24")
        frame.pts = pts
        frame.time_base = time_base
        return frame


class WebRTCBot:
    def __init__(self):
        self.sio = socketio.AsyncClient(
            reconnection=True,
            reconnection_attempts=0,
            reconnection_delay=1,
            logger=True,
        )
        self.pc = None
        self.track = None
        self.running = True

    async def cleanup(self):
        """Cleanup resources"""
        self.running = False
        if self.track:
            self.track.stop()
            self.track = None
        if self.pc:
            await self.pc.close()
            self.pc = None
        if self.sio.connected:
            await self.sio.disconnect()

    def setup_events(self):
        @self.sio.event
        async def connect():
            print("Connected to server")
            await self.join_room()

        @self.sio.event
        async def disconnect():
            print("Disconnected from server")

        @self.sio.event
        async def getOffer(data):
            print("Received offer, processing...")
            await self.handle_offer(data)

        @self.sio.event
        async def getCandidate(data):
            if self.pc:
                try:
                    candidate = RTCIceCandidate(
                        sdpMid=data["candidate"]["sdpMid"],
                        sdpMLineIndex=data["candidate"]["sdpMLineIndex"],
                        candidate=data["candidate"]["candidate"],
                    )
                    await self.pc.addIceCandidate(candidate)
                    print("Added ICE candidate")
                except Exception as e:
                    print(f"Error adding ICE candidate: {e}")

        @self.sio.event
        async def all_users(users):
            print(f"Users in room: {users}")

    async def create_peer_connection(self):
        if self.pc:
            await self.pc.close()

        self.pc = RTCPeerConnection()
        print("Created peer connection")

        @self.pc.on("iceconnectionstatechange")
        async def on_iceconnectionstatechange():
            if self.pc:
                print(f"ICE Connection state: {self.pc.iceConnectionState}")

        @self.pc.on("connectionstatechange")
        async def on_connectionstatechange():
            if self.pc:
                print(f"Connection state: {self.pc.connectionState}")
                if self.pc.connectionState == "failed":
                    await self.cleanup()

        # Add video track
        self.track = BlueVideoStreamTrack()
        self.pc.addTrack(self.track)
        print("Added video track")

    async def join_room(self):
        await self.sio.emit("join_room", {"room": "test-room", "email": "TYPHOON_BOT"})
        print("Join room request sent")

    async def handle_offer(self, data):
        try:
            print("Setting up peer connection")
            await self.create_peer_connection()

            print("Processing offer")
            print("Offer data:", data)  # Debug print

            # Extract SDP correctly
            sdp = data.get("sdp")
            if isinstance(sdp, dict):
                sdp = sdp.get("sdp", "")

            print(f"SDP type: {type(sdp)}")  # Debug print
            print(f"SDP content: {sdp[:100]}...")  # Show first 100 chars

            offer = RTCSessionDescription(sdp=sdp, type="offer")
            await self.pc.setRemoteDescription(offer)

            print("Creating answer")
            answer = await self.pc.createAnswer()

            print("Setting local description")
            await self.pc.setLocalDescription(answer)

            print("Sending answer")
            await self.sio.emit(
                "answer",
                {
                    "sdp": self.pc.localDescription.sdp,
                    "answerReceiveID": data["offerSendID"],
                    "answerSendID": self.sio.sid,
                },
            )
            print("Answer sent successfully")

        except Exception as e:
            print(f"Error handling offer: {e}")
            print(f"Full offer data: {data}")  # Print full data on error
            await self.cleanup()

    async def run(self):
        self.setup_events()
        while self.running:
            try:
                if not self.sio.connected:
                    await self.sio.connect(
                        "http://localhost:8080", transports=["websocket"]
                    )
                await asyncio.sleep(1)
            except Exception as e:
                print(f"Connection error: {e}")
                await asyncio.sleep(1)


async def main():
    bot = WebRTCBot()
    try:
        await bot.run()
    except KeyboardInterrupt:
        print("\nStopping bot...")
        await bot.cleanup()


if __name__ == "__main__":
    asyncio.run(main())
