import React, { useState } from 'react';
import { Form, Input, Button, message } from 'antd';
import styled from 'styled-components';
import { createServer } from '../api/server';
import { colors } from '../theme';

interface Props {
  serverId?: string;
  onServerCreated?: (serverId: string) => void;
}

interface ServerFormData {
  name: string;
  version: string;
  memory?: string;
}

const ServerControl: React.FC<Props> = ({ serverId, onServerCreated }) => {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm<ServerFormData>();

  const handleSubmit = async (values: ServerFormData) => {
    setLoading(true);
    try {
      const newServerId = await createServer({
        name: values.name,
        version: values.version,
        memory: values.memory,
      });
      if (newServerId && onServerCreated) {
        onServerCreated(newServerId);
        message.success('Server created successfully');
        form.resetFields();
      }
    } catch (error) {
      console.error('Error creating server:', error);
      message.error('Failed to create server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <StyledCard>
      <Form
        form={form}
        onFinish={handleSubmit}
        layout="vertical"
        initialValues={{ version: '1.21.3' }}
      >
        <Form.Item
          name="name"
          label={<StyledLabel>Server Name</StyledLabel>}
          rules={[
            { required: true, message: 'Please enter a server name' },
            {
              pattern: /^[a-zA-Z0-9-_]+$/,
              message: 'Only letters, numbers, hyphens and underscores are allowed',
            },
            { max: 20, message: 'Name must be at most 20 characters' },
          ]}
        >
          <StyledInput placeholder="Enter server name" />
        </Form.Item>

        <Form.Item
          name="version"
          label={<StyledLabel>Minecraft Version</StyledLabel>}
          rules={[{ required: true, message: 'Please select a version' }]}
        >
          <StyledInput placeholder="Enter version (e.g. 1.21.3)" />
        </Form.Item>

        <Form.Item
          name="memory"
          label={<StyledLabel>Memory (optional)</StyledLabel>}
          rules={[
            {
              pattern: /^[0-9]+[MG]$/,
              message: 'Memory must be in format like 2G or 2048M',
            },
          ]}
        >
          <StyledInput placeholder="Enter memory (e.g. 2G)" />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>
            Create Server
          </Button>
        </Form.Item>
      </Form>
    </StyledCard>
  );
};

const StyledCard = styled.div`
  background: ${colors.surface};
  padding: 24px;
  border-radius: 8px;
  border: 1px solid ${colors.border};
  max-width: 500px;
  width: 100%;
`;

const StyledInput = styled(Input)`
  background: ${colors.surface};
  border: 1px solid ${colors.border};
  color: ${colors.text};

  &:hover,
  &:focus {
    border-color: ${colors.accent1};
    background: ${colors.background};
  }

  &::placeholder {
    color: ${colors.textSecondary};
  }
`;

const StyledLabel = styled.span`
  color: ${colors.text};
`;

export default ServerControl;
