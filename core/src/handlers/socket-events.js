import {SocketHelper} from "../helpers/socket-helper";
import {Room} from "../helpers/room";

export const addSocketEvents = (socket, worker) => {
    socket.on("disconnect", function () {
        SocketHelper.cleanUpPeer(socket.roomname, socket);
        // --- socket.io room ---
        socket.leave(socket.roomname);
    });

    socket.on("error", function (err) {
        console.error("socket ERROR:", err);
    });
    socket.on("connect_error", (err) => {
        console.error("client connection error", err);
    });

    socket.on("send_message", (data) => {
        console.log(data);
        const {text, room} = data;
        socket.to(room).emit("message", {type: "room_message", text});
    });

    socket.on("getRouterRtpCapabilities", (data, callback) => {
        const {roomId} = data;
        console.log(data);
        const joinedRoom = Room.getRoom(roomId);
        const router = joinedRoom?.router;

        if (router) {
            SocketHelper.sendResponse(router.rtpCapabilities, callback);
        } else {
            SocketHelper.sendReject({text: "ERROR- router NOT READY"}, callback);
        }
    });

    // --- setup room ---
    socket.on("prepareRoom", async (data, callback) => {
        const roomId = data.roomId;
        const existRoom = Room.getRoom(roomId);
        if (existRoom) {
            console.log("--- use exist room. roomId=" + roomId);
        } else {
            console.log("--- create new room. roomId=" + roomId);
            await SocketHelper.setupRoom(worker, roomId);
        }

        socket.emit("message", {type: "room_broadcast", text: [roomId]});
    });

    socket.on("getExistingRooms", async () => {
        // send existing rooms on first join
        const existingRooms = SocketHelper.getExistingRooms();
        socket.emit("message", {type: "room_broadcast", text: existingRooms});
    });

    socket.on("joinRoom", async (data, callback) => {
        const roomId = data.roomId;
        console.log("--- use exist room. roomId=" + roomId);
        socket.join(roomId);
        SocketHelper.setRoomName(socket, roomId);
        SocketHelper.sendResponse(roomId, callback);
    });

    // --- producer ----
    socket.on("createProducerTransport", async (data, callback) => {
        const roomName = SocketHelper.getRoomName(socket);

        console.log("-- createProducerTransport ---room=%s", roomName);
        const {transport, params} = await SocketHelper.createTransport(roomName);
        SocketHelper.addProducerTransport(roomName, socket.id, transport);
        transport.observer.on("close", () => {
            const id = socket.id;
            const videoProducer = SocketHelper.getProducer(roomName, id, "video");
            if (videoProducer) {
                videoProducer.close();
                SocketHelper.removeProducer(roomName, id, "video");
            }
            const audioProducer = SocketHelper.getProducer(roomName, id, "audio");
            if (audioProducer) {
                audioProducer.close();
                SocketHelper.removeProducer(roomName, id, "audio");
            }
            SocketHelper.removeProducerTransport(roomName, id);
        });

        SocketHelper.sendResponse(params, callback);
    });

    socket.on("connectProducerTransport", async (data, callback) => {
        const roomName = SocketHelper.getRoomName(socket);
        const transport = SocketHelper.getProducerTransport(roomName, socket.id);
        await transport.connect({dtlsParameters: data.dtlsParameters});
        SocketHelper.sendResponse({}, callback);
    });

    socket.on("produce", async (data, callback) => {
        const roomName = SocketHelper.getRoomName(socket);
        const {kind, rtpParameters} = data;
        console.log("-- produce --- kind=" + kind);
        const id = socket.id;
        const transport = SocketHelper.getProducerTransport(roomName, id);
        if (!transport) {
            console.error("transport NOT EXIST for id=" + id);
            return;
        }
        const producer = await transport.produce({kind, rtpParameters});
        SocketHelper.addProducer(roomName, id, producer, kind);
        producer.observer.on("close", () => {
            console.log("producer closed --- kind=" + kind);
        });
        SocketHelper.sendResponse({id: producer.id}, callback);

        // inform clients about new producer

        if (roomName) {
            console.log("--broadcast room=%s newProducer ---", roomName);
            socket.broadcast
                .to(roomName)
                .emit("newProducer", {socketId: id, producerId: producer.id, kind: producer.kind});
        } else {
            console.log("--broadcast newProducer ---");
            socket.broadcast.emit("newProducer", {socketId: id, producerId: producer.id, kind: producer.kind});
        }
    });

    // --- consumer ----
    socket.on("createConsumerTransport", async (data, callback) => {
        const roomName = SocketHelper.getRoomName(socket);
        console.log("-- createConsumerTransport -- id=" + socket.id);
        const {transport, params} = await SocketHelper.createTransport(roomName);
        SocketHelper.addConsumerTransport(roomName, socket.id, transport);
        transport.observer.on("close", () => {
            const localId = socket.id;
            SocketHelper.removeConsumerSetDeep(roomName, localId);
            SocketHelper.removeConsumerTransport(roomName, localId);
        });

        SocketHelper.sendResponse(params, callback);
    });

    socket.on("connectConsumerTransport", async (data, callback) => {
        const roomName = SocketHelper.getRoomName(socket);
        console.log("-- connectConsumerTransport -- id=" + socket.id);
        let transport = SocketHelper.getConsumerTransport(roomName, socket.id);
        if (!transport) {
            console.error("transport NOT EXIST for id=" + socket.id);
            return;
        }
        await transport.connect({dtlsParameters: data.dtlsParameters});
        SocketHelper.sendResponse({}, callback);
    });

    socket.on("consume", async (data, callback) => {
        console.error("-- ERROR: consume NOT SUPPORTED ---");
        return;
    });

    socket.on("resume", async (data, callback) => {
        console.error("-- ERROR: resume NOT SUPPORTED ---");
        return;
    });

    socket.on("getCurrentProducers", async (data, callback) => {
        const roomName = SocketHelper.getRoomName(socket);
        const clientId = data.localId;
        console.log("-- getCurrentProducers for Id=" + clientId);

        const remoteVideoIds = SocketHelper.getRemoteIds(roomName, clientId, "video");
        console.log("-- remoteVideoIds:", remoteVideoIds);
        const remoteAudioIds = SocketHelper.getRemoteIds(roomName, clientId, "audio");
        console.log("-- remoteAudioIds:", remoteAudioIds);

        SocketHelper.sendResponse({remoteVideoIds: remoteVideoIds, remoteAudioIds: remoteAudioIds}, callback);
    });

    socket.on("consumeAdd", async (data, callback) => {
        const roomName = SocketHelper.getRoomName(socket);
        const localId = socket.id;
        const kind = data.kind;
        console.log("-- consumeAdd -- localId=%s kind=%s", localId, kind);

        let transport = SocketHelper.getConsumerTransport(roomName, localId);
        if (!transport) {
            console.error("transport NOT EXIST for id=" + localId);
            return;
        }
        const rtpCapabilities = data.rtpCapabilities;
        const remoteId = data.remoteId;
        console.log("-- consumeAdd - localId=" + localId + " remoteId=" + remoteId + " kind=" + kind);
        const producer = SocketHelper.getProducer(roomName, remoteId, kind);
        if (!producer) {
            console.error("producer NOT EXIST for remoteId=%s kind=%s", remoteId, kind);
            return;
        }
        const {consumer, params} = await SocketHelper.createConsumer(roomName, transport, producer, rtpCapabilities);
        //subscribeConsumer = consumer;
        SocketHelper.addConsumer(roomName, localId, remoteId, consumer, kind);
        console.log("addConsumer localId=%s, remoteId=%s, kind=%s", localId, remoteId, kind);
        consumer.observer.on("close", () => {
            console.log("consumer closed ---");
        });
        consumer.on("producerclose", () => {
            console.log("consumer -- on.producerclose");
            consumer.close();
            SocketHelper.removeConsumer(roomName, localId, remoteId, kind);

            // -- notify to client ---
            socket.emit("producerClosed", {localId: localId, remoteId: remoteId, kind: kind});
        });

        console.log("-- consumer ready ---");
        SocketHelper.sendResponse(params, callback);
    });

    socket.on("resumeAdd", async (data, callback) => {
        const roomName = SocketHelper.getRoomName(socket);
        const localId = socket.id;
        const remoteId = data.remoteId;
        const kind = data.kind;
        console.log("-- resumeAdd localId=%s remoteId=%s kind=%s", localId, remoteId, kind);
        let consumer = SocketHelper.getConsumer(roomName, localId, remoteId, kind);
        if (!consumer) {
            console.error("consumer NOT EXIST for remoteId=" + remoteId);
            return;
        }
        await consumer.resume();
        SocketHelper.sendResponse({}, callback);
    });
};
