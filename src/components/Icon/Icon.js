import React, { Component } from "react";
import PropTypes from "prop-types";
import classnames from "classnames";
import omit from "object.omit";
import { kStyles, kClass, getClassSet } from "../../utils/kUtils";
import { State, PRIMARY, Sizes } from "../../utils/styleMaps";
import { icons as outline } from "./outline";
import { icons as filled } from "./filled";
import SvgIcon from "./SvgIcon";

const prefixCls = "k-icon";

class Icon extends Component {
    static displayName = "Icon";
    static propTypes = {
        fontSize: PropTypes.number,
        theme: PropTypes.oneOf(["outline", "filled"]),
        type: PropTypes.string,
        color: PropTypes.string,
        spin: PropTypes.bool,
        onClick: PropTypes.func
    };
    static defaultProps = {
        theme: "outline",
        viewBox: "0 0 1024 1024"
    };
    renderIcon() {
        const { theme, type, children, color } = this.props;
        let presetIcon;
        if (theme && type) {
            switch (theme) {
                case "outline":
                    presetIcon = outline[type];
                    break;
                case "filled":
                    presetIcon = filled[type];
                    break;
                default:
                    break;
            }
        }
        if (presetIcon) {
            return (
                <SvgIcon viewBox={presetIcon.viewBox} color={color}>
                    {presetIcon.path}
                </SvgIcon>
            );
        }
        return children;
    }
    render() {
        const {
            children,
            className,
            spin,
            type,
            style,
            fontSize,
            ...other
        } = this.props;
        let classString = getClassSet(this.props);
        classString = classnames(classString, className, {
            "k-spin": !!spin || type == "loading"
        });
        const others = omit(other, [
            "kStyle",
            "kClass",
            "kSize",
            "className",
            "style",
            "fontSize"
        ]);
        const _style = {
            fontSize,
            ...style
        };

        return (
            <i className={classString} {...others} style={_style}>
                {this.renderIcon()}
            </i>
        );
    }
}
const styles = State.values().concat(PRIMARY);

export default kStyles(styles, kClass(prefixCls, Icon));
