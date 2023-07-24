require("dotenv").config();
import { Server } from "socket.io";
import supabase from "./useSupabase";
const express = require("express");
const http = require("http");
import { Configuration, OpenAIApi } from "openai";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const app = express();
const server = http.createServer(app);

// create a new api endpoint on /api/ai_approval

app.post("/api/ai_approval", async (req, res) => {
  console.log(req.query);
  // get post parameters
  const prompt = {
    topic: req.query.topic,
  };

  const completion = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content:
          "You will be provided with a topic a user is attempting to submit for approval on an online social media platform. You should check if the topic is compliant to the community guidelines. Although slang, familiar language and cursing is allowed, the community guidelines exclude topics like: * Hate speech * Violence * LGBTQIA+-phobic language * Racist speech * References to right wing dogwhistles * Adult content (excluding explicitly for educative purposes) * Promotion of gambling and possible scams. You should respond as follows: Answer in json while respecting the standards of its syntax. If the topic is cleared to be published and isn't harmful, set the status property 'approved'. Else, set it to 'ai-denied' for further human moderation. Always include a 'topic' property, which will contain the submitted topic",
      },
      { role: "user", content: prompt.topic },
    ],
  });

  console.log(completion.data.choices[0]);
  res.send(completion.data.choices[0]);
});

const io = new Server(server, {
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
      else callback(error);
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

    if (!arg.sender || !arg.receiver || !arg.ice_candidate) {
      console.log("invalid ice candidate");
      return;
    } else {
      io.emit("ice_candidate", {
        sender: arg.id,
        receiver: arg.remoteID,
        ice_candidate: arg.ice_candidate,
      });

      console.log("transmitted ice candidate to another peer");
    }
  });

  // sometimes we need to renegotiate the connection so one peer resends an offer and the other peer resends an answer
  socket.on("renegotiating_offer", (arg) => {
    io.emit("renegotiation", {
      id: arg.id,
      remoteID: arg.remoteID,
      offerDescription: arg.offerDescription,
    });
  });
});

io.on("listening", () => {
  console.log("listening on port 3000");
});

io.on("error", (err) => {
  console.log(err);
});

server.listen(3000);
