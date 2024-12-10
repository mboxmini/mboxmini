import React, { useState } from 'react';
import { Table, Button, Tag, Space, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import styled from 'styled-components';
import { Server, startServer, stopServer } from '../api/server';
import { colors } from '../theme';
import { PlayCircleOutlined, PauseCircleOutlined, DeleteOutlined } from '@ant-design/icons';
import DeleteServerModal from './DeleteServerModal';

const getStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'running':
      return 'green';
    case 'stopped':
      return 'red';
    case 'starting':
      return 'orange';
    case 'stopping':
      return 'orange';
    default:
      return 'default';
  }
};

interface Props {
  servers: Server[];
  loading?: boolean;
  onServerClick: (serverId: string) => void;
  onServerDeleted?: () => void;
}

const ServerList: React.FC<Props> = ({
  servers,
  loading = false,
  onServerClick,
  onServerDeleted,
}) => {
  const [serverToDelete, setServerToDelete] = useState<string | null>(null);

  const handleStartServer = async (serverId: string) => {
    try {
      await startServer(serverId);
      message.success('Server starting');
      onServerClick(serverId);
    } catch (error) {
      console.error('Error starting server:', error);
      message.error('Failed to start server');
    }
  };

  const handleStopServer = async (serverId: string) => {
    try {
      await stopServer(serverId);
      message.success('Server stopping');
      onServerClick(serverId);
    } catch (error) {
      console.error('Error stopping server:', error);
      message.error('Failed to stop server');
    }
  };

  const columns: ColumnsType<Server> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <span>{text}</span>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => <Tag color={getStatusColor(status)}>{status.toUpperCase()}</Tag>,
    },
    {
      title: 'Address',
      key: 'address',
      render: (_, record) => <span>localhost:{record.port}</span>,
    },
    {
      title: 'Players',
      dataIndex: 'players',
      key: 'players',
      render: (_, record) => <span>{record.players?.length || 0} online</span>,
    },
    {
      title: 'Version',
      dataIndex: 'version',
      key: 'version',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            icon={<PlayCircleOutlined />}
            onClick={() => handleStartServer(record.id)}
            disabled={record.status === 'running' || record.status === 'starting'}
            title="Start Server"
          />
          <Button
            type="text"
            icon={<PauseCircleOutlined />}
            onClick={() => handleStopServer(record.id)}
            disabled={record.status === 'stopped' || record.status === 'stopping'}
            title="Stop Server"
          />
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => setServerToDelete(record.id)}
            title="Delete Server"
          />
          <Button type="link" onClick={() => onServerClick(record.id)}>
            Details
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      <StyledTable<Server>
        columns={columns}
        dataSource={servers}
        rowKey="id"
        pagination={false}
        locale={{
          emptyText: 'No servers found. Create one to get started!',
        }}
        loading={loading}
      />
      <DeleteServerModal
        serverId={serverToDelete}
        onClose={() => setServerToDelete(null)}
        onDeleted={() => {
          if (onServerDeleted) {
            onServerDeleted();
          }
        }}
      />
    </>
  );
};

const StyledTable = styled(Table)`
  .ant-table {
    background: transparent;
  }

  .ant-table-cell {
    background: ${colors.surface} !important;
    color: ${colors.text};
    border-bottom: 1px solid ${colors.border};
  }

  .ant-table-thead > tr > th {
    background: ${colors.surface} !important;
    color: ${colors.text};
    border-bottom: 1px solid ${colors.border};
  }

  .ant-table-row:hover .ant-table-cell {
    background: ${colors.background} !important;
  }

  .ant-empty-description {
    color: ${colors.textSecondary};
  }
` as typeof Table;

export default ServerList;
