import {Room} from "./room.js";
import mediasoupOptions from "../config.js";

export function getProducerTrasnport(roomname, id) {
    if (roomname) {
        console.log("=== getProducerTrasnport use room=%s ===", roomname);
        const room = Room.getRoom(roomname);
        return room.getProducerTrasnport(id);
    } else {
        const defaultRoom = Room.getRoom("_default_room");
        console.log("=== getProducerTrasnport use defaultRoom room=%s ===", roomname);
        return defaultRoom.getProducerTrasnport(id);
    }
}

export function addProducerTrasport(roomname, id, transport) {
    if (roomname) {
        const room = Room.getRoom(roomname);
        room.addProducerTrasport(id, transport);
        console.log("=== addProducerTrasport use room=%s ===", roomname);
    } else {
        const defaultRoom = Room.getRoom("_default_room");
        defaultRoom.addProducerTrasport(id, transport);
        console.log("=== addProducerTrasport use defaultRoom room=%s ===", roomname);
    }
}

export function removeProducerTransport(roomname, id) {
    if (roomname) {
        const room = Room.getRoom(roomname);
        room.removeProducerTransport(id);
    } else {
        const defaultRoom = Room.getRoom("_default_room");
        defaultRoom.removeProducerTransport(id);
    }
}

export function getProducer(roomname, id, kind) {
    if (roomname) {
        const room = Room.getRoom(roomname);
        return room.getProducer(id, kind);
    } else {
        const defaultRoom = Room.getRoom("_default_room");

        return defaultRoom.getProducer(id, kind);
    }
}

export function getRemoteIds(roomname, clientId, kind) {
    if (roomname) {
        const room = Room.getRoom(roomname);
        return room.getRemoteIds(clientId, kind);
    } else {
        const defaultRoom = Room.getRoom("_default_room");

        return defaultRoom.getRemoteIds(clientId, kind);
    }
}

export function addProducer(roomname, id, producer, kind) {
    if (roomname) {
        const room = Room.getRoom(roomname);
        room.addProducer(id, producer, kind);
        console.log("=== addProducer use room=%s ===", roomname);
    } else {
        const defaultRoom = Room.getRoom("_default_room");

        defaultRoom.addProducer(id, producer, kind);
        console.log("=== addProducer use defaultRoom room=%s ===", roomname);
    }
}

export function removeProducer(roomname, id, kind) {
    if (roomname) {
        const room = Room.getRoom(roomname);
        room.removeProducer(id, kind);
    } else {
        const defaultRoom = Room.getRoom("_default_room");

        defaultRoom.removeProducer(id, kind);
    }
}

export function getConsumerTrasnport(roomname, id) {
    if (roomname) {
        console.log("=== getConsumerTrasnport use room=%s ===", roomname);
        const room = Room.getRoom(roomname);
        return room.getConsumerTrasnport(id);
    } else {
        const defaultRoom = Room.getRoom("_default_room");

        console.log("=== getConsumerTrasnport use defaultRoom room=%s ===", defaultRoom);
        return defaultRoom.getConsumerTrasnport(id);
    }
}

export function addConsumerTrasport(roomname, id, transport) {
    if (roomname) {
        const room = Room.getRoom(roomname);
        room.addConsumerTrasport(id, transport);
        console.log("=== addConsumerTrasport use room=%s ===", roomname);
    } else {
        const defaultRoom = Room.getRoom("_default_room");

        defaultRoom.addConsumerTrasport(id, transport);
        console.log("=== addConsumerTrasport use defaultRoom room=%s ===", roomname);
    }
}

export function removeConsumerTransport(roomname, id) {
    if (roomname) {
        const room = Room.getRoom(roomname);
        room.removeConsumerTransport(id);
    } else {
        const defaultRoom = Room.getRoom("_default_room");

        defaultRoom.removeConsumerTransport(id);
    }
}

export function getConsumer(roomname, localId, remoteId, kind) {
    if (roomname) {
        const room = Room.getRoom(roomname);
        return room.getConsumer(localId, remoteId, kind);
    } else {
        const defaultRoom = Room.getRoom("_default_room");

        return defaultRoom.getConsumer(localId, remoteId, kind);
    }
}

