"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv").config();
var socket_io_1 = require("socket.io");
var useSupabase_1 = require("./useSupabase");
var express = require("express");
var http = require("http");
var openai_1 = require("openai");
var httpServer = express;
console.log(process.env.OPENAI_API_KEY);
var configuration = new openai_1.Configuration({
    apiKey: "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",
});
var openai = new openai_1.OpenAIApi(configuration);
var app = express();
var server = http.createServer(app);
// create a new api endpoint on /api/ai_approval
app.post("/api/ai_approval", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var prompt, completion;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                console.log(req.query);
                prompt = {
                    topic: req.query.topic,
                };
                return [4 /*yield*/, openai.createChatCompletion({
                        model: "gpt-3.5-turbo",
                        messages: [
                            {
                                role: "system",
                                content: "You will be provided with a topic a user is attempting to submit for approval on an online social media platform. You should check if the topic is compliant to the community guidelines. Although slang, familiar language and cursing is allowed, the community guidelines exclude topics like: * Hate speech * Violence * LGBTQIA+-phobic language * Racist speech * References to right wing dogwhistles * Adult content (excluding explicitly for educative purposes) * Promotion of gambling and possible scams. You should respond as follows: Answer in json while respecting the standards of its syntax. If the topic is cleared to be published and isn't harmful, set the status property 'approved'. Else, set it to 'ai-denied' for further human moderation. Always include a 'topic' property, which will contain the submitted topic",
                            },
                            { role: "user", content: prompt.topic },
                        ],
                    })];
            case 1:
                completion = _a.sent();
                console.log(completion.data.choices[0]);
                res.send(completion.data.choices[0]).status(200);
                return [2 /*return*/];
        }
    });
}); });
var io = new socket_io_1.Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});
io.on("open", function () {
    console.log("socket.io server open");
});
io.on("connection", function (socket) {
    socket.on("enter_matchmaking", function (arg, callback) { return __awaiter(void 0, void 0, void 0, function () {
        var _a, data, error, _b, data_1, error_1;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    // more user information here later (socials, username, profile_picture, etc.)
                    if (!arg.id || arg.id.slice(0, 5) !== "user_") {
                        callback("invalid id");
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, useSupabase_1.default.from("matchmaking").insert([
                            {
                                id: arg.id,
                                offerDescription: arg.offerDescription,
                            },
                        ])];
                case 1:
                    _a = _c.sent(), data = _a.data, error = _a.error;
                    if (!error)
                        callback("success");
                    if (!((error === null || error === void 0 ? void 0 : error.code) === "23505")) return [3 /*break*/, 3];
                    return [4 /*yield*/, useSupabase_1.default
                            .from("matchmaking")
                            .update({ offerDescription: arg.offerDescription })
                            .eq("id", arg.id)];
                case 2:
                    _b = _c.sent(), data_1 = _b.data, error_1 = _b.error;
                    if (!error_1)
                        callback("updated entry");
                    else
                        callback(error_1);
                    _c.label = 3;
                case 3: return [2 /*return*/];
            }
        });
    }); });
    /*
    an interested peer that is open to handshake sent their answer
    it is being sent privately to the initial offer holder
    */
    socket.on("client_answer", function (arg) {
        console.log("transmiting answer to initial peer", arg);
        io.emit("server_answer", {
            id: arg.id,
            remoteID: arg.remoteID,
            answerDescription: arg.answerDescription,
        });
    });
    /*
    a peer has found a match (they exchanged offers already) and is now sending ice candidates privately to the other peer
    */
    socket.on("send_ice", function (arg) {
        console.log(arg);
        if (!arg.sender || !arg.receiver || !arg.ice_candidate) {
            console.log("invalid ice candidate");
            return;
        }
        else {
            io.emit("ice_candidate", {
                sender: arg.sender,
                receiver: arg.receiver,
                ice_candidate: arg.ice_candidate,
            });
            console.log("transmitted ice candidate to another peer");
        }
    });
    // sometimes we need to renegotiate the connection so one peer resends an offer and the other peer resends an answer
    socket.on("renegotiating_offer", function (arg) {
        io.emit("renegotiation", {
            id: arg.id,
            remoteID: arg.remoteID,
            offerDescription: arg.offerDescription,
        });
    });
});
io.on("listening", function () {
    console.log("listening on port 3000");
});
io.on("error", function (err) {
    console.log(err);
});
server.listen(3000);
