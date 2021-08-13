"use strict";

require("./models/index");
import express from "express";
import http from "http";
import path from "path";
import cors from "cors";
import * as mediasoup from "mediasoup";
import * as socketIO from "socket.io";
import mediasoupOptions from "../config.js";
import {SocketHelper} from "./helpers/socket-helper.js";
import {addSocketEvents} from "./handlers/socket-events";
import {router} from "./handlers/register-routes";
import {registerJwtStrategy} from "./modules/auth/jwt.strategy";

let webServer;
let socketServer;
let expressApp;
let worker;
let nextMediasoupWorkerIdx = 0;
const workers = [];

// Run express app, configs. middlewares.
async function runExpressApp() {
    expressApp = express();
    expressApp.use(express.json());
    expressApp.use(
        cors({
            origin: "*",
        }),
    );
    expressApp.use("/", router);

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

    registerJwtStrategy();
}

async function runWebServer() {
    /**
     * @TODO SSL, CORS problem
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
            origin: process.env.FRONTEND_URL,
        },
    });

    socketServer.on("connection", (socket) => {
        const existingRooms = SocketHelper.getExistingRooms();
        socket.emit("existingRooms", {existingRooms});

        // add socket events
        addSocketEvents(socket, worker);

        // ---- sendback welcome message with on connected ---
        const newId = socket.id;
        SocketHelper.sendBack(socket, {type: "welcome", id: newId});
    });
}

/**
 * Get next mediasoup Worker.
 */
const getMediasoupWorker = () => {
    const worker = workers[nextMediasoupWorkerIdx];

    if (++nextMediasoupWorkerIdx === workers.length) {
        nextMediasoupWorkerIdx = 0;
    }

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
};

/**
 * Application bootstrap.
 */
(async () => {
    try {
        await runExpressApp();
        await runWebServer();
        await runMediasoupWorker();
        worker = getMediasoupWorker();
        await runSocketServer();

        await SocketHelper.setupRoom(worker, "default_room");
    } catch (err) {
        console.log(err);
    }
})();
