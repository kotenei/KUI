import React, { Component } from "react";
import { Tabs, Button } from "kui-react";

const TabPane = Tabs.TabPane;

export default class Example extends Component {
    render() {
        return (
            <Tabs
                extraContent={
                    <Button kSize="sm" raised>
                        Extra
                    </Button>
                }
            >
                <TabPane tab="Tab 1">Tab 1</TabPane>
                <TabPane tab="Tab 2">Tab 2</TabPane>
                <TabPane tab="Tab 3">Tab 3</TabPane>
            </Tabs>
        );
    }
}
