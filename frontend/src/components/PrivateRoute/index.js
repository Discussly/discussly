import React from "react";
import {Redirect, Route, withRouter} from "react-router-dom";
import {useStoreState} from "easy-peasy";

const PrivateRoute = ({component: Component, location, ...rest}) => {
    const [authenticatedUser] = useStoreState((state) => [state.auth.authenticatedUser]);

    if (!authenticatedUser) {
        return <Redirect to={{pathname: "/login"}} />;
    }

    return <Route {...rest} render={(props) => <Component {...props} />} />;
};

export default withRouter(PrivateRoute);
