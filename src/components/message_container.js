import React from "react";
import {Message} from "./message";

export class MessageContainer extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            selectedId: 0
        }
    }

    componentDidMount() {
        this.scrollToBottom();
        window.addEventListener('scroll', this.loadOnScroll);
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        this.scrollToBottom();
        setTimeout(() => {
            this.scrollToBottom();
        }, 50);
    }

    loadOnScroll() {

    }


    scrollToBottom = () => {
        console.log("scroll")
        this.messagesEnd.scrollIntoView();
    }

    render() {
        const {messages, curUserId} = this.props;
        console.log("Messages rendered with selection " + this.state.selectedId);
        return (
                <div
                    className="box messaging"
                >
                    <div style={{ float:"left", clear: "both" }}
                         ref={(el) => { this.messagesStart = el; }}/>
                    {messages.map((item) => (
                        <Message
                            curUserId={curUserId}
                            item={item}
                        />
                    ))
                    }
                    <div style={{ float:"left", clear: "both" }}
                         ref={(el) => { this.messagesEnd = el; }}>
                    </div>
                </div>
        );
    }



}