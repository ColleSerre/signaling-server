import { Server } from "socket.io";
import supabase from "./useSupabase";
const express = require("express");
const path = require("path");
const { createServer } = require("http");

const app = express();
app.use(express.static(path.join(__dirname, "/public")));

const server = createServer(app);

const io = new Server(server);

const emitOffer = async (peer: any) => {
  io.emit("server_offer", {
    id: peer.id, // id of the initial offer holder
    open_to_handshake: peer.open_to_handshake, // if the initial offer holder is open to handshake
    offerDescription: peer.offerDescription, // the offer description
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

matchmaking.subscribe();

io.on("connection", (socket) => {
  socket.on("enter_matchmaking", async (arg, callback) => {
    // more user information here later (socials, username, profile_picture, etc.)

    const { data, error } = await supabase.from("matchmaking").insert({
      id: arg.id,
      offerDescription: arg.localDescription,
      open_to_handshake: arg.open_to_handshake,
    });

    if (error) {
      if (error?.code === "23505") {
        console.log("already in matchmaking db");
        callback(undefined);
      } else {
        console.log(error);
        callback(false);
      }
    } else {
      console.log(arg.id + " successfully entered matchmaking db");
      callback(true);
    }
  });

  /* 
  an interested peer that is open to handshake sent their answer
  it is being sent privately to the initial offer holder
  */

  socket.on("client_answer", (arg) => {
    io.to(arg.id).emit("server_answer", {
      id: arg.id,
      remoteID: arg.remoteID,
      answerDescription: arg.answerDescription,
    });
  });

  /*
  a peer has found a match (they exchanged offers already) and is now sending ice candidates privately to the other peer
  */
  socket.on("client_send_ice_candidate_private", (arg) => {
    console.log(arg);

    socket.join(arg.id);

    io.to(arg.id).emit("server_transmit_ice_candidate_private", {
      id: arg.id,
      remoteID: arg.remoteID,
      ice_candidate: arg.ice_candidate,
    });

    console.log("transmitted ice candidate to another peer");
  });
});

io.on("listening", () => {
  console.log("listening on port 8080");
});

io.on("error", (err) => {
  console.log(err);
});

server.listen(8080, function () {
  console.log("Listening on http://0.0.0.0:8080");
});
