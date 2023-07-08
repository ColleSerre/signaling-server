import { Server } from "socket.io";
import supabase from "./useSupabase";

const emitOffer = async (peer: any) => {
  io.emit("server_offer", {
    id: peer.id,
    open_to_handshake: peer.open_to_handshake,
    offerDescription: peer.offerDescription,
  });
};

const matchmaking = supabase
  .channel("any")
  .on(
    "postgres_changes",
    { event: "INSERT", schema: "public", table: "matchmaking" },
    async (payload) => {
      emitOffer(payload.new);
    }
  );

const io = new Server(3000);

matchmaking.subscribe();

io.on("connection", (socket) => {
  socket.on("enter_matchmaking", async (arg, callback) => {
    const peerDescription = arg.localDescription;

    // more user information here later (socials, username, profile_picture, etc.)

    const { data, error } = await supabase.from("matchmaking").insert({
      id: socket.id,
      offerDescription: { peerDescription: peerDescription },
      open_to_handshake: arg.open_to_handshake,
    });

    if (error) {
      console.log(error);
      callback(false);
    } else {
      console.log("Successfully entered matchmaking db");
      callback(true);
    }
  });

  /* 
  an interested peer that is open to handshake sent their answer
  it is being sent privately to the initial offer holder
  */

  socket.on("client_answer", (arg) => {
    socket.join(arg.id);
    io.to(arg.id).emit("server_answer", {
      id: arg.id,
      remoteID: arg.remoteID,
      answerDescription: arg.answerDescription,
    });
  });
});

io.on("listening", () => {
  console.log("listening on port 3000");
});

io.on("error", (err) => {
  console.log(err);
});
