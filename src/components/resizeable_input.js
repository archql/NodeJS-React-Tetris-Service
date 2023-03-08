import React from "react";
export class ResizeableInput extends React.Component {

    constructor(props) {
        super(props);

        // define values of this component
        this.state = {
            textAreaHeight: 0
        };
    }

    render() {
        return (<textarea
            placeholder="Type your message here..."
            id={this.props.id}
            name="message_body"
            cols="50"
            rows="1"
            maxLength="255"
            onInput={e => this.onMessageInputChange(e)}
        />)
    }

    onMessageInputChange(e) {
        e.target.style.height = 'inherit';
        e.target.style.height = `${Math.min(e.target.scrollHeight, 100)}px`;
    }
}