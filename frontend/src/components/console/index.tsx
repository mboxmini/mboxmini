import React, { useState, useRef, useEffect } from 'react';
import { Input, Button, theme } from 'antd';
import { SendOutlined } from '@ant-design/icons';
import { executeCommand } from '@/api/servers';
import styled from 'styled-components';

const ConsoleContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 600px;
  min-height: 300px;
`;

const ConsoleOutput = styled.div`
  background: ${() => {
    const { useToken } = theme;
    const { token } = useToken();
    return token.colorBgContainer;
  }};
  border: 1px solid ${() => {
    const { useToken } = theme;
    const { token } = useToken();
    return token.colorBorder;
  }};
  border-radius: 4px;
  padding: 16px;
  flex: 1;
  overflow-y: auto;
  font-family: monospace;
  white-space: pre-wrap;
  word-wrap: break-word;
  color: ${() => {
    const { useToken } = theme;
    const { token } = useToken();
    return token.colorText;
  }};
`;

interface ConsoleEntryProps {
  $isError?: boolean;
}

const ConsoleEntry = styled.div<ConsoleEntryProps>`
  margin-bottom: 8px;
  color: ${(props: ConsoleEntryProps) => {
    const { useToken } = theme;
    const { token } = useToken();
    return props.$isError ? token.colorError : token.colorText;
  }};
`;

const InputContainer = styled.div`
  display: flex;
  gap: 8px;
`;

interface Props {
  serverId: string;
}

interface ConsoleMessage {
  text: string;
  isError?: boolean;
  timestamp: string;
}

export const Console: React.FC<Props> = ({ serverId }) => {
  const [command, setCommand] = useState('');
  const [messages, setMessages] = useState<ConsoleMessage[]>([]);
  const [executing, setExecuting] = useState(false);
  const inputRef = useRef<any>(null);

  // Focus input when component mounts and after execution
  useEffect(() => {
    if (!executing) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  }, [executing]);

  const handleExecuteCommand = async () => {
    if (!command.trim()) return;

    const timestamp = new Date().toLocaleTimeString();
    setMessages(prev => [...prev, { text: `> ${command}`, timestamp }]);
    setExecuting(true);

    try {
      const response = await executeCommand(serverId, command);
      if (response.status === 'error') {
        setMessages(prev => [
          ...prev,
          { text: response.error || 'Unknown error', isError: true, timestamp },
        ]);
      } else {
        setMessages(prev => [...prev, { text: response.output || '', timestamp }]);
      }
    } catch (error) {
      console.error('Error executing command:', error);
      setMessages(prev => [
        ...prev,
        { text: 'Failed to execute command', isError: true, timestamp },
      ]);
    } finally {
      setCommand('');
      setExecuting(false);
    }
  };

  return (
    <ConsoleContainer>
      <ConsoleOutput>
        {messages.map((msg, index) => (
          <ConsoleEntry key={index} $isError={msg.isError}>
            [{msg.timestamp}] {msg.text}
          </ConsoleEntry>
        ))}
      </ConsoleOutput>
      <InputContainer>
        <Input
          ref={inputRef}
          placeholder="Enter command..."
          value={command}
          onChange={e => setCommand(e.target.value)}
          onPressEnter={handleExecuteCommand}
          disabled={executing}
          style={{ flex: 1 }}
          autoFocus
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={handleExecuteCommand}
          loading={executing}
        >
          Execute
        </Button>
      </InputContainer>
    </ConsoleContainer>
  );
}; 