const WebSocket = require("ws");

class ChatRoomManager {
  constructor() {
    this._rooms = [];
    this._wss = null;
    this._connections = [];

    this._initializeServer();
  }

  _initializeServer() {
    this._wss = new WebSocket.Server({ port: 5050 });

    this._initializeConnection();
  }

  _initializeConnection() {
    if (!this._wss) {
      return;
    }

    // Update active status
    this._activeStatus = true;

    // Generate reference to chatroom
    const chatroom = this;

    this._wss.on("connection", function connection(ws, req) {
      // Parse header
      const queryParams = req.url.split("?")[1];

      // Parse url
      const roomId = req.url.split("?")[0].split("/")[2];

      // Parse query
      const userName = queryParams.split("=")[1];

      // Setup listener functions
      console.log("A new user has connected!");
      chatroom._connections.push(ws);

      // Find room
      const room = chatroom._findRoom(roomId);

      // Setup connection
      room.addUser(ws, userName);

      // Add to global connections
      chatroom._connections.push(ws);
    });
  }

  createRoom(roomId) {
    // Determine if room exists
    if (this._rooms.length) {
      for (let ind in this._rooms) {
        const room = this._rooms[ind];

        if (room.getRoomId() === roomId) {
          return false;
        }
      }
    }

    // If room doesn't exist create
    const room = new ChatRoom(roomId);

    // Add room to rooms
    this._rooms.push(room);

    return true;
  }

  getRoomMessages(roomId) {
    const room = this._findRoom(roomId);

    // Check if room exists
    if (!room) {
      return null;
    }

    // Fetch messages
    return room.getMessages();
  }

  hasExistingRoom(roomId) {
    const room = this._findRoom(roomId);

    return !!room;
  }

  _findRoom(roomId) {
    if (this._rooms.length === 0) {
      return null;
    }

    for (let ind in this._rooms) {
      const room = this._rooms[ind];

      if (room.getRoomId() === roomId) {
        return room;
      }
    }
    console.log(`Failed to find room: ${roomId}`);
    return null;
  }
}

class ChatRoom {
  constructor(roomId) {
    /*
     * Properties for chatroom
     */
    this._roomId = roomId;
    this._connections = [];
    this._messageList = [];
    this._userNames = [];
    this._sockets = {};
    this._internalCounter = 0;
  }

  getRoomId() {
    return this._roomId;
  }

  getMessages() {
    return this._messageList;
  }

  _addMessage(messageStr) {
      const message = JSON.parse(messageStr);
    message.number = this._internalCounter;
    this._internalCounter += 1;

    this._messageList.push(message);

    console.log(message);

    // Broadcast message
    for (let ind in this._sockets) {
      const socket = this._sockets[ind];
      socket.send(JSON.stringify(message));
    }
  }

  containsUser(userName) {
      return this._userNames.includes(userName);
  }

  addUser(socket, userName) {
      this._userNames.push(userName);
      this._sockets[userName] = socket;

      // Setup Communication
      socket.on("message", this._addMessage.bind(this));
  }
}

module.exports = ChatRoomManager;
