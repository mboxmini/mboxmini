import React, { useState, useEffect } from "react";
import { useShow, useNavigation } from "@refinedev/core";
import { Show } from "@refinedev/antd";
import { Card, Space, Button, Tag, message, Row, Col, Divider, Modal, Checkbox } from "antd";
import { PlayCircleOutlined, PauseCircleOutlined, DeleteOutlined, LoadingOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import { Server } from "@/interfaces";
import { startServer, stopServer, deleteServer } from "@/api/servers";
import { Console } from "@/components/console";
import { PlayerList } from "@/components/player-list";

export const ServerShow: React.FC = () => {
  const { queryResult } = useShow<Server>();
  const { data, isLoading, refetch } = queryResult;
  const record = data?.data;
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteFiles, setDeleteFiles] = useState(false);
  const { push } = useNavigation();

  // Auto-refresh scheduler
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [refetch]);

  // Existing effect for status polling
  useEffect(() => {
    if (record?.status === "starting" || record?.status === "stopping") {
      const interval = setInterval(() => {
        refetch();
      }, 2000); // More frequent updates during status changes
      return () => clearInterval(interval);
    }
  }, [record?.status, refetch]);

  const handleStartServer = async () => {
    if (!record) return;
    try {
      setActionLoading('start');
      await startServer(record.id);
      message.success("Server started");
      await refetch();
    } catch (error) {
      message.error("Failed to start server");
    } finally {
      setActionLoading(null);
    }
  };

  const handleStopServer = async () => {
    if (!record) return;
    try {
      setActionLoading('stop');
      await stopServer(record.id);
      message.success("Server stopped");
      await refetch();
    } catch (error) {
      message.error("Failed to stop server");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteServer = async () => {
    if (!record) return;
    Modal.confirm({
      title: 'Delete Server',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>Are you sure you want to delete this server? This action cannot be undone.</p>
          <Checkbox
            checked={deleteFiles}
            onChange={(e) => setDeleteFiles(e.target.checked)}
          >
            Also delete server files from disk
          </Checkbox>
        </div>
      ),
      okText: 'Delete',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          setActionLoading('delete');
          await deleteServer(record.id, { deleteFiles });
          message.success("Server deleted");
          push("/servers");
        } catch (error) {
          message.error("Failed to delete server");
          setActionLoading(null);
        }
      },
    });
  };

  const getStatusColor = (status: string): string => {
    switch (status?.toLowerCase()) {
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

  return (
    <Show isLoading={isLoading}>
      <Row gutter={16}>
        <Col flex="auto">
          <Space direction="vertical" style={{ width: "100%" }}>
            <Card>
              <Space direction="vertical" style={{ width: "100%" }}>
                <div>
                  <h2>{record?.name}</h2>
                  <Tag color={getStatusColor(record?.status || "")}>
                    {record?.status?.toUpperCase()}
                  </Tag>
                  <div>Version: {record?.version}</div>
                  <div>Address: localhost:{record?.port}</div>
                </div>
                <Divider />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Space size="middle">
                    <Button
                      type="primary"
                      icon={actionLoading === 'start' ? <LoadingOutlined /> : <PlayCircleOutlined />}
                      onClick={handleStartServer}
                      disabled={
                        actionLoading !== null ||
                        record?.status === "running" ||
                        record?.status === "starting"
                      }
                      loading={actionLoading === 'start'}
                    >
                      Start Server
                    </Button>
                    <Button
                      danger
                      icon={actionLoading === 'stop' ? <LoadingOutlined /> : <PauseCircleOutlined />}
                      onClick={handleStopServer}
                      disabled={
                        actionLoading !== null ||
                        record?.status !== "running"
                      }
                      loading={actionLoading === 'stop'}
                    >
                      Stop Server
                    </Button>
                  </Space>
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    onClick={handleDeleteServer}
                    disabled={actionLoading !== null}
                    loading={actionLoading === 'delete'}
                    style={{ borderColor: '#ff4d4f', color: '#ff4d4f' }}
                  >
                    Delete Server
                  </Button>
                </div>
              </Space>
            </Card>

            <Card title="Console">
              <Console serverId={record?.id || ""} />
            </Card>
          </Space>
        </Col>
        <Col flex="300px">
          <Card title="Players" style={{ height: "100%" }}>
            <PlayerList serverId={record?.id || ""} />
          </Card>
        </Col>
      </Row>
    </Show>
  );
}; 