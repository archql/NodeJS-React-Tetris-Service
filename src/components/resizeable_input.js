import React from "react";
export class ResizeableInput extends React.Component {

    constructor(props) {
        super(props);

        // define values of this component
        this.state = {
            textAreaHeight: 0,
            value: ''
        };

        this.inputRef = null;
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        //console.log("componentDidUpdate");
        if (this.props.value !== prevProps.value || this.props.hack !== prevProps.hack) {
            console.log("new value");
            // this.setState({
            //     value: this.props.value
            // });
            this.setNativeValue(this.inputRef, this.props.value);
            this.inputRef.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }

    render() {
        return (<textarea
            placeholder="Type your message here..."
            id={this.props.id}
            name="message_body"
            cols="50"
            rows="1"
            maxLength="255"
            ref={ref => (this.inputRef = ref)}
            value={this.state.value}
            onInput={e => this.onMessageInputChange(e)}
            onChange={e => this.onMessageInputChange(e)}
            onReset={e => console.log("reset")}
        />)
    }

    onMessageInputChange(e) {
        this.setState({
            value: e.target.value
        })
        e.target.style.height = 'inherit';
        e.target.style.height = `${Math.min(e.target.scrollHeight, 100)}px`;
    }

    setNativeValue(element, value) {
        const valueSetter = Object.getOwnPropertyDescriptor(element, 'value').set;
        const prototype = Object.getPrototypeOf(element);
        const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value').set;

        if (valueSetter && valueSetter !== prototypeValueSetter) {
            prototypeValueSetter.call(element, value);
        } else {
            valueSetter.call(element, value);
        }
    }
}