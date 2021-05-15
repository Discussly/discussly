/* eslint-disable no-undef */
/* eslint-disable no-param-reassign */
import {Device} from "mediasoup-client";
const io = require("socket.io-client");

const {REACT_APP_SERVER_HOST, REACT_APP_SERVER_PORT} = process.env;
const serverUrl = `http://${REACT_APP_SERVER_HOST}:${REACT_APP_SERVER_PORT}`;
const opts = {
    path: "/server",
    transports: ["websocket"],
};
let device;
let clientId;
let localStream;
let producerTransport;
let consumerTransport;
let videoConsumers = {};
let audioConsumers = {};

const connectSocket = (connectedSocket) => {
    if (connectedSocket) {
        connectedSocket.close();
        connectedSocket = null;
        clientId = null;
    }

    const socket = io.connect(serverUrl, opts);

    socket.on("connect", (evt) => {
        console.log("socket.io connected()");
    });
    socket.on("error", (err) => {
        console.error("socket.io ERROR:", err);
        reject(err);
    });
    socket.on("disconnect", (evt) => {
        console.log("socket.io disconnect:", evt);
    });
    socket.on("message", (message) => {
        console.log("socket.io message:", message);
        if (message.type === "welcome") {
            if (socket.id !== message.id) {
                console.warn("WARN: something wrong with clientID", socket.io, message.id);
            }

            clientId = message.id;
            console.log("connected to server. clientId=" + clientId);
        } else {
            console.error("UNKNOWN message from server:", message);
        }
    });
    socket.on("newProducer", (message) => {
        console.log("socket.io newProducer:", message);
        const remoteId = message.socketId;
        const prdId = message.producerId;
        const {kind} = message;
        if (kind === "video") {
            console.log("--try consumeAdd remoteId=" + remoteId + ", prdId=" + prdId + ", kind=" + kind);
            consumeAdd(socket, consumerTransport, remoteId, prdId, kind);
        } else if (kind === "audio") {
            console.log("--try consumeAdd remoteId=" + remoteId + ", prdId=" + prdId + ", kind=" + kind);
            consumeAdd(socket, consumerTransport, remoteId, prdId, kind);
        }
    });

    socket.on("producerClosed", (message) => {
        console.log("socket.io producerClosed:", message);
        const {localId} = message;
        const {remoteId} = message;
        const {kind} = message;
        console.log("--try removeConsumer remoteId=%s, localId=%s, track=%s", remoteId, localId, kind);
        removeConsumer(remoteId, kind);
        removeRemoteVideo(remoteId);
    });

    return socket;
};

const loadDevice = async (routerRtpCapabilities) => {
    try {
        device = new Device();
    } catch (error) {
        if (error.name === "UnsupportedError") {
            console.error("browser not supported");
        }
    }
    await device.load({routerRtpCapabilities});
};

const startMedia = () => {
    if (localStream) {
        console.warn("WARN: local media ALREADY started");
        return;
    }
    const localVideo = document.getElementById("local_video");

    navigator.mediaDevices
        .getUserMedia({audio: true, video: true})
        .then((stream) => {
            localStream = stream;
            playVideo(localVideo, localStream);
        })
        .catch((err) => {
            console.error("media ERROR:", err);
        });
};

