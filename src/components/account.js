import React from 'react';
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

export class Account extends React.Component {

    constructor(props) {
        super(props);

        console.log("constructor")

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
        console.log("mount");
        // TODO dup code!
        userService.getInit().then(data => {
            console.log(data.body.data)
            if (data.status === 403 || data.body.data.getSelf === null) {
                this.setState({redirect: "/login"});
            } else if (data.status !== 200) {
                alert("Server returned an error: " + data.body.error_message);
            } else {
                this.setState({
                    user: data.body.data.getSelf,
                    others: data.body.data.getOthers
                })
            }
        }).catch(e => {
            this.setState({ redirect: "/login" });
        });
    }

    userSelected(user) {
        if (user) {
            // do this separately in the messages section
            userService.getMessages(user.user_id).then(data => {
                console.log(data);
                if (data.status === 403 || data.body.data.getMessages === null) {
                    this.setState({redirect: "/login"});
                } else if (data.status !== 200) {
                    alert("Server returned an error: " + data.body.error_message);
                } else {
                    this.setState({messages: data.body.data.getMessages,
                                        userSelected: user})
                }
            }).catch(e => {
                this.setState({redirect: "/login"});
            });
        } else {
            this.setState({userSelected: null, messages: [] });
        }
    }

    logout(e) {
        authService.logout();
        this.setState({redirect: "/login"});
    }

    sendMessage(e) {
        e.preventDefault();

        const userSelected = this.state.userSelected;
        const iContent = document.getElementById('message_content');
        const iAttachments = this.fileInputRef;//document.getElementById('message_attachments');
        const iForm = document.getElementById('message_input_form');
        if (userSelected && iContent && iForm && iAttachments && iContent.value !== '') {
            //console.log(element.value);
            userService.sendMessage(userSelected.user_id, iContent.value, iAttachments.files).then(data => {
                console.log(data);
                if (data.status === 403 || data.body.data.sendMessage === null) {
                    this.setState({redirect: "/login"});
                } else if (data.status !== 200) {
                    alert("Server returned an error: " + data.body.error_message);
                } else {
                    this.setState({
                        messages: [...this.state.messages, data.body.data.sendMessage],
                        inputUpdateHack: !this.state.inputUpdateHack })
                    // TODO clear input
                    console.log("iForm.reset();");
                    iForm.reset();

                }
            }).catch(e => {
                // TODO what if error is not connected with jwt
                this.setState({redirect: "/login"});
            });
        }
    }

    deleteMessage(msgId) {
        userService.deleteMessage(msgId).then(data => {
            if (data.status === 403|| !data.body.data.deleteMessage) {
                this.setState({redirect: "/login"});
            } else if (data.status !== 200) {
                alert("Server returned an error");
            } else {
                const messages = this.state.messages;
                const newMessages = messages.filter(function( obj ) {
                    return obj.message_id !== msgId;
                });
                this.setState({messages: newMessages})
            }
        }).catch(e => {
            // TODO what if error is not connected with jwt
            this.setState({redirect: "/login"});
        });
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
        const iAttachments = this.fileInputRef;//document.getElementById('message_attachments');
        const iForm = document.getElementById('message_input_form');
        const messageEdited = this.state.messageEdited;
        if (userSelected && messageEdited && iContent && iForm && iAttachments && iContent.value !== '') {
            userService.editMessage({
                message_id: messageEdited.message_id,
                message_content: iContent.value
            }).then(data => {
                console.log("saddddddddddddddddddd");
                console.log(data);
                if (data.status === 403 || !data.body.data.editMessage) {
                    this.setState({redirect: "/login"});
                } else if (data.status !== 200) {
                    alert("Server returned an error");
                } else {
                    const messages = this.state.messages.map((item) => {
                        if (item.message_id === data.body.data.editMessage.message_id) {
                            item.message_content = data.body.data.editMessage.message_content;
                            item.message_updated = data.body.data.editMessage.message_updated;
                        }
                        return item;
                    });

                    this.setState({messageEdited: null, messages: messages});
                }
            }).catch(e => {
                // TODO what if error is not connected with jwt
                this.setState({redirect: "/login"});
            });
        }
    }

    render() {
        if (this.state.redirect) {
            return <Navigate to={this.state.redirect} />
        } else if (this.state.user && this.state.others) {
            console.log(this.state.user);
            console.log(this.state.others);
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
                                nameMap={(item) => item.user_name}
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
                                    name="attachment"
                                    ref={ref => (this.fileInputRef = ref)}
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