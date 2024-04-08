import React, {Component, Fragment} from "react";
import {withRouter} from "../common/with_router";
import {InputField} from "./input_field";
import {socket} from "./account";
import {authService} from "../services/auth_service";

class RoomCreate extends Component {

    constructor(props) {
        super(props);

        // define values of this form
        this.state = {
            name: '',
            teams: 2,
            password: '',
            password_repeat: '',
            members: 0,
            loading: false,
            successful: false,
            message: ''
        };
    }
    componentDidMount() {
        socket.on('room create', this.onAddRoom)
        socket.on('error', this.onError)
    }

    componentWillUnmount() {
        socket.off('room create', this.onAddRoom)
        socket.off('error', this.onError)
    }

    onChangeName = (e) => {
        this.setState({
            name: e.target.value
        });
    }
    onChangeTeams = (e) => {
        this.setState({
            teams: e.target.value
        });
    }
    onChangeMembers = (e) => {
        this.setState({
            members: e.target.value
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

    handleCreate = (e) => {
        e.preventDefault();

        console.log("handleCreate")

        const { name, teams, members, password_repeat, password } = this.state;
        const room = {
            name,
            teams,
            members,
        };

        // check input
        let badInput = name.length < 3 || password !== password_repeat
            || (password.length < 4 && password.length !== 0) || teams < 2 || teams > 4 || members < 1 || members > 4;
        if (badInput) {
            this.setState({
                loading: false,
                message: "bad input!",
                successful: false
            });
            return;
        }
        // if eok - try to register
        this.setState({
            message: "",
            loading: true
        });
        //
        room.password_hash = password ? authService.hash(password) : null
        //
        socket.emit('room create', room);
    }
    onAddRoom = (room) => {
        console.log("onAddRoom", room)
        // if eok - try to register
        this.setState({
            message: "OK",
            loading: false,
            successful: true
        });
    }
    onError = (e) => {
        console.log("on Error")
        this.setState({
            message: e.message,
            loading: false,
            successful: false
        });
    }

    render() {
        return (
            <Fragment>
                <div className="reg_header">Room creation</div>
                <form method="POST" className="reg_box reg_form" style={{margin:0, padding:0}} onSubmit={this.handleCreate}>
                    <InputField
                        onChange={e => this.onChangeName(e)}
                        type={"text"}
                    >
                        Name
                    </InputField>
                    <InputField
                        onChange={e => this.onChangeTeams(e)}
                        type={"number"}
                        min={2}
                        max={4}
                    >
                        Teams
                    </InputField>
                    <InputField
                        onChange={e => this.onChangeMembers(e)}
                        type={"number"}
                        min={1}
                        max={4}
                    >
                        Members per team
                    </InputField>
                    <InputField
                        onChange={e => this.onChangePassword(e)}
                        type={"password"}
                    >
                        Room password (keep empty for public)
                    </InputField>
                    <InputField
                        onChange={e => this.onChangePasswordRepeat(e)}
                        type={"password"}
                    >
                        Confirm room password
                    </InputField>

                    <button className="btn reg_btn" type="submit">Submit</button>
                </form>
                {this.state.message && (
                    <div className="reg_bo_info">
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
            </Fragment>
        );
    }
}

export const RoomCreateRouted = withRouter(RoomCreate);