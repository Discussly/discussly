import React from "react";
import {connectSocket} from "../services/room-helpers";

export const socket = connectSocket();
export const SocketContext = React.createContext();
