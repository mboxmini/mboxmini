import { useState } from "react";
import { SearchOutlined } from "@ant-design/icons";
import { AutoComplete, Flex, Input, Typography, Tag } from "antd";
import { useList, useNavigation } from "@refinedev/core";
import { Server } from "@/interfaces";
import { useStyles } from "./styled";

export const Search = () => {
  const [searchText, setSearchText] = useState<string>("");
  const { styles } = useStyles();
  const { push } = useNavigation();

  const { data } = useList<Server>({
    resource: "servers",
    pagination: {
      current: 1,
      pageSize: 999,
    },
  });

  const servers = data?.data || [];
  
  // Filter servers based on search text
  const filteredServers = searchText
    ? servers.filter(server => 
        server.name.toLowerCase().includes(searchText.toLowerCase())
      )
    : [];

  return (
    <AutoComplete
      style={{
        width: "100%",
        maxWidth: "360px",
      }}
      filterOption={false}
      options={filteredServers.map(server => ({
        value: server.id,
        label: server.name,
        data: server,
      }))}
      value={searchText}
      onChange={(text) => setSearchText(text)}
      onSelect={(value) => {
        const server = servers.find(s => s.id === value);
        if (server) {
          push(`/servers/${server.id}`);
          setSearchText(""); // Clear search after selection
        }
      }}
      optionRender={(option) => {
        const server = (option.data as { data: Server }).data;
        return (
          <Flex align="center" gap={8}>
            <Typography.Text strong>{server.name}</Typography.Text>
            <Tag color={server.status === "running" ? "green" : "red"}>
              {server.status.toUpperCase()}
            </Tag>
          </Flex>
        );
      }}
    >
      <Input
        size="middle"
        placeholder="Search servers"
        suffix={<div className={styles.inputSuffix}>/</div>}
        prefix={<SearchOutlined className={styles.inputPrefix} />}
        allowClear
      />
    </AutoComplete>
  );
};
