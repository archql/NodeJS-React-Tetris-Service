import React from 'react';
import { withRouter } from '../common/with_router.js';
import { required } from '../common/helpers.js';
import { authService } from  "../services/auth_service.js"
import '../stylesheets/forms.css';

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
                window.location.reload();
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
                <div className="reg_box">
                    <div className="reg_header">Login Form</div>
                    <form method="POST" className="login_form" onSubmit={e => this.handleLogin(e)}>
                        <div>
                            <label htmlFor="name-reg" className="form-label">Name</label>
                            <input value={this.state.name} onChange={e => this.onChangeName(e)} type="text" className="input-field" id="name-reg"></input>
                        </div>
                        <div>
                            <label htmlFor="password-reg" className="form-label">Password</label>
                            <input value={this.state.password} onChange={e => this.onChangePassword(e)} type="password" className="input-field" id="password-reg"></input>
                        </div>

                        <button className="reg_button" type="submit">Submit</button>
                    </form>
                    <a href="/register">Do not have an account? Register here</a>
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

export const LoginFormRouted = withRouter(LoginForm);