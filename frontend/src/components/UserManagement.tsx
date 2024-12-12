import React from "react";
import {
  List,
  useTable,
  DeleteButton,
  CreateButton,
} from "@refinedev/antd";
import {
  Table,
  Form,
  Input,
  Button,
  Card,
  Space,
} from "antd";
import { useCreate } from "@refinedev/core";

export const UserManagement: React.FC = () => {
  const [form] = Form.useForm();
  const { tableProps } = useTable({
    resource: "admin/users",
    syncWithLocation: true,
  });

  const { mutate: createUser } = useCreate();

  const handleAddUser = async (values: { email: string; password: string }) => {
    createUser({
      resource: "admin/users",
      values,
    }, {
      onSuccess: () => {
        form.resetFields();
      },
    });
  };

  return (
    <List
      resource="admin/users"
      createButtonProps={{
        style: { display: 'none' }
      }}
    >
      <Card style={{ marginBottom: 24 }}>
        <Form
          form={form}
          onFinish={handleAddUser}
          layout="inline"
          style={{ gap: 16, flexWrap: 'wrap' }}
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: 'Please input email!' },
              { type: 'email', message: 'Please enter a valid email!' }
            ]}
          >
            <Input placeholder="Email" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: 'Please input password!' },
              { min: 6, message: 'Password must be at least 6 characters!' }
            ]}
          >
            <Input.Password placeholder="Password" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit">
              Add User
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Table {...tableProps} rowKey="_id">
        <Table.Column
          dataIndex="email"
          title="Email"
        />
        <Table.Column<{ _id: string }>
          title="Actions"
          dataIndex="actions"
          render={(_, record) => (
            <Space>
              <DeleteButton
                hideText
                size="small"
                recordItemId={record._id}
                resource="admin/users"
              />
            </Space>
          )}
        />
      </Table>
    </List>
  );
}; 