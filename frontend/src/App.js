import "./App.css";

import {Room} from "./Room";
import {SocketContext, socket} from "./context/socket.js";

function App() {
    return (
        <div className="App">
            <SocketContext.Provider value={socket}>
                <header className="App-header">
                    <Room />
                </header>
            </SocketContext.Provider>
        </div>
    );
}

export default App;
