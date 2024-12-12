import React, { useState, useEffect } from "react";
import { useList, useNavigation, useInvalidate } from "@refinedev/core";
import { List as AntdList, Table, Space, Button, Tag, message, Row, Col, Modal, Checkbox, Typography, theme } from "antd";
import { 
  PlayCircleOutlined, 
  PauseCircleOutlined, 
  DeleteOutlined, 
  LoadingOutlined, 
  ExclamationCircleOutlined,
  FolderOpenOutlined,
  CloudServerOutlined
} from "@ant-design/icons";
import { Server } from "@/interfaces";
import { startServer, stopServer, deleteServer } from "@/api/servers";

const DeleteConfirmContent: React.FC<{ onDeleteFilesChange: (checked: boolean) => void }> = ({ onDeleteFilesChange }) => {
  const [deleteFiles, setDeleteFiles] = useState(false);

  return (
    <div>
      <p>Are you sure you want to delete this server? This action cannot be undone.</p>
      <Checkbox
        checked={deleteFiles}
        onChange={(e) => {
          setDeleteFiles(e.target.checked);
          onDeleteFilesChange(e.target.checked);
        }}
      >
        Also delete server files from disk
      </Checkbox>
    </div>
  );
};

export const ServerList: React.FC = () => {
  const { data, isLoading, refetch } = useList<Server>({
    resource: "servers",
  });
  const invalidate = useInvalidate();
  const { push } = useNavigation();
  const [actionLoading, setActionLoading] = useState<Record<string, string | null>>({});
  const [deleteFiles, setDeleteFiles] = useState(false);
  const { token } = theme.useToken();

  // Auto-refresh scheduler
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [refetch]);

  const handleStartServer = async (serverId: string) => {
    try {
      setActionLoading(prev => ({ ...prev, [serverId]: 'start' }));
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Operation timed out')), 10000);
      });

      await Promise.race([startServer(serverId), timeoutPromise]);
      message.success("Server started");
      await refetch();
    } catch (error) {
      const errorMessage = error instanceof Error && error.message === 'Operation timed out' 
        ? "Server is taking too long to respond" 
        : "Failed to start server";
      message.error(errorMessage);
    } finally {
      setActionLoading(prev => ({ ...prev, [serverId]: null }));
    }
  };

  const handleStopServer = async (serverId: string) => {
    try {
      setActionLoading(prev => ({ ...prev, [serverId]: 'stop' }));
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Operation timed out')), 10000);
      });

      await Promise.race([stopServer(serverId), timeoutPromise]);
      message.success("Server stopped");
      await refetch();
    } catch (error) {
      const errorMessage = error instanceof Error && error.message === 'Operation timed out' 
        ? "Server is taking too long to respond" 
        : "Failed to stop server";
      message.error(errorMessage);
    } finally {
      setActionLoading(prev => ({ ...prev, [serverId]: null }));
    }
  };

  const handleDeleteServer = (serverId: string) => {
    let deleteFiles = false;

    Modal.confirm({
      title: 'Delete Server',
      icon: <ExclamationCircleOutlined />,
      content: <DeleteConfirmContent onDeleteFilesChange={(checked) => {
        deleteFiles = checked;
      }} />,
      okText: 'Delete',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          setActionLoading(prev => ({ ...prev, [serverId]: 'delete' }));
          
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Operation timed out')), 10000);
          });

          await Promise.race([deleteServer(serverId, { deleteFiles }), timeoutPromise]);
          message.success("Server deleted");
          await refetch();
        } catch (error) {
          const errorMessage = error instanceof Error && error.message === 'Operation timed out' 
            ? "Server is taking too long to respond" 
            : "Failed to delete server";
          message.error(errorMessage);
          setActionLoading(prev => ({ ...prev, [serverId]: null }));
        }
      },
    });
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
      render: (version: string) => version || "Latest",
    },
    {
      title: "Address",
      key: "address",
      render: (_: any, record: Server) => (
        <span style={{ 
          color: record.status === "running" ? 'inherit' : token.colorTextDisabled 
        }}>
          localhost:{record.port}
        </span>
      ),
    },
    {
      title: "Players",
      key: "players",
      render: (_: any, record: Server) => `${record.players?.length || 0} online`,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: any, record: Server) => {
        const isLoading = actionLoading[record.id];
        return (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <Button
                type="text"
                icon={isLoading === 'start' ? <LoadingOutlined /> : <PlayCircleOutlined />}
                onClick={() => handleStartServer(record.id)}
                disabled={
                  Boolean(isLoading) ||
                  record.status === "running" ||
                  record.status === "starting"
                }
                title="Start Server"
              />
              <Button
                type="text"
                icon={isLoading === 'stop' ? <LoadingOutlined /> : <PauseCircleOutlined />}
                onClick={() => handleStopServer(record.id)}
                disabled={
                  Boolean(isLoading) ||
                  record.status !== "running"
                }
                title="Stop Server"
              />
              <Button
                type="text"
                style={{ color: '#ff4d4f' }}
                icon={isLoading === 'delete' ? <LoadingOutlined /> : <DeleteOutlined />}
                onClick={() => handleDeleteServer(record.id)}
                disabled={Boolean(isLoading)}
                title="Delete Server"
              />
            </Space>
            <Button
              type="primary"
              icon={<FolderOpenOutlined />}
              onClick={() => push(`/servers/${record.id}`)}
              size="small"
            >
              Go to server details
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space>
          <CloudServerOutlined style={{ fontSize: '24px' }} />
          <Typography.Title level={2} style={{ margin: 0 }}>
            Minecraft Servers2
          </Typography.Title>
        </Space>
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