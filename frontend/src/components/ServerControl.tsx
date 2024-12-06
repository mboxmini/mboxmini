import React, { useState, useEffect } from 'react';
import { Form, Input, Button, message, Select, Space, Popconfirm, Typography } from 'antd';
import styled from 'styled-components';
import {
  createServer,
  getServerStatus,
  startServer,
  stopServer,
  deleteServer,
} from '../api/server';
import { colors } from '../theme';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  DeleteOutlined,
  CopyOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

// Common Minecraft versions
const MINECRAFT_VERSIONS = [
  '1.21.3',
  '1.20.4',
  '1.20.2',
  '1.20.1',
  '1.19.4',
  '1.19.3',
  '1.19.2',
  '1.18.2',
  '1.17.1',
  '1.16.5',
];

// Common memory configurations
const MEMORY_OPTIONS = ['2G', '4G', '6G', '8G', '12G', '16G'];

interface Props {
  serverId?: string;
  onServerCreated?: (serverId: string) => void;
  onServerDeleted?: () => void;
}

interface ServerFormData {
  name: string;
  version: string;
  memory?: string;
}

const StyledSelect = styled(Select)`
  &.ant-select {
    width: 100%;
  }

  .ant-select-selector {
    background: ${colors.surface} !important;
    border: 1px solid ${colors.border} !important;
    color: ${colors.text} !important;
  }

  &:hover .ant-select-selector,
  &.ant-select-focused .ant-select-selector {
    border-color: ${colors.accent1} !important;
    background: ${colors.background} !important;
  }

  .ant-select-selection-placeholder {
    color: ${colors.textSecondary} !important;
  }

  .ant-select-arrow {
    color: ${colors.text};
  }

  .ant-select-dropdown {
    background: ${colors.surface};
    border: 1px solid ${colors.border};
  }

  .ant-select-item {
    color: ${colors.text};

    &:hover {
      background: ${colors.background};
    }

    &.ant-select-item-option-selected {
      background: ${colors.accent1};
    }
  }
`;

const getStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'running':
      return colors.accent2; // green
    case 'stopped':
      return colors.accent1; // red
    case 'starting':
      return colors.accent3; // blue
    case 'stopping':
      return colors.accent3; // blue
    default:
      return colors.textSecondary;
  }
};

