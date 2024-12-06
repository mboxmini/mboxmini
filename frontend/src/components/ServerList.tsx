import React from 'react';
import { Table, Button, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import styled from 'styled-components';
import { Server } from '../api/server';

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
  onRefresh: () => void;
  onOpenServer: (serverId: string) => void;
}

const ServerList: React.FC<Props> = ({ servers, onRefresh, onOpenServer }) => {
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
        <Button type="link" size="small" onClick={() => onOpenServer(record.id)}>
          Open
        </Button>
      ),
    },
  ];

  return (
    <StyledTable<Server> columns={columns} dataSource={servers} rowKey="id" pagination={false} />
  );
};

const StyledTable = styled(Table)`
  .ant-table {
    background: transparent;
  }
` as typeof Table;

export default ServerList;
