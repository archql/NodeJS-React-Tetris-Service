import React from 'react';
import { withRouter } from '../common/with_router.js';
import { required } from '../common/helpers.js';
import { authService } from  "../services/auth_service.js"
import '../stylesheets/forms.css';
import { Link } from "react-router-dom";

export class RegisterForm extends React.Component {

    constructor(props) {
        super(props);

        // define values of this form
        this.state = {
            name: '',
            password: '',
            password_repeat: '',
            loading: false,
            successful: false,
            message: ''
        };

        //
        this.onChangeName = this.onChangeName.bind(this);
        this.onChangePassword = this.onChangePassword.bind(this);
        this.onChangePasswordRepeat = this.onChangePasswordRepeat.bind(this);
        this.handleRegister = this.handleRegister.bind(this);
    }

    handleRegister(event) {
        event.preventDefault();

        const { name, password, password_repeat } = this.state;

        // check input
        let badInput = name.length < 3 || password !== password_repeat || password.length < 4;
        if (badInput) {
            this.setState({
                loading: false,
                message: "bad input!"
            });
            return;
        }

        // if eok - try to register
        this.setState({
            message: "",
            loading: true
        });

        authService.register(name, password).then(
            (response) => {
                if (response.status !== 200) {
                    this.setState({
                        loading: false,
                        message: response.body.error_message
                    });
                } else {
                    this.props.router.navigate("/login");
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
    onChangePasswordRepeat(e) {
        this.setState({
            password_repeat: e.target.value
        });
    }

    render() {
        return (
            <div className="reg_container">
                <div className="reg_box">
                    <div className="reg_header">Register Form</div>
                    <form method="POST" className="reg_form" onSubmit={this.handleRegister}>
                        <div>
                            <label htmlFor="name-reg" className="form-label">Name</label>
                            <input value={this.state.name} onChange={this.onChangeName} type="text" className="input-field" id="name-reg"></input>
                        </div>
                        <div>
                            <label htmlFor="password-reg" className="form-label">Password</label>
                            <input value={this.state.password} onChange={this.onChangePassword} type="password" className="input-field" id="password-reg"></input>
                        </div>
                        <div>
                            <label htmlFor="password-conf-reg" className="form-label">Confirm Password</label>
                            <input value={this.state.password_repeat} onChange={this.onChangePasswordRepeat} type="password" className="input-field" id="password-conf-reg"></input>
                        </div>

                        <button className="reg_button" type="submit">Submit</button>
                    </form>
                    <Link to={"/login"}> Already have an account? Login here </Link>
                </div>
                {this.state.message && (
                    <div className="reg_bo_info">
                        <div
                            className={
                                this.state.successful
                                    ? "alert alert-success"
                                    : "alert alert-danger"
                            }
                            role="alert"
                        >{this.state.message}</div>
                    </div>
                )}
            </div>

        );
    }
}

export const RegisterFormRouted = withRouter(RegisterForm);