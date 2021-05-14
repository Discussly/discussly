/* eslint-disable no-undef */
import React, {useEffect, useState} from "react";

import {publish, startMedia} from "./roomHelpers";

export function Room() {
    return (
        <>
            <div id="container">
                <div>Test Room 1</div>

                <button onClick={() => publish()}>Speak</button>

                <button onClick={() => startMedia()}>Local connect</button>
                <video id="local_video" autoPlay style={{width: 120, height: 90, border: "1px solid black"}}>
                    Local
                </video>
            </div>
        </>
    );
}
