/* eslint-disable no-undef */
/* eslint-disable no-console */
"use strict";

import express from "express";
import http from "http";
import path from "path";
import mediasoup from "mediasoup";
import * as socketIO from "socket.io";
import mediasoupOptions from "../config.js";
import {Room} from "./room.js";
import {
    setupRoom,
    getProducer,
    removeProducer,
    removeProducerTransport,
    getProducerTrasnport,
    addProducer,
    removeConsumerSetDeep,
    removeConsumerTransport,
    getConsumerTrasnport,
    getRemoteIds,
    getId,
    createConsumer,
    addConsumer,
    getConsumer,
    cleanUpPeer,
    addProducerTrasport,
    removeConsumer,
    addConsumerTrasport,
    createTransport,
} from "./helper.js";

let webServer;
let socketServer;
let expressApp;
let worker;
let defaultRoom = null;
let nextMediasoupWorkerIdx = 0;
const workers = [];
let localId;

// Run express app, configs. middlewares.
async function runExpressApp() {
    expressApp = express();
    expressApp.use(express.json());

    const dirname = path.resolve(path.dirname(""));
    expressApp.use(express.static(dirname));

    expressApp.use((error, req, res, next) => {
        if (error) {
            console.warn("Error", error.message);

            res.statusMessage = error.message;
            res.status(error.status).send(String(error));
        }

        next();
    });
}

async function runWebServer() {
    const {sslKey, sslCrt} = mediasoupOptions;
    const sslKeyPath = `${process.cwd()}${sslKey}`;
    const sslCrtPath = `${process.cwd()}${sslCrt}`;
    /*
    if (!fs.existsSync(sslKeyPath) || !fs.existsSync(sslCrtPath)) {
        console.error("SSL files are not found. check your mediasoupOptions.js file");
        process.exit(0);
    }*/

    /**
     * @TODO SSL, CORS problem
     */
    /*
    const tls = {
        cert: fs.readFileSync(sslCrtPath, "utf-8"),
        key: fs.readFileSync(sslKeyPath, "utf-8"),
        requestCert: false,
        rejectUnauthorized: false,
    };
*/
    try {
        webServer = http.createServer(expressApp);
    } catch (e) {
        console.log(e);
    }
    webServer.on("error", (err) => {
        console.error("starting web server failed:", err.message);
    });

    await new Promise((resolve) => {
        const {listenIp, listenPort} = mediasoupOptions.webRtcTransport;
        webServer.listen(listenPort, listenIp, () => {
            const listenIps = mediasoupOptions.webRtcTransport.listenIps[0];
            const ip = listenIps.announcedIp || listenIps.ip;
            console.log("server is running");
            console.log(`open https://${ip}:${listenPort} in your web browser`);
            resolve();
        });
    });
}

