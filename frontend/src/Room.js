/* eslint-disable no-undef */
import React, {useContext, useState, useDebounce} from "react";
import {publish, startMedia, createRoom, joinRoom, sendMessage} from "./roomHelpers";
import {SocketContext} from "./context/socket.js";
import {Formik, Form, Field, ErrorMessage} from "formik";
import {ChatFeed, Message} from "react-chat-ui";
import {debounce} from "lodash";

export function Room() {
    const socket = useContext(SocketContext);
    const [selectedRoom, setSelectedRoom] = useState(false);
    const [rooms, setRooms] = useState([]);
    const [localStream, setStream] = useState();
    const [clientId, setClientId] = useState();
    const [messages, setMessages] = useState([
        new Message({
            id: 1,
            message: "I'm the recipient! (The person you're talking to)",
        }),
        new Message({id: 0, message: "I'm you -- the blue bubble!"}), // Blue bubble
    ]);
    const [isTyping, setIsTyping] = useState(false);

    socket.on("existingRooms", (message) => {
        setRooms(message.existingRooms);
    });

    socket.on("message", (message) => {
        console.log("socket.io message:", message);
        if (message.type === "welcome") {
            if (socket.id !== message.id) {
                console.warn("WARN: something wrong with clientID", socket.io, message.id);
            }

            setClientId(message.id);
            console.log("connected to server. clientId=" + message.id);
        } else if (message.type === "room_message") {
            console.log(message);
            const existingMessages = [...messages];
            const newMessage = message && message.chatMessage;
            if (newMessage) {
                setMessages([...existingMessages, new Message({id: 1, message: newMessage})]);
            }
        } else {
            console.error("UNKNOWN message from server:", message);
        }
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

    const handleIsTyping = debounce(() => {
        setIsTyping(false);
    }, 1500);

    const initialValues = {
        chat_message: "your message !",
    };

    return (
        <>
            <div id="container">
                <div>Discussly</div>
                {renderRooms()}
                <button onClick={() => publish(socket, localStream, selectedRoom, clientId)}>Speak</button>
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
                        setRooms([...rooms, newRoom]);
                    }}
                >
                    Create a Room
                </button>
                <video id="local_video" autoPlay style={{width: 120, height: 90, border: "1px solid black"}}>
                    Local
                </video>
                <ChatFeed
                    messages={messages} // Array: list of message objects
                    isTyping={isTyping} // Boolean: is the recipient typing
                    hasInputField={false} // Boolean: use our input, or use your own
                    showSenderName // show the name of the user who sent the message
                    bubblesCentered={false} //Boolean should the bubbles be centered in the feed?
                    // JSON: Custom bubble styles
                    bubbleStyles={{
                        text: {
                            fontSize: 15,
                        },
                        chatbubble: {
                            borderRadius: 70,
                            padding: 20,
                        },
                    }}
                />
                <Formik
                    initialValues={initialValues}
                    onSubmit={async (values, {setSubmitting}) => {
                        setSubmitting(false);
                        const existingMessages = [...messages];
                        setMessages([...existingMessages, new Message({id: 0, message: values.chat_message})]);
                        await sendMessage(socket, {chatMessage: values.chat_message, selectedRoom});
                    }}
                >
                    {({isSubmitting}) => (
                        <Form>
                            <span className="user-typing">{isTyping && `a user is typing....`}</span>
                            <Field name="chat_message">
                                {({
                                    field, // { name, value, onChange, onBlur }
                                    form,
                                    meta,
                                }) => (
                                    <div>
                                        <input
                                            type="text"
                                            name="chat_message"
                                            placeholder="Email"
                                            value={field.value}
                                            {...field}
                                            onChange={(e) => {
                                                setIsTyping(true);
                                                handleIsTyping();
                                                form.setFieldValue(field.name, e.target.value);
                                            }}
                                        />
                                        {meta.touched && meta.error && <div className="error">{meta.error}</div>}
                                    </div>
                                )}
                            </Field>
                            <ErrorMessage name="text" component="div" />
                            <button type="submit" disabled={isSubmitting}>
                                Submit
                            </button>
                        </Form>
                    )}
                </Formik>
            </div>
        </>
    );
}
