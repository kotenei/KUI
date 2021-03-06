import React, { Component, PureComponent } from "react";
import PropTypes from "prop-types";
import classnames from "classnames";
import TableColumn from "./TableColumn";
import Loading from "../Loading";
import Pagination from "../Pagination";
import { deepClone, guid } from "../../utils";
import domUtils from "../../utils/domUtils";
import omit from "object.omit";
import Checkbox from "../Checkbox";
import Icon from "../Icon";
import TableSorter from "./TableSorter";
import TableFilter from "./TableFilter";
import invariant from "invariant";

const prefixCls = "k-table";
const FLEX_WIDTH = 50;

const HeaderContaienr = props => {
    return (
        <div
            ref={props.elRef}
            className={classnames(props.className, {
                [`${prefixCls}-header`]: true
            })}
            style={props.style}
        >
            {props.children}
        </div>
    );
};

const BodyContainer = props => {
    return (
        <div
            ref={props.elRef}
            className={classnames(props.className, {
                [`${prefixCls}-body`]: true,
                [`${prefixCls}-body__scroll`]: props.scroll
            })}
            style={props.style}
        >
            {props.children}
        </div>
    );
};

const ExpandIcon = props => {
    let onClick = function() {
        if (props.onClick) {
            props.onClick(props.id);
        }
    };
    return (
        <span onClick={onClick}>
            {props.expanded ? (
                <Icon type="minus-square" />
            ) : (
                <Icon type="plus-square" />
            )}
        </span>
    );
};

class Table extends Component {
    constructor(props) {
        super(props);
        this.state = {
            loading: props.loading,
            checkedIds: props.checkedIds || props.defaultCheckedIds,
            expandedRowIds: props.expandedRowIds || props.defaultExpandedRowIds,
            tableWidth: 0,
            tableContainerWidth: 0,
            columnsWidth: {},
            theadRowsHeight: [],
            tbodyRowsHeight: [],
            theadHeight: 0,
            tbodyHeight: 0,
            scrollLeft: 0,
            sorter: {},
            filter: {},
            pagination: {
                pageNumber: 1,
                total: props.data ? props.data.length : 0,
                pageSize: 5
            }
        };
    }

    static propTypes = {
        bordered: PropTypes.bool,
        checkbox: PropTypes.bool,
        checkedIds: PropTypes.arrayOf(PropTypes.string),
        data: PropTypes.array,
        defaultCheckedIds: PropTypes.arrayOf(PropTypes.string),
        defaultExpandedRowIds: PropTypes.arrayOf(PropTypes.string),
        disabledCheckIds: PropTypes.arrayOf(PropTypes.string),
        expandedRowIds: PropTypes.arrayOf(PropTypes.string),
        expandedRowRender: PropTypes.func,
        // footer: PropTypes.object,
        height: PropTypes.number,
        // indentSize: PropTypes.number,
        loading: PropTypes.bool,
        pagination: PropTypes.object,
        rowClassName: PropTypes.func,
        // showHeader: PropTypes.bool,
        stripe: PropTypes.bool,
        // title: PropTypes.oneOfType([PropTypes.node, PropTypes.string]),
        onCheck: PropTypes.func,
        onChange: PropTypes.func,
        onExpand: PropTypes.func
    };

    static defaultProps = {
        bordered: false,
        checkbox: false,
        defaultCheckedIds: [],
        defaultExpandedRowIds: [],
        // showHeader: true,
        stripe: false
    };

