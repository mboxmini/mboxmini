import React, { useState } from 'react';
import { Card, Input, Button, Typography, message } from 'antd';
import { SendOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { colors } from '../theme';
import { executeCommand } from '../api/server';

const { Title } = Typography;

const StyledCard = styled(Card)`
  background: ${colors.surface};
  border: 1px solid ${colors.border};
  border-radius: 16px;

  .ant-card-head {
    border-bottom: 1px solid ${colors.border};
  }

  .ant-card-head-title {
    color: ${colors.text};
  }
`;

const InputGroup = styled.div`
  display: flex;
  gap: 12px;
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

  // Override antd's default styles
  &.ant-input {
    background: ${colors.surface};
    color: ${colors.text};
  }

  &.ant-input:focus,
  &.ant-input-focused {
    background: ${colors.background};
    box-shadow: 0 0 0 2px rgba(255, 51, 102, 0.2);
  }

  &.ant-input-disabled {
    background: ${colors.background};
    color: ${colors.textSecondary};
  }
`;

const Console: React.FC = () => {
  const [command, setCommand] = useState('');
  const [loading, setLoading] = useState(false);

  const handleExecute = async () => {
    if (!command.trim()) {
      message.warning('Please enter a command');
      return;
    }

    setLoading(true);
    try {
      await executeCommand(command);
      message.success('Command executed successfully');
      setCommand('');
    } catch (error) {
      console.error('Failed to execute command:', error);
      message.error('Failed to execute command');
    }
    setLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleExecute();
    }
  };

  return (
    <StyledCard
      title={
        <Title level={4} style={{ margin: 0, color: colors.text }}>
          Server Console
        </Title>
      }
    >
      <InputGroup>
        <StyledInput
          placeholder="Enter server command..."
          value={command}
          onChange={e => setCommand(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={loading}
        />
        <Button type="primary" icon={<SendOutlined />} onClick={handleExecute} loading={loading}>
          Execute
        </Button>
      </InputGroup>
    </StyledCard>
  );
};

export default Console;
