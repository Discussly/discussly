import {TextField as FormikTextField} from "@material-ui/core";
import {Field} from "formik";

export const TextField = ({name, validate, ...otherProps}) => {
    return (
        <Field name={name} validate={validate || null}>
            {({field}) => <FormikTextField {...field} {...otherProps} />}
        </Field>
    );
};
