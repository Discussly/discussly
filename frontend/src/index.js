import "./styles/index.css";
import "./styles/App.css";

import React from "react";
import ReactDOM from "react-dom";
import {Router} from "react-router-dom";
import {StoreProvider} from "easy-peasy";
import {createBrowserHistory} from "history";
import {QueryClient, QueryClientProvider} from "react-query";
import {Room} from "./components/Room/index";
import PrivateRoute from "./components/PrivateRoute/index";
import {Route, Switch} from "react-router-dom";
import {SocketContext, socket} from "./context/socket.js";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import store from "./store/store";

const queryClient = new QueryClient();
const history = createBrowserHistory();

const App = () => {
    return (
        <div className="App">
            <SocketContext.Provider value={socket}>
                <Switch>
                    {/* Public routes */}
                    <Route exact path="/login" component={Login} />
                    <Route exact path="/register" component={Register} />

                    {/* Private routes */}
                    <PrivateRoute exact path="/" component={() => <Room />} />
                </Switch>
            </SocketContext.Provider>
        </div>
    );
};

ReactDOM.render(
    <React.StrictMode>
        <StoreProvider store={store}>
            <QueryClientProvider client={queryClient}>
                <Router history={history}>
                    <App />
                </Router>
            </QueryClientProvider>
        </StoreProvider>
    </React.StrictMode>,
    document.getElementById("root"),
);
