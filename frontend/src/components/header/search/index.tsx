import { useState } from "react";
import { SearchOutlined } from "@ant-design/icons";
import { AutoComplete, Flex, Input, Typography, Tag } from "antd";
import { useList, useNavigation } from "@refinedev/core";
import { Link } from "react-router-dom";
import { Server } from "@/interfaces";
import { useStyles } from "./styled";

export const Search = () => {
  const [searchText, setSearchText] = useState<string>("");
  const { styles } = useStyles();
  const { show } = useNavigation();

  const { data } = useList<Server>({
    resource: "servers",
    pagination: {
      current: 1,
      pageSize: 999,
    },
    filters: [
      {
        field: "name",
        operator: "contains",
        value: searchText,
      },
    ],
  });

  const servers = data?.data || [];

  return (
    <AutoComplete
      style={{
        width: "100%",
        maxWidth: "360px",
      }}
      filterOption={false}
      options={servers.map(server => ({
        value: server.id,
        label: server.name,
        data: server,
      }))}
      value={searchText}
      onChange={(text) => setSearchText(text)}
      optionRender={(option) => {
        const server = (option.data as { data: Server }).data;
        return (
          <Link to={`/servers/${server.id}`}>
            <Flex align="center" gap={8}>
              <Typography.Text>{server.name}</Typography.Text>
              <Tag color={server.status === "running" ? "green" : "red"}>
                {server.status.toUpperCase()}
              </Tag>
            </Flex>
          </Link>
        );
      }}
    >
      <Input
        size="middle"
        placeholder="Search servers"
        suffix={<div className={styles.inputSuffix}>/</div>}
        prefix={<SearchOutlined className={styles.inputPrefix} />}
      />
    </AutoComplete>
  );
};
