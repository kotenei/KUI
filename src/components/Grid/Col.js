import React, { Component } from "react";
import PropTypes from "prop-types";

const prefixCls = "k-grid__col";

class Col extends Component {
    static displayName = "Col";
    static propTypes = {
        start: PropTypes.string
    };
    static defaultProps = {};
    render() {
        return <div className={prefixCls} />;
    }
}

export default Col;