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
    let producerId;
    transport.on("produce", async ({kind, rtpParameters}, callback, errback) => {
        console.log(kind);

        try {
            const {producer_id} = await socket.request("produce", {
                kind,
                rtpParameters,
                transportId,
            });
            console.log("Producer id->", producer_id);
            producerId = producer_id;
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
            console.log(producer);
        }
    } catch (err) {
        console.log(err);
    }

    return producerId;
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
    transport.on("connect", ({dtlsParameters}, callback, errback) => {
        socket
            .request("connectTransport", {
                transportId: transport.id,
                dtlsParameters,
            })
            .then(callback)
            .catch(errback);
    });

    const {stream, consumer} = await consume(transport, socket, device, producerId);

    console.log(stream);

    const el = document.createElement(consumer.kind);

    el.setAttribute("playsinline", true);
    el.setAttribute("autoplay", true);
    el.srcObject = new MediaStream([consumer.track.clone()]);
    el.consumer = consumer;
    console.log(el);
    await el.play();
}

async function consume(transport, socket, device, producer_id) {
    const {rtpCapabilities} = device;
    const consumerTransportId = transport._id;
    const data = await socket.request("consume", {consumerTransportId, producerId: producer_id, rtpCapabilities});
    const {producerId, id, kind, rtpParameters} = data;

    let codecOptions = {};
    try {
        const consumer = await transport.consume({
            id,
            producerId,
            kind,
            rtpParameters,
        });

        const stream = new MediaStream();
        console.log(consumer, await consumer.getStats());
        consumer.observer.on("close", () => {
            console.log("test");
        });
        stream.addTrack(consumer.track);
        return {stream, consumer};
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
    // after you joined room, get RtpCapabilities
    const device = await getRtpCapabilities(socket);
    const producerId = await publish(socket, device);

    await subscribe(socket, device, producerId);
};

export {joinRoom, consume, getRtpCapabilities, createRoom, subscribe, getUserMedia, publish, loadDevice};