const publish = async () => {
    let socket;
    try {
        socket = connectSocket();
        console.log(socket);
    } catch (e) {
        console.error(e);
    }

    if (!localStream || !socket) {
        console.warn("WARN: local media or socket NOT READY");
        return;
    }

    // --- get capabilities --
    const data = await sendRequest(socket, "getRouterRtpCapabilities", {});
    console.log("getRouterRtpCapabilities:", data);
    await loadDevice(data);

    // --- get transport info ---
    console.log("--- createProducerTransport --");
    const params = await sendRequest(socket, "createProducerTransport", {});
    console.log("transport params:", params);
    producerTransport = device.createSendTransport(params);
    console.log("createSendTransport:", producerTransport);

    // --- join & start publish --
    producerTransport.on("connect", async ({dtlsParameters}, callback, errback) => {
        console.log("--trasnport connect");
        sendRequest(socket, "connectProducerTransport", {dtlsParameters: dtlsParameters}).then(callback).catch(errback);
    });

    producerTransport.on("produce", async ({kind, rtpParameters}, callback, errback) => {
        console.log("--trasnport produce");
        try {
            const {id} = await sendRequest(socket, "produce", {
                transportId: producerTransport.id,
                kind,
                rtpParameters,
            });
            callback({id});
            console.log("--produce requested, then subscribe ---");
            subscribe(socket);
        } catch (err) {
            errback(err);
        }
    });

    producerTransport.on("connectionstatechange", (state) => {
        switch (state) {
            case "connecting":
                console.log("publishing...");
                break;

            case "connected":
                console.log("published");
                break;

            case "failed":
                console.log("failed");
                producerTransport.close();
                break;

            default:
                break;
        }
    });

    const useVideo = true;
    const useAudio = true;
    if (useVideo) {
        const videoTrack = localStream.getVideoTracks()[0];
        if (videoTrack) {
            const trackParams = {track: videoTrack};
            await producerTransport.produce(trackParams);
        }
    }
    if (useAudio) {
        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack) {
            const trackParams = {track: audioTrack};
            producerTransport.produce(trackParams);
        }
    }
};

const subscribe = async (socket) => {
    if (!socket) {
        await connectSocket().catch((err) => {
            console.error(err);
            return;
        });

        // --- get capabilities --
        const data = await sendRequest(socket, "getRouterRtpCapabilities", {});
        console.log("getRouterRtpCapabilities:", data);
        await loadDevice(data);
    }

    // --- prepare transport ---
    console.log("--- createConsumerTransport --");
    if (!consumerTransport) {
        const params = await sendRequest(socket, "createConsumerTransport", {});
        console.log("transport params:", params);
        consumerTransport = device.createRecvTransport(params);
        console.log("createConsumerTransport:", consumerTransport);

        // --- join & start publish --
        consumerTransport.on("connect", async ({dtlsParameters}, callback, errback) => {
            console.log("--consumer trasnport connect");
            sendRequest(socket, "connectConsumerTransport", {dtlsParameters: dtlsParameters})
                .then(() => {
                    callback();
                })
                .catch(errback);
        });

        consumerTransport.on("connectionstatechange", (state) => {
            switch (state) {
                case "connecting":
                    console.log("subscribing...");
                    break;

                case "connected":
                    console.log("subscribed");
                    //consumeCurrentProducers(clientId);
                    break;

                case "failed":
                    console.log("failed");
                    producerTransport.close();
                    break;

                default:
                    break;
            }
        });

        consumeCurrentProducers(socket, clientId);
    }
};

const consumeCurrentProducers = async (socket, clientId) => {
    console.log("-- try consuleAll() --");
    const remoteInfo = await sendRequest(socket, "getCurrentProducers", {localId: clientId}).catch((err) => {
        console.error("getCurrentProducers ERROR:", err);
        return;
    });
    console.log("remoteInfo.remoteVideoIds:", remoteInfo.remoteVideoIds);
    console.log("remoteInfo.remoteAudioIds:", remoteInfo.remoteAudioIds);
    consumeAll(socket, consumerTransport, remoteInfo.remoteVideoIds, remoteInfo.remoteAudioIds);
};

const consumeAll = (socket, transport, remoteVideoIds, remotAudioIds) => {
    console.log("----- consumeAll() -----");
    remoteVideoIds.forEach((rId) => {
        consumeAdd(socket, transport, rId, null, "video");
    });
    remotAudioIds.forEach((rId) => {
        consumeAdd(socket, transport, rId, null, "audio");
    });
};

