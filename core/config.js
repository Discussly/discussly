import os from "os";

export default {
    listenIp: "127.0.0.1",
    listenPort: 3000,
    sslCrt: "/certs/file.crt",
    sslKey: "/certs/file.pem",
    mediasoup: {
        // Worker settings
        numWorkers: Object.keys(os.cpus()).length,
        worker: {
            rtcMinPort: 10000,
            rtcMaxPort: 10100,
            logLevel: "warn",
            logTags: [
                "info",
                "ice",
                "dtls",
                "rtp",
                "srtp",
                "rtcp",
                // 'rtx',
                // 'bwe',
                // 'score',
                // 'simulcast',
                // 'svc'
            ],
        },
        // Router settings
        router: {
            mediaCodecs: [
                {
                    kind: "audio",
                    mimeType: "audio/opus",
                    clockRate: 48000,
                    channels: 2,
                },
                {
                    kind: "video",
                    mimeType: "video/VP8",
                    clockRate: 90000,
                    parameters: {
                        "x-google-start-bitrate": 1000,
                    },
                },
            ],
        },
        // WebRtcTransport settings
        webRtcTransport: {
            listenIps: [
                {
                    ip: "127.0.0.1",
                    announcedIp: null,
                },
            ],
            enableUdp: true,
            enableTcp: true,
            preferUdp: true,
            maxIncomingBitrate: 1500000,
            initialAvailableOutgoingBitrate: 1000000,
        },
    },
};