export function addConsumer(roomname, localId, remoteId, consumer, kind) {
    if (roomname) {
        const room = Room.getRoom(roomname);
        room.addConsumer(localId, remoteId, consumer, kind);
        console.log("=== addConsumer use room=%s ===", roomname);
    } else {
        const defaultRoom = Room.getRoom("_default_room");

        defaultRoom.addConsumer(localId, remoteId, consumer, kind);
        console.log("=== addConsumer use defaultRoom room=%s ===", roomname);
    }
}

export function removeConsumer(roomname, localId, remoteId, kind) {
    if (roomname) {
        const room = Room.getRoom(roomname);
        room.removeConsumer(localId, remoteId, kind);
    } else {
        const defaultRoom = Room.getRoom("_default_room");

        defaultRoom.removeConsumer(localId, remoteId, kind);
    }
}

export function removeConsumerSetDeep(roomname, localId) {
    if (roomname) {
        const room = Room.getRoom(roomname);
        room.removeConsumerSetDeep(localId);
    } else {
        const defaultRoom = Room.getRoom("_default_room");

        defaultRoom.removeConsumerSetDeep(localId);
    }
}

export async function createTransport(roomname) {
    let router = null;
    const defaultRoom = Room.getRoom("_default_room");

    if (roomname) {
        const room = Room.getRoom(roomname);
        router = room.router;
    } else {
        router = defaultRoom.router;
    }
    const transport = await router.createWebRtcTransport(mediasoupOptions.webRtcTransport);
    console.log("-- create transport room=%s id=%s", roomname, transport.id);

    return {
        transport: transport,
        params: {
            id: transport.id,
            iceParameters: transport.iceParameters,
            iceCandidates: transport.iceCandidates,
            dtlsParameters: transport.dtlsParameters,
        },
    };
}

export async function createConsumer(roomname, transport, producer, rtpCapabilities) {
    let router = null;
    const defaultRoom = Room.getRoom("_default_room");
    if (roomname) {
        const room = Room.getRoom(roomname);
        router = room.router;
    } else {
        router = defaultRoom.router;
    }

    if (
        !router.canConsume({
            producerId: producer.id,
            rtpCapabilities,
        })
    ) {
        console.error("can not consume");
        return;
    }

    let consumer = null;
    //consumer = await producerTransport.consume({ // NG: try use same trasport as producer (for loopback)
    consumer = await transport
        .consume({
            // OK
            producerId: producer.id,
            rtpCapabilities,
            paused: producer.kind === "video",
        })
        .catch((err) => {
            console.error("consume failed", err);
            return;
        });

    //if (consumer.type === 'simulcast') {
    //  await consumer.setPreferredLayers({ spatialLayer: 2, temporalLayer: 2 });
    //}

    return {
        consumer: consumer,
        params: {
            producerId: producer.id,
            id: consumer.id,
            kind: consumer.kind,
            rtpParameters: consumer.rtpParameters,
            type: consumer.type,
            producerPaused: consumer.producerPaused,
        },
    };
}

export function getClientCount() {
    // WARN: undocumented method to get clients number
    return io.io.clientsCount;
}

export async function setupRoom(worker, name) {
    const room = new Room(name);
    const mediaCodecs = mediasoupOptions.router.mediaCodecs;
    const router = await worker.createRouter({mediaCodecs});
    router.roomname = name;

    router.observer.on("close", () => {
        console.log("-- router closed. room=%s", name);
    });
    router.observer.on("newtransport", (transport) => {
        console.log("-- router newtransport. room=%s", name);
    });

    room.router = router;
    Room.addRoom(room, name);
    return room;
}

export function cleanUpPeer(roomname, socket) {
    const id = getId(socket);
    removeConsumerSetDeep(roomname, id);

    const transport = getConsumerTrasnport(roomname, id);
    if (transport) {
        transport.close();
        removeConsumerTransport(roomname, id);
    }

    const videoProducer = getProducer(roomname, id, "video");
    if (videoProducer) {
        videoProducer.close();
        removeProducer(roomname, id, "video");
    }
    const audioProducer = getProducer(roomname, id, "audio");
    if (audioProducer) {
        audioProducer.close();
        removeProducer(roomname, id, "audio");
    }

    const producerTransport = getProducerTrasnport(roomname, id);
    if (producerTransport) {
        producerTransport.close();
        removeProducerTransport(roomname, id);
    }
}

export function getId(socket) {
    return socket.id;
}
