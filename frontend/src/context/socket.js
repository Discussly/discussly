import React from "react";
import {connectSocket} from "../roomHelpers";

export const socket = connectSocket();
export const SocketContext = React.createContext();