async function runSocketServer() {
    socketServer = new socketIO.Server(webServer, {
        serveClient: false,
        path: "/server",
        log: true,
        cors: {
            origin: "http://localhost:3002",
        },
    });

    socketServer.on("connection", (socket) => {
        socket.on("disconnect", function () {
            const roomName = getRoomname();

            // close user connection
            cleanUpPeer(roomName, socket);

            // --- socket.io room ---
            socket.leave(roomName);
        });

        localId = getId(socket);

        socket.on("error", function (err) {
            console.error("socket ERROR:", err);
        });
        socket.on("connect_error", (err) => {
            console.error("client connection error", err);
        });

        socket.on("getRouterRtpCapabilities", (data, callback) => {
            const router = defaultRoom.router;

            if (router) {
                //console.log('getRouterRtpCapabilities: ', router.rtpCapabilities);
                sendResponse(router.rtpCapabilities, callback);
            } else {
                sendReject({text: "ERROR- router NOT READY"}, callback);
            }
        });

        // --- setup room ---
        socket.on("prepare_room", async (data) => {
            const roomId = data.roomId;
            const existRoom = Room.getRoom(roomId);
            if (existRoom) {
                console.log("--- use exist room. roomId=" + roomId);
            } else {
                console.log("--- create new room. roomId=" + roomId);
                const room = await setupRoom(worker, roomId);
            }

            // --- socket.io room ---
            socket.join(roomId);
            setRoomname(roomId);
        });

        // --- producer ----
        socket.on("createProducerTransport", async (data, callback) => {
            const roomName = getRoomname();

            console.log("-- createProducerTransport ---room=%s", roomName);
            const {transport, params} = await createTransport(roomName);
            addProducerTrasport(roomName, getId(socket), transport);
            transport.observer.on("close", () => {
                const id = getId(socket);
                const videoProducer = getProducer(roomName, id, "video");
                if (videoProducer) {
                    videoProducer.close();
                    removeProducer(roomName, id, "video");
                }
                const audioProducer = getProducer(roomName, id, "audio");
                if (audioProducer) {
                    audioProducer.close();
                    removeProducer(roomName, id, "audio");
                }
                removeProducerTransport(roomName, id);
            });
            //console.log('-- createProducerTransport params:', params);
            sendResponse(params, callback);
        });

        socket.on("connectProducerTransport", async (data, callback) => {
            const roomName = getRoomname();
            const transport = getProducerTrasnport(roomName, getId(socket));
            await transport.connect({dtlsParameters: data.dtlsParameters});
            sendResponse({}, callback);
        });

        socket.on("produce", async (data, callback) => {
            const roomName = getRoomname();
            const {kind, rtpParameters} = data;
            console.log("-- produce --- kind=" + kind);
            const id = getId(socket);
            const transport = getProducerTrasnport(roomName, id);
            if (!transport) {
                console.error("transport NOT EXIST for id=" + id);
                return;
            }
            const producer = await transport.produce({kind, rtpParameters});
            addProducer(roomName, id, producer, kind);
            producer.observer.on("close", () => {
                console.log("producer closed --- kind=" + kind);
            });
            sendResponse({id: producer.id}, callback);

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
            const roomName = getRoomname();
            console.log("-- createConsumerTransport -- id=" + getId(socket));
            const {transport, params} = await createTransport(roomName);
            addConsumerTrasport(roomName, getId(socket), transport);
            transport.observer.on("close", () => {
                const localId = getId(socket);
                removeConsumerSetDeep(roomName, localId);
                removeConsumerTransport(roomName, lid);
            });
            //console.log('-- createTransport params:', params);
            sendResponse(params, callback);
        });

        socket.on("connectConsumerTransport", async (data, callback) => {
            const roomName = getRoomname();
            console.log("-- connectConsumerTransport -- id=" + getId(socket));
            let transport = getConsumerTrasnport(roomName, getId(socket));
            if (!transport) {
                console.error("transport NOT EXIST for id=" + getId(socket));
                return;
            }
            await transport.connect({dtlsParameters: data.dtlsParameters});
            sendResponse({}, callback);
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
            const roomName = getRoomname();
            const clientId = data.localId;
            console.log("-- getCurrentProducers for Id=" + clientId);

            const remoteVideoIds = getRemoteIds(roomName, clientId, "video");
            console.log("-- remoteVideoIds:", remoteVideoIds);
            const remoteAudioIds = getRemoteIds(roomName, clientId, "audio");
            console.log("-- remoteAudioIds:", remoteAudioIds);

            sendResponse({remoteVideoIds: remoteVideoIds, remoteAudioIds: remoteAudioIds}, callback);
        });

        socket.on("consumeAdd", async (data, callback) => {
            const roomName = getRoomname();
            const localId = getId(socket);
            const kind = data.kind;
            console.log("-- consumeAdd -- localId=%s kind=%s", localId, kind);

            let transport = getConsumerTrasnport(roomName, localId);
            if (!transport) {
                console.error("transport NOT EXIST for id=" + localId);
                return;
            }
            const rtpCapabilities = data.rtpCapabilities;
            const remoteId = data.remoteId;
            console.log("-- consumeAdd - localId=" + localId + " remoteId=" + remoteId + " kind=" + kind);
            const producer = getProducer(roomName, remoteId, kind);
            if (!producer) {
                console.error("producer NOT EXIST for remoteId=%s kind=%s", remoteId, kind);
                return;
            }
            const {consumer, params} = await createConsumer(roomName, transport, producer, rtpCapabilities); // producer must exist before consume
            //subscribeConsumer = consumer;
            addConsumer(roomName, localId, remoteId, consumer, kind); // TODO: MUST comination of  local/remote id
            console.log("addConsumer localId=%s, remoteId=%s, kind=%s", localId, remoteId, kind);
            consumer.observer.on("close", () => {
                console.log("consumer closed ---");
            });
            consumer.on("producerclose", () => {
                console.log("consumer -- on.producerclose");
                consumer.close();
                removeConsumer(roomName, localId, remoteId, kind);

                // -- notify to client ---
                socket.emit("producerClosed", {localId: localId, remoteId: remoteId, kind: kind});
            });

            console.log("-- consumer ready ---");
            sendResponse(params, callback);
        });

        socket.on("resumeAdd", async (data, callback) => {
            const roomName = getRoomname();
            const localId = getId(socket);
            const remoteId = data.remoteId;
            const kind = data.kind;
            console.log("-- resumeAdd localId=%s remoteId=%s kind=%s", localId, remoteId, kind);
            let consumer = getConsumer(roomName, localId, remoteId, kind);
            if (!consumer) {
                console.error("consumer NOT EXIST for remoteId=" + remoteId);
                return;
            }
            await consumer.resume();
            sendResponse({}, callback);
        });

        // ---- sendback welcome message with on connected ---
        const newId = getId(socket);
        sendback(socket, {type: "welcome", id: newId});

        // --- send response to client ---
        function sendResponse(response, callback) {
            //console.log('sendResponse() callback:', callback);
            callback(null, response);
        }

        // --- send error to client ---
        function sendReject(error, callback) {
            callback(error.toString(), null);
        }

        function sendback(socket, message) {
            socket.emit("message", message);
        }

        function setRoomname(room) {
            socket.roomname = room;
        }

        function getRoomname() {
            const room = socket.roomname;
            return room;
        }
    });
}

/**
 * Get next mediasoup Worker.
 */
const getMediasoupWorker = () => {
    const worker = workers[nextMediasoupWorkerIdx];

    if (++nextMediasoupWorkerIdx === workers.length) nextMediasoupWorkerIdx = 0;

    return worker;
};

const runMediasoupWorker = async () => {
    let {numWorkers} = mediasoupOptions;
    let worker;

    for (let i = 0; i < numWorkers; i++) {
        worker = await mediasoup.createWorker({
            logLevel: mediasoupOptions.worker.logLevel,
            logTags: mediasoupOptions.worker.logTags,
            rtcMinPort: mediasoupOptions.worker.rtcMinPort,
            rtcMaxPort: mediasoupOptions.worker.rtcMaxPort,
        });

        worker.on("died", () => {
            console.error("mediasoup worker died, exiting in 2 seconds... [pid:%d]", worker.pid);
            setTimeout(() => process.exit(1), 2000);
        });
        workers.push(worker);
    }

    defaultRoom = await setupRoom(worker, "_default_room");
    console.log("-- mediasoup worker start. -- room:", defaultRoom.name);
};

(async () => {
    try {
        await runExpressApp();
        await runWebServer();
        await runMediasoupWorker();
        worker = getMediasoupWorker();
        await runSocketServer();
    } catch (err) {
        console.log(err);
    }
})();
