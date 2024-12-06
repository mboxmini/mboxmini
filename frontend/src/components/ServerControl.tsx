import React, { useState, useEffect } from 'react';
import { Form, Input, Button, message, Select, Space, Popconfirm, Typography } from 'antd';
import type { SelectProps } from 'antd';
import styled from 'styled-components';
import {
  createServer,
  getServerStatus,
  startServer,
  stopServer,
  deleteServer,
  updateServer,
  Server,
} from '../api/server';
import { colors } from '../theme';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  DeleteOutlined,
  CopyOutlined,
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
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

// Add this constant at the top with other constants
const LATEST_NUMERIC_VERSION = '1.21.3';

interface Props {
  serverId?: string;
  onServerCreated?: (serverId: string) => void;
  onServerDeleted?: () => void;
}

interface ServerFormData {
  name: string;
  version: string;
  memory: string;
}

const StyledCard = styled.div`
  background: ${colors.surface};
  border: 1px solid ${colors.border};
  border-radius: 8px;
  padding: 24px;
`;

const ServerControls = styled.div`
  margin-bottom: 24px;
  padding: 16px;
  background: ${colors.surface};
  border-radius: 8px;
  border-bottom: 1px solid ${colors.border};
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ServerInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const InfoItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;

  .label {
    color: ${colors.textSecondary};
    min-width: 80px;
  }

  .value {
    color: ${colors.text};
    display: flex;
    align-items: center;
    gap: 8px;
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 8px;
  justify-content: flex-end;
`;

const EditButtons = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
`;

const StyledLabel = styled.span`
  color: ${colors.textSecondary};
`;

const StyledInput = styled(Input)`
  background: ${colors.surface};
  border-color: ${colors.border};
  color: ${colors.text};

  &:hover,
  &:focus {
    border-color: ${colors.accent1};
  }

  &:disabled {
    background: ${colors.surface};
    color: ${colors.textSecondary};
  }
`;

const StyledSelect = styled(Select)`
  .ant-select-selector {
    background: ${colors.surface} !important;
    border-color: ${colors.border} !important;
    color: ${colors.text} !important;
  }

  &:not(.ant-select-disabled) {
    .ant-select-selector:hover {
      border-color: ${colors.accent1} !important;
    }
  }

  &.ant-select-disabled {
    .ant-select-selector {
      background: ${colors.surface} !important;
      color: ${colors.textSecondary} !important;
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
  const [serverDetails, setServerDetails] = useState<Server | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [form] = Form.useForm<ServerFormData>();

  const handleVersionChange: SelectProps['onChange'] = value => {
    setCustomVersion(value === 'custom');
    if (value === 'custom') {
      form.setFieldValue('version', LATEST_NUMERIC_VERSION);
    }
  };

  const handleMemoryChange: SelectProps['onChange'] = value => {
    setCustomMemory(value === 'custom');
  };

  useEffect(() => {
    if (serverId) {
      console.log('Fetching details for server:', serverId);
      fetchServerDetails();
    }
  }, [serverId]);

  const fetchServerDetails = async () => {
    if (!serverId) return;

    try {
      console.log('Making API call to fetch server details');
      const details = await getServerStatus(serverId);
      console.log('Received server details:', details);

      if (details) {
        setServerDetails(details);
        // Pre-fill form with current values
        const formValues = {
          name: details.name,
          version: details.version,
          memory: form.getFieldValue('memory') || '2G',
        };
        console.log('Setting form values:', formValues);
        form.setFieldsValue(formValues);
      } else {
        console.error('No server details received');
        message.error('Failed to fetch server details');
      }
    } catch (error) {
      console.error('Error fetching server details:', error);
      message.error('Failed to fetch server details');
    }
  };

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

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    // Reset form to original values
    if (serverDetails) {
      form.setFieldsValue({
        name: serverDetails.name,
        version: serverDetails.version,
        // Keep existing memory value
      });
    }
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    if (!serverId) return;

    try {
      const values = await form.validateFields();
      setLoading(true);

      await updateServer(serverId, values.version || '', values.memory || '2G');

      message.success('Server updated successfully');
      setIsEditing(false);

      // Refresh server details
      const details = await getServerStatus(serverId);
      if (details) {
        setServerDetails(details);
      }
    } catch (error) {
      console.error('Error updating server:', error);
      message.error('Failed to update server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <StyledCard>
      {serverId && serverDetails && (
        <ServerControls>
          <ServerInfo>
            <InfoItem>
              <span className="label">Name:</span>
              <span className="value">{serverDetails.name}</span>
            </InfoItem>
            <InfoItem>
              <span className="label">Status:</span>
              <span className="value">
                <Tag color={getStatusColor(serverDetails.status)}>
                  {serverDetails.status.toUpperCase()}
                </Tag>
              </span>
            </InfoItem>
            <InfoItem>
              <span className="label">Version:</span>
              <span className="value">{serverDetails.version}</span>
            </InfoItem>
            <InfoItem>
              <span className="label">Address:</span>
              <span className="value">
                localhost:{serverDetails.port}
                <Button
                  type="text"
                  icon={<CopyOutlined />}
                  onClick={copyAddress}
                  title="Copy server address"
                />
              </span>
            </InfoItem>
          </ServerInfo>
          <ActionButtons>
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
            <Button
              icon={<EditOutlined />}
              onClick={handleEdit}
              disabled={serverDetails.status === 'running' || serverDetails.status === 'starting'}
            >
              Edit
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
          </ActionButtons>
        </ServerControls>
      )}

      {(!serverId || isEditing) && (
        <Form
          form={form}
          onFinish={isEditing ? handleSaveEdit : handleSubmit}
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
              disabled={Boolean(serverId)}
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
              onChange={handleVersionChange}
              disabled={Boolean(serverId && !isEditing)}
            >
              <Select.Option key="latest" value="latest">
                Latest
              </Select.Option>
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
              <StyledInput
                placeholder="Enter custom version (e.g., 1.20.4)"
                disabled={Boolean(serverId && !isEditing)}
              />
            </Form.Item>
          )}

          <Form.Item name="memory" label={<StyledLabel>Memory</StyledLabel>}>
            <StyledSelect
              placeholder="Select memory allocation"
              onChange={handleMemoryChange}
              disabled={Boolean(serverId && !isEditing)}
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
                disabled={Boolean(serverId && !isEditing)}
              />
            </Form.Item>
          )}

          {isEditing && (
            <EditButtons>
              <Button onClick={handleCancelEdit} icon={<CloseOutlined />}>
                Cancel
              </Button>
              <Button
                type="primary"
                onClick={handleSaveEdit}
                loading={loading}
                icon={<SaveOutlined />}
              >
                Save Changes
              </Button>
            </EditButtons>
          )}

          {!serverId && !isEditing && (
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading}>
                Create Server
              </Button>
            </Form.Item>
          )}
        </Form>
      )}
    </StyledCard>
  );
};

const Tag = styled.span<{ color: string }>`
  background: ${props => props.color};
  color: white;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
`;

export default ServerControl;
