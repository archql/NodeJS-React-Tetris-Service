import React, { Component } from 'react';

export class SortableTable extends Component {
    constructor(props) {
        super(props);

        // this.props.headers

        this.state = {
            data: this.props.data,
            sortField: null,
            sortDirection: 'asc',
        };
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        console.log('update')
        if (prevProps.data !== this.props.data) {
            this.setState({data: this.props.data});
            this.handleSort()
        }
    }

    handleSort(index) {
        const { sortField, sortDirection } = this.state;
        const { onSort, headers } = this.props;

        let direction = (index === sortField && sortDirection === 'asc') ? 'desc' : 'asc';
        if (index === sortField) {
            if (sortDirection === 'asc') direction = 'desc';
            else if (sortDirection === 'desc') {
                direction = '';
                index = null; // clear selection
            }
            else direction = 'asc';
        }
        let sortedData = this.props.data;
        if (direction) {
            index = index ?? sortField
            const field = headers[index];
            if (!field) return
            //
            const func = field.sorter || field.fetcher ||
                (field.attribute ? (e) => e[field.attribute] : null) ||
                (field.name ? (e) => e[field.name] : null) ||
                (typeof field === 'string' ? (e) => e : null)

            // Sort the data based on the clicked field and direction
            sortedData = [...this.state.data].sort((a, b) => {
                if (func(a) < func(b)) return direction === 'asc' ? -1 : 1;
                if (func(a) > func(b)) return direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        this.setState(
            {
                data: sortedData,
                sortField: index,
                sortDirection: direction
            },
            () => {
                // Invoke the onSort callback with the sorted field and direction
                if (onSort) {
                    onSort(index, direction);
                }
            }
        );
    }

    fetchValue(header, item) {
        let cellValue;
        if (typeof header === 'string') cellValue = item[header]
        else if (header.fetcher) cellValue = header.fetcher(item)
        else if (header.attribute) cellValue = item[header.attribute]
        return cellValue
    }
    fetchHeader(header) {
        if (typeof header === 'string') {
            return header;
        } else {
            return header.name;
        }
    }
    fetchProperty(item, prop) {
        if (!prop || typeof prop === 'string') {
            return prop
        } else { // lambda
            return prop(item)
        }
    }

    // if object - looks into: fetcher -> [attribute]
    // sorter  looks into: sorter ->  fetcher -> [attribute]
    /*

    {
        name: '#', - display name
        attribute: 'room_id', - accessed attribute
        nonSortable: true, - if do not want sort
        // TODO button name
        sorter - lambda - evaluates sortable value of obj
        fetcher - lambda - evaluates name of obj
    },

     */
    render() {
        const { data, sortField, sortDirection } = this.state;
        const { headers } = this.props;

        return (
            <table>
                <thead>
                <tr>
                    {headers.map((header, index) => {
                        const name = this.fetchHeader(header)
                        if (header.nonSortable) {
                            return (
                                <th key={index} >
                                    {name}
                                </th>
                            )
                        } else {
                            return (
                                <th key={index} onClick={() => this.handleSort(index)}>
                                    {name}{' '}
                                    {sortField === index && <span style={{color: sortDirection === 'asc' ? 'green' : 'red'}}>
                                        {sortDirection === 'asc' ? '▲' : '▼'}
                                    </span>}
                                    {sortField !== index && <span>{'◆'}</span>}
                                </th>
                            )
                        }
                    })}
                </tr>
                </thead>
                <tbody>
                {data.map((item, index) => (
                    <tr key={index}>
                        {headers.map((header, index) => {
                            let cellValue = this.fetchValue(header, item);
                            if (this.fetchProperty(item, header.type) === 'button') {
                                return (
                                    <td style={{padding: 0}} key={index}>
                                        <button className="btn" onClick={() => header.onClick(item)}>{cellValue}</button>
                                    </td>
                                )
                            } else {
                                return (
                                    <td key={index}>{
                                        cellValue
                                    }</td>
                                )
                            }
                        })}
                    </tr>
                ))}
                </tbody>
            </table>
        );
    }
}