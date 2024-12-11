import React from "react";
import { useShow, useNavigation } from "@refinedev/core";
import { Show } from "@refinedev/antd";
import { Card, Space, Button, Tag, message } from "antd";
import { PlayCircleOutlined, PauseCircleOutlined, DeleteOutlined } from "@ant-design/icons";
import { Server } from "@/interfaces";
import { startServer, stopServer } from "@/api/servers";
import { Console } from "@/components/console";
import { PlayerList } from "@/components/player-list";

export const ServerShow: React.FC = () => {
  const { queryResult } = useShow<Server>();
  const { data, isLoading } = queryResult;
  const record = data?.data;

  const handleStartServer = async () => {
    if (!record) return;
    try {
      await startServer(record.id);
      message.success("Server starting");
    } catch (error) {
      message.error("Failed to start server");
    }
  };

  const handleStopServer = async () => {
    if (!record) return;
    try {
      await stopServer(record.id);
      message.success("Server stopping");
    } catch (error) {
      message.error("Failed to stop server");
    }
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
      <Space direction="vertical" style={{ width: "100%" }}>
        <Card>
          <Space style={{ width: "100%", justifyContent: "space-between" }}>
            <Space direction="vertical">
              <h2>{record?.name}</h2>
              <Tag color={getStatusColor(record?.status || "")}>
                {record?.status?.toUpperCase()}
              </Tag>
              <div>Version: {record?.version}</div>
              <div>Address: localhost:{record?.port}</div>
            </Space>
            <Space>
              <Button
                type="text"
                icon={<PlayCircleOutlined />}
                onClick={handleStartServer}
                disabled={
                  record?.status === "running" || record?.status === "starting"
                }
              />
              <Button
                type="text"
                icon={<PauseCircleOutlined />}
                onClick={handleStopServer}
                disabled={
                  record?.status === "stopped" || record?.status === "stopping"
                }
              />
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={() => {}}
              />
            </Space>
          </Space>
        </Card>

        <Card title="Console">
          <Console serverId={record?.id || ""} />
        </Card>

        <Card title="Players">
          <PlayerList serverId={record?.id || ""} />
        </Card>
      </Space>
    </Show>
  );
}; 