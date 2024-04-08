import React, {Fragment} from "react";

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
                <input
                    value={this.props.value}
                    onChange={this.onChange}
                    type={this.props.type}
                    className="input_field"
                    id={this.props.id}
                    min={this.props.min}
                    max={this.props.max}>
                </input>
            </div>
        );
    }
}

export class TextField extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            value: this.props.value || ""
        }
    }

    onChange = (e) => {
        this.setState({value: e.target.value})
        this.props.onChange && this.props.onChange(e);
    }

    onEnter = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            this.props.onEnter && this.props.onEnter(this.state.value);
            this.setState({value: ''})
        }
    }

    render() {
        return (
            <Fragment>
                <textarea
                    value={this.state.value}
                    onChange={this.onChange}
                    onKeyDown={this.onEnter}
                    className="input_field"
                    id={this.props.id}>
                </textarea>
            </Fragment>
        );
    }
}