const Message = require("./models/messageModel.js");
const { isValidRoomId } = require("./utils/validation");

let rooms = new Map();

function socketHandler(io) {
  io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    let currentUsername, currentRoomId;

    socket.on("join-room", async ({ roomId }) => {
      if (!isValidRoomId(roomId)) return;
      currentUsername = socket.data.user.username;
      currentRoomId = roomId;

      socket.join(roomId);

      if (!rooms.has(roomId)) {
        rooms.set(roomId, {
          users: new Map(),
          sharedText: "",
          sharedInput: "", // Add this line
        });
      }
      const room = rooms.get(roomId);
      room.users.set(currentUsername, (room.users.get(currentUsername) || 0) + 1);

      // Load previous messages from database
      try {
        const previousMessages = await Message.find({ roomId })
          .sort({ timestamp: 1 })
          .limit(100);

        socket.emit("room-init", {
          users: Array.from(rooms.get(roomId).users.keys()),
          sharedText: rooms.get(roomId).sharedText,
          sharedInput: rooms.get(roomId).sharedInput, // Add this line
          previousMessages,
        });
      } catch (err) {
        console.error("Error loading messages:", err);
      }

      socket.to(roomId).emit("user-joined", currentUsername);
      io.to(roomId).emit("room-users", Array.from(rooms.get(roomId).users.keys()));
    });

    socket.on("send-msg", async ({ roomId, message }) => {
      try {
        if (roomId !== currentRoomId || typeof message !== "string" || message.trim().length === 0 || message.length > 2_000) return;
        const username = currentUsername;
        const newMessage = new Message({ roomId, username, message });
        await newMessage.save();

        io.to(roomId).emit("recieve-msg", {
          username,
          message,
          timestamp: newMessage.timestamp,
        });
      } catch (err) {
        console.error("Error saving message:", err);
      }
    });

    socket.on("text-edit", ({ roomId, text }) => {
      if (roomId !== currentRoomId || typeof text !== "string" || text.length > 100_000 || !rooms.has(roomId)) return;
      rooms.get(roomId).sharedText = text;
      socket.to(roomId).emit("text-edit", text);
    });

    // Add this block for input sync
    socket.on("input-edit", ({ roomId, input }) => {
      if (roomId !== currentRoomId || typeof input !== "string" || input.length > 20_000 || !rooms.has(roomId)) return;
      rooms.get(roomId).sharedInput = input;
      socket.to(roomId).emit("input-edit", input);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);

      if (currentRoomId && currentUsername && rooms.has(currentRoomId)) {
        const room = rooms.get(currentRoomId);
        const remainingConnections = room.users.get(currentUsername) - 1;
        if (remainingConnections > 0) room.users.set(currentUsername, remainingConnections);
        else room.users.delete(currentUsername);

        if (room.users.size === 0) {
          rooms.delete(currentRoomId);
        } else {
          io.to(currentRoomId).emit("user-left", currentUsername);
          io.to(currentRoomId).emit(
            "room-users",
            Array.from(room.users.keys())
          );
        }
      }
    });
  });
}

module.exports = socketHandler;
