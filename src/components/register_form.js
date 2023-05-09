import React from 'react';
import { withRouter } from '../common/with_router.js';
import { required } from '../common/helpers.js';
import { authService } from  "../services/auth_service.js"
import '../stylesheets/forms.css';
import { Link } from "react-router-dom";
import {InputField} from "./input_field";

export class RegisterForm extends React.Component {

    constructor(props) {
        super(props);

        // define values of this form
        this.state = {
            name: '',
            password: '',
            password_repeat: '',
            nickname: '',
            surname: '',
            loading: false,
            successful: false,
            message: ''
        };
    }

    handleRegister = (event) => {
        event.preventDefault();

        const { name, surname, nickname, password, password_repeat } = this.state;

        // check input
        let badInput = name.length < 3 || surname.length < 3 || password !== password_repeat || password.length < 4;
        if (badInput) {
            this.setState({
                loading: false,
                message: "bad input!"
            });
            return;
        }
        const badNickName = !nickname.match(/^[_A-Z]{8}$/g);
        if (badNickName) {
            this.setState({
                loading: false,
                message: "bad nickname! (8 capitalized latin letters or '_' symbol)"
            });
            return;
        }

        // if eok - try to register
        this.setState({
            message: "",
            loading: true
        });

        authService.register(name, surname, nickname, password).then(
            (response) => {
                if (response.status !== 200) {
                    this.setState({
                        loading: false,
                        message: response.body.error_message
                    });
                } else {
                    this.props.router.navigate("/auth/login");
                    //window.location.reload();
                }
            }).catch(error => {
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

    onChangeName = (e) => {
        this.setState({
            name: e.target.value
        });
    }
    onChangeSurname = (e) => {
        this.setState({
            surname: e.target.value
        });
    }
    onChangeNickname = (e) => {
        this.setState({
            nickname: e.target.value
        });
    }
    onChangePassword = (e) => {
        this.setState({
            password: e.target.value
        });
    }
    onChangePasswordRepeat = (e) => {
        this.setState({
            password_repeat: e.target.value
        });
    }

    render() {
        return (
            <div className="reg_container">
                <div className="box reg_box">
                    <div className="reg_header">Register Form</div>
                    <form method="POST" className="reg_form" onSubmit={this.handleRegister}>
                        <InputField
                            onChange={e => this.onChangeName(e)}
                            id={"reg-name"}
                            type={"text"}
                        >
                            Name
                        </InputField>
                        <InputField
                            onChange={e => this.onChangeSurname(e)}
                            id={"reg-surname"}
                            type={"text"}
                        >
                            Surname
                        </InputField>
                        <InputField
                            onChange={e => this.onChangeNickname(e)}
                            id={"reg-nickname"}
                            type={"text"}
                        >
                            Nickname
                        </InputField>
                        <InputField
                            onChange={e => this.onChangePassword(e)}
                            id={"reg-password"}
                            type={"password"}
                        >
                            Password
                        </InputField>
                        <InputField
                            onChange={e => this.onChangePasswordRepeat(e)}
                            id={"reg-password-conf"}
                            type={"password"}
                        >
                            Confirm your password
                        </InputField>

                        <button className="btn reg_btn" type="submit">Submit</button>
                    </form>
                    <div>
                        <Link className={"link"} to={"/auth/login"}> Already have an account? Login here</Link>
                    </div>
                    <div>
                        <Link className={"link"} to={"/game"}> Want to play without an account? Click here </Link>
                    </div>
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

export const RegisterFormRouted = withRouter(RegisterForm);