    init(props = this.props) {
        const {
            children,
            loading,
            checkedIds,
            expandedRowIds,
            pagination
        } = props;

        if (!this.columns) {
            let maxLevel = 1,
                nodes = [],
                rows = [],
                columns = [],
                fixedLeft = [],
                fixedRight = [],
                tmpWidth = 0,
                initNode = function(node, parentNode) {
                    node.id = guid();
                    node.level = parentNode ? parentNode.level + 1 : 1;
                    node.parentIds = parentNode
                        ? parentNode.parentIds.length > 0
                            ? [parentNode.id, ...parentNode.parentIds]
                            : [parentNode.id]
                        : [];
                    node.path = parentNode
                        ? parentNode.path + node.id + "/"
                        : `/${node.id}/`;
                    node.parentId = parentNode ? parentNode.id : "";
                },
                loop = function(child, curNode, parentNode) {
                    if (maxLevel < curNode.level) {
                        maxLevel = curNode.level;
                    }
                    if (child.props.children) {
                        let colSpan = 0;
                        React.Children.map(child.props.children, subChild => {
                            let subNode = omit(subChild.props, ["children"]);
                            initNode(subNode, curNode);
                            nodes.push(subNode);
                            loop(subChild, subNode, curNode);
                            colSpan += subNode.colSpan;
                        });
                        curNode.hasChild = true;
                        curNode.colSpan = colSpan;
                    } else {
                        const { width, style } = child.props;
                        curNode.hasChild = false;
                        curNode.colSpan = 1;
                        if (width != undefined) {
                            curNode.width = width;
                        }
                        if (style && typeof style.width == "number") {
                            curNode.width = style.width;
                        }
                        if (curNode.width) {
                            tmpWidth += curNode.width;
                        }
                        columns.push(curNode);
                    }
                };

            React.Children.map(children, child => {
                let node = omit(child.props, ["children"]);
                initNode(node);
                nodes.push(node);
                loop(child, node);
            });

            for (let i = 0; i < maxLevel; i++) {
                rows.push([]);
                fixedLeft.push([]);
                fixedRight.push([]);
            }

            let fixed;
            nodes.forEach(node => {
                let rowIndex = node.level - 1;

                if (!node.hasChild) {
                    node.rowSpan = maxLevel - node.level + 1;
                } else {
                    node.rowSpan = 1;
                }

                if (!node.fixed && !node.parentId) {
                    fixed = "";
                }

                if ((node.fixed && !node.parentId) || fixed) {
                    if (!fixed || !node.parentId) {
                        fixed = node.fixed;
                    }
                    if (fixed == "left" || fixed == true) {
                        fixedLeft[rowIndex].push(node);
                        node.fixed = "left";
                    } else {
                        fixedRight[rowIndex].push(node);
                        node.fixed = "right";
                    }
                } else {
                    rows[rowIndex].push(node);
                }
            });

            rows.forEach((row, rowIndex) => {
                row.push(...fixedRight[rowIndex]);
                row.unshift(...fixedLeft[rowIndex]);
            });

            this.columns = columns;
            this.fixedLeft = fixedLeft;
            this.fixedRight = fixedRight;
            this.theadRows = rows;
        }

        if ("loading" in props) {
            this.setState({
                loading
            });
        }

        if ("checkedIds" in props) {
            this.setState({
                checkedIds
            });
        }

        if ("expandedRowIds" in props) {
            this.setState({
                expandedRowIds
            });
        }

        if ("pagination" in props) {
            this.setState({
                pagination
            });
        }
    }

    getColumns(rows) {
        if (!rows) {
            return [];
        }
        let columns = [];
        let loop = function(rows, columns, rowIndex = 0) {
            rows[rowIndex].forEach(item => {
                if (!item.hasChild) {
                    columns.push(item);
                } else {
                    loop(rows, columns, rowIndex + 1);
                }
            });
        };
        loop(rows, columns);
        return columns;
    }

    setWidth = () => {
        const { checkbox, expandedRowRender } = this.props;
        let totalWidth = domUtils.width(this.refs.table);
        let tmpWidth = 0;
        let count = 0;
        let columnsWidth = {};

        if (checkbox) {
            tmpWidth += FLEX_WIDTH;
            columnsWidth["checkbox"] = FLEX_WIDTH;
        }
        if (expandedRowRender) {
            tmpWidth += FLEX_WIDTH;
            columnsWidth["expand"] = FLEX_WIDTH;
        }

        this.columns.forEach((item, index) => {
            if (item.width) {
                tmpWidth += item.width;
                columnsWidth[item.id] = item.width;
            } else {
                columnsWidth[item.id] = 0;
                count++;
            }
        });

        let diff = Math.abs(totalWidth - tmpWidth);
        let width = count == 0 ? 0 : diff / count;

        for (let key in columnsWidth) {
            if (columnsWidth[key] === 0) {
                columnsWidth[key] = width;
            }
        }

        this.setState({
            columnsWidth,
            tableWidth: tmpWidth,
            tableContainerWidth: totalWidth
        });
    };

