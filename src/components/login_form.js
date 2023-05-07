import React from 'react';
import { withRouter } from '../common/with_router.js';
import { required } from '../common/helpers.js';
import { authService } from  "../services/auth_service.js"
import '../stylesheets/forms.css';
import { Link } from "react-router-dom";
import {InputField} from "./input_field";

export class LoginForm extends React.Component {

    constructor(props) {
        super(props);

        // define values of this form
        this.state = {
            name: '',
            password: '',
            loading: false,
            successful: false,
            message: ''
        };
    }

    handleLogin(event) {
        event.preventDefault();

        const {name, password} = this.state;

        // check input
        let badInput = name.length < 3 || password.length < 4;
        if (badInput) {
            this.setState({
                loading: false,
                message: "bad input!"
            });
            return;
        }

        authService.login(name, password).then((data) => {
            console.log(data);
            if (data.status !== 200) {
                this.setState({
                    loading: false,
                    message: data.body.error_message || ''
                });
            } else {
                this.props.router.navigate("/");
            }
        }).catch(error => {
            console.log(error);
            const resMessage =
                (error.response &&
                    error.response.data &&
                    error.response.data.message) ||
                error.message ||
                error.toString();

            this.setState({
                loading: false,
                message: resMessage
            });
        });
    }

    onChangeName(e) {
        this.setState({
            name: e.target.value
        });
    }
    onChangePassword(e) {
        this.setState({
            password: e.target.value
        });
    }

    render() {
        return (
            <div className="reg_container">
                <div className="box reg_box">
                    <div className="reg_header">Login Form</div>
                    <form method="POST" className="login_form" onSubmit={e => this.handleLogin(e)}>
                        <InputField
                            onChange={e => this.onChangeName(e)}
                            id={"reg-name"}
                            type={"text"}
                        >
                            Name
                        </InputField>
                        <InputField
                            onChange={e => this.onChangePassword(e)}
                            id={"reg-password"}
                            type={"password"}
                        >
                            Password
                        </InputField>

                        <button className="btn reg_btn" type="submit">Submit</button>
                    </form>
                    <Link className={"link"} to={"/auth/register"}> Do not have an account? Register here </Link>
                </div>
                {this.state.message && (
                    <div className="box reg_bo_info">
                        <div
                            className={
                                this.state.successful
                                    ? "alert alert-success"
                                    : "alert alert-danger"
                            }
                            role="alert"
                        >{this.state.successful ? '\u2705 ': '\u26A0 '}{this.state.message}</div>
                    </div>
                )}
            </div>
        );
    }
}

export const LoginFormRouted = withRouter(LoginForm);