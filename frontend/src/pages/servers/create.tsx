import React from "react";
import { useNavigate } from "react-router-dom";
import { Create } from "@refinedev/antd";
import { Form, Input, Select, message } from "antd";
import { createServer } from "@/api/servers";

interface CreateServerRequest {
  name: string;
  version: string;
  memory?: string;
}

export const ServerCreate: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm<CreateServerRequest>();

  const handleSubmit = async (values: CreateServerRequest) => {
    try {
      await createServer(values);
      message.success("Server created successfully");
      navigate("/servers");
    } catch (error) {
      message.error("Failed to create server");
    }
  };

  return (
    <Create
      title="Create Server"
      saveButtonProps={{
        onClick: () => form.submit(),
      }}
    >
      <Form<CreateServerRequest>
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          version: "1.21.3"
        }}
      >
        <Form.Item
          label="Server Name"
          name="name"
          rules={[
            {
              required: true,
              message: "Please enter a server name",
            },
            {
              pattern: /^[a-zA-Z0-9-_]+$/,
              message: "Server name can only contain letters, numbers, hyphens, and underscores",
            },
          ]}
        >
          <Input placeholder="my-minecraft-server" />
        </Form.Item>

        <Form.Item
          label="Minecraft Version"
          name="version"
          rules={[
            {
              required: true,
              message: "Please select a Minecraft version",
            },
          ]}
        >
          <Select placeholder="Select version">
            <Select.Option value="1.20.4">1.20.4 (Latest)</Select.Option>
            <Select.Option value="1.20.2">1.20.2</Select.Option>
            <Select.Option value="1.20.1">1.20.1</Select.Option>
            <Select.Option value="1.19.4">1.19.4</Select.Option>
            <Select.Option value="1.19.3">1.19.3</Select.Option>
            <Select.Option value="1.18.2">1.18.2</Select.Option>
            <Select.Option value="1.17.1">1.17.1</Select.Option>
            <Select.Option value="1.16.5">1.16.5</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item
          label="Memory"
          name="memory"
          tooltip="Server memory allocation (e.g., 2G, 4G)"
        >
          <Select
            placeholder="Select memory allocation"
            allowClear
          >
            <Select.Option value="1G">1GB</Select.Option>
            <Select.Option value="2G">2GB</Select.Option>
            <Select.Option value="4G">4GB</Select.Option>
            <Select.Option value="8G">8GB</Select.Option>
          </Select>
        </Form.Item>
      </Form>
    </Create>
  );
}; 