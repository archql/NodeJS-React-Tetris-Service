import React from "react";

export class NotFound extends React.Component {

    render() {
        return (
        <div className="reg_container">
            <div className="reg_box">
                <p style={{color: 'red'}}>Whoops! Looks like this page does not exist!</p>
            </div>
        </div>);
    }
}