    setHeight = () => {
        let elTableScroll = this.refs.table.querySelector(".k-table-scroll");
        let theadRows = elTableScroll.querySelectorAll(
            `.${prefixCls}-header tr`
        );
        let tbodyRows = elTableScroll.querySelectorAll(`.${prefixCls}-body tr`);
        let theadRowsHeightInfo = this.getRowHeightInfo(theadRows);
        let tbodyRowsHeightInfo = this.getRowHeightInfo(tbodyRows);

        this.setState({
            theadRowsHeight: theadRowsHeightInfo.rowsHeight,
            tbodyRowsHeight: tbodyRowsHeightInfo.rowsHeight,
            theadHeight: theadRowsHeightInfo.totalHeight,
            tbodyHeight: tbodyRowsHeightInfo.totalHeight
        });
    };

    getRowHeightInfo(elRows) {
        let ret = { rowsHeight: [], totalHeight: 0 };
        if (elRows && elRows.length > 0) {
            elRows.forEach(row => {
                let height = domUtils.height(row);
                ret.totalHeight += height;
                ret.rowsHeight.push(height);
            });
        }
        return ret;
    }

    getColGroupInfo(columns) {
        const { columnsWidth } = this.state;
        const { checkbox, expandedRowRender } = this.props;
        let colGroup = [];
        let key = 0;
        let totalWidth = 0;
        if (checkbox) {
            colGroup.push(
                <col key={key++} style={{ width: columnsWidth["checkbox"] }} />
            );
            totalWidth += columnsWidth["checkbox"];
        }
        if (expandedRowRender) {
            colGroup.push(
                <col key={key++} style={{ width: columnsWidth["expand"] }} />
            );
            totalWidth += columnsWidth["expand"];
        }
        columns.forEach(column => {
            let colStyle = { width: columnsWidth[column.id] || "auto" };
            colGroup.push(<col key={key++} style={colStyle} />);
            totalWidth += columnsWidth[column.id] || 0;
        });

        return { colGroup, totalWidth: totalWidth || "auto" };
    }

    getFixedWidth(columns, fixed = "left") {
        const { columnsWidth } = this.state;
        const { checkbox, expandedRowRender } = this.props;
        let totalWidth = 0;
        if (fixed == "left") {
            if (checkbox) {
                totalWidth += columnsWidth["checkbox"] || 0;
            }
            if (expandedRowRender) {
                totalWidth += columnsWidth["expand"] || 0;
            }
        }
        columns.forEach(column => {
            let width = 0;
            if (column.fixed && column.fixed == fixed) {
                width = columnsWidth[column.id] || 0;
                totalWidth += width;
            }
        });
        return totalWidth;
    }

    getData() {
        const { data } = this.props;
        const { sorter, pagination, filter } = this.state;
        let dataSource = data || [];
        dataSource = dataSource.slice(0);
        const sorterFn = this.getSorterFunc();
        if (sorterFn) {
            dataSource = dataSource.sort(sorterFn);
        }

        if (filter) {
            Object.keys(filter).forEach(key => {
                let column = this.columns.find(
                    column => column.dataIndex == key
                );
                if (!column) {
                    return;
                }
                let values = filter[key] || [];
                if (values.length == 0) {
                    return;
                }
                const onFilter = column.onFilter;
                dataSource = onFilter
                    ? dataSource.filter(record => {
                          return values.some(value => onFilter(value, record));
                      })
                    : dataSource;
            });
        }

        if (!("pagination" in this.props)) {
            let offset = (pagination.pageNumber - 1) * pagination.pageSize;
            dataSource = dataSource.slice(offset, offset + pagination.pageSize);
        }

        return dataSource;
    }

    getAllPage() {
        const { pagination } = this.state;
        if (!pagination || pagination.total === 0) {
            return 1;
        }
        let allPage = parseInt(pagination.total / pagination.pageSize);
        allPage =
            pagination.total % pagination.pageSize !== 0
                ? allPage + 1
                : allPage;
        return allPage;
    }

    getSorterFunc() {
        const { sorter } = this.state;
        if (
            !sorter ||
            !sorter.column ||
            typeof sorter.column.sorter !== "function"
        ) {
            return null;
        }
        return (a, b) => {
            const result = sorter.column.sorter(a, b);
            if (result !== 0) {
                return sorter.order === "desc" ? -result : result;
            }
            return 0;
        };
    }

