```jsx
import React, { Component } from "react";
import { Card } from "kui-react";

export default class Example extends Component {
    render() {
        return (
            <Card title="卡片标题" bordered={false}>
                <p>列表内容1</p>
                <p>列表内容2</p>
                <p>列表内容3</p>
                <p style={{ marginBottom: 0 }}>列表内容4</p>
            </Card>
        );
    }
}

```