const ServerControl: React.FC<Props> = ({ serverId, onServerCreated, onServerDeleted }) => {
  const [loading, setLoading] = useState(false);
  const [customVersion, setCustomVersion] = useState(false);
  const [customMemory, setCustomMemory] = useState(false);
  const [serverDetails, setServerDetails] = useState<any>(null);
  const [form] = Form.useForm<ServerFormData>();

  useEffect(() => {
    const fetchServerDetails = async () => {
      if (!serverId) return;

      try {
        const details = await getServerStatus(serverId);
        if (details) {
          setServerDetails(details);
          // Set custom version/memory if values aren't in predefined lists
          setCustomVersion(!MINECRAFT_VERSIONS.includes(details.version));
          const serverMemory = form.getFieldValue('memory');
          setCustomMemory(!MEMORY_OPTIONS.includes(serverMemory));

          // Update form with server details
          form.setFieldsValue({
            name: details.name,
            version: details.version,
            // Memory might not be available in server details, keep existing value
          });
        }
      } catch (error) {
        console.error('Error fetching server details:', error);
        message.error('Failed to load server details');
      }
    };

    fetchServerDetails();
  }, [serverId, form]);

  const handleStartServer = async () => {
    if (!serverId) return;
    try {
      await startServer(serverId);
      message.success('Server starting');
      // Refresh server details
      const details = await getServerStatus(serverId);
      setServerDetails(details);
    } catch (error) {
      console.error('Error starting server:', error);
      message.error('Failed to start server');
    }
  };

  const handleStopServer = async () => {
    if (!serverId) return;
    try {
      await stopServer(serverId);
      message.success('Server stopping');
      // Refresh server details
      const details = await getServerStatus(serverId);
      setServerDetails(details);
    } catch (error) {
      console.error('Error stopping server:', error);
      message.error('Failed to stop server');
    }
  };

  const handleDeleteServer = async () => {
    if (!serverId) return;
    try {
      await deleteServer(serverId);
      message.success('Server deleted');
      onServerDeleted?.();
    } catch (error) {
      console.error('Error deleting server:', error);
      message.error('Failed to delete server');
    }
  };

  const copyAddress = () => {
    if (serverDetails?.port) {
      navigator.clipboard.writeText(`localhost:${serverDetails.port}`);
      message.success('Server address copied to clipboard');
    }
  };

  const handleSubmit = async (values: ServerFormData) => {
    if (serverId) {
      // In detail view, handle updates if needed
      message.info('Server details updated');
      return;
    }

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
      {serverId && serverDetails && (
        <ServerControls>
          <Space size="middle" align="center">
            <Text>
              Status:{' '}
              <Tag color={getStatusColor(serverDetails.status)}>
                {serverDetails.status.toUpperCase()}
              </Tag>
            </Text>
            <Text>
              Address: localhost:{serverDetails.port}
              <Button type="text" icon={<CopyOutlined />} onClick={copyAddress} />
            </Text>
          </Space>
          <Space>
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={handleStartServer}
              disabled={serverDetails.status === 'running' || serverDetails.status === 'starting'}
            >
              Start
            </Button>
            <Button
              icon={<PauseCircleOutlined />}
              onClick={handleStopServer}
              disabled={serverDetails.status === 'stopped' || serverDetails.status === 'stopping'}
            >
              Stop
            </Button>
            <Popconfirm
              title="Delete Server"
              description="Are you sure you want to delete this server? This action cannot be undone."
              onConfirm={handleDeleteServer}
              okText="Yes"
              cancelText="No"
              okButtonProps={{ danger: true }}
            >
              <Button danger icon={<DeleteOutlined />}>
                Delete
              </Button>
            </Popconfirm>
          </Space>
        </ServerControls>
      )}

      <Form
        form={form}
        onFinish={handleSubmit}
        layout="vertical"
        initialValues={{ version: '1.21.3', memory: '2G' }}
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
          <StyledInput
            placeholder="Enter server name"
            disabled={!!serverId}
            title={serverId ? 'Server name cannot be changed' : undefined}
          />
        </Form.Item>

        <Form.Item
          name="version"
          label={<StyledLabel>Minecraft Version</StyledLabel>}
          rules={[{ required: true, message: 'Please select a version' }]}
        >
          <StyledSelect
            placeholder="Select Minecraft version"
            onChange={value => setCustomVersion(value === 'custom')}
            disabled={!!serverId}
          >
            {MINECRAFT_VERSIONS.map(version => (
              <Select.Option key={version} value={version}>
                {version}
              </Select.Option>
            ))}
            <Select.Option value="custom">Custom Version</Select.Option>
          </StyledSelect>
        </Form.Item>

        {customVersion && (
          <Form.Item
            name="version"
            rules={[
              { required: true, message: 'Please enter a version' },
              {
                pattern: /^\d+\.\d+\.\d+$/,
                message: 'Version must be in format X.Y.Z (e.g., 1.20.4)',
              },
            ]}
          >
            <StyledInput placeholder="Enter custom version (e.g., 1.20.4)" disabled={!!serverId} />
          </Form.Item>
        )}

        <Form.Item name="memory" label={<StyledLabel>Memory</StyledLabel>}>
          <StyledSelect
            placeholder="Select memory allocation"
            onChange={value => setCustomMemory(value === 'custom')}
            disabled={!!serverId}
          >
            {MEMORY_OPTIONS.map(memory => (
              <Select.Option key={memory} value={memory}>
                {memory}
              </Select.Option>
            ))}
            <Select.Option value="custom">Custom Memory</Select.Option>
          </StyledSelect>
        </Form.Item>

        {customMemory && (
          <Form.Item
            name="memory"
            rules={[
              {
                pattern: /^[0-9]+[MG]$/,
                message: 'Memory must be in format like 2G or 2048M',
              },
            ]}
          >
            <StyledInput
              placeholder="Enter custom memory (e.g., 2G or 2048M)"
              disabled={!!serverId}
            />
          </Form.Item>
        )}

        {!serverId && (
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              Create Server
            </Button>
          </Form.Item>
        )}
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

const ServerControls = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid ${colors.border};
`;

const Tag = styled.span<{ color: string }>`
  background: ${props => props.color};
  color: white;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
`;

export default ServerControl;
