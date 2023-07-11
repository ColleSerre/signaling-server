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

const emitOffer = async (peer: any) => {
  io.emit("server_offer", {
    id: peer.id, // id of the initial offer holder
    offerDescription: peer.offerDescription, // the offer description
    open_to_handshake: peer.open_to_handshake, // if the initial offer holder is open to handshake
  });
};

const matchmaking = supabase
  .channel("any")
  .on(
    "postgres_changes",
    { event: "INSERT", schema: "public", table: "matchmaking" },
    async (payload) => {
      // new offers are emitted to all clients on ws, they all check if they are not the offer holder and if they are open to handshake then answer the offer
      emitOffer(payload.new);
    }
  );

const matchmaking1 = supabase
  .channel("any")
  .on(
    "postgres_changes",
    { event: "UPDATE", schema: "public", table: "matchmaking" },
    async (payload) => {
      // new offers are emitted to all clients on ws, they all check if they are not the offer holder and if they are open to handshake then answer the offer
      emitOffer(payload.new);
    }
  );

matchmaking.subscribe();
matchmaking1.subscribe();

io.on("connection", (socket) => {
  socket.on("enter_matchmaking", async (arg, callback) => {
    // more user information here later (socials, username, profile_picture, etc.)
    if (!arg.id || arg.id.slice(0, 5) !== "user_") {
      callback("invalid id");
      return;
    }

    try {
      const { data, error } = await supabase.from("matchmaking").insert({
        id: arg.id,
        offerDescription: arg.offerDescription,
      });
      callback("entered matchmaking");
    } catch (error) {
      console.log(error);
      if (error?.code === "23505") {
        const { data, error } = await supabase
          .from("matchmaking")
          .update({
            offerDescription: arg.offerDescription,
          })
          .eq("id", arg.id);
        if (!error) callback("Updated existing offer description");
        else callback(error);
      } else {
        callback(error);
      }
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
  socket.on("client_send_ice_candidate", (arg) => {
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
