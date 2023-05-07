import React from "react";

export class ListContainer extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            selectedId: 0
        }
    }

    render() {
        const {list} = this.props;
        console.log("List rendered with selection " + this.state.selectedId);
        return (
            <React.Fragment>
            {list.map((item) => (
                <div
                    className={this.getClassName(item)}
                    onClick={() => this.itemSelected(item)}
                    key={this.props.idMap(item)}
                >
                    {this.props.nameMap(item)}
                </div>
            ))
            }
            </React.Fragment>
        );
    }

    getClassName(item) {
        return this.props.cssItemClass +
            ((this.props.idMap(item) === this.state.selectedId) ?
                ' ' + this.props.cssActiveClass : '');
    }

    itemSelected(item) {
        const selId = this.props.idMap(item);
        const curId = this.state.selectedId;
        if (curId !== selId) {
            this.setState({
                selectedId: selId
            });
            this.props.callback(item);
        } else {
            this.setState({
                selectedId: 0
            });
            this.props.callback(null);
        }
    }
}