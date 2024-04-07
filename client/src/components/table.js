import React, { Component } from 'react';

export class SortableTable extends Component {
    constructor(props) {
        super(props);

        this.state = {
            data: props.data,
            sortField: null,
            sortDirection: 'asc',
        };
    }

    handleSort(field, f) {
        const { data, sortField, sortDirection } = this.state;
        const { onSort } = this.props;

        // Check if the clicked field is the same as the current sort field
        // If it is, toggle the sort direction
        const direction = field === sortField && sortDirection === 'asc' ? 'desc' : 'asc';

        // Sort the data based on the clicked field and direction
        const sortedData = [...data].sort((a, b) => {
            if (f(a) < f(b)) return direction === 'asc' ? -1 : 1;
            if (f(a) > f(b)) return direction === 'asc' ? 1 : -1;
            return 0;
        });

        this.setState(
            {
                data: sortedData,
                sortField: field,
                sortDirection: direction
            },
            () => {
                // Invoke the onSort callback with the sorted field and direction
                if (onSort) {
                    onSort(field, direction);
                }
            }
        );
    }

    fetchDisplayed(header, item) {
        let cellValue;
        if (typeof header === 'string') cellValue = item[header]
        else if (header.fetcher) cellValue = header.fetcher(item)
        else if (header.attribute) cellValue = item[header.attribute]
        return cellValue
    }
    fetchHeader(header) {
        const res = {
            name: null,
            fetcher: null
        }
        if (typeof header === 'string') {
            res.name = header;
            res.fetcher = (e) => e[header]
        } else {
            res.name = header.name;
            res.fetcher = header.sorter || header.fetcher || header[header.attribute] || header[header.name]
        }
        return res
    }

    // if object - looks into: fetcher -> [attribute]
    // sorter  looks into: sorter ->  fetcher -> [attribute]
    render() {
        const { data, sortField, sortDirection } = this.state;
        const { headers, onClick } = this.props;

        return (
            <table>
                <thead>
                <tr>
                    {headers.map((header) => {
                        const {name, fetcher} = this.fetchHeader(header)
                        return (
                        <th key={name} onClick={() => this.handleSort(name, fetcher)}>
                            {name}{' '}
                            {sortField === name && <span color={sortDirection === 'asc' ? 'green' : 'red'}>
                                {sortDirection === 'asc' ? '▲' : '▼'}
                            </span>}
                            {sortField !== name && <span>{'◆'}</span>}
                        </th>
                    )})}
                    {onClick && <th>
                        {'join'}
                    </th>}
                </tr>
                </thead>
                <tbody>
                {data.map((item, index) => (
                    <tr key={index}>
                        {headers.map((header, index) => {
                            let cellValue = this.fetchDisplayed(header, item);
                            return (
                            <td key={index}>{
                                cellValue
                            }</td>
                        )})}
                        {onClick && (
                            <td style={{padding: 0}} key={'button'}>
                                <button onClick={() => onClick(item)}>&lt;</button>
                            </td>
                        )}
                    </tr>
                ))}
                </tbody>
            </table>
        );
    }
}