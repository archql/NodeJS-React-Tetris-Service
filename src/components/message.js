import React from "react";

export class Message extends React.Component {

    render() {
        return (
            <div
                className={this.getClassName()}
                onClick={() => this.itemSelected()}
            >
                <div style="font-size: larger">
                    from {this.props.item.user_name}
                </div>
                <div className="attachments">
                {
                    this.props.item.attachments.map((item) => (
                        <img
                            className="attachment"
                            src={"./attachments/" + item.attachment_filename}
                            alt={item.attachment_filename}
                        />
                    ))
                }
                </div>
                <div>
                    {this.props.item.message_content}
                </div>
                <div style="font-size: smaller">
                    {this.props.item.message_datetime}
                </div>
            </div>
        );
    }

    getClassName() {
        const item = this.props.item;
        return "message" //+
            //((item.message_from_id === ) ?
            //    ' message_out' : ' message_in');
    }
}