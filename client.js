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
var socket_io_client_1 = require("socket.io-client");
var socket = (0, socket_io_client_1.io)("ws://localhost:3000");
var id;
var remoteID = null;
socket.emit("enter_matchmaking", {
    id: socket.id,
    localDescription: "offer",
    open_to_handshake: true,
}, function (response_from_server) {
    id = socket.id;
    if (response_from_server) {
        console.log("server received the initial offer");
        console.log("Successfully entered matchmaking db");
    }
});
// the offer found an interested peer that is open to handshake
socket.on("server_offer", function (arg) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        /*
        generate answer to the offer here
        */
        console.log(arg);
        if (arg.id === socket.id || arg.open_to_handshake === false) {
            console.log("not interested");
            return [2 /*return*/];
        }
        else {
            // send answer to the initial offer
            socket.emit("client_answer", {
                id: arg.id,
                remoteID: id,
                answerDescription: "answer",
            });
            console.log("sent answer to the initial offer");
        }
        return [2 /*return*/];
    });
}); });
socket.on("server_answer", function (arg) {
    if (arg.id === id) {
        console.log("Friend found!", arg.remoteID);
        console.log(arg.answerDescription);
        remoteID = arg.remoteID;
        // we can now send ice candidates to the other peer without passing through the server
        socket.emit("client_send_ice_candidate_private", {
            id: remoteID,
            remoteID: id,
            ice_candidate: "ice_candidate",
        });
    }
});
socket.on("server_transmit_ice_candidate_private", function (arg) {
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