const consumeAdd = async (socket, transport, remoteSocketId, prdId, trackKind) => {
    console.log("--start of consumeAdd -- kind=%s", trackKind);
    const {rtpCapabilities} = device;

    const data = await sendRequest(socket, "consumeAdd", {
        rtpCapabilities: rtpCapabilities,
        remoteId: remoteSocketId,
        kind: trackKind,
    }).catch((err) => {
        console.error("consumeAdd ERROR:", err);
    });

    const {producerId, id, kind, rtpParameters} = data;

    if (prdId && prdId !== producerId) {
        console.warn("producerID NOT MATCH");
    }

    let codecOptions = {};
    const consumer = await transport.consume({
        id,
        producerId,
        kind,
        rtpParameters,
        codecOptions,
    });

    addRemoteTrack(remoteSocketId, consumer.track);
    addConsumer(remoteSocketId, consumer, kind);
    consumer.remoteId = remoteSocketId;
    consumer.on("transportclose", () => {
        console.log("--consumer transport closed. remoteId=" + consumer.remoteId);
    });
    consumer.on("producerclose", () => {
        console.log("--consumer producer closed. remoteId=" + consumer.remoteId);
        consumer.close();
        removeConsumer(remoteId, kind);
        removeRemoteVideo(consumer.remoteId);
    });
    consumer.on("trackended", () => {
        console.log("--consumer trackended. remoteId=" + consumer.remoteId);
    });

    console.log("--end of consumeAdd");

    if (kind === "video") {
        console.log("--try resumeAdd --");
        sendRequest(socket, "resumeAdd", {remoteId: remoteSocketId, kind: kind})
            .then(() => {
                console.log("resumeAdd OK");
            })
            .catch((err) => {
                console.error("resumeAdd ERROR:", err);
            });
    }
};

const addConsumer = (id, consumer, kind) => {
    if (kind === "video") {
        videoConsumers[id] = consumer;
        console.log("videoConsumers count=" + Object.keys(videoConsumers).length);
    } else if (kind === "audio") {
        audioConsumers[id] = consumer;
        console.log("audioConsumers count=" + Object.keys(audioConsumers).length);
    } else {
        console.warn("UNKNOWN consumer kind=" + kind);
    }
};

const removeConsumer = (id, kind) => {
    if (kind === "video") {
        delete videoConsumers[id];
        console.log("videoConsumers count=" + Object.keys(videoConsumers).length);
    } else if (kind === "audio") {
        delete audioConsumers[id];
        console.log("audioConsumers count=" + Object.keys(audioConsumers).length);
    } else {
        console.warn("UNKNOWN consumer kind=" + kind);
    }
};

const findRemoteVideo = (id) => {
    let element = document.getElementById("remote_" + id);
    return element;
};

const addRemoteTrack = (id, track) => {
    let video = findRemoteVideo(id);
    if (!video) {
        video = addRemoteVideo(id);
        video.controls = "1";
    }

    if (video.srcObject) {
        video.srcObject.addTrack(track);
        return;
    }

    const newStream = new MediaStream();
    newStream.addTrack(track);
    playVideo(video, newStream)
        .then(() => {
            video.volume = 1.0;
        })
        .catch((err) => {
            console.error("media ERROR:", err);
        });
};

const addRemoteVideo = (id) => {
    let element = document.createElement("video");
    document.getElementById("container").append(element);
    element.id = "remote_" + id;
    element.width = 240;
    element.height = 180;
    element.autoplay = 1;
    element.volume = 0;
    element.controls = 1;
    element.style = "border: solid black 1px;";
    return element;
};

const playVideo = (element, stream) => {
    console.log(element);
    if (element.srcObject) {
        console.warn("element ALREADY playing, so ignore");
        return;
    }
    element.srcObject = stream;
    element.volume = 0;
    element.controls = 1;
    return element.play();
};

const sendRequest = (socket, type, data) => {
    return new Promise((resolve, reject) => {
        socket.emit(type, data, (err, response) => {
            if (!err) {
                // Success response, so pass the mediasoup response to the local Room.
                resolve(response);
            } else {
                reject(err);
            }
        });
    });
};

export {publish, startMedia};