    componentDidMount() {
        this.init();
        setTimeout(() => {
            this.setWidth();
            this.setHeight();
        });
        window.addEventListener("resize", this.setWidth);
        window.addEventListener("resize", this.setHeight);
        this.scrollBind([
            this.elMainBody,
            this.refs.elFixedLeftBody,
            this.refs.elFixedRightBody
        ]);
    }

    componentWillUnmount() {
        window.removeEventListener("resize", this.setWidth);
        window.removeEventListener("resize", this.setHeight);
        this.scrollBind(
            [
                this.elMainBody,
                this.refs.elFixedLeftBody,
                this.refs.elFixedRightBody
            ],
            false
        );
    }

    componentWillReceiveProps(nextProps) {
        this.init(nextProps);
    }

    renderThead(data, headerRows, colGroupInfo) {
        const { checkbox, expandedRowRender, disabledCheckIds } = this.props;
        const { checkedIds, expandedRowIds, sorter, filter } = this.state;
        let checkedCount = 0;
        let disabledCheckCount = 0;

        if (data && data.length > 0) {
            data.forEach(item => {
                if (checkedIds && checkedIds.indexOf(item.id) > -1) {
                    checkedCount++;
                }
                if (
                    disabledCheckIds &&
                    disabledCheckIds.indexOf(item.id) > -1
                ) {
                    disabledCheckCount++;
                }
            });
        }

        let theadRows = [];
        if (Array.isArray(headerRows)) {
            headerRows.forEach((row, rowIndex) => {
                let cells = [];
                row.forEach((cell, cellIndex) => {
                    if (rowIndex == 0 && cellIndex == 0) {
                        if (checkbox) {
                            cells.push(
                                <th
                                    className="checkbox-cell"
                                    key={`thCell-checkbox-${cellIndex}`}
                                    rowSpan={headerRows.length}
                                >
                                    <Checkbox
                                        indeterminate={checkedCount > 0}
                                        checked={
                                            checkedCount +
                                                disabledCheckCount ===
                                            data.length
                                        }
                                        onChange={this.handleCheckAll}
                                    />
                                </th>
                            );
                        }
                        if (expandedRowRender) {
                            cells.push(
                                <th
                                    className="expand-cell"
                                    key={`thCell-expand-${cellIndex}`}
                                    rowSpan={headerRows.length}
                                />
                            );
                        }
                    }
                    cells.push(
                        <th
                            key={`thCell-${cellIndex}`}
                            colSpan={cell.colSpan == 1 ? null : cell.colSpan}
                            rowSpan={cell.rowSpan == 1 ? null : cell.rowSpan}
                            style={{ textAlign: cell.align }}
                        >
                            <div className={`${prefixCls}-thead-content`}>
                                <div
                                    className={`${prefixCls}-thead-content__title`}
                                >
                                    {cell.title}
                                </div>
                                <TableSorter
                                    prefixCls={prefixCls}
                                    column={cell}
                                    sorter={sorter}
                                    onSort={this.handleSort}
                                />
                                <TableFilter
                                    prefixCls={prefixCls}
                                    column={cell}
                                    filter={filter}
                                    onOK={this.handleFilter}
                                    onReset={this.handleFilter}
                                />
                            </div>
                        </th>
                    );
                });

                theadRows.push(<tr key={`thRow-${rowIndex}`}>{cells}</tr>);
            });
        }

        return (
            <table
                className={`${prefixCls}-fixed`}
                style={{ width: colGroupInfo.totalWidth }}
            >
                <colgroup>{colGroupInfo.colGroup}</colgroup>
                <thead className={`${prefixCls}-thead`}>{theadRows}</thead>
            </table>
        );
    }

