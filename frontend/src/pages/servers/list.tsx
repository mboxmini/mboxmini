import React, { useState, useEffect } from "react";
import { useList, useNavigation, useInvalidate } from "@refinedev/core";
import { List as AntdList, Table, Space, Button, Tag, message, Row, Col, Modal, Checkbox, Typography } from "antd";
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
      await startServer(serverId);
      message.success("Server started");
      invalidate({
        resource: "servers",
        invalidates: ["list"],
      });
    } catch (error) {
      message.error("Failed to start server");
    } finally {
      setActionLoading(prev => ({ ...prev, [serverId]: null }));
    }
  };

  const handleStopServer = async (serverId: string) => {
    try {
      setActionLoading(prev => ({ ...prev, [serverId]: 'stop' }));
      await stopServer(serverId);
      message.success("Server stopped");
      invalidate({
        resource: "servers",
        invalidates: ["list"],
      });
    } catch (error) {
      message.error("Failed to stop server");
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
          await deleteServer(serverId, { deleteFiles });
          message.success("Server deleted");
          invalidate({
            resource: "servers",
            invalidates: ["list"],
          });
        } catch (error) {
          message.error("Failed to delete server");
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
                  isLoading !== undefined ||
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
                  isLoading !== undefined ||
                  record.status !== "running"
                }
                title="Stop Server"
              />
              <Button
                type="text"
                style={{ color: '#ff4d4f' }}
                icon={isLoading === 'delete' ? <LoadingOutlined /> : <DeleteOutlined />}
                onClick={() => handleDeleteServer(record.id)}
                disabled={isLoading !== undefined}
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
            Minecraft Servers
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