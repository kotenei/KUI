import React, { memo, useState, useMemo, useCallback } from 'react';
import classnames from 'classnames';
import { CSSTransition } from 'react-transition-group';
import {
  AiOutlineClose,
  AiFillCheckCircle,
  AiFillInfoCircle,
  AiFillWarning,
  AiFillCloseCircle,
} from 'react-icons/ai';

import { Icon } from '../icon';
import { AlertProps } from './typing';

const Alert = (props: AlertProps) => {
  const {
    prefixCls = 'k-alert',
    title,
    description,
    showIcon,
    closable,
    closeText,
    state,
    className,
    onClose,
  } = props;
  const [closed, setClosed] = useState(false);

  const stateIcon = useMemo(() => {
    const iconClassString = classnames({
      [`${prefixCls}__icon`]: true,
      [`${prefixCls}__icon--lg`]: !!description,
    });
    let icon;

    switch (state) {
      case 'info':
        icon = <AiFillInfoCircle />;
        break;
      case 'success':
        icon = <AiFillCheckCircle />;
        break;
      case 'warning':
        icon = <AiFillWarning />;
        break;
      case 'danger':
        icon = <AiFillCloseCircle />;
        break;
    }
    return icon ? <Icon className={iconClassString}>{icon}</Icon> : null;
  }, [state]);

  const handleClose = useCallback(() => {
    if (!closable) {
      return;
    }
    if (!onClose || (typeof onClose === 'function' && onClose() !== false)) {
      setClosed(true);
    }
  }, [closable, onClose]);

  const classString = classnames(
    {
      [prefixCls]: true,
      [`${prefixCls}--${state}`]: !!state,
    },
    className,
  );

  return (
    <CSSTransition in={!closed} timeout={300} classNames="fade" unmountOnExit>
      <div className={classString}>
        {showIcon && stateIcon}
        <div className={`${prefixCls}__content`}>
          <div className={`${prefixCls}__title`}>{title}</div>
          {description ? <div className={`${prefixCls}__description`}>{description}</div> : null}
          {closable && !closeText ? (
            <AiOutlineClose className={`${prefixCls}__close`} onClick={handleClose} />
          ) : null}
          {closeText ? (
            <span className={`${prefixCls}__closetext`} onClick={handleClose}>
              {closeText}
            </span>
          ) : null}
        </div>
      </div>
    </CSSTransition>
  );
};

Alert.defaultProps = {
  showIcon: false,
  closable: false,
};

export default memo(Alert);
