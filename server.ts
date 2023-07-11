import { Server } from "socket.io";
const path = require("path");
const { createServer } = require("http");

const httpServer = createServer();

httpServer.on("listening", () => {
  console.log("listening on port 3000");
});

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const emitOffer = async (peer: any) => {};

io.on("connection", (socket) => {
  socket.on("enter_matchmaking", async (arg, callback) => {
    // more user information here later (socials, username, profile_picture, etc.)
    if (!arg.id || arg.id.slice(0, 5) !== "user_") {
      callback("invalid id");
      return;
    }

    try {
      io.emit("new_user", {
        id: arg.id,
        offferDescription: arg.offerDescription,
        // more user information here later (socials, username, profile_picture, etc.)
      });
      callback("success");
    } catch (err) {
      callback(err);
    }
  });

  /* 
  an interested peer that is open to handshake sent their answer
  it is being sent privately to the initial offer holder
  */

  socket.on("client_answer", (arg) => {
    console.log("transmiting answer to initial peer", arg);
    io.emit("server_answer", {
      id: arg.id, // id of the initial sender
      remoteID: arg.remoteID, // id of the responder
      answerDescription: arg.answerDescription,
    });
  });

  /*
  a peer has found a match (they exchanged offers already) and is now sending ice candidates privately to the other peer
  */
  socket.on("send_ice", (arg) => {
    console.log(arg);

    io.emit("ice_candidate", {
      id: arg.id,
      remoteID: arg.remoteID,
      ice_candidate: arg.ice_candidate,
    });

    console.log("transmitted ice candidate to another peer");
  });
});

io.on("listening", () => {
  console.log("listening on port 3000");
});

io.on("error", (err) => {
  console.log(err);
});

httpServer.listen(3000);
