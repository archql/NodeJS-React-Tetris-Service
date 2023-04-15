import React from "react";
import fontawesome from '@fortawesome/fontawesome'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import * as faIcons from '@fortawesome/fontawesome-free-solid'

fontawesome.library.add(faIcons.faTrash, faIcons.faPencilAlt, faIcons.faSignOutAlt);

export class Message extends React.Component {

    render() {
        const item = this.props.item;
        return (
            <div
                className={this.getClassName()}
                key={item.message_id}
            >
                <div style={{fontSize: 'larger'}}>
                    from {item.user_from.user_name}
                </div>
                <div className="attachments">
                {
                    this.props.item.attachments.map((item) => (
                        <img
                            key={item.attachment_id}
                            className="attachment"
                            src={"./attachments/" + item.attachment_filename}
                            alt={item.attachment_filename}
                        />
                    ))
                }
                </div>
                <span style={{whiteSpace: "pre-line"}}>
                    {item.message_content}
                </span>
                <div className={"time"}>
                    {
                        item.message_updated !== item.message_created &&
                        (<p style={{fontStyle: 'italic'}}>
                            modified
                        </p>)
                    }
                    {item.message_updated}
                </div>
                {
                    item.message_from_id === this.props.curUserId && (
                        <div className={"float delete"} onClick={() => this.props.deleteMessage(item.message_id)}>
                        <FontAwesomeIcon icon={faIcons.faTrash}/>
                        </div>
                    )
                }
                {
                    item.message_from_id === this.props.curUserId && (
                        <div
                            className={this.props.selected ? "float edit selected" : "float edit"}
                            onClick={() => this.props.editMessage(item)}
                        >
                        <FontAwesomeIcon icon={faIcons.faPencilAlt}/>
                        </div>
                    )
                }
            </div>
        );
    }

    getClassName() {
        const item = this.props.item;
        return "message" +
            ((item.message_from_id === this.props.curUserId) ?
                ' message_out' : ' message_in');
    }
}