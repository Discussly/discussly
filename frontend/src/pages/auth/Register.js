import React from "react";
import {Redirect} from "react-router-dom";
import {makeStyles} from "@material-ui/core/styles";
import Button from "@material-ui/core/Button";
import CssBaseline from "@material-ui/core/CssBaseline";
import FormControl from "@material-ui/core/FormControl";
import LockOpenOutlinedIcon from "@material-ui/icons/LockOpenOutlined";
import {InputAdornment} from "@material-ui/core";
import Typography from "@material-ui/core/Typography";
import MailOutlineOutlinedIcon from "@material-ui/icons/MailOutlineOutlined";
import {Formik, Form} from "formik";
import {TextField} from "../../components/TextField/index";
import {useApiRegister} from "../../hooks";

const useStyles = makeStyles((theme) => ({
    register: {
        display: "flex",
        height: "100vh",
    },
    formError: {
        color: "#ff0000",
    },
    registerForm: {
        alignItems: "center",
        padding: theme.spacing(8, 4, 4, 4),
        width: "25%",
        marginLeft: "40%",
        backgroundColor: theme.palette.type === "dark" ? theme.palette.primary.dark : "#fdfdfd",
        [theme.breakpoints.down("sm")]: {
            width: "100%",
        },
    },
    registerFormHeader: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        marginBottom: theme.spacing(4),
    },
    venuexLogo: {
        marginBottom: theme.spacing(1),
    },
    submit: {
        marginTop: theme.spacing(3),
    },
    copyright: {
        marginTop: theme.spacing(3),
    },
    icon: {
        color: theme.palette.primary.main,
    },
}));

const Register = () => {
    const classes = useStyles();
    const {
        mutate: registerUser,
        error: registerError,
        isSuccess: registerSuccess,
        isLoading: registerLoading,
    } = useApiRegister();

    const initialValues = {
        email: "",
        first_name: "",
        last_name: "",
        password: "",
        password_confirmation: "",
    };

    if (registerSuccess) {
        return <Redirect to="/login" />;
    }

    return (
        <>
            <CssBaseline />
            <div className={classes.register}>
                <div className={classes.registerForm}>
                    <div className={classes.registerFormHeader}>
                        <Typography component="h1" variant="h6" color="textSecondary">
                            Register your account
                        </Typography>
                    </div>
                    {registerError && (
                        <Typography className={classes.formError}>
                            Error during registration, please try again later
                        </Typography>
                    )}
                    <Formik
                        initialValues={initialValues}
                        displayErrors={false}
                        onSubmit={(payload) => {
                            registerUser({payload});
                        }}
                    >
                        <Form>
                            <FormControl margin="normal" fullWidth>
                                <TextField
                                    variant="outlined"
                                    label="Email Address"
                                    name="email"
                                    required
                                    fullWidth
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <MailOutlineOutlinedIcon className={classes.icon} />
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                            </FormControl>
                            <FormControl margin="normal" fullWidth>
                                <TextField
                                    variant="outlined"
                                    label="Name"
                                    name="first_name"
                                    fullWidth
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <LockOpenOutlinedIcon className={classes.icon} />
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                            </FormControl>
                            <FormControl margin="normal" fullWidth>
                                <TextField
                                    variant="outlined"
                                    label="Surname"
                                    name="last_name"
                                    fullWidth
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <LockOpenOutlinedIcon className={classes.icon} />
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                            </FormControl>
                            <FormControl margin="normal" fullWidth>
                                <TextField
                                    variant="outlined"
                                    label="Password"
                                    name="password"
                                    type="password"
                                    required
                                    fullWidth
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <LockOpenOutlinedIcon className={classes.icon} />
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                            </FormControl>
                            <FormControl margin="normal" fullWidth>
                                <TextField
                                    variant="outlined"
                                    label="Password Again"
                                    name="password_confirmation"
                                    type="password"
                                    required
                                    fullWidth
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <LockOpenOutlinedIcon className={classes.icon} />
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                            </FormControl>
                            <Button
                                type="submit"
                                variant="contained"
                                color="primary"
                                className={classes.submit}
                                fullWidth
                            >
                                Register
                            </Button>
                        </Form>
                    </Formik>
                </div>
            </div>
        </>
    );
};

export default Register;
