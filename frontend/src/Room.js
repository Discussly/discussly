/* eslint-disable no-undef */
import React, {useEffect, useState} from "react";
const {uuid} = require("uuidv4");

const io = require("socket.io-client");
import socketPromise from "./socketPromise";
import {getRtpCapabilities, createRoom, joinRoom, subscribe, publish} from "./roomHelpers";

export function Room() {
    const {REACT_APP_SERVER_HOST, REACT_APP_SERVER_PORT} = process.env;
    const serverUrl = `http://${REACT_APP_SERVER_HOST}:${REACT_APP_SERVER_PORT}`;
    const opts = {
        path: "/server",
        transports: ["websocket"],
    };
    const [roomId, setRoomId] = useState("");
    const [existingRoom, setExistingRooms] = useState([]);

    const [connectedSocket, setSocket] = useState();
    const [testDevice, setTestDevice] = useState();
    const socket = io.connect(serverUrl, opts);

    const urlParams = new URLSearchParams(window.location.search);
    const urlRoomId = urlParams.get("roomId");
    const peerName = urlParams.get("peerName");

    let device;

    console.log(urlParams, window.location.search);
    console.log(urlRoomId, peerName);

    console.log(existingRoom);

    socket.request = socketPromise(socket);

    useEffect(() => {
        socket.on("connect", async () => {
            console.log("Connected to the socket !", socket);

            await createRoom(socket, "room1");

            await joinRoom(socket, "room1", peerName);

            device = await getRtpCapabilities(socket);

            console.warn(device, socket);

            setSocket(socket);
            setTestDevice(device);
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

        socket.on("existingRooms", (data) => {
            console.log("evet existing");
            console.log(data);
            setExistingRooms(data);
        });

        console.log(connectedSocket, device);
        socket.on("newProducerJoined", async (data) => {
            console.log("New producer joinend --> id: ", data);
            console.log(socket, device);
            if (data && device) {
                await subscribe(socket, device, data);
            }
        });
    }, []);

    console.log(connectedSocket, testDevice);
    return (
        <>
            <div id="container">
                <div>Test Room 1</div>
            </div>
            <button onClick={() => publish(connectedSocket, testDevice)}>Speak</button>
        </>
    );
}
