/* eslint-disable no-undef */
/* eslint-disable no-console */
import express from "express";
//import https from "https";
import http from "http";
import fs from "fs";
import path from "path";
import mediasoup from "mediasoup";
import * as socketIO from "socket.io";
import config from "../config.js";
import {Room} from "./room.js";
import {Peer} from "./peer.js";

let roomList = new Map();
let workers = [];
let nextMediasoupWorkerIdx = 0;
let webServer;
let socketServer;
let expressApp;
let consumer;

(async () => {
    try {
        await runExpressApp();
        await runWebServer();
        await runSocketServer();
        await runMediasoupWorker();
    } catch (err) {
        console.log(err);
    }
})();

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
    const {sslKey, sslCrt} = config;
    const sslKeyPath = `${process.cwd()}${sslKey}`;
    const sslCrtPath = `${process.cwd()}${sslCrt}`;

    if (!fs.existsSync(sslKeyPath) || !fs.existsSync(sslCrtPath)) {
        console.error("SSL files are not found. check your config.js file");
        process.exit(0);
    }

    /**
     * @TODO SSL, CORS problem
     */
    const tls = {
        cert: fs.readFileSync(sslCrtPath, "utf-8"),
        key: fs.readFileSync(sslKeyPath, "utf-8"),
        requestCert: false,
        rejectUnauthorized: false,
    };

    try {
        webServer = http.createServer(expressApp);
    } catch (e) {
        console.log(e);
    }
    webServer.on("error", (err) => {
        console.error("starting web server failed:", err.message);
    });

    await new Promise((resolve) => {
        const {listenIp, listenPort} = config;
        webServer.listen(listenPort, listenIp, () => {
            const listenIps = config.mediasoup.webRtcTransport.listenIps[0];
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
        console.log("client connected");

        socket.on("disconnect", () => {
            console.log("client disconnected");
        });

        socket.on("connect_error", (err) => {
            console.error("client connection error", err);
        });

        socket.on("createRoom", async ({room_id}, callback) => {
            if (roomList.has(room_id)) {
                callback("already exists");
            } else {
                console.log("---created room--- ", room_id);
                let worker = await getMediasoupWorker();
                roomList.set(room_id, new Room(room_id, worker, socket));
                console.log(roomList.size);
                callback(room_id);
            }
        });

        socket.on("join", ({room_id, name}, cb) => {
            console.log('---user joined--- "' + room_id + '": ' + name);
            if (!roomList.has(room_id)) {
                return cb({
                    error: "room does not exist",
                });
            }
            roomList.get(room_id).addPeer(new Peer(socket.id, name));
            socket.room_id = room_id;

            cb(roomList.get(room_id).toJson());
        });

        socket.on("getProducers", () => {
            console.log(`---get producers--- name:${roomList.get(socket.room_id).getPeers().get(socket.id).name}`);
            // send all the current producer to newly joined member
            if (!roomList.has(socket.room_id)) return;
            let producerList = roomList.get(socket.room_id).getProducerListForPeer(socket.id);

            socket.emit("newProducers", producerList);
        });

        socket.on("getRouterRtpCapabilities", (_, callback) => {
            console.log(roomList);
            try {
                callback(roomList.get(socket.room_id).getRtpCapabilities());
            } catch (e) {
                callback({
                    error: e.message,
                });
            }
        });

        socket.on("createWebRtcTransport", async (_, callback) => {
            try {
                const {params} = await roomList.get(socket.room_id).createWebRtcTransport(socket.id);
                console.log(params);
                callback(params);
            } catch (err) {
                console.error(err);
                callback({
                    error: err.message,
                });
            }
        });

        socket.on("connectTransport", async ({transport_id, dtlsParameters}, callback) => {
            console.log(`---connect transport--- name: ${roomList.get(socket.room_id).getPeers().get(socket.id).name}`);
            if (!roomList.has(socket.room_id)) return;
            await roomList.get(socket.room_id).connectPeerTransport(socket.id, transport_id, dtlsParameters);

            callback("success");
        });

        socket.on("produce", async ({kind, rtpParameters, transportId}, callback) => {
            console.log("Creating producer ->", kind, transportId);
            if (!roomList.has(socket.room_id)) {
                return callback({error: "not is a room"});
            }

            let producer_id = await roomList.get(socket.room_id).produce(socket.id, transportId, rtpParameters, kind);

            callback({
                producer_id,
            });
        });

        socket.on("consume", async ({consumerTransportId, producerId, rtpCapabilities}, callback) => {
            //TODO null handling
            let params = await roomList
                .get(socket.room_id)
                .consume(socket.id, consumerTransportId, producerId, rtpCapabilities);

            console.log(
                `---consuming--- name: ${
                    roomList.get(socket.room_id) && roomList.get(socket.room_id).getPeers().get(socket.id).name
                } prod_id:${producerId} consumer_id:${params.id}`,
            );
            callback(params);
        });

        socket.on("resume", async (data, callback) => {
            await consumer.resume();
            callback();
        });

        socket.on("getMyRoomInfo", (_, cb) => {
            cb(roomList.get(socket.room_id).toJson());
        });

        socket.on("disconnect", () => {
            console.log(
                `---disconnect--- name: ${
                    roomList.get(socket.room_id) && roomList.get(socket.room_id).getPeers().get(socket.id).name
                }`,
            );
            if (!socket.room_id) return;
            roomList.get(socket.room_id).removePeer(socket.id);
        });

        socket.on("producerClosed", ({producer_id}) => {
            console.log(
                `---producer close--- name: ${
                    roomList.get(socket.room_id) && roomList.get(socket.room_id).getPeers().get(socket.id).name
                }`,
            );
            roomList.get(socket.room_id).closeProducer(socket.id, producer_id);
        });

        socket.on("exitRoom", async (_, callback) => {
            console.log(
                `---exit room--- name: ${
                    roomList.get(socket.room_id) && roomList.get(socket.room_id).getPeers().get(socket.id).name
                }`,
            );
            if (!roomList.has(socket.room_id)) {
                callback({
                    error: "not currently in a room",
                });
                return;
            }
            // close transports
            await roomList.get(socket.room_id).removePeer(socket.id);
            if (roomList.get(socket.room_id).getPeers().size === 0) {
                roomList.delete(socket.room_id);
            }

            socket.room_id = null;

            callback("successfully exited room");
        });
    });
}

async function runMediasoupWorker() {
    let {numWorkers} = config.mediasoup;

    for (let i = 0; i < numWorkers; i++) {
        let worker = await mediasoup.createWorker({
            logLevel: config.mediasoup.worker.logLevel,
            logTags: config.mediasoup.worker.logTags,
            rtcMinPort: config.mediasoup.worker.rtcMinPort,
            rtcMaxPort: config.mediasoup.worker.rtcMaxPort,
        });

        worker.on("died", () => {
            console.error("mediasoup worker died, exiting in 2 seconds... [pid:%d]", worker.pid);
            setTimeout(() => process.exit(1), 2000);
        });
        workers.push(worker);
    }
}

function room() {
    return Object.values(roomList).map((r) => {
        return {
            router: r.router.id,
            peers: Object.values(r.peers).map((p) => {
                return {
                    name: p.name,
                };
            }),
            id: r.id,
        };
    });
}

/**
 * Get next mediasoup Worker.
 */
function getMediasoupWorker() {
    const worker = workers[nextMediasoupWorkerIdx];

    if (++nextMediasoupWorkerIdx === workers.length) nextMediasoupWorkerIdx = 0;

    return worker;
}