    renderTbody(data, columns, colGroupInfo) {
        const {
            checkbox,
            expandedRowRender,
            disabledCheckIds,
            rowClassName,
            stripe
        } = this.props;
        const { checkedIds, expandedRowIds } = this.state;

        let tbodyRows = [];

        if (data && data.length > 0) {
            data.forEach((item, index) => {
                let cells = [],
                    isEven = index % 2 == 0,
                    checked = checkedIds.indexOf(item.id) > -1,
                    expanded = expandedRowIds.indexOf(item.id) > -1,
                    disabledCheck =
                        disabledCheckIds &&
                        disabledCheckIds.indexOf(item.id) > -1,
                    tableRowClassName =
                        rowClassName && rowClassName(item, index);

                columns.forEach((column, cellIndex) => {
                    if (cellIndex == 0) {
                        if (checkbox) {
                            cells.push(
                                <td
                                    key={`tbCell-checkbox-${cellIndex}`}
                                    className="checkbox-cell"
                                >
                                    <Checkbox
                                        checked={checked}
                                        onChange={this.handleCheck}
                                        value={item.id}
                                        disabled={disabledCheck}
                                    />
                                </td>
                            );
                        }
                        if (expandedRowRender) {
                            cells.push(
                                <td
                                    key={`tbCell-expand-${cellIndex}`}
                                    className="expand-cell"
                                >
                                    <ExpandIcon
                                        expanded={expanded}
                                        id={item.id}
                                        onClick={this.handleExpand}
                                    />
                                </td>
                            );
                        }
                    }

                    cells.push(
                        <td key={`tbCell-${cellIndex}`}>
                            {column.render
                                ? column.render(item[column.dataIndex], item)
                                : item[column.dataIndex]}
                        </td>
                    );
                });

                tbodyRows.push(
                    <tr
                        key={`tbRow-${index}`}
                        className={classnames(tableRowClassName, {
                            "stripe-row": !isEven && stripe
                        })}
                    >
                        {cells}
                    </tr>
                );

                if (expandedRowRender) {
                    cells = [];
                    if (checkbox) {
                        cells.push(<td key={guid()} />);
                    }
                    cells.push(<td key={guid()} />);
                    cells.push(
                        <td
                            key={`tbCell-expand-${index}`}
                            colSpan={columns.length}
                        >
                            {expandedRowRender(item)}
                        </td>
                    );
                    tbodyRows.push(
                        <tr
                            className={classnames({
                                [`expand-row`]: true,
                                [`expand-row--show`]: expanded
                            })}
                            key={`tbRow-expand-${index}`}
                        >
                            {cells}
                        </tr>
                    );
                }
            });
        }

        return (
            <table
                className={`${prefixCls}-fixed`}
                style={{ width: colGroupInfo.totalWidth }}
            >
                <colgroup>{colGroupInfo.colGroup}</colgroup>
                <tbody className={`${prefixCls}-tbody`}>{tbodyRows}</tbody>
            </table>
        );
    }

