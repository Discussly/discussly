/* eslint-disable no-undef */
import React, {useEffect, useState} from "react";
const {uuid} = require("uuidv4");

const io = require("socket.io-client");
import socketPromise from "./socketPromise";
import {getRtpCapabilities, createRoom, joinRoom} from "./roomHelpers";

export function Room() {
    const {REACT_APP_SERVER_HOST, REACT_APP_SERVER_PORT} = process.env;
    const serverUrl = `http://${REACT_APP_SERVER_HOST}:${REACT_APP_SERVER_PORT}`;
    const opts = {
        path: "/server",
        transports: ["polling"],
    };
    const [connectedSocket, setSocketId] = useState("");
    const [roomId, setRoomId] = useState("");

    // Socket check !
    useEffect(() => {
        const socket = io.connect(serverUrl, opts);
        console.warn(serverUrl);
        console.log(socket);
        socket.request = socketPromise(socket);

        socket.on("connect", async () => {
            console.log("Connected to the socket !");
            setSocketId(socket);
        });

        socket.on("disconnect", async () => {
            console.error("Disconnected !");
        });

        socket.on("connect_error", (error) => {
            console.error("could not connect to");
        });

        socket.on("currentRooms", (data) => {
            console.log(data);
        });
    }, []);

    return (
        <>
            <div>Test Room 1</div>
            <button
                type="submit"
                onClick={() => {
                    const roomId = uuid();
                    setRoomId(roomId);
                    createRoom(connectedSocket, roomId);
                }}
            >
                Create room
            </button>
            <button type="submit" onClick={() => joinRoom(connectedSocket, roomId, "test-user")}>
                Join room
            </button>
        </>
    );
}
