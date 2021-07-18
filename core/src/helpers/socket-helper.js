import {Room} from "./room.js";
import mediasoupOptions from "../../config.js";

/**
 * SocketHelper is a helper class for calling room methods.
 */
export class SocketHelper {
    static getExistingRooms = () => {
        return Room.getExistingRooms();
    };

    static getProducerTransport = (roomname, id) => {
        console.log("=== getProducerTransport use room=%s ===", roomname);
        const room = Room.getRoom(roomname);
        return room.getProducerTransport(id);
    };

    static addProducerTransport = (roomname, id, transport) => {
        const room = Room.getRoom(roomname);
        room.addProducerTransport(id, transport);
        console.log("=== addProducerTrasport use room=%s ===", roomname);
    };

    static removeProducerTransport = (roomname, id) => {
        const room = Room.getRoom(roomname);
        room.removeProducerTransport(id);
    };

    static getProducer = (roomname, id, kind) => {
        const room = Room.getRoom(roomname);
        return room.getProducer(id, kind);
    };

    static getRemoteIds = (roomname, clientId, kind) => {
        const room = Room.getRoom(roomname);
        return room.getRemoteIds(clientId, kind);
    };

    static addProducer = (roomname, id, producer, kind) => {
        const room = Room.getRoom(roomname);
        room.addProducer(id, producer, kind);
        console.log("=== addProducer use room=%s ===", roomname);
    };

    static removeProducer = (roomname, id, kind) => {
        const room = Room.getRoom(roomname);
        room.removeProducer(id, kind);
    };

    static getConsumerTransport = (roomname, id) => {
        console.log("=== getConsumerTransport use room=%s ===", roomname);
        const room = Room.getRoom(roomname);
        return room.getConsumerTransport(id);
    };

    static addConsumerTransport = (roomname, id, transport) => {
        const room = Room.getRoom(roomname);
        room.addConsumerTransport(id, transport);
        console.log("=== addConsumerTrasport use room=%s ===", roomname);
    };

    static removeConsumerTransport = (roomname, id) => {
        const room = Room.getRoom(roomname);
        room.removeConsumerTransport(id);
    };

    static getConsumer = (roomname, localId, remoteId, kind) => {
        const room = Room.getRoom(roomname);
        return room.getConsumer(localId, remoteId, kind);
    };

    static addConsumer = (roomname, localId, remoteId, consumer, kind) => {
        const room = Room.getRoom(roomname);
        room.addConsumer(localId, remoteId, consumer, kind);
        console.log("=== addConsumer use room=%s ===", roomname);
    };

    static removeConsumer = (roomname, localId, remoteId, kind) => {
        const room = Room.getRoom(roomname);
        room.removeConsumer(localId, remoteId, kind);
    };

    static removeConsumerSetDeep = (roomname, localId) => {
        const room = Room.getRoom(roomname);
        room.removeConsumerSetDeep(localId);
    };

    static createTransport = async (roomname) => {
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
    };

    static createConsumer = async (roomname, transport, producer, rtpCapabilities) => {
        let router = null;
        const room = Room.getRoom(roomname);
        router = room.router;

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
    };

    static setupRoom = async (worker, name) => {
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
    };

    // --- send response to client ---
    static sendResponse = (response, callback) => {
        callback(null, response);
    };

    // --- send error to client ---
    static sendReject = (error, callback) => {
        callback(error.toString(), null);
    };

    static sendBack = (socket, message) => {
        socket.emit("message", message);
    };

    static setRoomName = (socket, room) => {
        socket.roomname = room;
    };

    static getRoomName = (socket) => {
        const room = socket.roomname;
        return room;
    };

    static cleanUpPeer = (roomName, socket) => {
        const id = socket.id;
        SocketHelper.removeConsumerSetDeep(roomName, id);
        const room = Room.getRoom(roomName);

        const transport = SocketHelper.getConsumerTransport(roomName, id);
        if (transport) {
            transport.close();
            room.removeConsumerTransport(roomName, id);
        }

        const videoProducer = SocketHelper.getProducer(roomName, id, "video");
        if (videoProducer) {
            videoProducer.close();
            room.removeProducer(roomName, id, "video");
        }
        const audioProducer = SocketHelper.getProducer(roomName, id, "audio");
        if (audioProducer) {
            audioProducer.close();
            room.removeProducer(roomName, id, "audio");
        }

        const producerTransport = SocketHelper.getProducerTransport(roomName, id);
        if (producerTransport) {
            producerTransport.close();
            room.removeProducerTransport(roomName, id);
        }
    };
}
