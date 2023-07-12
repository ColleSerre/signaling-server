import { Server } from "socket.io";
import supabase from "./useSupabase";
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

io.on("open", () => {
  console.log("socket.io server open");
});

io.on("connection", (socket) => {
  socket.on("enter_matchmaking", async (arg, callback) => {
    // more user information here later (socials, username, profile_picture, etc.)
    if (!arg.id || arg.id.slice(0, 5) !== "user_") {
      callback("invalid id");
      return;
    }

    const { data, error } = await supabase.from("matchmaking").insert([
      {
        id: arg.id,
        offerDescription: arg.offerDescription,
      },
    ]);

    if (!error) callback("success");

    if (error?.code === "23505") {
      // duplicate key error
      const { data, error } = await supabase
        .from("matchmaking")
        .update({ offerDescription: arg.offerDescription })
        .eq("id", arg.id);
      if (!error) callback("updated entry");
    } else callback(error);
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
