import React, { useState } from 'react';
import { Input, Button } from 'antd';
import { SendOutlined } from '@ant-design/icons';
import { executeCommand } from '@/api/servers';
import styled from 'styled-components';

const ConsoleContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const ConsoleOutput = styled.div`
  background: #f5f5f5;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  padding: 16px;
  min-height: 200px;
  max-height: 400px;
  overflow-y: auto;
  font-family: monospace;
  white-space: pre-wrap;
  word-wrap: break-word;
`;

interface ConsoleEntryProps {
  $isError?: boolean;
}

const ConsoleEntry = styled.div<ConsoleEntryProps>`
  margin-bottom: 8px;
  color: ${(props: ConsoleEntryProps) => (props.$isError ? '#ff4d4f' : 'inherit')};
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
      setExecuting(false);
      setCommand('');
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
          placeholder="Enter command..."
          value={command}
          onChange={e => setCommand(e.target.value)}
          onPressEnter={handleExecuteCommand}
          disabled={executing}
          style={{ flex: 1 }}
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