    render() {
        const { bordered, children, height } = this.props;
        const {
            loading,
            theadHeight,
            tbodyHeight,
            tableWidth,
            tableContainerWidth,
            scrollLeft,
            pagination
        } = this.state;
        let data = this.getData();
        let classString = classnames({
            [prefixCls]: true,
            [`${prefixCls}-bordered`]: bordered
        });
        let scrollY = false;
        let scrollX = tableWidth > tableContainerWidth;
        let mainHeaderStyle = {};
        let positionClass;
        let curWidth = scrollLeft + tableContainerWidth;
        let columns = this.getColumns(this.theadRows);
        let colGropInfo = this.getColGroupInfo(columns);
        let header = this.renderThead(data, this.theadRows, colGropInfo);
        let body = this.renderTbody(data, columns, colGropInfo);
        let fixedLeftWidth = this.getFixedWidth(columns);
        let fixedRightWidth = this.getFixedWidth(columns, "right");
        let scrollbarWidth = 21;
        let fixedHeight = theadHeight + tbodyHeight;
        let allPage = this.getAllPage();

        if (height) {
            scrollY = height < tbodyHeight;
        }

        if (!scrollX) {
            mainHeaderStyle.overflowX = "hidden";
            mainHeaderStyle.marginBottom = "0";
        }

        if (scrollY) {
            curWidth -= scrollbarWidth;
            fixedHeight = theadHeight + height - scrollbarWidth;
            fixedRightWidth += scrollbarWidth;
        } else {
            mainHeaderStyle.overflowY = "hidden";
        }

        if (scrollLeft > 0 && curWidth < tableWidth) {
            positionClass = `${prefixCls}-position-middle`;
        } else if (scrollLeft > 0 && curWidth == tableWidth) {
            positionClass = `${prefixCls}-position-right`;
        } else {
            positionClass = `${prefixCls}-position-left`;
        }

        if (scrollX) {
            classString = classnames(classString, positionClass);
        } else {
            classString = classnames(classString, {
                [`${prefixCls}-position-left`]: true,
                [`${prefixCls}-position-right`]: true
            });
        }

        let main = (
            <React.Fragment>
                <HeaderContaienr
                    style={mainHeaderStyle}
                    elRef={el => (this.elMainHeader = el)}
                >
                    {header}
                </HeaderContaienr>
                <BodyContainer
                    elRef={el => (this.elMainBody = el)}
                    style={{
                        maxHeight: height,
                        overflowY: scrollY ? "scroll" : "hidden",
                        overflowX: scrollX ? "scroll" : "hidden"
                    }}
                >
                    {body}
                </BodyContainer>
            </React.Fragment>
        );

        let left = (
            <div
                className={`${prefixCls}-fixed-left`}
                style={{
                    width: fixedLeftWidth,
                    height: fixedHeight
                }}
            >
                <HeaderContaienr>{header}</HeaderContaienr>
                <BodyContainer
                    scroll={scrollY}
                    style={{ top: bordered ? theadHeight : theadHeight + 1 }}
                >
                    <div
                        ref="elFixedLeftBody"
                        className={`${prefixCls}-body-inner`}
                        style={{
                            maxHeight: height
                        }}
                    >
                        {body}
                    </div>
                </BodyContainer>
            </div>
        );

        let right = (
            <div
                className={`${prefixCls}-fixed-right`}
                style={{
                    width: fixedRightWidth,
                    height: fixedHeight
                }}
            >
                <HeaderContaienr
                    style={{ overflowY: scrollY ? "scroll" : null }}
                >
                    {header}
                </HeaderContaienr>
                <BodyContainer
                    scroll={scrollY}
                    style={{ top: bordered ? theadHeight : theadHeight + 1 }}
                >
                    <div
                        ref="elFixedRightBody"
                        className={`${prefixCls}-body-inner`}
                        style={{
                            maxHeight: height
                        }}
                    >
                        {body}
                    </div>
                </BodyContainer>
            </div>
        );

        return (
            <Loading show={loading}>
                <div className={classString} ref="table">
                    <div className={`${prefixCls}-top`} />
                    <div className={`${prefixCls}-middle`}>
                        <div
                            className={`${prefixCls}-scroll`}
                            ref="elMainScroll"
                        >
                            {main}
                        </div>

                        {this.fixedLeft &&
                        this.fixedLeft.length > 0 &&
                        this.fixedLeft[0].length
                            ? left
                            : null}

                        {this.fixedRight &&
                        this.fixedRight.length > 0 &&
                        this.fixedRight[0].length > 0
                            ? right
                            : null}
                    </div>
                    <div className={`${prefixCls}-bottom`}>
                        {pagination && allPage > 1 ? (
                            <Pagination
                                kStyle="primary"
                                {...pagination}
                                onChange={this.handlePageChange}
                            />
                        ) : null}
                    </div>
                </div>
            </Loading>
        );
    }

    handleCheckAll = e => {
        const { target } = e;
        const { onCheck, data, disabledCheckIds } = this.props;
        const { checkedIds } = this.state;
        let checked = target.checked;
        let newCheckedIds = [...checkedIds];
        data.forEach(item => {
            let index = newCheckedIds.indexOf(item.id);
            let disabled =
                disabledCheckIds && disabledCheckIds.indexOf(item.id) > -1;
            if (!disabled) {
                if (checked) {
                    if (index == -1) {
                        newCheckedIds.push(item.id);
                    }
                } else {
                    if (index > -1) {
                        newCheckedIds.splice(index, 1);
                    }
                }
            }
        });
        if (!("checkedIds" in this.props)) {
            this.setState({
                checkedIds: newCheckedIds
            });
        }
        if (onCheck) {
            onCheck(newCheckedIds);
        }
    };

    handleCheck = e => {
        const { target } = e;
        const { onCheck } = this.props;
        const { checkedIds } = this.state;
        let checked = target.checked;
        let value = target.value;
        let index = checkedIds.indexOf(value);
        let newCheckedIds = [...checkedIds];
        if (index > -1) {
            newCheckedIds.splice(index, 1);
        } else {
            newCheckedIds.push(value);
        }
        if (!("checkedIds" in this.props)) {
            this.setState({
                checkedIds: newCheckedIds
            });
        }
        if (onCheck) {
            onCheck(newCheckedIds);
        }
    };

