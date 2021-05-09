import {Device} from "mediasoup-client";

async function loadDevice(routerRtpCapabilities) {
    let device;
    try {
        device = new Device();
        console.log(device.loaded);
    } catch (error) {
        if (error.name === "UnsupportedError") {
            console.error("browser not supported");
        }
    }
    await device.load({routerRtpCapabilities});
    console.log(device.loaded);

    return device;
}

async function publish(socket, device) {
    const data = await socket.request("createWebRtcTransport", {
        forceTcp: false,
        rtpCapabilities: device.rtpCapabilities,
    });

    if (data.error) {
        console.error(data.error);
        return;
    }

    console.log(device.canProduce("audio"));

    const transport = device.createSendTransport(data);

    transport.on("connect", async ({dtlsParameters}, callback, errback) => {
        const connection = await socket.request("connectTransport", {transport_id: transport._id, dtlsParameters});
        if (connection) {
            callback();
        } else {
            errback();
        }
    });

    const transportId = transport._id;
    transport.on("produce", async ({kind, rtpParameters}, callback, errback) => {
        console.log(kind);

        try {
            const {producer_id} = await socket.request("produce", {
                kind,
                rtpParameters,
                transportId,
            });
            console.log("Producer id->", producer_id);
            callback({id: producer_id});
        } catch (err) {
            console.error(err);
            errback(err);
        }
    });

    transport.on("connectionstatechange", (state) => {
        switch (state) {
            case "connecting":
                console.log("publishing...");
                break;

            case "connected":
                console.log("published");
                break;

            case "failed":
                console.log("failed");
                transport.close();
                break;

            default:
                break;
        }
    });

    let stream;
    try {
        stream = await getUserMedia();
        if (stream.getAudioTracks()) {
            const track = stream.getAudioTracks()[0];

            const producer = await transport.produce({track});
            console.log(producer);
        }
    } catch (err) {
        console.log(err);
    }
}

async function getUserMedia() {
    let stream;
    try {
        stream = await navigator.mediaDevices.getUserMedia({audio: true, video: false});
        console.log(stream);
    } catch (err) {
        console.error("getUserMedia() failed:", err.message);
        throw err;
    }
    return stream;
}

async function subscribe(socket, device, producerId) {
    const data = await socket.request("createWebRtcTransport", {
        forceTcp: false,
        rtpCapabilities: device.rtpCapabilities,
    });

    if (data.error) {
        console.error(data.error);
        return;
    }

    const transport = device.createRecvTransport(data);
    transport.on("connect", async ({dtlsParameters}, callback, errback) => {
        try {
            const connection = await socket.request("connectTransport", {
                transportId: transport.id,
                dtlsParameters,
            });

            console.log("Consumer connected", connection);
            callback();
        } catch (err) {
            errback(err);
        }
    });

    transport.on("connectionstatechange", (state) => {
        switch (state) {
            case "connecting":
                console.log("consumer publishing...");
                break;

            case "connected":
                console.log("consumer published");
                break;

            case "failed":
                console.log("consumer failed");
                transport.close();
                break;

            default:
                break;
        }
    });

    console.log(producerId);
    await consume(transport, socket, device, producerId);
}

async function consume(transport, socket, device, producer_id) {
    const {rtpCapabilities} = device;
    const consumerTransportId = transport._id;
    const data = await socket.request("consume", {consumerTransportId, producerId: producer_id, rtpCapabilities});
    const {producerId, id, kind, rtpParameters} = data;
    const codecOptions = {};
    try {
        const consumer = await transport.consume({
            id,
            producerId,
            kind,
            rtpParameters,
            codecOptions,
        });

        console.log(consumer.track);

        if (consumer.kind === "audio") {
            const video = document.createElement("video");
            const stream = new MediaStream();
            stream.addTrack(consumer.track);
            video.srcObject = stream;
            video.autoplay = true;
            video.muted = true;
            video.width = 240;
            video.height = 180;
            video.volume = 1.0;
            video.controls = "1";
            video.style = "border: solid green 5px;";
            document.getElementById("container").appendChild(video);
            console.log(consumer);
            await video
                .play()
                .then(() => {
                    console.log("caliyor");
                    video.muted = false;
                })
                .catch((e) => {
                    console.log(e);
                });
        }

        consumer.on("close", () => {
            console.log("Consumer closed");
        });
    } catch (err) {
        console.log(err);
    }
}

const getRtpCapabilities = async (socket) => {
    const data = await socket.request("getRouterRtpCapabilities");
    return loadDevice(data);
};

const createRoom = async (socket, roomId) => {
    const createdRoom = await socket.request("createRoom", {room_id: roomId});
    console.log(createdRoom);
};

const joinRoom = async (socket, roomId, name) => {
    const joinedRoom = await socket.request("join", {room_id: roomId, name});
    console.log(joinedRoom);

    if (joinedRoom === true) {
        return;
    }
};

export {joinRoom, consume, getRtpCapabilities, createRoom, subscribe, getUserMedia, publish, loadDevice};
