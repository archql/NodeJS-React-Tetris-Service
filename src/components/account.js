import React from 'react';
import Cookies from 'js-cookie';
import { authService } from  "../services/auth_service.js";
import { userService } from "../services/user_service.js";
import { Navigate } from "react-router-dom";
import { withRouter } from '../common/with_router.js';

import '../stylesheets/user.css';
import {ListContainer} from "./list_container";
import {ResizeableInput} from "./resizeable_input";
import {MessageContainer} from "./message_container";
import * as faIcons from "@fortawesome/fontawesome-free-solid";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";

import { io } from 'socket.io-client';
const socket = io("http://localhost:5000/chat", {
    autoConnect: false,
    //withCredentials: true,
    auth: {
        token: Cookies.get('jwt')
    }
});

export class Account extends React.Component {

    constructor(props) {
        super(props);

        // define values of this component
        this.state = {
            redirect: null,
            userReady: false,
            userSelected: null,
            messages: [],
            messageEdited: null,
            inputUpdateHack: false
        };

        this.messageContentRef = null;
        this.fileInputRef = null;
    }
    componentDidMount() {
        console.log("mount " + Cookies.get('jwt'));
        socket.auth.token = Cookies.get('jwt');

        socket.connect();

        socket.on('connect', this.onConnect);
        socket.on('disconnect', this.onDisconnect);
        socket.on('error', this.onError);
        socket.on('connect_error', this.onConnectError)
        socket.on('self', this.onSelf);
        socket.on('members', this.onMembers);
        socket.on('create message', this.onCreateMessage);
        socket.on('delete message', this.onDeleteMessage);
        socket.on('edit message', this.onEditMessage);
        socket.on('messages', this.onMessages);
        socket.on('new message', this.onNewMessage);
        socket.on('user updated', this.onUserUpdated);
    }

    componentWillUnmount() {
        socket.off('connect', this.onConnect);
        socket.off('disconnect', this.onDisconnect);
        socket.off('error', this.onError);
        socket.off('connect_error', this.onConnectError)
        socket.off('self', this.onSelf);
        socket.off('members', this.onMembers);
        socket.off('create message', this.onCreateMessage);
        socket.off('delete message', this.onDeleteMessage);
        socket.off('edit message', this.onEditMessage);
        socket.off('messages', this.onMessages);
        socket.off('new message', this.onNewMessage);
        socket.off('user updated', this.onUserUpdated);
    }

    onConnect = () => {
        console.log("connect")
    }

    onDisconnect = () => {
        console.log("disconnect")
    }

    onError = (error) => {
        console.log(`onError ${error.status} ${error.message}`);
    }
    onConnectError = () => {
        console.log("onConnectError")
        this.setState({redirect: "/auth/login"});
        socket.disconnect();
    }

    onSelf = (data) => {
        this.setState({user: data})
    }
    onMembers = (data) => {
        this.setState({others: data})
    }
    onCreateMessage = (newMessage) => {
        console.log("newMessage");
        console.log(newMessage);
        this.fileInputRef.value = '';
        this.setState({
            messages: [...this.state.messages, newMessage],
            inputUpdateHack: !this.state.inputUpdateHack })
        // TODO clear input
    }

    onDeleteMessage = (msgId) => {
        const messages = [...this.state.messages];
        const newMessages = messages.filter(function( obj ) {
            return obj.message_id !== msgId;
        });
        this.setState({messages: newMessages})
    }
    onEditMessage = (msg) => {
        const messages = this.state.messages.map((item) => {
            if (item.message_id === msg.message_id) {
                item.message_content = msg.message_content;
                item.message_updated = msg.message_updated;
            }
            return item;
        });

        this.setState({messageEdited: null, messages: messages});
    }

    onNewMessage = (newMessage) => {
        this.setState({
            messages: [...this.state.messages, newMessage]
        });
    }
    onMessages = (messages) => {
        this.setState({messages: messages})
    }

    onUserUpdated = (user) => {
        console.log(user);
        let count = 0;
        let others = this.state.others.map((item) => {
            if (item.user_id === user.user_id) {
                count++;
                return user;
            }
            return item;
        });
        if (count === 0) {
            others = [...others, user];
        }
        this.setState({others: others})
    }

    userSelected(user) {
        if (user) {
            this.setState({userSelected: user})
            socket.emit('messages', user.user_id);
        } else {
            this.setState({userSelected: null, messages: [] });
        }
    }

    logout(e) {
        authService.logout();
        this.setState({redirect: "/auth/login"});
        socket.close();
    }

