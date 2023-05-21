import {ListContainer} from "./list_container";
import {MessageContainer} from "./message_container";
import {ResizeableInput} from "./resizeable_input";
import React from "react";
import {withRouter} from "../common/with_router";
import {Account} from "./account";
import {authService} from "../services/auth_service";

import { socket } from "./account";

export class Chat extends React.Component {

    constructor(props) {
        super(props);

        // define values of this component
        this.state = {
            userSelected: null,
            messages: [],
            others: [],
            messageEdited: null,
            inputUpdateHack: false
        };

        this.messageContentRef = null;
        this.fileInputRef = null;
    }

    componentDidMount() {
        console.log("CHAT MOUNTED")

        socket.on('members', this.onMembers);
        socket.on('create message', this.onCreateMessage);
        socket.on('delete message', this.onDeleteMessage);
        socket.on('edit message', this.onEditMessage);
        socket.on('messages', this.onMessages);
        socket.on('new message', this.onNewMessage);
        socket.on('user updated', this.onUserUpdated);

        // get members
        socket.emit('members');
    }

    componentWillUnmount() {
        socket.off('members', this.onMembers);
        socket.off('create message', this.onCreateMessage);
        socket.off('delete message', this.onDeleteMessage);
        socket.off('edit message', this.onEditMessage);
        socket.off('messages', this.onMessages);
        socket.off('new message', this.onNewMessage);
        socket.off('user updated', this.onUserUpdated);
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
        console.log("On new message");
        console.log(newMessage);
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
        if (!this.props.user || !this.state.others) {
            return (<div>
                409
            </div>);
        }
        const messageEdited = this.state.messageEdited;
        return (
            <div className="messages_grid" style={{flex: 1, flexBasis: 0}}>
                <div className="cell top_left top">
                    Select user to start messaging
                </div>
                <div className="cell top_right top">
                    Messages
                </div>
                <div className="cell user_list">
                    <ListContainer
                        list={this.state.others}
                        callback={e => this.userSelected(e)}
                        idMap={(item) => item.user_id} // TODO
                        nameMap={(item) => <div><div>{item.user_nickname}</div><div>{item.user_name}</div><div style={{fontSize: 'smaller', fontStyle: 'italic'}}>{item.user_status_id === 1 ? "offline" : "on-line" }</div></div>}
                        cssItemClass={"box user"}
                        cssActiveClass={"active"}
                    />
                </div>
                <MessageContainer
                    curUserId={this.props.user.user_id}
                    messages={this.state.messages}
                    deleteMessage={id => this.deleteMessage(id)}
                    editMessage={id => this.editMessage(id)}
                    selectedMsgId={this.state.messageEdited ? this.state.messageEdited.message_id : 0}
                />
                <div className="cell bottom_left">
                    <div>Add new user</div>
                </div>
                <div className="cell bottom_right">
                    {/*TODO separate*/}
                    <form
                        id={"message_input_form"}
                        className="message_input_form"
                        encType="multipart/form-data"
                    >
                        <div>
                            <label
                                htmlFor="message_content"
                                className="input_field_label"
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
                        <div>
                            <label
                                htmlFor="message_attachments"
                                className="input_field_label file_upload_label"
                            >
                                Attachments
                            </label>
                            <input
                                multiple
                                className="input_field file-upload"
                                type="file"
                                ref={ref => (this.fileInputRef = ref)}
                                name="attachment"
                                accept=".jpg, .jpeg, .png"
                                id={"message_attachments"}
                            />
                        </div>
                        <button
                            type="submit"
                            className="btn btn-send"
                            onClick={messageEdited? e => this.doEditMessage(e) : e => this.sendMessage(e)}
                        >
                            { messageEdited ? 'Edit message' : 'Send message' }
                        </button>
                    </form>
                </div>
            </div>
        )
    }
}


export const ChatRouted = withRouter(Chat);