    handleExpand = (id, expanded) => {
        const { onExpand } = this.props;
        const { expandedRowIds } = this.state;
        let newExpandedRowIds = [...expandedRowIds];
        let index = newExpandedRowIds.indexOf(id);
        if (index > -1) {
            newExpandedRowIds.splice(index, 1);
        } else {
            newExpandedRowIds.push(id);
        }
        if (!("expandedRowIds" in this.props)) {
            this.setState(
                {
                    expandedRowIds: newExpandedRowIds
                },
                () => {
                    this.setHeight();
                }
            );
        }

        if (onExpand) {
            onExpand(newExpandedRowIds);
        }
    };

    handleScroll = e => {
        const { target } = e;
        const delay = 300;
        let scrollLeft = target.scrollLeft;
        let scrollTop = target.scrollTop;

        if (this.timer) {
            clearTimeout(this.timer);
        }

        if (target === this.elMainBody) {
            this.scrollBind(
                [this.refs.elFixedLeftBody, this.refs.elFixedRightBody],
                false
            );
            this.elMainHeader.scrollLeft = scrollLeft;
            if (this.refs.elFixedLeftBody) {
                this.refs.elFixedLeftBody.scrollTop = scrollTop;
            }
            if (this.refs.elFixedRightBody) {
                this.refs.elFixedRightBody.scrollTop = scrollTop;
            }
            this.timer = setTimeout(() => {
                this.scrollBind([
                    this.refs.elFixedLeftBody,
                    this.refs.elFixedRightBody
                ]);
            }, delay);
            if (this.state.scrollLeft !== scrollLeft) {
                this.setState({
                    scrollLeft: scrollLeft
                });
            }
        } else if (target === this.refs.elFixedLeftBody) {
            this.scrollBind(
                [this.elMainBody, this.refs.elFixedRightBody],
                false
            );
            this.elMainBody.scrollTop = scrollTop;
            if (this.refs.elFixedRightBody) {
                this.refs.elFixedRightBody.scrollTop = scrollTop;
            }
            this.timer = setTimeout(() => {
                this.scrollBind([this.elMainBody, this.refs.elFixedRightBody]);
            }, delay);
        } else if (target === this.refs.elFixedRightBody) {
            this.scrollBind(
                [this.elMainBody, this.refs.elFixedLeftBody],
                false
            );
            this.elMainBody.scrollTop = scrollTop;
            if (this.refs.elFixedLeftBody) {
                this.refs.elFixedLeftBody.scrollTop = scrollTop;
            }
            this.timer = setTimeout(() => {
                this.scrollBind([this.elMainBody, this.refs.elFixedLeftBody]);
            }, delay);
        }
    };

    handleSort = sorter => {
        const { onChange } = this.props;
        const { pagination, filter } = this.state;
        let newPagination = { ...pagination, pageNumber: 1 };
        this.setState({
            sorter,
            pagination: newPagination
        });
        if (onChange) {
            onChange(newPagination, filter, sorter);
        }
    };

    handleFilter = filter => {
        const { onChange } = this.props;
        const { pagination, sorter, filter: orgFilter } = this.state;
        let newFilter = { ...orgFilter, ...filter };
        let newPagination = { ...pagination, pageNumber: 1 };

        this.setState({
            filter: newFilter
        });

        if (onChange) {
            onChange(newPagination, newFilter, sorter);
        }
    };

    handlePageChange = pageNumber => {
        const { onChange } = this.props;
        const { pagination, filter, sorter } = this.state;
        let newPagination = { ...pagination, pageNumber: pageNumber };

        if (!("pageNumber" in this.props)) {
            this.setState({
                pagination: newPagination
            });
        }

        if (onChange) {
            onChange(newPagination, filter, sorter);
        }
    };

    scrollBind = (els, bind = true) => {
        if (els && els.length > 0) {
            els.forEach(el => {
                if (el) {
                    if (bind) {
                        el.addEventListener("scroll", this.handleScroll);
                    } else {
                        el.removeEventListener("scroll", this.handleScroll);
                    }
                }
            });
        }
    };

    // getFitler(filter){
    //     let ret={};
    //     if(filter){
    //         Object.keys(filter).forEach(key=>{
    //             ret[key.split()]
    //         })
    //     }
    //     return ret;
    // }
}

export default Table;