    sendMessage(e) {
        e.preventDefault();

        const userSelected = this.state.userSelected;
        const iContent = document.getElementById('message_content');
        const iAttachments = document.getElementById('message_attachments');
        const iForm = this.fileInputRef; //document.getElementById('message_input_form');
        console.log(this.fileInputRef);
        if (userSelected && iContent && iForm && iAttachments && iContent.value !== '') {
            const filesArray = Array.from(iAttachments.files).map(file => {
                return {
                    buffer: file,
                    name: file.name,
                    type: file.type
                }
            });
            socket.emit('create message', userSelected.user_id, iContent.value, filesArray);
        }
    }

    deleteMessage(msgId) {
        socket.emit('delete message', msgId );
    }

    editMessage(msg) {
        if (this.state.messageEdited === msg) {
            this.setState({messageEdited: null})
        } else {
            this.setState({messageEdited: msg})
        }
    }
    doEditMessage(e) {
        e.preventDefault();

        const userSelected = this.state.userSelected;
        const iContent = document.getElementById('message_content');
        const iAttachments = document.getElementById('message_attachments');
        const iForm = document.getElementById('message_input_form');
        const messageEdited = this.state.messageEdited;
        if (userSelected && messageEdited && iContent && iForm && iAttachments && iContent.value !== '') {
            socket.emit('edit message', messageEdited.message_id, iContent.value );
        }
    }

    render() {
        if (this.state.redirect) {
            return <Navigate to={this.state.redirect} />
        } else if (this.state.user && this.state.others) {
            this.state.others.forEach((item) => (
                console.log(item)
            ));
            const messageEdited = this.state.messageEdited;
            return (
            <div className="container flex_spread">
                <div className="card user_card">
                    <div className="user_image">
                        <img src="./images/icon_user.png" alt="user_icon"></img>
                    </div>
                    <div className="user_info">
                        <div className="user_name">
                            {this.state.user.user_name}
                        </div>
                        <div className="user_role" style={{
                            backgroundColor: this.state.user.role.role_color
                        }}>
                            {this.state.user.role.role_name}
                        </div>
                        <div>
                            status = {this.state.user.status.status_name}
                        </div>
                    </div>
                    <div className={"logout"} onClick={e => this.logout(e)}>
                        <FontAwesomeIcon icon={faIcons.faSignOutAlt}/>
                    </div>
                </div>
                <div className="card flex_spread">
                    <div className="messages_grid" style={{flex: 1, flexBasis: 0}}>
                        <div className="box top_left top">
                            Select user to start messaging
                        </div>
                        <div className="box top_right top">
                            Messages
                        </div>
                        <div className="box user_list">
                            <ListContainer
                                list={this.state.others}
                                callback={e => this.userSelected(e)}
                                idMap={(item) => item.user_id} // TODO
                                nameMap={(item) => <div><div>{item.user_name}</div> <div style={{fontSize: 'smaller', fontStyle: 'italic'}}>{item.user_status_id === 1 ? "offline" : "on-line" }</div></div>}
                                cssItemClass={"user"}
                                cssActiveClass={"active"}
                            />
                        </div>
                        <MessageContainer
                            curUserId={this.state.user.user_id}
                            messages={this.state.messages}
                            deleteMessage={id => this.deleteMessage(id)}
                            editMessage={id => this.editMessage(id)}
                            selectedMsgId={this.state.messageEdited ? this.state.messageEdited.message_id : 0}
                        />
                        <div className="box bottom_left">
                            <div>Add new user</div>
                        </div>
                        <div className="box bottom_right">
                            {/*TODO separate*/}
                            <form
                                id={"message_input_form"}
                                className="message_input_form"
                                encType="multipart/form-data"
                            >
                                <div>
                                    <label
                                        htmlFor="message_content"
                                        className="form_label"
                                    >
                                        Content
                                    </label>
                                    <ResizeableInput
                                        id={"message_content"}
                                        ref={ref => (this.messageContentRef = ref)}
                                        value={messageEdited ? messageEdited.message_content: ''}
                                        hack={this.state.inputUpdateHack}
                                    />
                                </div>
                                <input
                                    multiple
                                    type="file"
                                    ref={ref => (this.fileInputRef = ref)}
                                    name="attachment"
                                    accept=".jpg, .jpeg, .png"
                                    id={"message_attachments"}
                                />
                                <button
                                    type="submit"
                                    className="send_button"
                                    onClick={messageEdited? e => this.doEditMessage(e) : e => this.sendMessage(e)}
                                >
                                    { messageEdited ? 'Edit message' : 'Send message' }
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>);
        } else {
            return ("");
        }
    }
}

export const AccountRouted = withRouter(Account);