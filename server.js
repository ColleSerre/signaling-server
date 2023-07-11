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
var socket_io_1 = require("socket.io");
var useSupabase_1 = require("./useSupabase");
var path = require("path");
var createServer = require("http").createServer;
var httpServer = createServer();
httpServer.on("listening", function () {
    console.log("listening on port 8080");
});
var io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});
var emitOffer = function (peer) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        io.emit("server_offer", {
            id: peer.id,
            offerDescription: peer.offerDescription,
            open_to_handshake: peer.open_to_handshake, // if the initial offer holder is open to handshake
        });
        return [2 /*return*/];
    });
}); };
var matchmaking = useSupabase_1.default
    .channel("any")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "matchmaking" }, function (payload) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        // new offers are emitted to all clients on ws, they all check if they are not the offer holder and if they are open to handshake then answer the offer
        emitOffer(payload.new);
        return [2 /*return*/];
    });
}); });
matchmaking.subscribe();
io.on("connection", function (socket) {
    console.log("a user connected");
    socket.on("enter_matchmaking", function (arg, callback) { return __awaiter(void 0, void 0, void 0, function () {
        var _a, data, error;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    // more user information here later (socials, username, profile_picture, etc.)
                    if (!arg.id || arg.id.slice(0, 5) !== "user_") {
                        callback("invalid id");
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, useSupabase_1.default.from("matchmaking").insert({
                            id: arg.id,
                            offerDescription: arg.offerDescription,
                            open_to_handshake: arg.open_to_handshake,
                        })];
                case 1:
                    _a = _b.sent(), data = _a.data, error = _a.error;
                    if (error) {
                        if ((error === null || error === void 0 ? void 0 : error.code) === "23505") {
                            console.log("already in matchmaking db");
                            callback(undefined);
                        }
                        else {
                            console.log(error);
                            callback(error);
                        }
                    }
                    else {
                        console.log(arg.id + " successfully entered matchmaking db");
                        callback(true);
                    }
                    return [2 /*return*/];
            }
        });
    }); });
    /*
    an interested peer that is open to handshake sent their answer
    it is being sent privately to the initial offer holder
    */
    socket.on("client_answer", function (arg) {
        io.to(arg.id).emit("server_answer", {
            id: arg.id,
            remoteID: arg.remoteID,
            answerDescription: arg.answerDescription,
        });
    });
    /*
    a peer has found a match (they exchanged offers already) and is now sending ice candidates privately to the other peer
    */
    socket.on("client_send_ice_candidate_private", function (arg) {
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
io.on("listening", function () {
    console.log("listening on port 8080");
});
io.on("error", function (err) {
    console.log(err);
});
httpServer.listen(8080);
