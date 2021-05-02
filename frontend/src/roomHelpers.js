import {Device} from "mediasoup-client";

async function loadDevice(routerRtpCapabilities) {
    let device;
    try {
        device = new Device();
        console.log(device);
    } catch (error) {
        if (error.name === "UnsupportedError") {
            console.error("browser not supported");
        }
    }
    await device.load({routerRtpCapabilities});

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
            console.warn("Producer ->", producer_id);
            callback({producer_id});
        } catch (err) {
            errback(err);
        }
    });

    let stream;
    try {
        stream = await getUserMedia(device, transport);
        if (stream.getAudioTracks()) {
            const track = stream.getAudioTracks()[0];
            const params = {
                track,
            };

            const producer = await transport.produce(params);
        }
    } catch (err) {
        console.log(err);
    }
}

async function getUserMedia(device) {
    if (!device.canProduce("video")) {
        console.error("cannot produce video");
        return;
    }

    let isWebcam = false;

    let stream;
    try {
        stream = await navigator.mediaDevices.getUserMedia({audio: true, video: false});
    } catch (err) {
        console.error("getUserMedia() failed:", err.message);
        throw err;
    }
    return stream;
}

async function subscribe(socket, device) {
    const data = await socket.request("createConsumerTransport", {
        forceTcp: false,
    });
    if (data.error) {
        console.error(data.error);
        return;
    }

    const transport = device.createRecvTransport(data);
    transport.on("connect", ({dtlsParameters}, callback, errback) => {
        socket
            .request("connectConsumerTransport", {
                transportId: transport.id,
                dtlsParameters,
            })
            .then(callback)
            .catch(errback);
    });

    const stream = consume(transport);
}

async function consume(transport, device, socket) {
    const {rtpCapabilities} = device;
    const data = await socket.request("consume", {rtpCapabilities});
    const {producerId, id, kind, rtpParameters} = data;

    let codecOptions = {};
    const consumer = await transport.consume({
        id,
        producerId,
        kind,
        rtpParameters,
        codecOptions,
    });
    const stream = new MediaStream();
    stream.addTrack(consumer.track);
    return stream;
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
    // after you joined room, get RtpCapabilities
    const device = await getRtpCapabilities(socket);
    await publish(socket, device);
};

export {joinRoom, consume, getRtpCapabilities, createRoom, subscribe, getUserMedia, publish, loadDevice};
