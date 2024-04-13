import React from "react";
import {Message} from "./message";

export class MessageContainer extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            selectedId: 0
        }

        this.observer = null
        this.lastTargetPos = null

        //this.messageRefs = []
    }

    componentDidMount() {
        //console.log("XXX mount!!! ")
        this.observer = new IntersectionObserver(e => {
            //console.log("XXX observer!!! ", this.userAction)
            if (this.userAction) return
            e.forEach((entry) => {
                if (!entry.isIntersecting) {
                    //console.log('XXX invisible')
                    this.scrollToBottom();
                }
            });
        })
        if (this.messagesEnd) {
            this.observer.observe(this.messagesEnd);
        }
    }

    componentWillUnmount() {
        if (this.messagesEnd) {
            this.observer.unobserve(this.messagesEnd);
        }
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        //console.log("XXX update!!!")
        //
        if (prevProps.tgtUserId !== this.props.tgtUserId) {
            // reset user action
            this.userAction = false
            this.lastTargetPos = null
            // delay to prevent reading old position
            setTimeout(this.scrollToBottom, 50);
        }
    }

    loadOnScroll = (e) => {
        const currentPosition = e.target.scrollTop;
        //console.log(`XXX currentPosition: ${currentPosition} prev ${this.lastTargetPos}`);

        if (currentPosition < this.lastTargetPos) {
            // only user can scroll up
            this.userAction = true
            //console.log("XXX user action!!!")
        }

        this.lastTargetPos = e.target.scrollTop
    }


    scrollToBottom = () => {
        console.log(`XXX scrollToBottom`)

        this.messagesEnd.scrollIntoView({ behavior: 'instant' });
    }

    render() {
        const {messages, curUserId} = this.props;
        console.log("Messages rendered with selection " + this.state.selectedId);
        return (
                <div
                    className="cell messaging"
                    onScroll={this.loadOnScroll}
                >
                    <div style={{ float:"left", clear: "both" }}
                         ref={(el) => { this.messagesStart = el; }}/>
                    {messages.length ? messages.map((item, index) => (
                        <Message
                            key={item.message_id}
                            curUserId={curUserId}
                            item={item}
                            //ref={(el) => { this.messageRefs.current[index] = el; }}
                            replyMessage={this.props.replyMessage}
                            deleteMessage={this.props.deleteMessage}
                            editMessage={this.props.editMessage}
                            likeMessage={this.props.likeMessage}
                            selected={this.props.selectedMsgId === item.message_id}
                        />
                    )) : (
                        <div>
                            No messages
                        </div>
                    )
                    }
                    <div style={{ float:"left", clear: "both" }}
                         ref={(el) => { this.messagesEnd = el; }}>
                    </div>
                </div>
        );
    }



}