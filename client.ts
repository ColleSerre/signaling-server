import { io } from "socket.io-client";
import supabase from "./useSupabase";

const socket = io("ws://localhost:8080");
let id: string;

let remoteID: string | null = null;
let candidates: any[] = [];

socket.on("connect", () => {
  socket.emit(
    "enter_matchmaking",
    {
      id: socket.id,
      localDescription: "offer",
      open_to_handshake: true,
    },
    (response_from_server) => {
      id = socket.id;

      if (response_from_server) {
        console.log("server received the initial offer");
        console.log("Successfully entered matchmaking db");
      } else {
        console.log(response_from_server);
      }
    }
  );
});

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
      // we can now send ice candidates to the other peer without passing through the server

      console.log("sending ice candidates to", remoteID); // debug, check if remoteID is not null 👨‍🌾

      socket.emit("client_send_ice_candidate_private", {
        id: remoteID,
        remoteID: id,
        ice_candidate: "ice_candidate",
      });
    }
  }
);

//  the other peer sent an ice candidate
socket.on("server_transmit_ice_candidate_private", (arg) => {
  if (arg.id === id) {
    console.log("received ice candidate from the other peer via server");
    console.log(arg.ice_candidate);
    // process ice candidate here

    // send ice candidate to the other peer
    socket.emit("client_send_ice_candidate_private", {
      id: arg.remoteID,
      remoteID: id,
      ice_candidate: "ice_candidate",
    });
    console.log("sent ice candidate to the other peer via server");
  }
});
