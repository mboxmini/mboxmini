import React, { useState } from 'react';
import { Form, Input, Button, message, Select } from 'antd';
import styled from 'styled-components';
import { createServer } from '../api/server';
import { colors } from '../theme';

// Common Minecraft versions
const VERSION_OPTIONS = [
  { label: '1.21.3 (Latest)', value: '1.21.3' },
  { label: '1.20.4', value: '1.20.4' },
  { label: '1.20.2', value: '1.20.2' },
  { label: '1.19.4', value: '1.19.4' },
  { label: '1.19.2', value: '1.19.2' },
  { label: '1.18.2', value: '1.18.2' },
  { label: '1.17.1', value: '1.17.1' },
  { label: '1.16.5', value: '1.16.5' },
];

// Common memory options
const MEMORY_OPTIONS = [
  { label: '2GB (Recommended)', value: '2G' },
  { label: '4GB', value: '4G' },
  { label: '6GB', value: '6G' },
  { label: '8GB', value: '8G' },
  { label: '12GB', value: '12G' },
  { label: '16GB', value: '16G' },
];

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
  const [customMemory, setCustomMemory] = useState(false);
  const [customVersion, setCustomVersion] = useState(false);

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
          <StyledInput placeholder="Enter server name" />
        </Form.Item>

        <Form.Item
          name="version"
          label={<StyledLabel>Minecraft Version</StyledLabel>}
          rules={[{ required: true, message: 'Please select a version' }]}
        >
          {customVersion ? (
            <StyledInput 
              placeholder="Enter version (e.g. 1.21.3)"
              suffix={
                <Button type="link" size="small" onClick={() => setCustomVersion(false)}>
                  Use preset
                </Button>
              }
            />
          ) : (
            <StyledSelect
              options={VERSION_OPTIONS}
              dropdownStyle={{ background: colors.surface }}
              dropdownMatchSelectWidth={false}
              placeholder="Select Minecraft version"
              dropdownRender={(menu) => (
                <>
                  {menu}
                  <Divider />
                  <Button type="link" onClick={() => setCustomVersion(true)}>
                    Enter custom version
                  </Button>
                </>
              )}
            />
          )}
        </Form.Item>

        <Form.Item
          name="memory"
          label={<StyledLabel>Memory</StyledLabel>}
          rules={[
            {
              pattern: /^[0-9]+[MG]$/,
              message: 'Memory must be in format like 2G or 2048M',
            },
          ]}
        >
          {customMemory ? (
            <StyledInput 
              placeholder="Enter memory (e.g. 2G or 2048M)"
              suffix={
                <Button type="link" size="small" onClick={() => setCustomMemory(false)}>
                  Use preset
                </Button>
              }
            />
          ) : (
            <StyledSelect
              options={MEMORY_OPTIONS}
              dropdownStyle={{ background: colors.surface }}
              dropdownMatchSelectWidth={false}
              placeholder="Select memory allocation"
              dropdownRender={(menu) => (
                <>
                  {menu}
                  <Divider />
                  <Button type="link" onClick={() => setCustomMemory(true)}>
                    Enter custom value
                  </Button>
                </>
              )}
            />
          )}
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
`;

const StyledLabel = styled.span`
  color: ${colors.text};
`;

const Divider = styled.div`
  height: 1px;
  background: ${colors.border};
  margin: 8px 0;
`;

export default ServerControl;
