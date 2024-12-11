import React from "react";
import { useList, useNavigation } from "@refinedev/core";
import { List as AntdList, Table, Space, Button, Tag, message, Typography } from "antd";
import { PlayCircleOutlined, PauseCircleOutlined, DeleteOutlined } from "@ant-design/icons";
import { Server } from "@/interfaces";
import { startServer, stopServer } from "@/api/servers";

const { Title } = Typography;

export const ServerList: React.FC = () => {
  const { data, isLoading } = useList<Server>({
    resource: "servers",
  });

  const { push } = useNavigation();

  const handleStartServer = async (serverId: string) => {
    try {
      await startServer(serverId);
      message.success("Server starting");
    } catch (error) {
      message.error("Failed to start server");
    }
  };

  const handleStopServer = async (serverId: string) => {
    try {
      await stopServer(serverId);
      message.success("Server stopping");
    } catch (error) {
      message.error("Failed to stop server");
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case "running":
        return "green";
      case "stopped":
        return "red";
      case "starting":
      case "stopping":
        return "orange";
      default:
        return "default";
    }
  };

  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>{status.toUpperCase()}</Tag>
      ),
    },
    {
      title: "Version",
      dataIndex: "version",
      key: "version",
    },
    {
      title: "Address",
      key: "address",
      render: (_: any, record: Server) => `localhost:${record.port}`,
    },
    {
      title: "Players",
      key: "players",
      render: (_: any, record: Server) => `${record.players?.length || 0} online`,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: any, record: Server) => (
        <Space>
          <Button
            type="text"
            icon={<PlayCircleOutlined />}
            onClick={() => handleStartServer(record.id)}
            disabled={record.status === "running" || record.status === "starting"}
            title="Start Server"
          />
          <Button
            type="text"
            icon={<PauseCircleOutlined />}
            onClick={() => handleStopServer(record.id)}
            disabled={record.status === "stopped" || record.status === "stopping"}
            title="Stop Server"
          />
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => push(`/servers/delete/${record.id}`)}
            title="Delete Server"
          />
          <Button
            type="link"
            onClick={() => push(`/servers/${record.id}`)}
          >
            Details
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={2}>Minecraft Servers</Title>
        <Button
          type="primary"
          onClick={() => push("/servers/new")}
        >
          Create Server
        </Button>
      </div>
      <Table
        dataSource={data?.data}
        columns={columns}
        rowKey="id"
        loading={isLoading}
      />
    </div>
  );
}; 