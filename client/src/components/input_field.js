import React from "react";

export class InputField extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            value: this.props.value || ""
        }
    }

    onChange = (e) => {
        this.props.onChange && this.props.onChange(e);
    }

    render() {
        return (
            <div>
                <label htmlFor={this.props.id} className="input_field_label">{this.props.children}</label>
                <input value={this.state.password_repeat} onChange={this.onChange} type={this.props.type} className="input_field" id={this.props.id}></input>
            </div>
        );
    }
}