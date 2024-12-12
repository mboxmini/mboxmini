import React from "react";
import { Create, useForm } from "@refinedev/antd";
import { Form, Input, Select, Button, Space } from "antd";
import { useNavigation } from "@refinedev/core";
import { CreateServerRequest } from "@/interfaces";
import { createServer } from "@/api/servers";

const MINECRAFT_VERSIONS = [
  "1.21.3",
  "1.20.4",
  "1.20.2",
  "1.20.1",
  "1.19.4",
  "1.19.3",
  "1.19.2",
  "1.18.2",
  "1.17.1",
  "1.16.5",
];

const MEMORY_OPTIONS = ["2G", "4G", "6G", "8G", "12G", "16G"];

export const ServerCreate: React.FC = () => {
  const { form } = useForm<CreateServerRequest>();
  const { goBack } = useNavigation();

  const handleSubmit = async (values: CreateServerRequest) => {
    try {
      console.log('Creating server with values:', values);
      await createServer(values);
      goBack();
    } catch (error) {
      console.error('Error creating server:', error);
      throw error;
    }
  };

  return (
    <Create
      title="Create Minecraft Server"
      footerButtons={[
        <Space key="buttons">
          <Button onClick={() => goBack()}>
            Cancel
          </Button>
          <Button type="primary" onClick={() => form.submit()}>
            Create Server
          </Button>
        </Space>
      ]}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          version: "latest",
          memory: "4G"
        }}
      >
        <Form.Item
          label="Server Name"
          name="name"
          rules={[
            { required: true },
            {
              pattern: /^[a-zA-Z0-9-_]+$/,
              message: "Only letters, numbers, hyphens and underscores are allowed",
            },
            { max: 20, message: "Name must be at most 20 characters" },
          ]}
        >
          <Input placeholder="Enter server name" />
        </Form.Item>

        <Form.Item
          label="Minecraft Version"
          name="version"
          rules={[{ required: true }]}
        >
          <Select placeholder="Select version">
            <Select.Option value="latest">Latest</Select.Option>
            {MINECRAFT_VERSIONS.map((version) => (
              <Select.Option key={version} value={version}>
                {version}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item label="Memory" name="memory">
          <Select placeholder="Select memory allocation">
            {MEMORY_OPTIONS.map((memory) => (
              <Select.Option key={memory} value={memory}>
                {memory}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
      </Form>
    </Create>
  );
}; 