/* eslint-disable no-undef */
import React, {useContext, useState} from "react";
import {publish, startMedia, createRoom, joinRoom} from "./roomHelpers";
import {SocketContext} from "./context/socket.js";

export function Room() {
    const socket = useContext(SocketContext);
    const [selectedRoom, setSelectedRoom] = useState(false);
    const [rooms, setRooms] = useState([]);
    const [localStream, setStream] = useState();

    socket.on("existingRooms", (message) => {
        setRooms(message.existingRooms);
    });

    const renderRooms = () => {
        return rooms.map((room, i) => {
            return (
                <div key={i}>
                    <div>Room {i}</div>
                    <button
                        onClick={async () => {
                            setSelectedRoom(room);
                            await joinRoom(socket, room);
                        }}
                    >
                        Join this room
                    </button>
                </div>
            );
        });
    };

    return (
        <>
            <div id="container">
                <div>Discussly</div>
                {renderRooms()}
                <button onClick={() => publish(socket, localStream, selectedRoom)}>Speak</button>
                <button
                    onClick={async () => {
                        const stream = await startMedia();
                        setStream(stream);
                    }}
                >
                    Local connect
                </button>
                <button
                    onClick={async () => {
                        const newRoom = await createRoom(socket);
                        console.log(newRoom);
                    }}
                >
                    Create a Room
                </button>
                <video id="local_video" autoPlay style={{width: 120, height: 90, border: "1px solid black"}}>
                    Local
                </video>
            </div>
        </>
    );
}
