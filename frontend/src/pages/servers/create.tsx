import React, { useRef, useEffect, useState } from "react";
import { Create, useForm } from "@refinedev/antd";
import { Form, Input, Select, Button, Space, message } from "antd";
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

const getDefaultServerName = () => {
  const now = new Date();
  const timestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
  return `Minecraft-server-${timestamp}`;
};

export const ServerCreate: React.FC = () => {
  const { form } = useForm<CreateServerRequest>();
  const { goBack } = useNavigation();
  const nameInputRef = useRef<any>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    // Set default values when component mounts
    form.setFieldsValue({
      name: getDefaultServerName(),
      version: "latest",
      memory: "4G"
    });

    // Focus and select the name input text
    if (nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [form]);

  const handleSubmit = async (values: CreateServerRequest) => {
    setIsCreating(true);
    try {
      console.log('Creating server with values:', values);
      await createServer(values);
      message.success("Server created successfully!");
      goBack();
    } catch (error) {
      console.error('Error creating server:', error);
      message.error("Failed to create server");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Create
      title="Create Minecraft Server"
      footerButtons={[
        <Space key="buttons">
          <Button onClick={() => goBack()} disabled={isCreating}>
            Cancel
          </Button>
          <Button 
            type="primary" 
            onClick={() => form.submit()} 
            loading={isCreating}
            disabled={isCreating}
          >
            Create Server
          </Button>
        </Space>
      ]}
      isLoading={isCreating}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        disabled={isCreating}
      >
        <Form.Item
          label="Server Name"
          name="name"
          rules={[
            { required: true, message: "Server name is required" },
            {
              pattern: /^[a-zA-Z0-9][a-zA-Z0-9-_]*$/,
              message: "Server name must start with a letter or number and can only contain letters, numbers, hyphens and underscores",
            },
            {
              pattern: /^[^.].*[^.]$/,
              message: "Server name cannot start or end with a dot",
            },
            {
              pattern: /^[^-_].*[^-_]$/,
              message: "Server name cannot start or end with a hyphen or underscore",
            },
            {
              validator: (_, value) => {
                if (value && /[<>:"/\\|?*\x00-\x1F]/.test(value)) {
                  return Promise.reject("Server name cannot contain special characters: < > : \" / \\ | ? *");
                }
                return Promise.resolve();
              }
            },
            { max: 40, message: "Name must be at most 40 characters" },
          ]}
        >
          <Input 
            ref={nameInputRef}
            placeholder="Enter server name"
          />
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