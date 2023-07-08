import { io } from "socket.io-client";
import supabase from "./useSupabase";

const socket = io("ws://localhost:3000");
let id: string;

let remoteID: string | null = null;

socket.emit(
  "enter_matchmaking",
  {
    id: socket.id,
    localDescription: "offer",
    open_to_handshake: true,
  },
  (response_from_server: boolean) => {
    id = socket.id;

    if (response_from_server) {
      console.log("server received the initial offer");
      console.log("Successfully entered matchmaking db");
    }
  }
);

// the offer found an interested peer that is open to handshake
socket.on("server_offer", async (arg) => {
  /* 
  generate answer to the offer here
  */

  console.log(arg);

  if (arg.id === socket.id || arg.open_to_handshake === false) {
    console.log("not interested");
    return;
  } else {
    // send answer to the initial offer
    socket.emit("client_answer", {
      id: arg.id, // id of the initial offer holder
      remoteID: id, // self id to be used by the other peer to send ice candidates and etc
      answerDescription: "answer",
    });
    console.log("sent answer to the initial offer");
  }
});

socket.on(
  "server_answer",
  (arg: { id: string; remoteID: string; answerDescription: string }) => {
    if (arg.id === id) {
      console.log("Friend found!", arg.remoteID);
      console.log(arg.answerDescription);
      remoteID = arg.remoteID;
      // we can now send ice candidates to the other peer
    }
  }
);
