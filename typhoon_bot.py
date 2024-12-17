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


class BlueVideoStreamTrack(VideoStreamTrack):
    def __init__(self):
        super().__init__()
        # Create blue frame (RGB format)
        # self.img = np.zeros((480, 640, 3), dtype=np.uint8)
        self.img = np.zeros((5, 5, 3), dtype=np.uint8)
        self.img[:, :] = [0, 0, 255]  # RGB format
        self.pts = 0

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
            reconnection_attempts=0,  # Infinite retries
            reconnection_delay=1,
            logger=True,
        )
        self.pc = None
        self.track = None
        self.running = True  # Flag to control the main loop

        self._stop = False

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
                except Exception as e:
                    print(f"Error adding ICE candidate: {e}")

        @self.sio.event
        async def all_users(users):
            print(f"Users in room: {users}")

    async def create_peer_connection(self):
        self.pc = RTCPeerConnection()
        print("Created peer connection")

        # Add video track
        self.track = BlueVideoStreamTrack()
        self.pc.addTrack(self.track)
        print("Added video track")

        @self.pc.on("iceconnectionstatechange")
        async def on_iceconnectionstatechange():
            print(f"ICE Connection state: {self.pc.iceConnectionState}")

        @self.pc.on("connectionstatechange")
        async def on_connectionstatechange():
            print(f"Connection state: {self.pc.connectionState}")

        return self.pc

    async def join_room(self):
        await self.sio.emit("join_room", {"room": "test-room", "email": "TYPHOON_BOT"})
        print("Join room request sent")

    async def handle_offer(self, data):
        try:
            print("Setting up peer connection")
            await self.create_peer_connection()

            print("Processing offer")
            offer = RTCSessionDescription(sdp=data["sdp"], type="offer")
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
            if self.pc:
                await self.pc.close()
                self.pc = None

    async def run(self):
        self.setup_events()
        while self.running:
            try:
                if not self.sio.connected:
                    await self.sio.connect(
                        "http://localhost:8080", transports=["websocket"]
                    )
                # Keep program alive but don't spam reconnections
                await asyncio.sleep(1)
            except Exception as e:
                print(f"Connection error: {e}")

    async def stop(self):
        self._stop = True
        if self.pc:
            await self.pc.close()
        if self.sio.connected:
            await self.sio.disconnect()


async def main():
    bot = WebRTCBot()
    try:
        await bot.run()
    except KeyboardInterrupt:
        bot.running = False
        print("\nBot stopped by user")


if __name__ == "__main__":
    asyncio.run(main())
