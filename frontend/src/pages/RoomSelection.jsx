import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/rooms.css";

function RoomSelection() {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState("");
  const isValidRoomId = (value) => /^[a-zA-Z0-9_-]{1,64}$/.test(value);

  useEffect(() => {
    // Redirect to the login page if the user is not authenticated
    const jwtoken = localStorage.getItem("jwtoken");
    if (jwtoken === null || jwtoken === undefined) {
      navigate("/login");
    }
  }, [navigate]);

  const joinRoom = (event) => {
    event.preventDefault();
    const trimmedRoomId = roomId.trim();

    if (!isValidRoomId(trimmedRoomId)) {
      alert("Room IDs may contain only letters, numbers, underscores, and hyphens (up to 64 characters).");
      return;
    }

    setRoomId(trimmedRoomId);

    navigate(`/rooms/${trimmedRoomId}`);
  };

  const createRoom = (event) => {
    event.preventDefault();
    let newRoomId = roomId.trim();
    if (!roomId.trim()) {
      newRoomId = Math.random().toString(36).substring(2, 8);
    }
    if (!isValidRoomId(newRoomId)) {
      alert("Room IDs may contain only letters, numbers, underscores, and hyphens (up to 64 characters).");
      return;
    }
    navigate(`/rooms/${newRoomId}`);
  };

  return (
    <div className="room-page">
      <h1>Collaborative Rooms</h1>
      <div className="form-container">
        <form>
          <label htmlFor="roomId">RoomId</label>
          <input
            type="text"
            name="roomId"
            placeholder="Not needed if to create Room"
            maxLength="64"
            pattern="[A-Za-z0-9_-]+"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
          />
          {/* <br /> */}
          <button onClick={joinRoom}>Join Room</button>
          <button onClick={createRoom}>Create Room</button>
        </form>
      </div>
    </div>
  );
}

export default RoomSelection;
