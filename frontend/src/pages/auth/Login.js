import React, {useEffect} from "react";
import {Redirect, Link} from "react-router-dom";
import CssBaseline from "@material-ui/core/CssBaseline";
import {makeStyles} from "@material-ui/core/styles";
import Button from "@material-ui/core/Button";
import Typography from "@material-ui/core/Typography";
import FormControl from "@material-ui/core/FormControl";
import Paper from "@material-ui/core/Paper";
import Grid from "@material-ui/core/Grid";
import {useApiLogin} from "../../hooks";
import {Formik, Form} from "formik";
import {TextField} from "../../components/TextField/index";
import {useStoreState, useStoreActions} from "easy-peasy";

const useStyles = makeStyles((theme) => ({
    root: {
        flexGrow: 1,
    },
    paper: {
        padding: theme.spacing(1),
        textAlign: "center",
        color: theme.palette.text.secondary,
    },
    login: {
        display: "flex",
        height: "100vh",
    },
    emailOrPasswordIncorrect: {
        color: "#ff0000",
    },
    loginForm: {
        alignItems: "center",
        padding: theme.spacing(8, 8, 4, 4),
        width: "20%",
        marginLeft: "40%",
        marginTop: "10%",
        backgroundColor: "#fdfdfd",
        [theme.breakpoints.down("sm")]: {
            width: "100%",
        },
    },
    loginFormHeader: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        marginBottom: theme.spacing(4),
    },
    submit: {
        marginTop: theme.spacing(3),
    },
    icon: {
        color: theme.palette.primary.main,
    },
}));

const Login = () => {
    const classes = useStyles();
    const {authenticatedUser} = useStoreState((state) => state.auth);
    const {setAuth} = useStoreActions((actions) => actions.auth);
    const {mutate: login, isSuccess, data, error} = useApiLogin();

    useEffect(() => {
        if (isSuccess && data) {
            setAuth(data);
        }
    }, [isSuccess, data, setAuth]);

    console.log(authenticatedUser);

    if (authenticatedUser) {
        return <Redirect to="/" replace />;
    }

    const initialValues = {
        email: "",
        password: "",
    };

    return (
        <>
            <CssBaseline />
            <div className={classes.root}>
                <Grid container spacing={3}>
                    <Grid item xs={12} md={12}>
                        <Paper className={classes.paper}>
                            <div className={classes.login}>
                                <div className={classes.loginForm}>
                                    <div className={classes.loginFormHeader}>
                                        <Typography component="h1" variant="h6" color="textSecondary">
                                            Sign in
                                        </Typography>
                                    </div>
                                    {error && (
                                        <Typography className={classes.emailOrPasswordIncorrect}>
                                            Email or password is wrong.
                                        </Typography>
                                    )}
                                    <Formik
                                        initialValues={initialValues}
                                        displayErrors={false}
                                        onSubmit={(payload) => {
                                            console.log(payload);
                                            login({payload: {...payload}});
                                        }}
                                    >
                                        <Form>
                                            <FormControl margin="normal" fullWidth>
                                                <Typography component="h2" variant="h6" color="textSecondary">
                                                    Email
                                                </Typography>
                                                <TextField
                                                    variant="outlined"
                                                    label="Email Address"
                                                    name="email"
                                                    required
                                                    fullWidth
                                                />
                                            </FormControl>
                                            <FormControl margin="normal" fullWidth>
                                                <Typography component="h2" variant="h6" color="textSecondary">
                                                    Password
                                                </Typography>
                                                <TextField
                                                    variant="outlined"
                                                    label="Password"
                                                    name="password"
                                                    type="password"
                                                    required
                                                    fullWidth
                                                />
                                            </FormControl>
                                            <Button
                                                type="submit"
                                                variant="contained"
                                                color="primary"
                                                className={classes.submit}
                                                fullWidth
                                            >
                                                Sign In
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="contained"
                                                color="secondary"
                                                className={classes.submit}
                                                fullWidth
                                            >
                                                <Link to="/register" style={{textDecoration: "none", color: "white"}}>
                                                    Register
                                                </Link>
                                            </Button>
                                        </Form>
                                    </Formik>
                                </div>
                            </div>
                        </Paper>
                    </Grid>
                </Grid>
            </div>
        </>
    );
};

export default Login;
