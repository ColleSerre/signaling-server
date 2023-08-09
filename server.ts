require("dotenv").config();
import { Server } from "socket.io";
import supabase from "./useSupabase";
const express = require("express");
const http = require("http");
import { Configuration, OpenAIApi } from "openai";
const { Expo } = require("expo-server-sdk");

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const expo = new Expo();
let messages: { to: any; sound: string; body: string }[] = [];
let last_batch_sent_at = new Date();

const app = express();
const server = http.createServer(app);

let connections: Map<
  string,
  {
    uid: string;
    remotePeer?: string;
  }
> = new Map();

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

  // handling end of calls

  const endCall = () => {
    console.log("ending call", connections);
    if (!connections.get(socket.id)) {
      console.log("Couldn't find socket id in recorded connections");
      return;
    }

    const remotePeer = connections.get(socket.id)?.remotePeer;

    if (!remotePeer) {
      console.log("Connection doesn't have a remote peer");
      return;
    }
    // send a message to the remote peer telling it to close the call on their end
    // eg: removing remote video stream, closing the peer connection, setting as available in db
    io.emit("callClosed", remotePeer);
  };

  socket.on("uid", async (uid: string) => {
    console.log(uid);
    connections.set(socket.id, { uid: uid });
    console.log(connections);
  });

  // callStart takes two args, peer1 which is the emitter and peer2 which is the remotePeer of peer1
  socket.on("callStart", (peer1: string, peer2: string) => {
    console.log("call started");
    connections.set(socket.id, { uid: peer1, remotePeer: peer2 });
    console.log(connections);
  });

  socket.on("endCall", endCall);

  socket.on("disconnect", endCall);
});

io.on("listening", () => {
  console.log("listening on port 3000");
});

io.on("error", (err) => {
  console.log(err);
});

// for testing only, send a push notification to the communicated expo token

app.post("/api/send_push", async (req, res) => {
  // get expo push token from post parameters
  const token = req.query.token;
  const message = "Hello World!";
  const title = "New Message";
  const sound = "default";
  const body = "Hello world!";

  if (!Expo.isExpoPushToken(token)) {
    console.error(`Push token ${token} is not a valid Expo push token`);
    return;
  }

  messages.push({
    to: token,
    sound: sound,
    body: body,
  });

  if (messages.length > 0) {
    let chunks = expo.chunkPushNotifications(messages);
    let tickets = [];
    (async () => {
      for (let chunk of chunks) {
        try {
          let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
          console.log(ticketChunk);
          tickets.push(...ticketChunk);
        } catch (error) {
          console.error(error);
        }
      }
    })();
  }

  res.send("success");
});

// here we listen for changes in the database and send notifications to the users

const checkTickets = (tickets: any) => {
  let receiptIds = [];
  for (let ticket of tickets) {
    // NOTE: Not all tickets have IDs; for example, tickets for notifications
    // that could not be enqueued will have error information and no receipt ID.
    if (ticket.id) {
      receiptIds.push(ticket.id);
    }
  }

  let receiptIdChunks = expo.chunkPushNotificationReceiptIds(receiptIds);
  (async () => {
    // Like sending notifications, there are different strategies you could use
    // to retrieve batches of receipts from the Expo service.
    for (let chunk of receiptIdChunks) {
      try {
        let receipts = await expo.getPushNotificationReceiptsAsync(chunk);
        console.log(receipts);

        // The receipts specify whether Apple or Google successfully received the
        // notification and information about an error, if one occurred.
        for (let receiptId in receipts) {
          let { status, message, details } = receipts[receiptId];
          if (status === "ok") {
            continue;
          } else if (status === "error") {
            console.error(
              `There was an error sending a notification: ${message}`
            );
            if (details && details.error) {
              // The error codes are listed in the Expo documentation:
              // https://docs.expo.io/push-notifications/sending-notifications/#individual-errors
              // You must handle the errors appropriately.
              console.error(`The error code is ${details.error}`);
            }
          }
        }
      } catch (error) {
        console.error(error);
      }
    }
  })();
};
supabase
  .channel("notifications-channel")
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "notifications",
    },
    (payload) => {
      if (payload.eventType == "INSERT") {
        console.log("new notification", payload);
        const requester = payload.new.requester; // this is a uid
        const init_at = payload.new.init_at; // this is a timestamp

        // fetch the requested's push token from the database
        supabase
          .from("users")
          .select("push_token")
          .eq("uid", payload.new.requested) // this is a uid too
          .then(({ data, error }) => {
            if (data) {
              const pushToken = data[0].push_token;
              if (!Expo.isExpoPushToken(pushToken)) {
                console.error(
                  `Push token ${pushToken} is not a valid Expo push token`
                );
                return;
              }

              // construct the message
              messages.push({
                to: pushToken,
                sound: "default",
                body: `Check it out, ${requester} sent you a handshake!`,
              });
              // add the requester to the requestee's list of requests
              supabase
                .from("users")
                .select("requests")
                .eq("uid", payload.new.requested)
                .then(({ data, error }) => {
                  if (data) {
                    const requests = data[0].requests;
                    requests.push({
                      requester: requester,
                      init_at: init_at,
                    });
                    supabase
                      .from("users")
                      .update({ requests: requests })
                      .eq("uid", payload.new.requested)
                      .then(({ data, error }) => {
                        if (data) {
                          console.log("updated requests");
                        }
                        if (error) {
                          console.log(error);
                        }
                      });
                  }
                });
            }
            if (error) {
              console.log(error);
              return;
            }
          });

        // batch send the messages every 30 seconds
        if (
          new Date().getTime() - last_batch_sent_at.getTime() > 10000 &&
          messages.length > 0
        ) {
          console.log("sending batch of messages");
          let chunks = expo.chunkPushNotifications(messages);
          let tickets: any[] = [];
          const _prev_batch = last_batch_sent_at;
          (async () => {
            for (let chunk of chunks) {
              try {
                let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                if (ticketChunk.status === "ok") {
                  console.log("sent push notification ✅");
                } else {
                  console.log("failed to send push notification ❌");
                }

                tickets.push(...ticketChunk);
              } catch (error) {
                last_batch_sent_at = _prev_batch;
                console.error(error);
              }
            }
            last_batch_sent_at = new Date();
          })();
          // check the status of the tickets (even past ones)
          checkTickets(tickets);
        }
      }
    }
  )
  .subscribe();

server.listen(3000);
